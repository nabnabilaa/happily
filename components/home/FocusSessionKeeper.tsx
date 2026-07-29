"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { HP_TOKENS, HP_TEXT, HP_FONT, Row, HPButton, HPGlyph } from "@/components/ui";

/**
 * Penjaga sesi fokus di level aplikasi.
 *
 * Sebelumnya seluruh kelangsungan sesi bergantung pada `FocusModal` tetap
 * ter-mount: `app/page.tsx` merendernya secara kondisional, jadi menekan tombol
 * silang meng-unmount `useFocusSession` dan menghentikan detak jantung. Server
 * kehilangan bukti kehadiran setelah 45 detik lalu memulai interupsi, tanpa satu
 * pun pemberitahuan ke user. Tombol di ruang tunggu bahkan tertulis "Sembunyikan
 * (tetap di ruangan)" — janji yang tidak mungkin ditepati.
 *
 * Pembagian tugas antara komponen ini dan modal sengaja mengikuti janji tiap
 * mode, bukan sekadar "pokoknya jangan mati":
 *
 *   • ZEN menjanjikan "boleh buka aplikasi lain". Maka detak diteruskan di sini
 *     meskipun layar fokus ditutup — janji mode itu harus ditepati.
 *
 *   • HARDCORE menuntut layar fokus tetap di depan. Maka di sini detaknya
 *     sengaja TIDAK diteruskan; menutup layar memang berarti jeda. Yang
 *     diperbaiki bukan konsekuensinya, melainkan kebisuannya: bar di bawah
 *     menyatakan keadaan itu dengan jelas dan menyediakan jalan kembali.
 *
 *   • RUANG TUNGGU belum menghitung apa pun, jadi detak selalu diteruskan.
 */

const HEARTBEAT_MS = 20_000;
const DISCOVER_MS = 30_000;

interface ActiveRoom {
  id: string;
  name: string;
  mode: "zen" | "hardcore";
  status: "waiting" | "running";
  visibility: string;
  endsAt: string | null;
  myStatus: "joined" | "focusing" | "interrupted";
}

interface FocusSessionKeeperProps {
  /** Modal sesi sedang terbuka: ia yang berdetak dan menampilkan keadaan. */
  suspended: boolean;
  onOpen: (roomId: string) => void;
}

function fmt(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusSessionKeeper({ suspended, onOpen }: FocusSessionKeeperProps) {
  const [room, setRoom] = useState<ActiveRoom | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const roomRef = useRef<ActiveRoom | null>(null);
  const clockOffsetRef = useRef(0);
  roomRef.current = room;

  const discover = useCallback(async () => {
    try {
      const res = await fetch("/api/focus/rooms/active", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.serverNow) {
        clockOffsetRef.current = new Date(data.serverNow).getTime() - Date.now();
      }
      setRoom(data.room ?? null);
    } catch {
      /* Jaringan putus bukan alasan melupakan sesi yang sedang berjalan. */
    }
  }, []);

  // Cari sesi aktif saat modal ditutup juga, supaya bar langsung muncul begitu
  // user menyembunyikan layar fokus — bukan sampai 30 detik kemudian.
  useEffect(() => {
    void discover();
    const id = setInterval(() => void discover(), DISCOVER_MS);
    return () => clearInterval(id);
  }, [discover, suspended]);

  // ── Detak ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (suspended) return;

    const beat = async () => {
      const r = roomRef.current;
      if (!r) return;
      // Hardcore yang sedang berjalan sengaja dibiarkan berhenti berdetak:
      // layarnya memang harus di depan, dan modal-lah yang membuktikan itu.
      if (r.status === "running" && r.mode === "hardcore") return;
      try {
        const res = await fetch(`/api/focus/rooms/${r.id}/heartbeat`, {
          method: "POST",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.room) {
          setRoom((prev) =>
            prev && prev.id === data.room.id
              ? { ...prev, status: data.room.status, myStatus: data.room.viewer?.status ?? prev.myStatus, endsAt: data.room.endsAt }
              : prev,
          );
        }
      } catch {
        /* detak yang hilang dikejar detak berikutnya */
      }
    };

    void beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [suspended, room?.id]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (suspended || !room) return null;

  const serverNowMs = nowTick + clockOffsetRef.current;
  const remainingSecs = room.endsAt
    ? Math.max(0, Math.round((new Date(room.endsAt).getTime() - serverNowMs) / 1000))
    : 0;

  const paused = room.myStatus === "interrupted";
  const waiting = room.status === "waiting";

  // Nada bar mengikuti apa yang sedang terjadi pada waktumu, bukan sekadar
  // "ada sesi": dijeda harus terasa berbeda dari berjalan.
  const tone = paused
    ? { bg: HP_TOKENS.warningWash, fg: HP_TOKENS.warning }
    : { bg: HP_TOKENS.sageWash, fg: HP_TOKENS.sage };

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 88,
        zIndex: 900,
        background: tone.bg,
        border: `1.5px solid ${HP_TOKENS.line}`,
        borderRadius: HP_TOKENS.radiusLg,
        padding: "10px 12px",
        fontFamily: HP_FONT,
      }}
    >
      <Row gap={2} align="center">
        <span style={{ display: "flex", flexShrink: 0 }}>
          <HPGlyph name={paused ? "pause" : waiting ? "hourglass" : "target"} size={17} color={tone.fg} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...HP_TEXT.small, color: tone.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {paused
              ? "Timermu sedang dijeda"
              : waiting
                ? `Menunggu di ${room.name}`
                : `Fokus · sisa ${fmt(remainingSecs)}`}
          </div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {paused
              ? "Buka lagi dan tekan “Saya kembali” untuk melanjutkan"
              : waiting
                ? "Kamu tetap di ruangan"
                : room.mode === "zen"
                  ? "Mode Zen — menitmu tetap dihitung"
                  : "Layar fokus tertutup"}
          </div>
        </div>
        <HPButton size="sm" variant="primary" onClick={() => onOpen(room.id)}>
          Buka
        </HPButton>
      </Row>
    </div>
  );
}
