"use client";

import React from "react";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";

type Tone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "honey"
  // legacy names, kept so existing screens keep compiling
  | "sage"
  | "blue"
  | "yellow"
  | "coral"
  | "lavender";

interface HPChipProps {
  children: React.ReactNode;
  tone?: Tone;
  size?: "sm" | "lg";
  /** Border-only treatment. Lower emphasis than the filled default. */
  outline?: boolean;
  /** Leading dot — lets the chip carry status without relying on colour alone. */
  dot?: boolean;
  style?: React.CSSProperties;
}

const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: HP_TOKENS.lineSoft, fg: HP_TOKENS.inkSoft, border: HP_TOKENS.border },
  primary: { bg: HP_TOKENS.primarySoft, fg: HP_TOKENS.primary, border: HP_TOKENS.primary },
  success: { bg: HP_TOKENS.successSoft, fg: HP_TOKENS.success, border: HP_TOKENS.success },
  warning: { bg: HP_TOKENS.warningSoft, fg: HP_TOKENS.warning, border: HP_TOKENS.warning },
  danger: { bg: HP_TOKENS.dangerSoft, fg: HP_TOKENS.danger, border: HP_TOKENS.danger },
  info: { bg: HP_TOKENS.infoSoft, fg: HP_TOKENS.info, border: HP_TOKENS.info },
  honey: { bg: HP_TOKENS.yellowSoft, fg: HP_TOKENS.yellowDark, border: HP_TOKENS.yellow },
  // legacy aliases
  sage: { bg: HP_TOKENS.successSoft, fg: HP_TOKENS.success, border: HP_TOKENS.success },
  blue: { bg: HP_TOKENS.primarySoft, fg: HP_TOKENS.primary, border: HP_TOKENS.primary },
  yellow: { bg: HP_TOKENS.yellowSoft, fg: HP_TOKENS.yellowDark, border: HP_TOKENS.yellow },
  coral: { bg: HP_TOKENS.dangerSoft, fg: HP_TOKENS.danger, border: HP_TOKENS.danger },
  lavender: { bg: HP_TOKENS.infoSoft, fg: HP_TOKENS.info, border: HP_TOKENS.info },
};

export default function HPChip({
  children,
  tone = "neutral",
  size = "sm",
  outline = false,
  dot = false,
  style = {},
}: HPChipProps) {
  const c = TONES[tone] ?? TONES.neutral;
  const sz =
    size === "lg"
      ? { padding: "6px 12px", fontSize: 12.5, gap: 6 }
      : { padding: "4px 9px", fontSize: 11.5, gap: 5 };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: outline ? "transparent" : c.bg,
        color: c.fg,
        border: `1px solid ${outline ? c.border : "transparent"}`,
        borderRadius: HP_TOKENS.radiusPill,
        fontFamily: HP_FONT,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        ...sz,
        ...style,
      }}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "currentColor",
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
