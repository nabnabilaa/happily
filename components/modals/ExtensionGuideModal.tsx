import React, { useState, useEffect } from 'react';
import HPCard from '@/components/ui/HPCard';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';
import BeeMascot from '@/components/ui/BeeMascot';

interface ExtensionGuideModalProps {
  onClose: () => void;
}

export default function ExtensionGuideModal({ onClose }: ExtensionGuideModalProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'FB_EXTENSION_INSTALLED') {
        setIsExtensionInstalled(true);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Check if property is set globally in case message was sent before React mounted
    if (typeof window !== 'undefined' && (window as any).__FB_EXTENSION_INSTALLED) {
      setIsExtensionInstalled(true);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="hp-modal-overlay" onClick={onClose} style={{ zIndex: 9999, backdropFilter: 'blur(12px)', background: 'rgba(15, 31, 51, 0.4)' }}>
      <div 
        className="hp-modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          padding: 0, 
          width: '90%',
          maxWidth: 480, 
          fontFamily: HP_FONT,
          background: HP_TOKENS.card,
          overflow: 'hidden',
          borderRadius: 24,
          boxShadow: '0 24px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          animation: 'hpPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Header Hero Area */}
        <div style={{
          background: `${HP_TOKENS.yellowWash}`,
          padding: '40px 24px 32px',
          position: 'relative',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12
        }}>
          {/* Decorative blur elements */}
          <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(30px)' }} />
          <div style={{ position: 'absolute', left: -20, bottom: -40, width: 100, height: 100, background: 'rgba(0,0,0,0.03)', borderRadius: '50%', filter: 'blur(20px)' }} />
          
          <button 
            onClick={onClose}
            className="hp-tap"
            style={{ 
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              width: 32, height: 32, borderRadius: 16, background: 'rgba(0,0,0,0.04)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(10px)', color: HP_TOKENS.inkSoft,
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = HP_TOKENS.ink; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = HP_TOKENS.inkSoft; }}
          >
            <HPGlyph name="x" size={16} />
          </button>

          <div style={{ position: 'relative', zIndex: 1, marginBottom: 8 }}>
            <BeeMascot mood="happy" size={80} />
          </div>
          
          <h2 style={{ ...HP_TEXT.h, fontSize: 26, color: HP_TOKENS.ink, position: 'relative', zIndex: 1, letterSpacing: -0.5, margin: 0 }}>
            Pasang Flowbuddy
          </h2>
          <p style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, position: 'relative', zIndex: 1, margin: 0, fontSize: 14, maxWidth: '85%' }}>
            Hubungkan ruang kerjamu dengan ekstensi Chrome untuk pengalaman fokus maksimal.
          </p>
        </div>

        {/* Content Area */}
        <div style={{ padding: '32px 24px', background: HP_TOKENS.paper, flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {isExtensionInstalled ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', textAlign: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, background: HP_TOKENS.sageWash, color: HP_TOKENS.sage, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <HPGlyph name="check" size={32} stroke={3} />
              </div>
              <h3 style={{ ...HP_TEXT.h, fontSize: 20, color: HP_TOKENS.ink, margin: 0 }}>Ekstensi Terpasang!</h3>
              <p style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, fontSize: 15, margin: 0, maxWidth: 300 }}>
                Bagus sekali! Flowbuddy sudah aktif di browser kamu. Silakan tutup modal ini.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <StepItem 
                num={1}
                isHovered={hoveredStep === 1}
                onHover={() => setHoveredStep(1)}
                onLeave={() => setHoveredStep(null)}
                icon="arrowDown"
                title="Unduh File"
                text={<>Klik tombol di bawah untuk mendownload <strong>flowbuddy.zip</strong></>}
              />
              <StepItem 
                num={2}
                isHovered={hoveredStep === 2}
                onHover={() => setHoveredStep(2)}
                onLeave={() => setHoveredStep(null)}
                icon="zap"
                title="Extract ZIP"
                text={<><strong>Unzip</strong> / Extract file tersebut ke sebuah folder di komputermu.</>}
              />
              <StepItem 
                num={3}
                isHovered={hoveredStep === 3}
                onHover={() => setHoveredStep(3)}
                onLeave={() => setHoveredStep(null)}
                icon="bee"
                title="Buka Ekstensi Chrome"
                text={
                  <>
                    Buka tab baru, dan paste URL berikut:
                    <div style={{ marginTop: 8, padding: '8px 12px', background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.lineSoft}`, borderRadius: 8, color: HP_TOKENS.yellowDark, fontFamily: 'monospace', fontWeight: 'bold' }}>
                      chrome://extensions/
                    </div>
                  </>
                }
              />
              <StepItem 
                num={4}
                isHovered={hoveredStep === 4}
                onHover={() => setHoveredStep(4)}
                onLeave={() => setHoveredStep(null)}
                icon="target"
                title="Developer Mode"
                text={<>Aktifkan <strong>Developer mode</strong> (Mode Pengembang) di pojok kanan atas.</>}
              />
              <StepItem 
                num={5}
                isHovered={hoveredStep === 5}
                onHover={() => setHoveredStep(5)}
                onLeave={() => setHoveredStep(null)}
                icon="upload"
                title="Load Unpacked"
                text={<>Tarik (drag & drop) folder <strong>flowbuddy</strong> hasil extract tadi ke halaman ekstensi, atau klik tombol <strong>Load unpacked</strong>.</>}
                isLast
              />
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div style={{ padding: '24px', background: HP_TOKENS.card, borderTop: `1px solid ${HP_TOKENS.lineSoft}`, flexShrink: 0 }}>
          {isExtensionInstalled ? (
            <button 
              className="hp-tap"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '16px 24px',
                borderRadius: 16,
                background: HP_TOKENS.ink,
                color: '#fff',
                fontSize: 16,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Lanjutkan
            </button>
          ) : (
            <a 
              href="/flowbuddy.zip" 
              download
              className="hp-tap"
              onClick={() => {
                setTimeout(onClose, 500); // Close after starting download
              }}
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '16px 24px',
                borderRadius: 16,
                background: `${HP_TOKENS.yellowLight}`,
                color: '#fff',
                fontSize: 16,
                fontWeight: 800,
                border: 'none',
                boxShadow: `0 8px 24px ${HP_TOKENS.yellowSoft}`,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <HPGlyph name="arrowDown" size={20} />
              Download ZIP
              
              {/* Shine effect */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '50%',
                height: '100%',
                background: 'transparent, transparent)',
                transform: 'skewX(-20deg)',
                animation: 'hpShine 3s infinite'
              }} />
            </a>
          )}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes hpShine { 0% { left: -100% } 20% { left: 200% } 100% { left: 200% } }
          `}} />
        </div>
      </div>
    </div>
  );
}

