"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import BeeMascot from "@/components/ui/BeeMascot";

interface OvertimePromptModalProps {
  onClose: () => void;
}

export default function OvertimePromptModal({ onClose }: OvertimePromptModalProps) {
  const { updateState } = useHP();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLembur = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    updateState((s: any) => ({ ...s, overtimeStatus: 'overtime' }));
    onClose();
  };

  const handleLupaAbsen = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    updateState((s: any) => ({ ...s, overtimeStatus: 'forgot_clockout' }));
    // Pemicu buka modal clock-out
    window.dispatchEvent(new Event('hp_open_reflect'));
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Cek Jam Kerja 🌙">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
        <BeeMascot mood="sleepy" size={60} showSpeech="Udah lewat jam kerja nih..." />
        <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft, flex: 1 }}>
          Sistem mendeteksi kamu masih membuka aplikasi melewati jam pulang kerjamu. Kamu masih lanjut lembur, atau lupa absen pulang?
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button 
          onClick={handleLembur}
          className="hp-tap"
          disabled={isSubmitting}
          style={{
            width: '100%', padding: '16px', borderRadius: 16,
            background: HP_TOKENS.yellowWash, border: `1.5px solid ${HP_TOKENS.yellow}`,
            color: HP_TOKENS.ink, fontFamily: HP_FONT, fontWeight: 800, fontSize: 14,
            cursor: isSubmitting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 12,
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          <span style={{ fontSize: 24 }}>💪</span>
          <div style={{ textAlign: 'left' }}>
            <div>Masih Lanjut Lembur</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 600 }}>Aku masih ada kerjaan yang harus diselesaikan.</div>
          </div>
        </button>

        <button 
          onClick={handleLupaAbsen}
          className="hp-tap"
          disabled={isSubmitting}
          style={{
            width: '100%', padding: '16px', borderRadius: 16,
            background: HP_TOKENS.sageWash, border: `1.5px solid ${HP_TOKENS.sage}`,
            color: HP_TOKENS.sage, fontFamily: HP_FONT, fontWeight: 800, fontSize: 14,
            cursor: isSubmitting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 12,
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          <span style={{ fontSize: 24 }}>😅</span>
          <div style={{ textAlign: 'left' }}>
            <div>Lupa Absen Pulang</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 600, opacity: 0.8 }}>Aku udah selesai kok, mau tutup hari sekarang.</div>
          </div>
        </button>
      </div>
    </Modal>
  );
}
