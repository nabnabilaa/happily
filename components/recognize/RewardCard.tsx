"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface RewardCardProps {
  title: string;
  points: number;
  tone?: string;
  glyph?: string;
  category?: string;
  description?: string;
  index?: number;
  isWishlist?: boolean;
  isFullWidth?: boolean;
  onToggleWishlist?: (e: React.MouseEvent) => void;
  onRedeem?: () => void;
}

// Clean, vibrant solid colors (100% flat solid colors, no gradients)
const PALETTE_LIST = [
  { name: 'orange',  bg: '#EA580C', border: '#C2410C', accent: '#FDBA74', badgeBg: 'rgba(0, 0, 0, 0.25)', text: '#FFFFFF', subtext: 'rgba(255, 255, 255, 0.85)', btnBg: '#FFFFFF', btnText: '#7C2D12' },
  { name: 'purple',  bg: '#7C3AED', border: '#6D28D9', accent: '#A78BFA', badgeBg: 'rgba(0, 0, 0, 0.25)', text: '#FFFFFF', subtext: 'rgba(255, 255, 255, 0.85)', btnBg: '#FFFFFF', btnText: '#4C1D95' },
  { name: 'teal',    bg: '#059669', border: '#047857', accent: '#6EE7B7', badgeBg: 'rgba(0, 0, 0, 0.25)', text: '#FFFFFF', subtext: 'rgba(255, 255, 255, 0.85)', btnBg: '#FFFFFF', btnText: '#064E3B' },
  { name: 'magenta', bg: '#DB2777', border: '#BE185D', accent: '#F472B6', badgeBg: 'rgba(0, 0, 0, 0.25)', text: '#FFFFFF', subtext: 'rgba(255, 255, 255, 0.85)', btnBg: '#FFFFFF', btnText: '#831843' },
  { name: 'blue',    bg: '#2563EB', border: '#1D4ED8', accent: '#60A5FA', badgeBg: 'rgba(0, 0, 0, 0.25)', text: '#FFFFFF', subtext: 'rgba(255, 255, 255, 0.85)', btnBg: '#FFFFFF', btnText: '#1E3A8A' },
  { name: 'amber',   bg: '#D97706', border: '#B45309', accent: '#FDE047', badgeBg: 'rgba(0, 0, 0, 0.25)', text: '#FFFFFF', subtext: 'rgba(255, 255, 255, 0.85)', btnBg: '#FFFFFF', btnText: '#78350F' },
  { name: 'indigo',  bg: '#4F46E5', border: '#4338CA', accent: '#A5B4FC', badgeBg: 'rgba(0, 0, 0, 0.25)', text: '#FFFFFF', subtext: 'rgba(255, 255, 255, 0.85)', btnBg: '#FFFFFF', btnText: '#312E81' },
  { name: 'coral',   bg: '#DC2626', border: '#B91C1C', accent: '#FCA5A5', badgeBg: 'rgba(0, 0, 0, 0.25)', text: '#FFFFFF', subtext: 'rgba(255, 255, 255, 0.85)', btnBg: '#FFFFFF', btnText: '#7F1D1D' }
];

const PALETTE_MAP: Record<string, typeof PALETTE_LIST[0]> = {
  orange:  PALETTE_LIST[0],
  purple:  PALETTE_LIST[1],
  teal:    PALETTE_LIST[2],
  magenta: PALETTE_LIST[3],
  blue:    PALETTE_LIST[4],
  yellow:  PALETTE_LIST[5],
  amber:   PALETTE_LIST[5],
  indigo:  PALETTE_LIST[6],
  coral:   PALETTE_LIST[7],
  pink:    PALETTE_LIST[3],
  sage:    PALETTE_LIST[2],
};

function getPalette(tone?: string, index: number = 0) {
  if (tone && tone !== 'blue' && PALETTE_MAP[tone]) return PALETTE_MAP[tone];
  return PALETTE_LIST[index % PALETTE_LIST.length];
}

