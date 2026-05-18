"use client";

import React, { useEffect, useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "./HPGlyph";

export default function HPToastContainer() {
  const { toasts, dismissToast } = useHP();

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: any, onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animation in
    requestAnimationFrame(() => setVisible(true));
    
    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade out animation
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const config = {
    success: { color: HP_TOKENS.sage, bg: HP_TOKENS.sageWash, icon: 'check' },
    error: { color: HP_TOKENS.coral, bg: HP_TOKENS.coralWash, icon: 'zap' },
    info: { color: HP_TOKENS.blue, bg: `${HP_TOKENS.blue}10`, icon: 'info' },
    warning: { color: HP_TOKENS.yellow, bg: HP_TOKENS.yellowWash, icon: 'alert' }
  }[toast.type as 'success' | 'error' | 'info' | 'warning'] || { color: HP_TOKENS.ink, bg: HP_TOKENS.paper, icon: 'info' };

  return (
    <div style={{
      pointerEvents: 'auto',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      border: `1.5px solid ${config.color}30`,
      borderLeft: `4px solid ${config.color}`,
      padding: '12px 16px',
      borderRadius: 14,
      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      minWidth: 280,
      maxWidth: 400,
      transform: visible ? 'translateX(0) scale(1)' : 'translateX(50px) scale(0.95)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      cursor: 'pointer'
    }} onClick={() => setVisible(false)}>
      <div style={{ 
        width: 28, height: 28, borderRadius: 10, background: config.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <HPGlyph name={config.icon} size={14} color={config.color} />
      </div>
      <div style={{ flex: 1, marginTop: 2 }}>
        <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.ink, lineHeight: 1.2 }}>{toast.title}</div>
        {toast.message && (
          <div style={{ ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.inkMute, marginTop: 4 }}>
            {toast.message}
          </div>
        )}
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); setVisible(false); }}
        style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', opacity: 0.5 }}
      >
        <span style={{ fontSize: 14, color: HP_TOKENS.inkFade, fontWeight: 900 }}>×</span>
      </button>
    </div>
  );
}
