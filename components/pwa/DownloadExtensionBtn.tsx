'use client';

import HPGlyph from '@/components/ui/HPGlyph';
import { HP_TOKENS } from '@/lib/constants';
import { useState, useEffect } from 'react';
import { useHP } from '@/lib/HPContext';

export default function DownloadExtensionBtn() {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, loading } = useHP();

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (loading || !user || isMobile) return null;

  return (
    <button
      onClick={() => {
        window.dispatchEvent(new CustomEvent('hp_open_extension_guide'));
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="hp-tap"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        minHeight: 44,
        padding: '12px 16px',
        borderRadius: HP_TOKENS.radiusPill,
        // White on honey is about 1.8:1 — unreadable. Honey carries dark ink,
        // the way every other yellow surface in the app does.
        background: isHovered ? HP_TOKENS.yellow : HP_TOKENS.yellowSoft,
        color: HP_TOKENS.yellowDark,
        border: '1px solid transparent',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'background-color 180ms var(--hp-ease)',
        fontWeight: 650,
        fontSize: 13,
      }}
    >
      <HPGlyph name="sparkle" size={17} stroke={2.2} color="currentColor" />
      <span>Download Extension</span>
    </button>
  );
}
