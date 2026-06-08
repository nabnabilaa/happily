"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  dark?: boolean;
  noPadding?: boolean;
}

const iconBtnStyle: React.CSSProperties = {
  position: 'relative', 
  width: 40, 
  height: 40, 
  borderRadius: 20, 
  border: 'none',
  background: 'transparent', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  cursor: 'pointer',
};

export default function Modal({ children, onClose, title, dark, noPadding }: ModalProps) {
  return (
    <div 
      className="hp-modal-overlay"
      onClick={onClose} 
    >
      <div 
        className="hp-modal-content"
        onClick={e => e.stopPropagation()} 
        style={{
          background: dark ? '#1D3557' : HP_TOKENS.paper,
        }}
      >
        <div className="hp-modal-handle" style={{ padding: '12px 16px 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ 
            width: 40, 
            height: 5, 
            borderRadius: 100, 
            background: dark ? 'rgba(255,255,255,0.2)' : 'var(--hp-border)' 
          }}/>
        </div>
        {title && (
          <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...HP_TEXT.title, fontSize: 20, color: dark ? '#fff' : HP_TOKENS.ink }}>{title}</div>
            <button 
              onClick={onClose} 
              style={{ 
                ...iconBtnStyle, 
                background: dark ? 'rgba(255,255,255,0.1)' : HP_TOKENS.lineSoft 
              }}
            >
              <HPGlyph name="close" size={18} color={dark ? '#fff' : HP_TOKENS.inkSoft}/>
            </button>
          </div>
        )}
        {!title && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
            <button 
              onClick={onClose} 
              style={{ 
                ...iconBtnStyle, 
                background: dark ? 'rgba(255,255,255,0.1)' : HP_TOKENS.lineSoft 
              }}
            >
              <HPGlyph name="close" size={18} color={dark ? '#fff' : HP_TOKENS.inkSoft}/>
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: noPadding ? 0 : '0 20px 32px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