// Icon & Emoji mapping dictionary for predefined or newly created rewards
const GLYPH_CONFIG: Record<string, { emoji: string; glyphName: string }> = {
  gift:     { emoji: '🎁', glyphName: 'gift' },
  trophy:   { emoji: '🏆', glyphName: 'trophy' },
  star:     { emoji: '⭐', glyphName: 'star' },
  heart:    { emoji: '❤️', glyphName: 'heart' },
  zap:      { emoji: '⚡', glyphName: 'zap' },
  tree:     { emoji: '🌴', glyphName: 'tree' },
  book:     { emoji: '📚', glyphName: 'book' },
  leaf:     { emoji: '🌿', glyphName: 'leaf' },
  target:   { emoji: '🎯', glyphName: 'target' },
  refresh:  { emoji: '🎓', glyphName: 'refresh' },
  people:   { emoji: '🧘', glyphName: 'people' },
  coffee:   { emoji: '🥤', glyphName: 'sparkle' },
  food:     { emoji: '🍔', glyphName: 'heart' },
  ticket:   { emoji: '🎟️', glyphName: 'star' },
  shirt:    { emoji: '🧥', glyphName: 'trophy' },
  card:     { emoji: '💳', glyphName: 'target' },
  headset:  { emoji: '🎧', glyphName: 'zap' },
  bag:      { emoji: '🛍️', glyphName: 'target' }
};

function resolveAccent(title: string, glyphKey?: string, categoryKey?: string) {
  if (glyphKey && GLYPH_CONFIG[glyphKey]) return GLYPH_CONFIG[glyphKey];

  const t = title.toLowerCase();
  const c = (categoryKey || '').toLowerCase();

  if (t.includes('gofood') || t.includes('makan') || t.includes('lunch') || c.includes('food'))
    return { emoji: '🍔', glyphName: 'heart' };
  if (t.includes('tiket') || t.includes('cinema') || t.includes('bioskop') || c.includes('ticket'))
    return { emoji: '🎟️', glyphName: 'star' };
  if (t.includes('tumbler') || t.includes('kopi') || t.includes('drink'))
    return { emoji: '🥤', glyphName: 'sparkle' };
  if (t.includes('hoodie') || t.includes('baju') || t.includes('kaos'))
    return { emoji: '🧥', glyphName: 'trophy' };
  if (t.includes('tokopedia') || t.includes('wallet') || t.includes('pulsa') || t.includes('voucher'))
    return { emoji: '💳', glyphName: 'target' };
  if (t.includes('headset') || t.includes('audio') || t.includes('bluetooth'))
    return { emoji: '🎧', glyphName: 'zap' };
  if (t.includes('cuti') || t.includes('libur') || t.includes('leave'))
    return { emoji: '🌴', glyphName: 'tree' };
  if (t.includes('donasi') || t.includes('sosial'))
    return { emoji: '🌱', glyphName: 'leaf' };
  if (t.includes('kelas') || t.includes('workshop') || t.includes('kursus'))
    return { emoji: '📚', glyphName: 'book' };
  if (t.includes('wellness') || t.includes('sehat'))
    return { emoji: '🧘', glyphName: 'people' };

  return { emoji: '🎁', glyphName: glyphKey || 'gift' };
}

