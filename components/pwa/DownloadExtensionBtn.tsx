'use client';

import HPGlyph from '@/components/ui/HPGlyph';
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
        padding: '12px 16px',
        borderRadius: 14,
        background: 'var(--hp-yellow)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease',
        boxShadow: isHovered ? '0 4px 12px var(--hp-yellow-soft)' : 'none',
        fontWeight: 800,
        fontSize: 13
      }}
    >
      <HPGlyph name="sparkle" size={18} stroke={2.5} color="#fff" />
      <span>Download Extension</span>
    </button>
  );
}
