#!/usr/bin/env node
/**
 * Design-token drift guard.
 *
 * The old codebase accumulated ~99 files with hardcoded hex colours, which is
 * why dark mode needed a CSS "safety net" of !important overrides. This script
 * stops that happening again.
 *
 *   npm run check:design          report violations
 *   npm run check:design -- --strict   exit 1 if any NEW file regresses
 *
 * Files already over the line are listed in the baseline below. The baseline
 * may shrink, never grow — that's the whole point. When you migrate a file,
 * delete it from the baseline.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN = ["components", "app", "lib"];
const BASELINE_FILE = join(ROOT, "scripts", "design-baseline.json");
const strict = process.argv.includes("--strict");

/**
 * Files exempt from the colour rule, with the reason.
 *
 * Only illustration belongs here. A drawing's colours *are* its content — the
 * bee is yellow and black in every theme — so routing them through semantic
 * tokens would be meaningless at best and destructive at worst. Everything that
 * frames or labels content is chrome and stays subject to the rule.
 *
 * This is not a place to park files you haven't migrated yet. That's the
 * baseline, which shrinks. This list should stay tiny.
 */
const ARTWORK = [
  "components/ui/BeeMascot.tsx", // inline SVG of the mascot
];

const RULES = [
  {
    id: "hardcoded-hex",
    // Hex colours in .tsx. Allowed in globals.css and constants.ts only.
    re: /#[0-9A-Fa-f]{3,8}\b/g,
    msg: "hardcoded hex colour — use a HP_TOKENS value",
    // Pure white/black are still used for things like avatar text on a photo.
    ignore: (m) => /^#(fff|ffffff|000|000000)$/i.test(m),
  },
  {
    id: "heavy-font-weight",
    // The old system pinned everything to 800/900. The scale tops out at 700.
    re: /fontWeight:\s*(800|900)\b/g,
    msg: "fontWeight 800/900 — the type scale tops out at 700 (use HP_TEXT)",
  },
  {
    id: "raw-shadow",
    re: /boxShadow:\s*["'`]0 /g,
    msg: "hand-written boxShadow — use HP_TOKENS.shadow* or drop it",
  },
  {
    id: "px-radius",
    // Catches borderRadius: 24 etc. Small values (<=8) are usually fine detail.
    re: /borderRadius:\s*(9|1[0-9]|2[0-9]|3[0-9])\b(?!\s*[,}]?\s*\/\/\s*ok)/g,
    msg: "numeric borderRadius — use HP_TOKENS.radius*",
  },
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

function scan(file) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  const hits = [];

  lines.forEach((line, i) => {
    // Skip comment-only lines — they often cite hexes for documentation.
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

    // Escape hatch for the genuinely-not-app-UI cases — chiefly the HTML we
    // build as a string for print/export, which renders outside the document
    // and so can't resolve our CSS custom properties. Must carry a reason:
    //   border: 1px solid #ddd  // design-ok: printed report, no CSS vars
    if (/\/\/\s*design-ok:/.test(line)) return;

    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line))) {
        if (rule.ignore?.(m[0])) continue;
        hits.push({ rule: rule.id, msg: rule.msg, line: i + 1, text: m[0] });
      }
    }
  });

  return hits;
}

const files = SCAN.flatMap((d) => walk(join(ROOT, d)));
const results = new Map();

for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (ARTWORK.includes(rel)) continue;
  const hits = scan(f);
  if (hits.length) results.set(rel, hits);
}

let baseline = {};
if (existsSync(BASELINE_FILE)) {
  baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
}

const regressions = [];
const improved = [];

for (const [file, hits] of results) {
  const allowed = baseline[file] ?? 0;
  if (hits.length > allowed) regressions.push({ file, count: hits.length, allowed });
}
for (const [file, allowed] of Object.entries(baseline)) {
  const now = results.get(file)?.length ?? 0;
  if (now < allowed) improved.push({ file, now, was: allowed });
}

const total = [...results.values()].reduce((n, h) => n + h.length, 0);

console.log(`\n  Design token check — ${files.length} .tsx files scanned\n`);
console.log(`  ${total} violation(s) across ${results.size} file(s)`);
console.log(`  baseline allows ${Object.values(baseline).reduce((a, b) => a + b, 0)}\n`);

if (improved.length) {
  console.log("  Improved since baseline:");
  for (const i of improved.slice(0, 20)) {
    console.log(`    ${i.file}  ${i.was} -> ${i.now}`);
  }
  console.log("    (run with --update to lower the baseline)\n");
}

if (regressions.length) {
  console.log("  REGRESSIONS — these files got worse:\n");
  for (const r of regressions) {
    console.log(`    ${r.file}  ${r.allowed} -> ${r.count}`);
    for (const h of results.get(r.file).slice(0, 5)) {
      console.log(`      L${h.line}  ${h.text}  — ${h.msg}`);
    }
  }
  console.log("");
}

if (process.argv.includes("--update")) {
  const next = {};
  for (const [file, hits] of results) next[file] = hits.length;
  const { writeFileSync } = await import("node:fs");
  writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + "\n");
  console.log(`  Baseline written: ${Object.keys(next).length} files\n`);
}

if (strict && regressions.length) {
  console.error("  FAILED: design tokens regressed.\n");
  process.exit(1);
}
