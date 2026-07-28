"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface AllRewardsModalProps {
  onClose: () => void;
  selected?: number;
}

const TONE_CONFIG: Record<string, any> = {
  blue:   { bg: HP_TOKENS.blueWash,   accent: HP_TOKENS.blue,   text: HP_TOKENS.blue, glow: 'rgba(77,168,218,0.12)' },
  yellow: { bg: HP_TOKENS.yellowWash, accent: HP_TOKENS.yellow, text: HP_TOKENS.yellowDark, glow: 'rgba(255,190,11,0.12)' },
  sage:   { bg: HP_TOKENS.sageWash,   accent: HP_TOKENS.sage,   text: HP_TOKENS.success, glow: 'rgba(74,124,89,0.12)' },
  coral:  { bg: HP_TOKENS.dangerWash,            accent: HP_TOKENS.coral,  text: HP_TOKENS.danger, glow: 'rgba(232,139,125,0.15)' },
  lavender: { bg: HP_TOKENS.lavenderSoft, accent: HP_TOKENS.lavender, text: HP_TOKENS.primary, glow: 'rgba(123,104,238,0.12)' },
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

export default function AllRewardsModal({ onClose, selected }: AllRewardsModalProps) {
  const { state, updateState, updateUser, user, notify } = useHP();
  const [confirmReward, setConfirmReward] = useState<any>(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (selected && state?.rewards && state.rewards.length > 0) {
      const match = state.rewards.find((r: any) => String(r.id) === String(selected));
      if (match) setConfirmReward(match);
    }
  }, [selected, state?.rewards]);

  const [userNotes, setUserNotes] = useState("");

  const executeRedeem = async () => {
    if (!state || !user || !confirmReward) return;
    const reward = confirmReward;
    
    setRedeeming(true);
    try {
      const res = await fetch('/api/rewards/redemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          rewardId: reward.id,
          rewardTitle: reward.title,
          rewardPoints: reward.points,
          rewardType: reward.category,
          userNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        notify('Gagal', data.error || 'Gagal menukar reward', 'error');
        setRedeeming(false);
        onClose();
        return;
      }

      updateState((s: any) => ({
        ...s,
        points: data.pointsRemaining,
        coins: data.pointsRemaining,
        rewards: s.rewards.map((r: any) => r.id === reward.id ? { ...r, stock: r.stock - 1 } : r),
        rewardHistory: [
          ...(s.rewardHistory || []),
          { id: data.id, title: reward.title, points: reward.points, date: new Date().toISOString(), glyph: reward.glyph || 'trophy', status: data.status }
        ]
      }));
      updateUser({ points: data.pointsRemaining, coins: data.pointsRemaining });
      
      notify('Reward Ditukar! 🎁', `Kamu berhasil menukarkan "${reward.title}".`, 'success');
      onClose();
    } catch (e) {
      console.error(e);
      notify('Gagal', 'Gagal menghubungi server.', 'error');
      setRedeeming(false);
    }
  };

  if (!confirmReward) {
    return (
      <Modal title="Tukar Reward" onClose={onClose}>
        <div style={{ padding: 20, textAlign: 'center', color: HP_TOKENS.inkMute }}>
          Memuat data reward...
        </div>
      </Modal>
    );
  }

  const cfg = TONE_CONFIG[confirmReward.tone] || TONE_CONFIG.blue;
  const icon = confirmReward.glyph || GLYPH_MAP[confirmReward.title] || 'sparkle';

  return (
    <Modal title="Konfirmasi Penukaran" onClose={onClose}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', textAlign: 'center'
      }}>
        <div style={{ 
          width: 80, height: 80, borderRadius: HP_TOKENS.radiusLg, 
          background: cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, border: `2px solid ${cfg.accent}30`,
        }}>
          <HPGlyph name={icon} size={40} color={cfg.accent} />
        </div>
        <div style={{ ...HP_TEXT.h, fontSize: 22, marginBottom: 8, color: HP_TOKENS.ink }}>
          Tukar Poin?
        </div>
        <div style={{ ...HP_TEXT.body, marginBottom: 20, lineHeight: 1.6, color: HP_TOKENS.inkMute }}>
          Kamu akan menukarkan <strong style={{ color: HP_TOKENS.ink }}>{confirmReward.points} poin</strong> untuk mendapatkan <br/>
          <strong style={{ color: HP_TOKENS.ink }}>&quot;{confirmReward.title}&quot;</strong>.
        </div>
        
        <div style={{ width: '100%', maxWidth: 300, marginBottom: 24, textAlign: 'left' }}>
          <label style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, marginBottom: 8, display: 'block' }}>
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            placeholder="Misal: Nomor HP untuk isi pulsa..."
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: HP_TOKENS.radiusMd,
              border: `1px solid ${HP_TOKENS.line}`,
              background: HP_TOKENS.paper,
              color: HP_TOKENS.ink,
              fontFamily: HP_FONT,
              fontSize: 14
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 300 }}>
          <button
            onClick={onClose}
            disabled={redeeming}
            style={{
              flex: 1, padding: '14px', borderRadius: HP_TOKENS.radiusMd, border: `1.5px solid ${HP_TOKENS.line}`,
              background: HP_TOKENS.paper, color: HP_TOKENS.inkSoft,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
              cursor: redeeming ? 'default' : 'pointer'
            }}
          >
            Batal
          </button>
          <button
            onClick={executeRedeem}
            disabled={redeeming}
            style={{
              flex: 1, padding: '14px', borderRadius: HP_TOKENS.radiusMd, border: 'none',
              background: cfg.accent, color: '#fff',
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
              cursor: redeeming ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {redeeming ? 'Memproses...' : 'Tukar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
