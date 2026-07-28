"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";

interface InsightCardProps {
  ins: any;
  idx: number;
  onClick?: () => void;
}

/**
 * Tone drives the icon colour only. The card surface stays neutral so a list
 * of insights reads as one list rather than a row of coloured blocks.
 */
const TONES: Record<string, { fg: string; bg: string; glyph: string }> = {
  sage: { fg: HP_TOKENS.success, bg: HP_TOKENS.successSoft, glyph: "sparkle" },
  blue: { fg: HP_TOKENS.primary, bg: HP_TOKENS.primarySoft, glyph: "activity" },
  yellow: { fg: HP_TOKENS.yellowDark, bg: HP_TOKENS.yellowSoft, glyph: "target" },
  coral: { fg: HP_TOKENS.danger, bg: HP_TOKENS.dangerSoft, glyph: "zap" },
  lavender: { fg: HP_TOKENS.info, bg: HP_TOKENS.infoSoft, glyph: "sparkle" },
};

export default function InsightCard({ ins, onClick }: InsightCardProps) {
  const t = TONES[ins.tone] ?? TONES.blue;

  return (
    <HPCard onClick={onClick} padding={15} style={{ borderRadius: HP_TOKENS.radiusMd }}>
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: HP_TOKENS.radiusSm,
            background: t.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <HPGlyph name={ins.glyph ?? t.glyph} size={16} color={t.fg} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...HP_TEXT.sub, fontSize: 14 }}>{ins.title}</div>
          <p style={{ ...HP_TEXT.body, fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>
            {ins.body}
          </p>
        </div>

        {onClick && (
          <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.inkFade} />
        )}
      </div>
    </HPCard>
  );
}
