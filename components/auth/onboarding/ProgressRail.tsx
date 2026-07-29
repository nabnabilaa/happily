"use client";

import React from "react";
import { HP_TOKENS, Row, motion, useReducedMotion } from "@/components/ui";

/**
 * Where-am-I rail, shown on every answering stage.
 *
 * Segments rather than one continuous bar: seeing how many questions are left
 * is the thing that actually reduces drop-off, and "3 of 5" is a promise a
 * single sliding bar can't make.
 *
 * Completed segments stay filled, the current one fills part-way, upcoming ones
 * stay empty. All three states are a `scaleX` on a child, so the rail animates
 * on the compositor and never reflows the header.
 *
 * The counter itself is rendered by the header, not here — it belongs next to
 * the back button where the eye already is.
 */
export default function ProgressRail({
  total,
  current,
}: {
  total: number;
  /** 0-indexed position of the stage currently on screen. */
  current: number;
}) {
  const reduce = useReducedMotion();

  return (
    <Row
      gap={1}
      align="center"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={Math.min(total, current + 1)}
      aria-label={`Langkah ${Math.min(total, current + 1)} dari ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: HP_TOKENS.radiusPill,
            background: HP_TOKENS.sunken,
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={false}
            animate={{ scaleX: i < current ? 1 : i === current ? 0.5 : 0 }}
            transition={reduce ? { duration: 0.01 } : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: "100%",
              borderRadius: HP_TOKENS.radiusPill,
              // The current step reads as "in progress", finished ones as done.
              background: i < current ? HP_TOKENS.primary : HP_TOKENS.primaryDark,
              transformOrigin: "left",
            }}
          />
        </div>
      ))}
    </Row>
  );
}