function StepItem({ num, title, text, icon, isLast, isHovered, onHover, onLeave }: any) {
  return (
    <div 
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{ 
        display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative',
        padding: '12px 16px', borderRadius: 16,
        background: isHovered ? HP_TOKENS.card : 'transparent',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)' : 'none',
        border: `1px solid ${isHovered ? HP_TOKENS.line : 'transparent'}`,
        transition: 'all 0.2s ease',
        cursor: 'default',
        transform: isHovered ? 'translateX(4px)' : 'none'
      }}
    >
      {/* Connecting Line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 31, top: 44, bottom: -12, width: 2,
          background: isHovered ? HP_TOKENS.yellowSoft : HP_TOKENS.lineSoft,
          transition: 'background 0.2s ease'
        }} />
      )}
      
      <div style={{ 
        width: 34, height: 34, borderRadius: 17, flexShrink: 0,
        background: isHovered ? HP_TOKENS.yellowDark : HP_TOKENS.card, 
        color: isHovered ? '#fff' : HP_TOKENS.inkMute, 
        border: `2px solid ${isHovered ? HP_TOKENS.yellowDark : HP_TOKENS.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: HP_FONT, fontWeight: 900, fontSize: 14,
        boxShadow: `0 0 0 4px ${isHovered ? HP_TOKENS.yellowSoft : HP_TOKENS.paper}, inset 0 0 0 1px ${isHovered ? 'transparent' : HP_TOKENS.line}`,
        transition: 'all 0.2s ease', zIndex: 1
      }}>
        {num}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 6 }}>
        <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
          <HPGlyph name={icon} size={14} color={isHovered ? HP_TOKENS.yellowDark : HP_TOKENS.inkMute} stroke={isHovered ? 2.5 : 2} />
          {title}
        </div>
        <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkFade, lineHeight: 1.5, fontSize: 13 }}>
          {text}
        </div>
      </div>
    </div>
  );
}
