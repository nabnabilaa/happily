'use client';

import HPGlyph from '@/components/ui/HPGlyph';
import { useState } from 'react';
import { useHP } from '@/lib/HPContext';

export default function DownloadExtensionBtn() {
  const [isHovered, setIsHovered] = useState(false);
  const { user, loading } = useHP();

  if (loading || !user) return null;

  return (
    <button
      onClick={() => {
        window.dispatchEvent(new CustomEvent('hp_open_extension_guide'));
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="hp-install-btn hp-tap"
      style={{
        bottom: 150, // Higher than install button
        textDecoration: 'none',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.2s ease, background 0.2s ease',
        zIndex: 1001,
        background: '#FF6B35',
        color: '#fff',
        border: 'none',
        cursor: 'pointer'
      }}
    >
      <HPGlyph name="sparkle" size={18} stroke={2.5} color="#fff" />
      <span>Download Extension</span>
    </button>
  );
}
