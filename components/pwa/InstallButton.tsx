'use client';

import { useState, useEffect, useRef } from 'react';
import HPGlyph from '@/components/ui/HPGlyph';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  useEffect(() => {
    // 1. Check standalone display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // 2. Listen to beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false); // If prompt is available, it is not installed yet
    };

    // 3. Listen to appinstalled (instant update when installed)
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  // Draggable Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    };
    setIsDragging(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setIsDragging(true);
    }
    setPos({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging && dragRef.current) {
      handleInstall();
    }
    dragRef.current = null;
  };

  if (isInstalled || !deferredPrompt) return null;

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="hp-install-btn"
      id="install-button"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)${!isDragging && isHovered ? ' translateY(-2px)' : ''}`,
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'pointer',
        transition: isDragging ? 'none' : 'transform 0.2s ease, background 0.2s ease',
        zIndex: 1001, // Higher than role badge (zIndex: 40)
      }}
    >
      <HPGlyph name="bee" size={18} stroke={2.5} />
      <span>Install App</span>
    </button>
  );
}
