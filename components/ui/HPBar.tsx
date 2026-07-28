"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

type Tone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "honey"
  // legacy names
  | "sage"
  | "blue"
  | "yellow"
  | "coral"
  | "lavender"
  | "teal";

interface HPBarProps {
  /** 0–100. Clamped. */
  value: number;
  tone?: Tone;
  height?: number;
  /** Describes what the bar measures, for screen readers. */
  label?: string;
  /** @deprecated flat fills only — gradients muddy the progress read */
  gradient?: boolean;
}

const TONES: Record<Tone, string> = {
  primary: HP_TOKENS.primary,
  success: HP_TOKENS.success,
  warning: HP_TOKENS.warning,
  danger: HP_TOKENS.danger,
  info: HP_TOKENS.info,
  honey: HP_TOKENS.yellow,
  sage: HP_TOKENS.success,
  blue: HP_TOKENS.primary,
  yellow: HP_TOKENS.yellow,
  coral: HP_TOKENS.danger,
  lavender: HP_TOKENS.info,
  teal: HP_TOKENS.success,
};

export default function HPBar({
  value,
  tone = "primary",
  height = 6,
  label,
}: HPBarProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{
        width: "100%",
        height,
        background: HP_TOKENS.sunken,
        borderRadius: HP_TOKENS.radiusPill,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: TONES[tone] ?? HP_TOKENS.primary,
          borderRadius: HP_TOKENS.radiusPill,
          transition: "width 320ms var(--hp-ease-out)",
        }}
      />
    </div>
  );
}