export default function RewardCard({
  title,
  points,
  tone,
  glyph,
  category,
  description,
  index = 0,
  isWishlist,
  isFullWidth,
  onToggleWishlist,
  onRedeem
}: RewardCardProps) {
  const { state, updateState, updateUser, user, notify } = useHP();
  
  // Pick palette dynamically based on tone or index to ensure adjacent cards have distinct vibrant colors
  const palette = getPalette(tone, index);
  const accentData = resolveAccent(title, glyph, category);

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
          { id: Date.now(), title, points, date: new Date().toLocaleDateString('id-ID'), glyph: accentData.glyphName }
        ]
      }));
      updateUser({ points: (user?.points || 0) - points, coins: (user?.points || 0) - points });
      notify('Reward Ditukar! 🎁', `Kamu berhasil menukarkan ${title}.`, 'success');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: isFullWidth ? 180 : 200,
        padding: '24px 22px 20px',
        borderRadius: 28,
        background: isLocked
          ? '#F1F5F9'
          : palette.bg,
        border: isLocked
          ? `1.5px solid ${HP_TOKENS.line}`
          : `1.5px solid ${palette.border}`,
        boxShadow: isLocked
          ? '0 2px 8px rgba(0, 0, 0, 0.04)'
          : '0 6px 18px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease',
        cursor: isLocked ? 'default' : 'pointer'
      }}
      className={isLocked ? "" : "hp-tap"}
    >

      {/* TOP ROW: Header Title + Right Side Icons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, zIndex: 2 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
          {/* Wishlist Tag */}
          {isWishlist && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 99,
              background: 'rgba(255, 212, 59, 0.3)',
              border: '1px solid rgba(255, 212, 59, 0.7)',
              color: '#FFD43B', fontSize: 10, fontWeight: 900,
              letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase'
            }}>
              <HPGlyph name="star" size={10} color="#FFD43B" />
              Wishlist Kamu
            </div>
          )}

          {/* Short Title (Top Left) */}
          <h3 style={{
            ...HP_TEXT.h,
            fontSize: 17,
            fontWeight: 900,
            color: isLocked ? '#94A3B8' : '#FFFFFF',
            lineHeight: 1.25,
            letterSpacing: '-0.3px',
            margin: 0
          }}>
            {title}
          </h3>

          {/* Short Description (Below Title) */}
          <p style={{
            ...HP_TEXT.small,
            fontSize: 12,
            lineHeight: 1.45,
            color: isLocked ? '#64748B' : 'rgba(255, 255, 255, 0.85)',
            marginTop: 6,
            marginBottom: 0
          }}>
            {description
              ? description
              : title.includes('Voucher')
                ? `Voucher digital senilai ${points / 20} ribu rupiah.`
                : `Satu buah ${title.toLowerCase()} eksklusif.`}
          </p>
        </div>

        {/* TOP RIGHT ICONS: Large 3D Icon Badge & Wishlist Button cleanly side-by-side */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          zIndex: 3
        }}>
          {/* Large 3D Icon Container */}
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background: isLocked ? 'rgba(255,255,255,0.08)' : 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(12px)',
            border: isLocked ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: isLocked ? 'none' : '0 6px 16px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            flexShrink: 0
          }}>
            {isLocked ? (
              <HPGlyph name="lock" size={22} color="rgba(255,255,255,0.4)" />
            ) : (
              <span>{accentData.emoji}</span>
            )}
          </div>

          {/* Wishlist Star Button */}
          {onToggleWishlist && (
            <button
              onClick={onToggleWishlist}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: isWishlist ? '#FFD43B' : 'rgba(0, 0, 0, 0.25)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isWishlist ? '#FCC419' : 'rgba(255, 255, 255, 0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              title={isWishlist ? "Hapus dari Wishlist" : "Jadikan Wishlist"}
            >
              <HPGlyph name="star" size={14} color={isWishlist ? '#000' : 'rgba(255,255,255,0.9)'} />
            </button>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Points Tag + Stock Badge + Action Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 20,
        zIndex: 2,
        flexWrap: 'nowrap'
      }}>
        {/* Left Side: Points Pill & Stok Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'nowrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 12px',
            borderRadius: 99,
            background: isLocked ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(8px)',
            border: isLocked ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255, 255, 255, 0.25)',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.5,
            whiteSpace: 'nowrap'
          }}>
            <HPGlyph name="star" size={12} color={palette.accent} />
            {points.toLocaleString()} <span style={{ opacity: 0.8, fontSize: 10 }}>POIN</span>
          </div>

          <span style={{
            fontSize: 10,
            fontWeight: 800,
            color: isLocked ? '#64748B' : 'rgba(255, 255, 255, 0.85)',
            whiteSpace: 'nowrap',
            background: isLocked ? 'rgba(0,0,0,0.1)' : 'rgba(0, 0, 0, 0.2)',
            padding: '4px 8px',
            borderRadius: 8
          }}>
            STOK: 100
          </span>
        </div>

        {/* Right Side: Action Button */}
        <button
          onClick={handleRedeem}
          disabled={isLocked}
          style={{
            padding: '10px 16px',
            borderRadius: 14,
            border: 'none',
            background: isLocked ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
            color: isLocked ? '#64748B' : '#0F172A',
            fontFamily: HP_FONT,
            fontWeight: 900,
            fontSize: 12,
            cursor: isLocked ? 'default' : 'pointer',
            boxShadow: isLocked ? 'none' : '0 4px 14px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}
        >
          <span>{isLocked ? "Poin Kurang" : "Tukar Sekarang"}</span>
          {!isLocked && <HPGlyph name="sparkle" size={12} color="#0F172A" />}
        </button>
      </div>
    </div>
  );
}


