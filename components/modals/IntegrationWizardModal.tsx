"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface IntegrationWizardModalProps {
  onClose: () => void;
}

export default function IntegrationWizardModal({ onClose }: IntegrationWizardModalProps) {
  const { user } = useHP();
  const [copiedGCal, setCopiedGCal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // In production, this would be fetched from the backend (the secure token from db)
  // For now, we mock the secure token hash calculation for display.
  const secureToken = "a1b2c3d4e5f6g7h8"; // Placeholder
  
  // Need the origin for absolute URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const gcalUrl = `${origin}/api/calendar/sync/${user?.id}?token=${secureToken}`;
  const extensionToken = `${user?.id}::${secureToken}`;

  const copyToClipboard = async (text: string, type: 'gcal' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'gcal') {
        setCopiedGCal(true);
        setTimeout(() => setCopiedGCal(false), 2000);
      } else {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      }
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  return (
    <Modal onClose={onClose} title="Integrasi Eksternal 🔌">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
        
        {/* Chrome Extension */}
        <div style={{ 
          background: HP_TOKENS.card, 
          border: `1.5px solid ${HP_TOKENS.line}`, 
          borderRadius: 16, 
          padding: 20 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: 12, 
              background: HP_TOKENS.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <HPGlyph name="zap" size={20} color={HP_TOKENS.blue} />
            </div>
            <div>
              <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Flowbee Chrome Extension</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>Sinkronisasi kebiasaan & blokir web distraksi</div>
            </div>
          </div>
          
          <div style={{ ...HP_TEXT.body, fontSize: 13, marginBottom: 16, color: HP_TOKENS.inkMute }}>
            Gunakan token di bawah ini untuk menghubungkan ekstensi browser dengan akun Anda. Paste token ini di halaman pengaturan ekstensi.
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              readOnly
              value={extensionToken}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12, border: `1px solid ${HP_TOKENS.line}`,
                fontFamily: 'monospace', fontSize: 14, outline: 'none', background: '#F8FAFC', color: HP_TOKENS.ink
              }}
            />
            <button 
              onClick={() => copyToClipboard(extensionToken, 'token')}
              style={{
                padding: '0 20px', borderRadius: 12, background: copiedToken ? HP_TOKENS.sage : HP_TOKENS.ink,
                color: '#fff', border: 'none', fontFamily: HP_FONT, fontWeight: 700, cursor: 'pointer', transition: '0.2s'
              }}
              className="hp-tap"
            >
              {copiedToken ? "Disalin!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Google Calendar Sync */}
        <div style={{ 
          background: HP_TOKENS.card, 
          border: `1.5px solid ${HP_TOKENS.line}`, 
          borderRadius: 16, 
          padding: 20 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: 12, 
              background: HP_TOKENS.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <HPGlyph name="calendar" size={20} color={HP_TOKENS.coral} />
            </div>
            <div>
              <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Google Calendar Sync</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>Langganan iCal Satu Arah (Read-only)</div>
            </div>
          </div>
          
          <div style={{ ...HP_TEXT.body, fontSize: 13, marginBottom: 16, color: HP_TOKENS.inkMute }}>
            Copy URL di bawah dan tambahkan ke Google Calendar menggunakan opsi <strong>"From URL"</strong>.
            Event dari Flowbee (rapat 1-on-1, time-blocking) akan otomatis muncul.
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              readOnly
              value={gcalUrl}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12, border: `1px solid ${HP_TOKENS.line}`,
                fontFamily: 'monospace', fontSize: 13, outline: 'none', background: '#F8FAFC', color: HP_TOKENS.ink
              }}
            />
            <button 
              onClick={() => copyToClipboard(gcalUrl, 'gcal')}
              style={{
                padding: '0 20px', borderRadius: 12, background: copiedGCal ? HP_TOKENS.sage : HP_TOKENS.ink,
                color: '#fff', border: 'none', fontFamily: HP_FONT, fontWeight: 700, cursor: 'pointer', transition: '0.2s'
              }}
              className="hp-tap"
            >
              {copiedGCal ? "Disalin!" : "Copy"}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
