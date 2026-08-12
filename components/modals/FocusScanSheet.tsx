"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { HP_TOKENS, HP_TEXT, HP_FONT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import { HPButton, HPInput } from "@/components/ui";

/**
 * Pindai kode ruang fokus.
 *
 * `RoomInvite` sudah lama menampilkan QR dan menulis "Pindai dari HP untuk
 * langsung masuk", tapi tidak ada satu pun layar di aplikasi ini yang bisa
 * memindainya — `html5-qrcode` terpasang di package.json sejak awal dan tidak
 * pernah di-import. Satu-satunya jalan masuk adalah mengetik kode enam huruf
 * dengan mata bergantian antara dua layar. Ini layar yang hilang itu.
 *
 * QR-nya membawa URL undangan penuh, bukan kode telanjang, jadi kamera HP bawaan
 * tetap bisa membukanya lewat `app/page.tsx` (`?action=focus&focusCode=`).
 * Karena itu pemindai di sini menerima KEDUANYA: URL undangan, atau kode yang
 * diketik langsung kalau kameranya ditolak.
 */

const CODE_LEN = 6;

/**
 * Permukaan `html5-qrcode` yang benar-benar dipakai di sini.
 *
 * Modulnya di-import dinamis (ia menyentuh `navigator` saat dimuat), jadi
 * tipenya tidak ikut tersedia secara statis di titik pemakaian. Mendeklarasikan
 * potongan yang dipakai jauh lebih berguna daripada `any`: salah ketik nama
 * metode tetap tertangkap tsc, dan pembaca berikutnya tahu persis seberapa
 * dalam ketergantungan ini menancap — empat metode, tidak lebih.
 */
interface QrScanner {
  start(
    camera: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onDecoded: (text: string) => void,
    onFailure: () => void,
  ): Promise<void>;
  stop(): Promise<void>;
  clear(): void;
}

type QrScannerCtor = new (elementId: string, config?: { verbose?: boolean }) => QrScanner;

/** Ambil kode dari apa pun yang terbaca: URL undangan penuh, atau kode telanjang. */
function extractCode(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get("focusCode");
    if (fromQuery) return fromQuery.trim().toUpperCase();
  } catch {
    /* Bukan URL — jatuh ke pembacaan sebagai kode telanjang di bawah. */
  }

  const bare = text.toUpperCase();
  return /^[A-Z0-9]{4,10}$/.test(bare) ? bare : null;
}

interface FocusScanSheetProps {
  onClose: () => void;
  /** Dipanggil dengan ruangan yang berhasil ditemukan dari kode. */
  onResolved: (roomId: string, joinCode: string) => void;
}

type CamState = "starting" | "scanning" | "denied" | "unsupported";

