"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { scrollIntoViewSafely } from "@/lib/motion";

interface ManageHabitsModalProps {
  onClose: () => void;
}

export default function ManageHabitsModal({ onClose }: ManageHabitsModalProps) {
  const { state, updateState, notify } = useHP();
  const [newName, setNewName] = useState("");
  const [glyph, setGlyph] = useState("sparkle");
  const [pendingDelete, setPendingDelete] = useState<any>(null);

  const addHabit = () => {
    if (!state || !newName) return;
    const trimmedName = newName.trim();
    if (state.habits?.some((h: any) => h.name.toLowerCase() === trimmedName.toLowerCase())) {
      notify("Kebiasaan Sudah Ada", "Kebiasaan dengan nama tersebut sudah terdaftar.", "warning");
      return;
    }
    const newH = {
      name: trimmedName,
      streak: 0,
      target: 7,
      done: false,
      glyph: glyph,
      created_at: new Date().toISOString(),
    };
    updateState((s: any) => ({
      ...s,
      habits: [...(s.habits || []), newH]
    }));
    setNewName("");
    onClose();
    setTimeout(() => {
      scrollIntoViewSafely(document.getElementById('daily-training-section'), { behavior: 'smooth', block: 'start' });
    }, 300);
  };

  /**
   * Menghapus kebiasaan.
   *
   * Harus lewat servernya. Dulu ini hanya `filter` di state React, dan
   * sinkronisasi blob sengaja tidak pernah menghapus baris habit (lihat
   * app/api/storage/route.ts) — jadi kebiasaan yang "dihapus" muncul lagi
   * begitu halaman dimuat ulang, tanpa satu pun pesan kesalahan.
   */
  const deleteHabit = async (name: string) => {
    try {
      const res = await fetch('/api/habits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify('Gagal menghapus', data.error || 'Coba lagi sebentar lagi.', 'error');
        return;
      }
    } catch (e) {
      notify('Gagal menghapus', 'Koneksi bermasalah. Coba lagi sebentar lagi.', 'error');
      return;
    }

    updateState((s: any) => ({
      ...s,
      habits: (s.habits || []).filter((h: any) => h.name !== name)
    }));
    notify('Kebiasaan dihapus', `"${name}" tidak lagi ada di daftar harianmu.`, 'info');
  };

  if (!state) return null;

  return (
    <Modal onClose={onClose} title="Atur Kebiasaan">
      <div style={{ marginTop: 4 }}>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 12 }}>KEBIASAAN AKTIF</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {state.habits.map((h: any, i: number) => (
            <div 
              key={`${h.name}-${i}`} 
              style={{
                padding: 12, borderRadius: HP_TOKENS.radiusMd, background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
                position: 'relative'
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <HPGlyph name={h.glyph || 'star'} size={20} color={HP_TOKENS.ink} />
              </div>
              <div style={{ ...HP_TEXT.h, fontSize: 13, marginBottom: 2 }}>{h.name}</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sageInk, fontWeight: 700 }}>🔥 {h.streak} hari</div>
              {/* Penghapusan sekarang permanen dan menghanguskan seluruh
                  riwayat streak, jadi ia perlu konfirmasi — sebelumnya satu
                  salah tekan langsung membuangnya tanpa ditanya apa pun. */}
              <button
                onClick={() => setPendingDelete(h)}
                aria-label={`Hapus kebiasaan ${h.name}`}
                style={{
                  position: 'absolute', top: 8, right: 8, background: 'none',
                  border: 'none', cursor: 'pointer', padding: 4
                }}
              >
                <HPGlyph name="close" size={14} color={HP_TOKENS.coralInk}/>
              </button>
            </div>
          ))}
        </div>

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 12 }}>BANGUN KEBIASAAN BARU</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: HP_TOKENS.radius, background: HP_TOKENS.blueWash }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: HP_TOKENS.radiusSm, background: HP_TOKENS.card, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              border: `1.5px solid ${HP_TOKENS.line}`
            }}>
              <HPGlyph name={glyph} size={24} color={HP_TOKENS.ink} />
            </div>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama kebiasaan..."
              style={{
                flex: 1, padding: 14, borderRadius: HP_TOKENS.radiusSm, border: `1.5px solid ${HP_TOKENS.line}`,
                fontFamily: HP_FONT, fontSize: 14, background: HP_TOKENS.card, outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['sparkle', 'leaf', 'heart', 'book', 'activity', 'moon', 'target', 'calendar'].map(g => (
              <button
                key={g}
                onClick={() => setGlyph(g)}
                style={{
                  width: 38, height: 38, borderRadius: HP_TOKENS.radiusSm, border: 'none',
                  background: glyph === g ? HP_TOKENS.ink : '#fff',
                  cursor: 'pointer', transition: '0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <HPGlyph name={g} size={18} color={glyph === g ? '#fff' : HP_TOKENS.ink} />
              </button>
            ))}
          </div>
          <button 
            onClick={addHabit}
            disabled={!newName}
            style={{
              marginTop: 4, padding: 14, borderRadius: HP_TOKENS.radiusSm, border: 'none',
              background: HP_TOKENS.blue, color: HP_TOKENS.onPrimary,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 15, cursor: 'pointer',
              opacity: !newName ? 0.5 : 1
            }}
          >
            Mulai Kebiasaan Baru
          </button>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={`Hapus "${pendingDelete.name}"?`}
          description={
            pendingDelete.streak > 0
              ? `Streak ${pendingDelete.streak} hari dan seluruh riwayat kalendernya ikut hilang, dan tidak bisa dikembalikan. Poin yang sudah kamu kumpulkan tetap aman.`
              : 'Kebiasaan ini akan dihapus permanen dari daftar harianmu.'
          }
          confirmLabel="Ya, hapus"
          tone="danger"
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            await deleteHabit(pendingDelete.name);
            setPendingDelete(null);
          }}
        />
      )}
    </Modal>
  );
}
