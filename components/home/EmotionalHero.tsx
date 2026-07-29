"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";

interface EmotionalHeroProps {
  state: any;
  moodObj?: any;
  energyObj?: any;
  onOpenCheckIn: () => void;
  showMidDay?: boolean;
  onOpenMidDay?: () => void;
}

/** Maps a mood tone onto the semantic palette. */
const MOOD_TONE: Record<string, { fg: string; bg: string }> = {
  yellow: { fg: HP_TOKENS.yellowDark, bg: HP_TOKENS.yellowSoft },
  sage: { fg: HP_TOKENS.success, bg: HP_TOKENS.successSoft },
  neutral: { fg: HP_TOKENS.inkSoft, bg: HP_TOKENS.sunken },
  blue: { fg: HP_TOKENS.primary, bg: HP_TOKENS.primarySoft },
  coral: { fg: HP_TOKENS.danger, bg: HP_TOKENS.dangerSoft },
};

export default function EmotionalHero({
  state,
  moodObj,
  energyObj,
  onOpenCheckIn,
}: EmotionalHeroProps) {
  const checkedIn = Boolean(moodObj && energyObj);
  const tone = MOOD_TONE[moodObj?.tone as string] ?? MOOD_TONE.neutral;

  return (
    <HPCard
      onClick={onOpenCheckIn}
      padding={18}
      ariaLabel={checkedIn ? `Kondisi saat ini: ${moodObj.label}. Ubah check-in` : "Mulai check-in harian"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          aria-hidden
          style={{
            width: 52,
            height: 52,
            borderRadius: HP_TOKENS.radiusMd,
            flexShrink: 0,
            background: checkedIn ? tone.bg : HP_TOKENS.yellowSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HPGlyph
            name={checkedIn ? moodObj.glyph : "sparkle"}
            size={24}
            color={checkedIn ? tone.fg : HP_TOKENS.yellowDark}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...HP_TEXT.tiny }}>
            {checkedIn ? "Kondisi saat ini" : "Check-in harian"}
          </div>

          <div style={{ ...HP_TEXT.h, fontSize: 17, marginTop: 3 }}>
            {checkedIn ? moodObj.label : "Bagaimana perasaan Anda?"}
          </div>

          {checkedIn ? (
            <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 9px",
                  borderRadius: HP_TOKENS.radiusPill,
                  background: HP_TOKENS.sunken,
                  color: HP_TOKENS.inkSoft,
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                <HPGlyph name="zap" size={11} color="currentColor" />
                {energyObj.label}
              </span>
              {state?.tag && (
                <span
                  style={{
                    padding: "4px 9px",
                    borderRadius: HP_TOKENS.radiusPill,
                    background: HP_TOKENS.sunken,
                    color: HP_TOKENS.inkSoft,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  #{state.tag}
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginTop: 7,
                color: HP_TOKENS.primaryInk,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Mulai check-in
              <HPGlyph name="arrow" size={13} color="currentColor" />
            </div>
          )}
        </div>

        <HPGlyph name="chevronRight" size={18} color={HP_TOKENS.inkFade} />
      </div>
    </HPCard>
  );
}
