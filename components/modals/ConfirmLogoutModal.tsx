"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";

interface ConfirmLogoutModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmLogoutModal({ onClose, onConfirm }: ConfirmLogoutModalProps) {
  return (
    <Modal onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 0 10px', textAlign: 'center' }}>
        
        {/* Warning Icon Container */}
        <div style={{ 
          width: 72, height: 72, borderRadius: 36, 
          background: HP_TOKENS.coralSoft, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 24px ${HP_TOKENS.coral}20`,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={HP_TOKENS.coral} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>

        {/* Text Details */}
        <div>
          <div style={{ ...HP_TEXT.h, fontSize: 20, color: HP_TOKENS.ink, marginBottom: 8 }}>
            Konfirmasi Keluar Akun
          </div>
          <div style={{ ...HP_TEXT.body, fontSize: 14, color: HP_TOKENS.inkSoft, lineHeight: 1.5, maxWidth: 300 }}>
            Apakah Anda yakin ingin keluar dari akun? Sesi kerja Anda hari ini akan disimpan dengan aman.
          </div>
        </div>

        {/* Buttons */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          <button 
            onClick={onConfirm}
            style={{
              width: '100%', padding: '16px', borderRadius: 16,
              background: HP_TOKENS.coral, color: '#fff',
              border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: `0 8px 20px ${HP_TOKENS.coral}30`
            }}
            className="hp-tap"
          >
            <span>Ya, Keluar Akun</span>
          </button>

          <button 
            onClick={onClose}
            style={{
              width: '100%', padding: '14px', borderRadius: 16,
              background: 'transparent', color: HP_TOKENS.inkMute,
              border: `1.5px solid ${HP_TOKENS.line}`, 
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
              cursor: 'pointer'
            }}
            className="hp-tap"
          >
            Batal
          </button>
        </div>
      </div>
    </Modal>
  );
}
