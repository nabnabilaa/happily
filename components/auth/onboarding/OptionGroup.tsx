"use client";

import React from "react";
import { HP_CATEGORICAL, HP_TOKENS, HP_TEXT, Stack, motion, useReducedMotion } from "@/components/ui";
import { OptionRow, OptionTile } from "./OptionCard";
import { useRovingRadio } from "./useRovingRadio";
import type { OnboardingOption } from "@/lib/onboardingUtils";

/**
 * The answers for one step, as a real single-select group.
 *
 * Beyond rendering, it varies the shape: short answer sets become a two-column
 * tile grid, long ones stay a list. Four consecutive steps drawn as the same
 * vertical list is exactly what made the previous flow read as one long form.
 *
 * Selecting deliberately does *not* advance the step. The preview card above
 * updates on every answer, and skipping past that is skipping the only reward
 * the flow offers.
 */

interface Props {
  options: OnboardingOption[];
  selected: string | null;
  onSelect: (label: string) => void;
  /** Id of the heading that labels this group. */
  labelledBy: string;
  /** Override the automatic list/grid choice. */
  shape?: "auto" | "list" | "grid";
  /** Secondary line per option, keyed by label. */
  notes?: Record<string, string>;
}

/** Tiles need short labels to survive two-up at 375px. */
function pickShape(options: OnboardingOption[]): "list" | "grid" {
  if (options.length < 3 || options.length > 8) return "list";
  const longest = options.reduce((n, o) => Math.max(n, o.l.trim().length), 0);
  return longest <= 20 ? "grid" : "list";
}

export default function OptionGroup({
  options,
  selected,
  onSelect,
  labelledBy,
  shape = "auto",
  notes,
}: Props) {
  const reduce = useReducedMotion();
  const labels = React.useMemo(() => options.map((o) => o.l), [options]);
  const { onKeyDown, tabIndex, setRef } = useRovingRadio(labels, selected, onSelect);

  const layout = shape === "auto" ? pickShape(options) : shape;

  if (options.length === 0) {
    return (
      <p style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, margin: 0 }}>
        Belum ada pilihan untuk langkah ini.
      </p>
    );
  }

  const items = options.map((o, i) => {
    const Shape = layout === "grid" ? OptionTile : OptionRow;
    return (
      <motion.div
        key={`${o.l}-${i}`}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: reduce ? 0 : Math.min(i * 0.045, 0.27),
          duration: 0.3,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ minWidth: 0 }}
      >
        <Shape
          label={o.l}
          emoji={o.e}
          accent={HP_CATEGORICAL[i % HP_CATEGORICAL.length]}
          selected={selected === o.l}
          onSelect={() => onSelect(o.l)}
          note={notes?.[o.l]}
          shortcut={i < 9 ? i + 1 : undefined}
          focusable={i === tabIndex}
          innerRef={setRef(i)}
        />
      </motion.div>
    );
  });

  if (layout === "grid") {
    return (
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        onKeyDown={onKeyDown}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(146px, 1fr))",
          gap: 10,
        }}
      >
        {items}
      </div>
    );
  }

  return (
    <Stack gap={2} role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {items}
    </Stack>
  );
}