export default function FocusScanSheet({ onClose, onResolved }: FocusScanSheetProps) {
  const [camState, setCamState] = useState<CamState>("starting");
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [resolving, setResolving] = useState(false);

  // Kode yang sedang diproses. Kamera menembakkan callback berkali-kali per
  // detik pada QR yang sama; tanpa penjaga ini satu pindaian jadi selusin POST.
  const claimedRef = useRef(false);
  const scannerRef = useRef<QrScanner | null>(null);

  const submitCode = useCallback(
    async (code: string) => {
      if (claimedRef.current) return;
      claimedRef.current = true;
      setResolving(true);
      setError("");
      try {
        const res = await fetch("/api/focus/rooms/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Kode tidak ditemukan.");
          claimedRef.current = false;
          return;
        }
        onResolved(data.roomId, code);
      } catch {
        setError("Koneksi bermasalah. Coba lagi.");
        claimedRef.current = false;
      } finally {
        setResolving(false);
      }
    },
    [onResolved],
  );

  // ── Kamera ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let instance: QrScanner | null = null;

    (async () => {
      // Import dinamis: html5-qrcode menyentuh `navigator` saat modul dimuat,
      // jadi ia tidak boleh ikut terbawa ke render server.
      let Html5Qrcode: QrScannerCtor;
      try {
        ({ Html5Qrcode } = (await import("html5-qrcode")) as unknown as {
          Html5Qrcode: QrScannerCtor;
        });
      } catch {
        if (!cancelled) setCamState("unsupported");
        return;
      }

      if (cancelled) return;
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCamState("unsupported");
        return;
      }

      try {
        instance = new Html5Qrcode("focus-scan-region", { verbose: false });
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded: string) => {
            const code = extractCode(decoded);
            if (!code) {
              setError("QR ini bukan undangan ruang fokus.");
              return;
            }
            void submitCode(code);
          },
          () => {
            /* Frame tanpa QR bukan kesalahan — ia keadaan normal saat memindai. */
          },
        );
        if (!cancelled) setCamState("scanning");
      } catch {
        // Izin ditolak, tidak ada kamera, atau konteks non-HTTPS. Ketiganya
        // berakhir sama bagi user: pakai jalur ketik manual di bawah.
        if (!cancelled) setCamState("denied");
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      // `stop()` menolak kalau pemindai belum sempat berjalan; kegagalan
      // membersihkan tidak boleh melempar saat komponen sedang dibongkar.
      Promise.resolve(s.stop()).then(() => s.clear()).catch(() => {});
    };
  }, [submitCode]);

  const manualValid = manualCode.trim().length >= 4;

  return (
    <div
      role="dialog"
      aria-label="Pindai kode ruang fokus"
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: HP_TOKENS.paper, color: HP_TOKENS.ink,
        fontFamily: HP_FONT, display: "flex", flexDirection: "column",
        animation: "hpFadeIn 260ms ease-out", overflowY: "auto",
      }}
    >
      <style>{`
        @keyframes focusScanSweep {
          0%   { transform: translateY(0); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateY(220px); opacity: 0; }
        }
        /* html5-qrcode menyuntik <video> apa adanya; tanpa ini videonya
           meluber keluar bingkai di layar sempit. */
        #focus-scan-region video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
          display: block;
        }
        #focus-scan-region img { display: none; }
      `}</style>

      <div style={{ padding: "40px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <button
          onClick={onClose}
          aria-label="Tutup"
          style={{
            width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
            background: HP_TOKENS.sunken, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <HPGlyph name="close" size={18} color={HP_TOKENS.ink} />
        </button>
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Gabung Ruang Fokus</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 24px 40px", textAlign: "center", gap: 20 }}>
        <div style={{ ...HP_TEXT.h, fontSize: 20 }}>Arahkan ke QR ruangan</div>

        {/* Jendela kamera. Selalu dirender: html5-qrcode butuh elemen targetnya
            sudah ada di DOM sebelum `start()` dipanggil. */}
        <div
          style={{
            position: "relative", width: 260, height: 260, flexShrink: 0,
            borderRadius: HP_TOKENS.radiusLg, overflow: "hidden",
            background: HP_TOKENS.sunken,
            border: `1.5px solid ${HP_TOKENS.line}`,
          }}
        >
          <div id="focus-scan-region" style={{ width: "100%", height: "100%" }} />

          {camState === "scanning" && (
            <>
              <div
                aria-hidden
                style={{
                  position: "absolute", left: 20, right: 20, top: 20, height: 2,
                  background: HP_TOKENS.sage, borderRadius: 2,
                  boxShadow: `0 0 12px ${HP_TOKENS.sage}`,
                  animation: "focusScanSweep 2.4s ease-in-out infinite",
                }}
              />
              {/* Empat siku bingkai — penanda area baca tanpa menutupi gambar. */}
              {([
                { top: 14, left: 14, borderWidth: "3px 0 0 3px" },
                { top: 14, right: 14, borderWidth: "3px 3px 0 0" },
                { bottom: 14, left: 14, borderWidth: "0 0 3px 3px" },
                { bottom: 14, right: 14, borderWidth: "0 3px 3px 0" },
              ] as React.CSSProperties[]).map((pos, i) => (
                <div
                  key={i}
                  aria-hidden
                  style={{
                    position: "absolute", width: 28, height: 28,
                    borderStyle: "solid", borderColor: HP_TOKENS.onPrimary,
                    borderRadius: 6, ...pos,
                  }}
                />
              ))}
            </>
          )}

          {camState !== "scanning" && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10, padding: 20,
            }}>
              <HPGlyph name="target" size={26} color={HP_TOKENS.inkMute} />
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>
                {camState === "starting"
                  ? "Menyalakan kamera…"
                  : camState === "denied"
                    ? "Kamera tidak bisa dipakai"
                    : "Perangkat ini tidak punya pemindai"}
              </div>
            </div>
          )}
        </div>

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, maxWidth: 300 }}>
          {camState === "scanning"
            ? "Kode akan terbaca sendiri begitu QR masuk bingkai."
            : "Ketik kode enam huruf dari layar host."}
        </div>

        {/* Jalur ketik selalu tersedia, bukan hanya saat kamera gagal: orang yang
            menerima kodenya lewat chat tidak punya QR untuk dipindai. */}
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
          <HPInput
            aria-label="Kode ruangan"
            placeholder="Kode ruangan"
            value={manualCode}
            maxLength={CODE_LEN}
            onChange={(e) => { setManualCode(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && manualValid && submitCode(manualCode.trim())}
            error={error || undefined}
            style={{ textTransform: "uppercase", letterSpacing: 4, textAlign: "center", fontSize: 18 }}
          />
          <HPButton
            variant="primary"
            onClick={() => submitCode(manualCode.trim())}
            disabled={!manualValid || resolving}
          >
            {resolving ? "Mencari ruangan…" : "Gabung"}
          </HPButton>
        </div>
      </div>
    </div>
  );
}
