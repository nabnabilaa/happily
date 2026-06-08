"use client";

import { useEffect } from "react";

/**
 * GlobalClickInterceptor
 * 
 * Melindungi semua tombol (`<button>`, `<a>`, dan `.hp-tap`) dari klik ganda (spam click)
 * dengan menggunakan event listener di fase *capture* React.
 * Ini memastikan event diblokir sebelum React Synthetic Events memprosesnya.
 */
export default function GlobalClickInterceptor() {
  useEffect(() => {
    // Handler untuk mencegat klik di fase awal (capture)
    const handleGlobalClick = (e: MouseEvent) => {
      // Cari elemen terdekat yang diklik yang merupakan tombol atau link
      const target = e.target as HTMLElement;
      const actionableEl = target.closest('button, a, .hp-tap') as HTMLElement;

      if (!actionableEl) return;

      // Jika tombol tipe 'submit' atau memiliki properti khusus, kita masih ingin melindunginya,
      // tetapi hati-hati dengan link yang hanya navigasi (href mulai dengan # atau sama).
      // Untuk keamanan maksimal, kita lindungi semuanya dengan cooldown 1 detik.
      
      const isProcessing = actionableEl.getAttribute('data-hp-processing');
      
      if (isProcessing === 'true') {
        // Blokir klik jika sedang dalam masa cooldown
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      // Tandai tombol sedang diproses
      actionableEl.setAttribute('data-hp-processing', 'true');
      
      // Simpan style asli untuk dikembalikan nanti
      const originalOpacity = actionableEl.style.opacity;
      const originalCursor = actionableEl.style.cursor;
      const originalTransition = actionableEl.style.transition;
      
      // Beri efek visual bahwa tombol sedang diproses (opsional, tapi disarankan)
      // Kita tambahkan transisi halus agar perubahannya enak dilihat
      actionableEl.style.transition = 'opacity 0.2s';
      actionableEl.style.opacity = '0.6';
      actionableEl.style.cursor = 'not-allowed';

      // Hapus status proses setelah 1000ms (1 detik)
      setTimeout(() => {
        // Pastikan elemen belum dihapus dari DOM
        if (document.body.contains(actionableEl)) {
          actionableEl.removeAttribute('data-hp-processing');
          actionableEl.style.opacity = originalOpacity;
          actionableEl.style.cursor = originalCursor;
          actionableEl.style.transition = originalTransition;
        }
      }, 1000);
    };

    // Pasang listener di window dengan capture = true
    // Capture = true memastikan listener ini berjalan PERTAMA KALI sebelum event turun ke elemen
    window.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  return null; // Komponen ini tidak me-render apapun ke UI
}
