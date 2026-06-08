import React from 'react';
import HPCard from '@/components/ui/HPCard';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';

interface ExtensionGuideModalProps {
  onClose: () => void;
}

export default function ExtensionGuideModal({ onClose }: ExtensionGuideModalProps) {
  return (
    <div className="hp-modal-overlay" onClick={onClose} style={{ zIndex: 9999, backdropFilter: 'blur(8px)' }}>
      <div 
        className="hp-modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          padding: 0, 
          maxWidth: 500, 
          fontFamily: HP_FONT,
          background: HP_TOKENS.paper,
          overflow: 'hidden'
        }}
      >
        {/* Header Hero Area */}
        <div style={{
          background: `linear-gradient(135deg, ${HP_TOKENS.primary}, #E65A20)`,
          padding: '32px 24px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {/* Decorative blur */}
          <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', filter: 'blur(20px)' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: 16, 
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
            }}>
              <HPGlyph name="sparkle" size={24} color="#fff" />
            </div>
            <button 
              onClick={onClose}
              className="hp-tap"
              style={{ 
                width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.2)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(10px)'
              }}
            >
              <HPGlyph name="x" size={16} color="#fff" />
            </button>
          </div>
          
          <h2 style={{ ...HP_TEXT.h, fontSize: 24, color: '#fff', marginTop: 16, position: 'relative', zIndex: 1, letterSpacing: -0.5 }}>
            Cara Install Extension
          </h2>
          <p style={{ ...HP_TEXT.small, color: 'rgba(255,255,255,0.9)', position: 'relative', zIndex: 1 }}>
            Pasang Flowbuddy ke browsermu secara manual dalam beberapa detik!
          </p>
        </div>

        {/* Content Area */}
        <div style={{ padding: '32px 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <StepItem 
              num={1}
              text={<><strong>Download</strong> file <span style={{ color: HP_TOKENS.primary, fontWeight: 800 }}>focusbuddy-v9.zip</span> melalui tombol di bawah.</>}
            />
            <StepItem 
              num={2}
              text={<><strong>Extract / Unzip</strong> file tersebut ke sebuah folder di komputermu.</>}
            />
            <StepItem 
              num={3}
              text={
                <>
                  Buka Google Chrome, lalu pergi ke URL: <br/>
                  <code style={{ 
                    display: 'inline-block',
                    marginTop: 8,
                    background: HP_TOKENS.lineSoft, 
                    padding: '6px 10px', 
                    borderRadius: 8, 
                    border: `1px solid ${HP_TOKENS.line}`, 
                    fontSize: 13, 
                    color: HP_TOKENS.primary,
                    fontWeight: 700,
                    userSelect: 'all' 
                  }}>chrome://extensions/</code>
                </>
              }
            />
            <StepItem 
              num={4}
              text={<>Aktifkan <strong>Developer mode</strong> (Mode Pengembang) di pojok kanan atas layar.</>}
            />
            <StepItem 
              num={5}
              text={<>Klik tombol <strong>Load unpacked</strong> di kiri atas, lalu pilih folder yang kamu extract tadi.</>}
            />
          </div>
        </div>

        {/* Footer Area */}
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <a 
            href="/focusbuddy-v9.zip"
            download="focusbuddy-v9.zip"
            onClick={onClose}
            className="hp-tap"
            style={{ 
              width: '100%', padding: '18px', borderRadius: 20, 
              background: `linear-gradient(135deg, ${HP_TOKENS.primary}, #E65A20)`,
              color: '#fff', 
              border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 16,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: `0 8px 24px rgba(255, 107, 53, 0.3)`, textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            <HPGlyph name="download" size={20} color="#fff" stroke={2.5} />
            Download File ZIP Sekarang
          </a>
        </div>
      </div>
    </div>
  );
}

function StepItem({ num, text }: { num: number, text: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ 
        width: 32, height: 32, borderRadius: 16, flexShrink: 0,
        background: HP_TOKENS.primarySoft, color: HP_TOKENS.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: HP_FONT, fontWeight: 900, fontSize: 14,
        boxShadow: `inset 0 0 0 1px ${HP_TOKENS.primary}40`
      }}>
        {num}
      </div>
      <div style={{ ...HP_TEXT.base, color: HP_TOKENS.ink, lineHeight: 1.5, paddingTop: 4 }}>
        {text}
      </div>
    </div>
  );
}
