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

  // Store the latest onDismiss in a ref so we can use it in setTimeout without adding it to dependencies
  const onDismissRef = React.useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const handleClose = React.useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVisible(false);
    setTimeout(() => {
      if (onDismissRef.current) onDismissRef.current();
    }, 300);
  }, []);

  useEffect(() => {
    // Trigger animation in
    requestAnimationFrame(() => setVisible(true));
    
    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [handleClose]);

  // `info` and `alert` are not names HPGlyph knows. It answers an unknown name
  // with a faded info-circle instead of throwing, so the info and warning
  // toasts have been drawing a placeholder this whole time and nothing said so.
  const config = {
    success: { color: HP_TOKENS.sageInk, bg: HP_TOKENS.sageWash, icon: 'check' },
    error: { color: HP_TOKENS.coralInk, bg: HP_TOKENS.coralWash, icon: 'zap' },
    info: { color: HP_TOKENS.blue, bg: `${HP_TOKENS.blue}10`, icon: 'alertCircle' },
    warning: { color: HP_TOKENS.yellowInk, bg: HP_TOKENS.yellowWash, icon: 'alertCircle' }
  }[toast.type as 'success' | 'error' | 'info' | 'warning'] || { color: HP_TOKENS.ink, bg: HP_TOKENS.paper, icon: 'alertCircle' };

  return (
    <div style={{
      pointerEvents: 'auto',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      border: `1.5px solid ${config.color}30`,
      borderLeft: `4px solid ${config.color}`,
      padding: '12px 16px',
      borderRadius: HP_TOKENS.radiusMd,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      minWidth: 280,
      maxWidth: 400,
      transform: visible ? 'translateX(0) scale(1)' : 'translateX(50px) scale(0.95)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      cursor: 'pointer'
    }} onClick={() => handleClose()}>
      <div style={{ 
        width: 28, height: 28, borderRadius: HP_TOKENS.radiusSm, background: config.bg,
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
        onClick={handleClose}
        style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', opacity: 0.5 }}
      >
        <span style={{ fontSize: 14, color: HP_TOKENS.inkFade, fontWeight: 700 }}>×</span>
      </button>
    </div>
  );
}
