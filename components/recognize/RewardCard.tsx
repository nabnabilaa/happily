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
  isWishlist?: boolean;
  onToggleWishlist?: (e: React.MouseEvent) => void;
  onRedeem?: () => void;
}

const TONE_CONFIG: Record<string, any> = {
  blue:   { bg: HP_TOKENS.primaryWash,   accent: HP_TOKENS.primary,   text: '#00558A', glow: 'rgba(77,168,218,0.12)' },
  yellow: { bg: HP_TOKENS.primaryWash,   accent: HP_TOKENS.primary,   text: '#00558A', glow: 'rgba(77,168,218,0.12)' },
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

export default function RewardCard({ title, points, tone, glyph, isWishlist, onToggleWishlist, onRedeem }: RewardCardProps) {
  const { state, updateState, updateUser, user, notify } = useHP();
  const cfg = TONE_CONFIG[tone] || TONE_CONFIG.blue;
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ 
            width: 50, height: 50, borderRadius: 16, 
            background: isLocked ? HP_TOKENS.paper : HP_TOKENS.paper,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isLocked ? 'inset 0 2px 4px rgba(0,0,0,0.05)' : '0 6px 12px rgba(26,29,35,0.08)',
            border: isLocked ? `1.5px solid ${HP_TOKENS.lineSoft}` : 'none'
          }}>
            <HPGlyph name={isLocked ? "lock" : icon} size={26} color={isLocked ? HP_TOKENS.inkFade : cfg.accent} />
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 12,
            background: isLocked ? HP_TOKENS.lineSoft : cfg.accent,
            color: isLocked ? HP_TOKENS.inkMute : HP_TOKENS.paper,
            fontFamily: HP_FONT, fontWeight: 900, fontSize: 13,
            letterSpacing: 0.5,
            boxShadow: isLocked ? 'none' : '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFEC99, #FFD43B)',
              border: '1.5px solid #F59F00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(245, 159, 0, 0.3)',
              filter: isLocked ? 'grayscale(100%) opacity(0.6)' : 'none'
            }}>
              <HPGlyph name="star" size={8} color="#E67700" />
            </div>
            {points.toLocaleString()} <span style={{ opacity: 0.9, fontWeight: 800 }}>poin</span>
          </div>
          
          {onToggleWishlist && (
            <div 
              onClick={onToggleWishlist}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isWishlist ? '#FFD43B' : HP_TOKENS.paper,
                border: `1.5px solid ${isWishlist ? '#FCC419' : HP_TOKENS.lineSoft}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isWishlist ? '0 4px 10px rgba(252, 196, 25, 0.3)' : 'none'
              }}
              title={isWishlist ? "Hapus dari Wishlist" : "Jadikan Wishlist"}
              className="hp-tap"
            >
              <HPGlyph name="star" size={16} color={isWishlist ? '#fff' : HP_TOKENS.inkFade} />
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ 
          ...HP_TEXT.h, fontSize: 16, color: isLocked ? HP_TOKENS.inkMute : cfg.text, 
          lineHeight: 1.3, marginBottom: 8, minHeight: 44, display: 'flex', alignItems: 'center'
        }}>
          {title}
        </div>
        
        {isLocked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontWeight: 700 }}>Progres Kamu</span>
              <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, fontWeight: 800 }}>{points - userCoins} poin lagi!</span>
            </div>
            <div style={{ width: '100%', height: 8, background: HP_TOKENS.lineSoft, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (userCoins / points) * 100)}%`, height: '100%', background: HP_TOKENS.inkFade, borderRadius: 4, transition: 'width 0.5s ease-out' }} />
            </div>
          </div>
        ) : (
          <button style={{ 
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
            background: cfg.accent, color: '#fff', border: 'none', borderRadius: 14,
            padding: '12px', fontWeight: 800, fontSize: 13, fontFamily: HP_FONT,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: `0 4px 12px ${cfg.glow}`
          }}
          className="hp-tap"
          >
            Tukar Sekarang
            <HPGlyph name="sparkle" size={14} color="#fff" />
          </button>
        )}
      </div>
    </div>
  );
}
