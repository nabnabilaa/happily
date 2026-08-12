"use client";

import React, { useEffect, useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import BeeMascot from "@/components/ui/BeeMascot";

interface CelebrationOverlayProps {
  show: boolean;
  onComplete: () => void;
  message?: string;
  /**
   * Poin yang BENAR-BENAR masuk ke saldo, dari jawaban server — bukan tebakan
   * pemanggil. 0 berarti tidak ada poin dibayar (kuota penuh, aksinya sudah
   * pernah dibayar, sesi kedaluwarsa), dan pil poinnya disembunyikan.
   *
   * Defaultnya dulu 50, jadi pemanggil yang tidak mengirim apa-apa tetap
   * menampilkan "+50 Poin" — angka yang tidak pernah cocok dengan ekonomi mana
   * pun di lib/pointsConfig.ts.
   */
  points?: number;
}

export default function CelebrationOverlay({ show, onComplete, message = "Hebat! Satu langkah lebih dekat.", points = 0 }: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);

  // `onComplete` hampir selalu ditulis sebagai arrow inline di pemanggil, jadi
  // identitasnya berubah tiap render induk. Sebagai dependency efek, itu
  // membuat hitungan 3 detiknya diulang dari nol setiap kali induknya render —
  // di layar yang sibuk, overlaynya menggantung jauh lebih lama dari 3 detik.
  const done = React.useRef(onComplete);
  done.current = onComplete;

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      done.current();
    }, 3000);
    return () => clearTimeout(timer);
  }, [show]);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
    onComplete();
  };

  return (
    <div 
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        // Dulu `rgba(255,255,255,0.9)` — putih yang dipatok, bukan token. Di
        // tema gelap itu berarti latar putih di bawah teks `--hp-ink` yang juga
        // nyaris putih: perayaannya benar-benar tidak terbaca. `paper` adalah
        // permukaan yang memang jadi acuan kontras `--hp-ink` di kedua tema.
        background: HP_TOKENS.paper,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'hpFadeIn 0.3s ease-out',
        cursor: 'pointer'
      }}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        style={{
          position: 'absolute', top: 24, right: 24,
          background: HP_TOKENS.lineSoft, border: 'none',
          width: 40, height: 40, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: HP_TOKENS.inkFade,
          fontSize: 20, fontWeight: 700
        }}
      >
        ×
      </button>

      <div style={{ transform: 'scale(1.2)', marginBottom: 32 }}>
        <BeeMascot mood="happy" size={100} showSpeech="Yeeay! 🎉" />
      </div>
      <div style={{ ...HP_TEXT.display, fontSize: 24, textAlign: 'center', maxWidth: 280, marginBottom: 12 }}>{message}</div>
      {/* Tanpa poin, perayaannya tetap ada — yang hilang cuma klaim poinnya.
          Menyelesaikan sesuatu memang layak dirayakan walau saldonya tidak
          bergerak; yang tidak boleh adalah menjanjikan angka yang tidak masuk. */}
      {points > 0 && (
        <div style={{
          background: HP_TOKENS.yellow, color: HP_TOKENS.ink, padding: '8px 16px', borderRadius: 99,
          fontFamily: HP_FONT, fontWeight: 700, fontSize: 18,
          fontVariantNumeric: 'tabular-nums',
          animation: 'hpBounce 0.5s ease-out'
        }}>
          +{points} Poin
        </div>
      )}
      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, marginTop: 32, opacity: 0.6 }}>
        Klik di mana saja untuk menutup
      </div>
    </div>
  );
}
