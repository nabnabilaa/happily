"use client";

import React from "react";
import {
  HP_TOKENS,
  HP_TEXT,
  HP_CATEGORICAL,
  Row,
  Stack,
  HPGlyph,
  HPInput,
  motion,
  AnimatePresence,
  SPRING,
  useReducedMotion,
} from "@/components/ui";
import { useRovingRadio } from "./useRovingRadio";
import type { DepartmentRow } from "@/lib/onboardingUtils";

/**
 * The department step, rendered as the teams they actually are.
 *
 * This is the one answer with consequences: it is matched back to a real
 * `departments` row and the employee joins that team on the spot â€” team
 * screens, division targets and the manager's roster all follow from it (see
 * `app/api/onboarding/complete/route.ts`). Offering that as a row of anonymous
 * pills, which is what it was, made the most important question in the flow
 * look like the least important.
 *
 * So each option shows the team: headcount, who leads it, and the initials of
 * people already there, straight from `/api/onboarding/departments`. When that
 * data isn't available the card degrades to just the name and still works.
 */

interface Props {
  departments: DepartmentRow[];
  selected: string | null;
  onSelect: (name: string) => void;
  labelledBy: string;
}

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/**
 * Past this many teams, scanning the list costs more than typing three letters.
 * Real deployments sit either side of this: a startup has four departments, a
 * company that has been running a while has a dozen.
 */
const FILTER_THRESHOLD = 8;

export default function DepartmentPicker({ departments, selected, onSelect, labelledBy }: Props) {
  const reduce = useReducedMotion();
  const [query, setQuery] = React.useState("");

  const showFilter = departments.length > FILTER_THRESHOLD;

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, query]);

  // Keyboard navigation follows what is on screen, not the full list â€” arrowing
  // onto a filtered-out team would select something the user cannot see.
  const labels = React.useMemo(() => shown.map((d) => d.name), [shown]);
  const { onKeyDown, tabIndex, setRef } = useRovingRadio(labels, selected, onSelect);

  return (
    <Stack gap={3}>
      {showFilter && (
        <HPInput
          label="Cari divisi"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Ketik untuk menyaring ${departments.length} divisi`}
        />
      )}

      {shown.length === 0 && (
        <p style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, margin: 0 }}>
          Tidak ada divisi yang cocok dengan â€œ{query.trim()}â€.
        </p>
      )}

      <Stack gap={2} role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {shown.map((d, i) => {
        const accent = HP_CATEGORICAL[i % HP_CATEGORICAL.length];
        const isSelected = selected === d.name;
        const count = typeof d.memberCount === "number" ? d.memberCount : null;
        const sample = Array.isArray(d.sample) ? d.sample : [];

        // The count is the honest headline; the manager is a nice-to-have.
        const meta: string[] = [];
        if (count !== null) meta.push(count === 0 ? "Kamu yang pertama" : `${count} orang`);
        if (d.managerName) meta.push(d.managerName);

        return (
          <motion.button
            key={`${d.name}-${i}`}
            ref={setRef(i)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={i === tabIndex ? 0 : -1}
            onClick={() => onSelect(d.name)}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduce ? 0 : Math.min(i * 0.045, 0.27),
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileTap={reduce ? undefined : { scale: 0.985 }}
            whileHover={reduce ? undefined : { x: 3 }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 13,
              textAlign: "left",
              minHeight: 72,
              padding: "12px 14px",
              borderRadius: HP_TOKENS.radiusMd,
              cursor: "pointer",
              background: isSelected ? HP_TOKENS.primaryWash : HP_TOKENS.card,
              border: `1.5px solid ${isSelected ? HP_TOKENS.primary : HP_TOKENS.line}`,
              color: HP_TOKENS.ink,
              transition: "background-color 180ms var(--hp-ease), border-color 180ms var(--hp-ease)",
            }}
          >
            <span
              aria-hidden
              style={{
                flex: "0 0 auto",
                width: 44,
                height: 44,
                borderRadius: HP_TOKENS.radiusSm,
                display: "grid",
                placeItems: "center",
                ...HP_TEXT.sub,
                color: accent,
                background: `color-mix(in srgb, ${accent} 15%, transparent)`,
                border: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
              }}
            >
              {initialsOf(d.name)}
            </span>

            <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  ...HP_TEXT.sub,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {d.name}
              </span>

              {meta.length > 0 && (
                <Row gap={2} align="center" style={{ minWidth: 0 }}>
                  <span
                    style={{
                      ...HP_TEXT.small,
                      color: HP_TOKENS.inkMute,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {meta.join(" Â· ")}
                  </span>

                  {sample.length > 0 && <Faces names={sample} extra={(count ?? 0) - sample.length} />}
                </Row>
              )}
            </Stack>

            <span
              style={{
                flex: "0 0 auto",
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                border: `1.5px solid ${isSelected ? "transparent" : HP_TOKENS.border}`,
                background: isSelected ? HP_TOKENS.primary : "transparent",
              }}
            >
              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.span
                    key="tick"
                    initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                    animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={SPRING}
                    style={{ display: "grid", placeItems: "center" }}
                  >
                    <HPGlyph name="check" size={13} color={HP_TOKENS.onPrimary} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </motion.button>
        );
      })}
      </Stack>
    </Stack>
  );
}

/**
 * Overlapping initials of people already in the team. Decorative â€” the
 * headcount next to it carries the same information as text, so this is hidden
 * from assistive tech rather than read out as a list of strangers' initials.
 */
function Faces({ names, extra }: { names: string[]; extra: number }) {
  return (
    <span aria-hidden style={{ display: "inline-flex", flex: "0 0 auto", paddingLeft: 4 }}>
      {names.map((n, i) => (
        <span
          key={`${n}-${i}`}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            marginLeft: i === 0 ? 0 : -7,
            display: "grid",
            placeItems: "center",
            fontSize: 9,
            fontWeight: 700,
            color: HP_TOKENS.inkSoft,
            background: HP_TOKENS.sunken,
            border: `1.5px solid ${HP_TOKENS.card}`,
          }}
        >
          {initialsOf(n)}
        </span>
      ))}
      {extra > 0 && (
        <span
          style={{
            height: 20,
            marginLeft: 4,
            display: "grid",
            placeItems: "center",
            ...HP_TEXT.tiny,
            color: HP_TOKENS.inkMute,
          }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
