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
  primary: { bg: HP_TOKENS.primaryWash, accent: HP_TOKENS.primary, text: '#8A2B00', glow: 'rgba(255,107,53,0.15)' },
  blue:   { bg: HP_TOKENS.blueWash,   accent: HP_TOKENS.blue,   text: '#00558A', glow: 'rgba(77,168,218,0.12)' },
  yellow: { bg: HP_TOKENS.yellowWash, accent: HP_TOKENS.yellow, text: '#7A5F10', glow: 'rgba(255,190,11,0.12)' },
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
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 16px', borderRadius: 18,
        background: isLocked ? HP_TOKENS.card : cfg.bg,
        border: `1.5px solid ${HP_TOKENS.line}`,
        boxShadow: isLocked ? 'none' : `0 4px 12px ${cfg.glow}`,
        marginBottom: 16,
        opacity: isLocked ? 0.8 : 1,
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: isLocked ? HP_TOKENS.lineSoft : `${cfg.accent}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2
      }}>
        <HPGlyph name={isLocked ? "lock" : icon} size={28} color={isLocked ? HP_TOKENS.inkFade : cfg.accent} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ ...HP_TEXT.h, fontSize: 15, color: isLocked ? HP_TOKENS.ink : cfg.text }}>{title}</div>
          {onToggleWishlist ? (
            <div 
              onClick={onToggleWishlist}
              style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isWishlist ? '#FFD43B' : HP_TOKENS.paper,
                border: `1.5px solid ${isWishlist ? '#FCC419' : HP_TOKENS.lineSoft}`,
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isWishlist ? '0 4px 10px rgba(252, 196, 25, 0.3)' : '0 2px 5px rgba(0,0,0,0.05)'
              }}
              title={isWishlist ? "Hapus dari Wishlist" : "Jadikan Wishlist"}
              className="hp-tap"
            >
              <HPGlyph name="star" size={16} color={isWishlist ? '#fff' : HP_TOKENS.inkFade} />
            </div>
          ) : <div />}
        </div>
        
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4, fontSize: 12, lineHeight: 1.4 }}>
          {/* Simulated description */}
          {title.includes('Voucher') ? `Voucher digital senilai ${points/20} ribu rupiah.` : `Satu buah ${title.toLowerCase()} eksklusif.`}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 900,
              background: isLocked ? HP_TOKENS.lineSoft : 'linear-gradient(135deg, #FFD43B, #F59F00)', 
              color: isLocked ? HP_TOKENS.inkFade : '#fff', 
              boxShadow: isLocked ? 'none' : '0 4px 10px rgba(245, 159, 0, 0.3)',
              fontFamily: HP_FONT, display: 'flex', alignItems: 'center', gap: 4
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: isLocked ? 'transparent' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HPGlyph name="star" size={8} color={isLocked ? HP_TOKENS.inkFade : "#E67700"} />
              </div>
              {points.toLocaleString()} POIN
            </span>
            <span style={{ fontSize: 10, fontWeight: 900, color: HP_TOKENS.sage }}>
              STOK: 100
            </span>
          </div>

          <button
            onClick={handleRedeem}
            disabled={isLocked}
            style={{
              padding: '10px 16px', borderRadius: 14, border: 'none',
              background: isLocked ? HP_TOKENS.lineSoft : cfg.accent,
              color: isLocked ? HP_TOKENS.inkFade : '#fff',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12,
              cursor: isLocked ? 'default' : 'pointer', transition: 'all 0.2s',
              boxShadow: isLocked ? 'none' : `0 4px 12px ${cfg.glow}`,
              display: 'flex', alignItems: 'center', gap: 6
            }}
            className={isLocked ? "" : "hp-tap"}
          >
            {isLocked ? "Poin Kurang" : "Tukar Sekarang"}
            {!isLocked && <HPGlyph name="sparkle" size={12} color="#fff" />}
          </button>
        </div>
      </div>
    </div>
  );
}
