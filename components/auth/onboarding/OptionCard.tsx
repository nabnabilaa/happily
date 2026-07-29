"use client";

import React from "react";
import {
  HP_TOKENS,
  HP_TEXT,
  HPGlyph,
  motion,
  AnimatePresence,
  SPRING,
  useReducedMotion,
} from "@/components/ui";

/**
 * One answer in an onboarding step, in the two shapes the flow uses.
 *
 * `OptionRow` is the list shape — full width, badge, label, tick. `OptionTile`
 * is the grid shape, for steps whose answers are short enough to sit two to a
 * line. Having both is not decoration: four consecutive steps rendered as the
 * same vertical list is what made the old flow feel like one long form, and
 * `OptionGroup` picks between them per step.
 *
 * Both are `role="radio"` and expect a parent `role="radiogroup"`, with focus
 * managed by the group (roving tabindex) so arrow keys move between answers the
 * way a radio group is supposed to.
 *
 * The badge colour comes from `HP_CATEGORICAL` by position, so the whole set
 * reads as one family in both themes. The old per-option background hex
 * (`#EAF4FD`…) is why the list used to look like five different designs and
 * went unreadable in dark mode.
 *
 * `emoji` is HR-authored *content*, not chrome — decorative, hidden from
 * assistive tech, with the label's initial as the fallback.
 */

export interface OptionVisualProps {
  label: string;
  emoji?: string;
  accent: string;
  selected: boolean;
  onSelect: () => void;
  /** Small secondary line, e.g. "12 orang". */
  note?: string;
  /** 1-based keyboard shortcut, shown on pointer devices only. */
  shortcut?: number;
  /** Roving tabindex, owned by `OptionGroup`. */
  focusable?: boolean;
  innerRef?: React.Ref<HTMLButtonElement>;
}

/* ── Shared bits ───────────────────────────────────────────────────── */

function Badge({ emoji, initial, accent, size }: { emoji?: string; initial: string; accent: string; size: number }) {
  return (
    <span
      aria-hidden
      style={{
        flex: "0 0 auto",
        width: size,
        height: size,
        borderRadius: HP_TOKENS.radiusSm,
        display: "grid",
        placeItems: "center",
        fontSize: emoji ? size * 0.48 : size * 0.4,
        fontWeight: 700,
        color: accent,
        background: `color-mix(in srgb, ${accent} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
      }}
    >
      {emoji || initial}
    </span>
  );
}

function Tick({ selected, size = 24 }: { selected: boolean; size?: number }) {
  const reduce = useReducedMotion();
  return (
    <span
      style={{
        flex: "0 0 auto",
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        border: `1.5px solid ${selected ? "transparent" : HP_TOKENS.border}`,
        background: selected ? HP_TOKENS.primary : "transparent",
      }}
    >
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            key="tick"
            initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING}
            style={{ display: "grid", placeItems: "center" }}
          >
            <HPGlyph name="check" size={size * 0.54} color={HP_TOKENS.onPrimary} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function Shortcut({ n }: { n: number }) {
  return (
    <span className="ob-kbd" aria-hidden>
      {n}
    </span>
  );
}

function skin(selected: boolean): React.CSSProperties {
  return {
    background: selected ? HP_TOKENS.primaryWash : HP_TOKENS.card,
    border: `1.5px solid ${selected ? HP_TOKENS.primary : HP_TOKENS.line}`,
    color: HP_TOKENS.ink,
    transition: "background-color 180ms var(--hp-ease), border-color 180ms var(--hp-ease)",
  };
}

/* ── List shape ────────────────────────────────────────────────────── */

export function OptionRow({
  label,
  emoji,
  accent,
  selected,
  onSelect,
  note,
  shortcut,
  focusable = false,
  innerRef,
}: OptionVisualProps) {
  const reduce = useReducedMotion();
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <motion.button
      ref={innerRef}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={focusable ? 0 : -1}
      onClick={onSelect}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      whileHover={reduce ? undefined : { x: 3 }}
      transition={SPRING}
      style={{
        width: "100%",
        minHeight: 62,
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: HP_TOKENS.radiusMd,
        cursor: "pointer",
        ...skin(selected),
      }}
    >
      <Badge emoji={emoji} initial={initial} accent={accent} size={40} />

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ ...HP_TEXT.sub, display: "block" }}>{label}</span>
        {note && (
          <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, display: "block", marginTop: 2 }}>
            {note}
          </span>
        )}
      </span>

      {shortcut !== undefined && !selected && <Shortcut n={shortcut} />}
      <Tick selected={selected} />
    </motion.button>
  );
}

/* ── Grid shape ────────────────────────────────────────────────────── */

export function OptionTile({
  label,
  emoji,
  accent,
  selected,
  onSelect,
  note,
  shortcut,
  focusable = false,
  innerRef,
}: OptionVisualProps) {
  const reduce = useReducedMotion();
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <motion.button
      ref={innerRef}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={focusable ? 0 : -1}
      onClick={onSelect}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      whileHover={reduce ? undefined : { y: -3 }}
      transition={SPRING}
      style={{
        position: "relative",
        width: "100%",
        minHeight: 108,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
        textAlign: "left",
        padding: "13px 14px",
        borderRadius: HP_TOKENS.radiusMd,
        cursor: "pointer",
        ...skin(selected),
      }}
    >
      <div style={{ display: "flex", width: "100%", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <Badge emoji={emoji} initial={initial} accent={accent} size={38} />
        {selected ? <Tick selected size={20} /> : shortcut !== undefined ? <Shortcut n={shortcut} /> : null}
      </div>

      <span style={{ width: "100%", minWidth: 0 }}>
        <span style={{ ...HP_TEXT.sub, display: "block", lineHeight: 1.3 }}>{label}</span>
        {note && (
          <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, display: "block", marginTop: 2 }}>
            {note}
          </span>
        )}
      </span>
    </motion.button>
  );
}

/** Back-compat default export — the list shape is what most steps use. */
export default OptionRow;
