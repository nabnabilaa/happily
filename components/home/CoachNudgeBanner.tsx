import React from 'react';
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import BeeMascot from "@/components/ui/BeeMascot";

interface CoachNudgeBannerProps {
  coachNudge: { text: string, type: 'support' | 'warning' | 'cheer' };
  beeMood: 'happy' | 'idle' | 'eating' | 'sad' | 'sleepy' | 'surprised' | 'focus' | 'working' | 'cool' | 'gym' | 'sick';
  openModal: (name: string, props?: any) => void;
}

export default function CoachNudgeBanner({ coachNudge, beeMood, openModal }: CoachNudgeBannerProps) {
  const tone =
    coachNudge.type === 'warning' ? HP_TOKENS.warning :
    coachNudge.type === 'cheer'   ? HP_TOKENS.primary :
                                    HP_TOKENS.success;
  const wash =
    coachNudge.type === 'warning' ? HP_TOKENS.warningWash :
    coachNudge.type === 'cheer'   ? HP_TOKENS.primaryWash :
                                    HP_TOKENS.successWash;

  return (
    // No `marginTop` here. This card lives in a `Stack` that owns the vertical
    // rhythm; the old local 16px stacked on top of the stack's own 16px and,
    // together with the gauge's `marginBottom: 20`, opened a 52px hole between
    // the wellbeing card and this one.
    <div
      style={{
        background: wash,
        border: `1.5px solid ${tone}40`,
        borderRadius: HP_TOKENS.radius,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <BeeMascot mood={beeMood as any} size={60} showSpeech="" />
      </div>
      <div
        onClick={() => openModal('mascot_guide')}
        className="hp-tap"
        style={{ flex: 1, cursor: 'pointer', padding: '4px 0' }}
      >
        <div style={{ ...HP_TEXT.bodyStrong, fontSize: 13, lineHeight: 1.5, color: HP_TOKENS.ink }}>
          {coachNudge.text}
        </div>
      </div>
    </div>
  );
}
