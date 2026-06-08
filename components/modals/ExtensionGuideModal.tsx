'use client';

import React from 'react';
import HPCard from '@/components/ui/HPCard';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';

interface ExtensionGuideModalProps {
  onClose: () => void;
}

export default function ExtensionGuideModal({ onClose }: ExtensionGuideModalProps) {
  return (
    <div className="hp-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="hp-modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ padding: 24, maxWidth: 500, fontFamily: HP_FONT }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: 12, 
              background: HP_TOKENS.primarySoft, display: 'flex', 
              alignItems: 'center', justifyContent: 'center' 
            }}>
              <HPGlyph name="sparkle" size={20} color={HP_TOKENS.primary} />
            </div>
            <h2 style={{ ...HP_TEXT.h, fontSize: 20 }}>Cara Install Extension</h2>
          </div>
          <button 
            onClick={onClose}
            className="hp-tap"
            style={{ 
              width: 32, height: 32, borderRadius: 16, background: HP_TOKENS.lineSoft,
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <HPGlyph name="x" size={16} color={HP_TOKENS.inkSoft} />
          </button>
        </div>

        <HPCard padding={16} style={{ marginBottom: 24, background: HP_TOKENS.lineSoft, border: 'none' }}>
          <p style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
            Karena extension ini belum dipublikasikan di Chrome Web Store, kamu perlu menginstalnya secara manual (Developer Mode). Ikuti langkah-langkah mudah berikut:
          </p>

          <ol style={{ 
            ...HP_TEXT.small, color: HP_TOKENS.ink, lineHeight: 1.6, paddingLeft: 20, 
            display: 'flex', flexDirection: 'column', gap: 8 
          }}>
            <li>
              <strong>Download</strong> file <span style={{ color: HP_TOKENS.primary, fontWeight: 700 }}>focusbuddy-v9.zip</span> melalui tombol di bawah.
            </li>
            <li>
              <strong>Extract/Unzip</strong> file tersebut ke sebuah folder di komputermu.
            </li>
            <li>
              Buka Google Chrome, lalu pergi ke URL: <br/>
              <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 6, border: `1px solid ${HP_TOKENS.line}`, fontSize: 13, userSelect: 'all' }}>chrome://extensions/</code>
            </li>
            <li>
              Aktifkan <strong>Developer mode</strong> (Mode Pengembang) di pojok kanan atas.
            </li>
            <li>
              Klik tombol <strong>Load unpacked</strong> (Muat yang tidak dibuka) di kiri atas, lalu pilih folder hasil extract tadi.
            </li>
            <li>
              Selesai! ✨ Extension Flowbuddy kini sudah aktif di browsermu.
            </li>
          </ol>
        </HPCard>

        <a 
          href="/focusbuddy-v9.zip"
          download="focusbuddy-v9.zip"
          onClick={onClose}
          className="hp-tap"
          style={{ 
            width: '100%', padding: '16px', borderRadius: 100, 
            background: HP_TOKENS.primary, color: '#fff', 
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 4px 16px ${HP_TOKENS.primary}40`, textDecoration: 'none'
          }}
        >
          <HPGlyph name="download" size={20} color="#fff" />
          Download File ZIP Sekarang
        </a>
      </div>
    </div>
  );
}
