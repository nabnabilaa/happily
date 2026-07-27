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

// Clean, elegant soft-tinted palette for minimalist card design
const PALETTE_LIST = [
  { name: 'orange',  bgSoft: '#FFF7ED', borderSoft: '#FFEDD5', accent: '#EA580C' },
  { name: 'purple',  bgSoft: '#F5F3FF', borderSoft: '#DDD6FE', accent: '#7C3AED' },
  { name: 'teal',    bgSoft: '#ECFDF5', borderSoft: '#A7F3D0', accent: '#059669' },
  { name: 'magenta', bgSoft: '#FDF2F8', borderSoft: '#FBCFE8', accent: '#DB2777' },
  { name: 'blue',    bgSoft: '#EFF6FF', borderSoft: '#BFDBFE', accent: '#2563EB' },
  { name: 'amber',   bgSoft: '#FEF3C7', borderSoft: '#FDE68A', accent: '#D97706' },
  { name: 'indigo',  bgSoft: '#EEF2FF', borderSoft: '#C7D2FE', accent: '#4F46E5' },
  { name: 'coral',   bgSoft: '#FEF2F2', borderSoft: '#FCA5A5', accent: '#DC2626' }
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
        minHeight: isFullWidth ? 170 : 190,
        padding: '20px 20px 18px',
        borderRadius: 20,
        background: '#FFFFFF',
        border: isWishlist ? '2px solid #2563EB' : '1px solid #E2E8F0',
        boxShadow: isWishlist ? '0 8px 24px rgba(37, 99, 235, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
        opacity: isLocked ? 0.8 : 1,
        overflow: 'hidden',
        transition: 'all 0.2s ease-in-out',
        cursor: isLocked ? 'default' : 'pointer'
      }}
      className={isLocked ? "" : "hp-tap"}
    >

      {/* TOP ROW: Header Title + Soft Icon Accent */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, zIndex: 2 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
          {/* Wishlist Tag */}
          {isWishlist && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 99,
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#2563EB', fontSize: 10, fontWeight: 800,
              letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase'
            }}>
              <HPGlyph name="star" size={10} color="#2563EB" />
              Wishlist Kamu
            </div>
          )}

          {/* Clean Dark Title */}
          <h3 style={{
            fontFamily: HP_FONT,
            fontSize: 16,
            fontWeight: 800,
            color: isLocked ? '#64748B' : '#0F172A',
            lineHeight: 1.3,
            letterSpacing: '-0.3px',
            margin: 0
          }}>
            {title}
          </h3>

          {/* Subtitle / Description */}
          <p style={{
            fontFamily: HP_FONT,
            fontSize: 12,
            lineHeight: 1.45,
            color: '#64748B',
            marginTop: 4,
            marginBottom: 0
          }}>
            {description
              ? description
              : title.includes('Voucher')
                ? `Voucher digital senilai ${points / 20} ribu rupiah.`
                : `Satu buah ${title.toLowerCase()} eksklusif.`}
          </p>
        </div>

        {/* TOP RIGHT: Icon Badge & Wishlist Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          zIndex: 3
        }}>
          {/* Subtle Soft Icon Badge */}
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: palette.bgSoft,
            border: `1px solid ${palette.borderSoft}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0
          }}>
            {isLocked ? (
              <HPGlyph name="lock" size={18} color="#94A3B8" />
            ) : (
              <span>{accentData.emoji}</span>
            )}
          </div>

          {/* Wishlist Star Button */}
          {onToggleWishlist && (
            <button
              onClick={onToggleWishlist}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: isWishlist ? '#FEF3C7' : '#F8FAFC',
                border: `1px solid ${isWishlist ? '#FDE68A' : '#E2E8F0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              title={isWishlist ? "Hapus dari Wishlist" : "Jadikan Wishlist"}
            >
              <HPGlyph name="star" size={13} color={isWishlist ? '#D97706' : '#94A3B8'} />
            </button>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Points Pill + Stock + Action Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 18,
        paddingTop: 12,
        borderTop: '1px solid #F1F5F9',
        zIndex: 2
      }}>
        {/* Points Pill & Stok Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 12px',
            borderRadius: 99,
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            color: '#2563EB',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.3,
            whiteSpace: 'nowrap'
          }}>
            <HPGlyph name="star" size={12} color="#2563EB" />
            {points.toLocaleString()} <span style={{ fontSize: 10, opacity: 0.8 }}>POIN</span>
          </div>

          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#64748B',
            background: '#F1F5F9',
            padding: '4px 8px',
            borderRadius: 6,
            whiteSpace: 'nowrap'
          }}>
            Stok: 100
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRedeem}
          disabled={isLocked}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: 'none',
            background: isLocked ? '#F1F5F9' : '#2563EB',
            color: isLocked ? '#94A3B8' : '#FFFFFF',
            fontFamily: HP_FONT,
            fontWeight: 800,
            fontSize: 12,
            cursor: isLocked ? 'default' : 'pointer',
            boxShadow: isLocked ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.22)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}
        >
          <span>{isLocked ? "Poin Kurang" : "Tukar Sekarang"}</span>
          {!isLocked && <HPGlyph name="sparkle" size={12} color="#FFFFFF" />}
        </button>
      </div>
    </div>
  );
}



