"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface RewardCardProps {
  title: string;
  points: number;
  tone: "sage" | "yellow" | "blue" | "coral" | "lavender";
  glyph?: string;
  onRedeem?: () => void;
}

const TONE_CONFIG: Record<string, any> = {
  blue:   { bg: HP_TOKENS.blueWash,   accent: HP_TOKENS.blue,   text: '#003399', glow: 'rgba(0,82,204,0.12)' },
  yellow: { bg: HP_TOKENS.yellowWash, accent: HP_TOKENS.yellow, text: '#8A6814', glow: 'rgba(255,215,0,0.15)' },
  sage:   { bg: HP_TOKENS.sageWash,   accent: HP_TOKENS.sage,   text: '#2D5A3D', glow: 'rgba(74,124,89,0.12)' },
  coral:  { bg: '#FEF0ED',            accent: HP_TOKENS.coral,  text: '#8B3A2F', glow: 'rgba(232,139,125,0.15)' },
  lavender: { bg: HP_TOKENS.lavenderSoft, accent: HP_TOKENS.lavender, text: '#4A3A6E', glow: 'rgba(123,104,238,0.12)' },
};

const GLYPH_MAP: Record<string, string> = {
  'Extra cuti 1 hari':     'tree',
  'Voucher lunch 100k':    'heart',
  'Workshop UX intensif':  'book',
  'Donasi program sosial': 'leaf',
  'Tiket bioskop 2x':      'star',
  'Pulsa / e-wallet 50k':  'zap',
  'Voucher belanja 200k':  'target',
  'Kelas online premium':  'refresh',
  'Sesi wellness 1:1':     'people',
};

export default function RewardCard({ title, points, tone, glyph, onRedeem }: RewardCardProps) {
  const { state, updateState, updateUser, user, notify } = useHP();
  const cfg = TONE_CONFIG[tone] || TONE_CONFIG.sage;
  const icon = glyph ?? GLYPH_MAP[title] ?? 'sparkle';

  const userCoins = state?.points ?? 0;
  const isLocked = userCoins < points;

  const handleRedeem = () => {
    if (isLocked) {
      notify('Poin Tidak Cukup', `Kamu butuh ${points - userCoins} poin lagi untuk menukar reward ini.`, 'warning');
      return;
    }

    if (onRedeem) {
      onRedeem();
      return;
    }

    if (!state) return;

    if (confirm(`Tukar ${points} poin dengan "${title}"?`)) {
      updateState((s: any) => ({
        ...s,
        points: s.points - points,
        coins: s.points - points,
        rewardHistory: [
          ...(s.rewardHistory || []),
          { id: Date.now(), title, points, date: new Date().toLocaleDateString('id-ID'), glyph: icon }
        ]
      }));
      updateUser({ points: (user?.points || 0) - points, coins: (user?.points || 0) - points });
      notify('Reward Ditukar! 🎁', `Kamu berhasil menukarkan ${title}.`, 'success');
    }
  };

  return (
    <div
      onClick={handleRedeem}
      style={{
        position: 'relative',
        borderRadius: 24,
        background: isLocked ? HP_TOKENS.paper : cfg.bg,
        border: `1.5px solid ${isLocked ? HP_TOKENS.lineSoft : cfg.accent + '30'}`,
        padding: '16px',
        cursor: isLocked ? 'default' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isLocked ? 0.7 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: isLocked ? 'none' : `0 10px 20px ${cfg.glow}`,
        overflow: 'hidden',
      }}
      className={isLocked ? "" : "hp-tap"}
    >
      {/* Background decoration */}
      <div style={{
        position: 'absolute', right: -10, top: -10, width: 60, height: 60,
        borderRadius: 30, background: isLocked ? HP_TOKENS.lineSoft : `${cfg.accent}15`, zIndex: 0
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div style={{ 
          width: 44, height: 44, borderRadius: 14, 
          background: isLocked ? HP_TOKENS.lineSoft : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isLocked ? 'none' : '0 4px 10px rgba(0,0,0,0.05)'
        }}>
          <HPGlyph name={isLocked ? "lock" : icon} size={22} color={isLocked ? HP_TOKENS.inkFade : cfg.accent} />
        </div>
        
        <div style={{ 
          padding: '4px 10px', borderRadius: 10,
          background: isLocked ? HP_TOKENS.lineSoft : cfg.accent,
          color: isLocked ? HP_TOKENS.inkMute : '#fff',
          fontFamily: HP_FONT, fontWeight: 900, fontSize: 11,
          letterSpacing: 0.5
        }}>
          {points} poin
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ 
          ...HP_TEXT.h, fontSize: 14, color: isLocked ? HP_TOKENS.inkMute : cfg.text, 
          lineHeight: 1.4, marginBottom: 4, height: 40, overflow: 'hidden' 
        }}>
          {title}
        </div>
        
        {isLocked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ flex: 1, height: 4, background: HP_TOKENS.lineSoft, borderRadius: 2 }}>
              <div style={{ width: `${(userCoins / points) * 100}%`, height: '100%', background: HP_TOKENS.inkFade, borderRadius: 2 }} />
            </div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>{points - userCoins} lagi</div>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
            color: cfg.accent, fontWeight: 800, fontSize: 11
          }}>
            <span>Tukar Sekarang</span>
            <HPGlyph name="arrow" size={10} color={cfg.accent} />
          </div>
        )}
      </div>
    </div>
  );
}
