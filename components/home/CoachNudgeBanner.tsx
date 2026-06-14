import React from 'react';
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import BeeMascot from "@/components/ui/BeeMascot";

interface CoachNudgeBannerProps {
  coachNudge: { text: string, type: 'support' | 'warning' | 'cheer' };
  beeMood: 'happy' | 'idle' | 'eating' | 'sad' | 'sleepy' | 'surprised' | 'focus' | 'working' | 'cool' | 'gym' | 'sick';
  openModal: (name: string, props?: any) => void;
}

export default function CoachNudgeBanner({ coachNudge, beeMood, openModal }: CoachNudgeBannerProps) {
  return (
        <div 
          style={{ 
            background: coachNudge.type === 'warning' ? HP_TOKENS.yellowWash : coachNudge.type === 'cheer' ? HP_TOKENS.primaryWash : HP_TOKENS.sageWash,
            border: `1.5px solid ${coachNudge.type === 'warning' ? HP_TOKENS.yellow : coachNudge.type === 'cheer' ? HP_TOKENS.primary : HP_TOKENS.sage}40`,
            borderRadius: 20,
            padding: '16px 20px',
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 20
        }}>
          <div style={{ flexShrink: 0 }}>
            <BeeMascot mood={beeMood as any} size={60} showSpeech="" />
          </div>
          <div 
            onClick={() => openModal('mascot_guide')}
            className="hp-tap"
            style={{ flex: 1, cursor: 'pointer', padding: '4px 0' }}
          >
            <div style={{ ...HP_TEXT.body, fontSize: 13, fontWeight: 800, lineHeight: 1.5, color: HP_TOKENS.ink }}>
              {coachNudge.text}
            </div>
          </div>
        </div>
  );
}
