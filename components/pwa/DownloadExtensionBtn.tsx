'use client';

import HPGlyph from '@/components/ui/HPGlyph';
import { useState } from 'react';

export default function DownloadExtensionBtn() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href="/focusbuddy-v9.zip"
      download="focusbuddy-v9.zip"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="hp-install-btn"
      style={{
        bottom: 150, // Higher than install button
        textDecoration: 'none',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.2s ease, background 0.2s ease',
        zIndex: 1001,
        background: '#FF6B35',
        color: '#fff',
      }}
    >
      <HPGlyph name="sparkle" size={18} stroke={2.5} color="#fff" />
      <span>Download Extension</span>
    </a>
  );
}
