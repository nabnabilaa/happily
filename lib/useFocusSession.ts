"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PUSHER_CLUSTER, PUSHER_KEY, isPusherConfigured } from "@/lib/realtimeConfig";
import { setFocusShield } from "@/lib/focusPresence";

/**
 * Klien sesi fokus.
 *
 * Seluruh kebenaran datang dari server; hook ini hanya menampilkannya dan
 * mengirim detak jantung. Perbedaan pentingnya dari versi lama:
 *
 *   • Hitungan mundur diturunkan dari `endsAt` milik server, bukan dari
 *     `setInterval` lokal. Tik lokal cuma untuk animasi angka — setiap kali
 *     data server datang, hitungan di-anchor ulang, jadi penyimpangan tidak
 *     pernah menumpuk (dan tab latar yang di-throttle tidak jadi masalah).
 *
 *   • Detak jantung adalah bukti kehadiran. Berhenti berdetak berarti berhenti
 *     dihitung — inilah yang membuat "tutup tab lalu pergi" tidak lagi menjadi
 *     cara termudah untuk lolos.
 */

export interface FocusParticipant {
  id: string;
  name: string;
  avatar: string | null;
  role: "host" | "comod" | "member";
  isHost: boolean;
  status: "joined" | "focusing" | "interrupted" | "left" | "removed";
  focusedMins: number;
  interruptsUsed: number;
  /** Menit ke-berapa setelah sesi mulai orang ini bergabung. Null = sejak awal. */
  joinedAtMin: number | null;
  outcome: string | null;
  awardedPoints: number | null;
}

export interface FocusRoomState {
  id: string;
  name: string;
  description: string | null;
  mode: "zen" | "hardcore";
  status: "waiting" | "running" | "finished" | "aborted";
  visibility: "public" | "code" | "invite" | "solo";
  joinPolicy: string;
  durationMins: number;
  maxParticipants: number;
  startedAt: string | null;
  endsAt: string | null;
  serverNow: string;
  hostId: string;
  participantCount: number;
  participants: FocusParticipant[];
  joinCode: string | null;
  /** Hanya terisi untuk host/co-mod di ruangan `invite`. */
  pendingRequests: Array<{ userId: string; name: string; avatar: string | null; requestedAt: string }>;
  interruptBudget: { allowance: number; totalSecs: number };
  viewer: {
    role: "host" | "comod" | "member";
    status: FocusParticipant["status"];
    focusedMins: number;
    interruptsUsed: number;
    interruptSecs: number;
    interruptedAt: string | null;
    interruptKind: "voluntary" | "detected" | null;
    graceSecs: number;
    interruptSecsLeft: number;
    outcome: string | null;
    awardedPoints: number | null;
  } | null;
}

const HEARTBEAT_MS = 20_000;
const POLL_FALLBACK_MS = 10_000;

export function useFocusSession(
  roomId: string | null,
  /** Untuk kejadian sekilas yang bukan bagian dari keadaan ruangan — mis. tawaran host. */
  onEvent?: (event: any) => void,
) {
  const [room, setRoom] = useState<FocusRoomState | null>(null);
  const [loading, setLoading] = useState(Boolean(roomId));
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Selisih jam browser dengan jam server. Tanpa ini, user yang jam sistemnya
  // meleset (atau sengaja digeser) melihat hitungan mundur yang salah.
  const clockOffsetRef = useRef(0);
  const roomRef = useRef<FocusRoomState | null>(null);

  // Disimpan di ref supaya callback yang berubah tiap render tidak memicu
  // langganan Pusher berlangganan ulang terus-menerus.
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  const applyRoom = useCallback((next: FocusRoomState | null) => {
    if (next?.serverNow) {
      clockOffsetRef.current = new Date(next.serverNow).getTime() - Date.now();
    }
    roomRef.current = next;
    setRoom(next);
    // Satu-satunya tempat keadaan ruangan mendarat di hook ini, jadi juga satu-
    // satunya tempat yang tidak bisa terlewat saat menaikkan perisai.
    setFocusShield(next?.status === "running" && next?.viewer?.status === "focusing");
  }, []);

  const refresh = useCallback(async () => {
    if (!roomId) return null;
    try {
      const res = await fetch(`/api/focus/rooms/${roomId}`, { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memuat ruangan.");
        return null;
      }
      applyRoom(data.room);
      setError(null);
      return data.room as FocusRoomState;
    } catch {
      // Jaringan putus bukan alasan untuk menghapus keadaan terakhir yang
      // diketahui — user tetap melihat timernya berjalan sampai server balas.
      return null;
    } finally {
      setLoading(false);
    }
  }, [roomId, applyRoom]);

  /** Mengirim aksi ke server dan memakai keadaan yang dikembalikannya. */
  const act = useCallback(
    async (action: string, body: Record<string, any> = {}) => {
      if (!roomId) return { ok: false, error: "Tidak ada ruangan." };
      try {
        const res = await fetch(`/api/focus/rooms/${roomId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action, ...body }),
        });
        const data = await res.json();
        if (data.room) applyRoom(data.room);
        if (!res.ok) return { ok: false, error: data.error || "Aksi gagal.", data };
        return { ok: true, data };
      } catch {
        return { ok: false, error: "Koneksi bermasalah. Coba lagi." };
      }
    },
    [roomId, applyRoom],
  );

  // ── Detak jantung ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    const current = roomRef.current;
    if (current && current.status !== "running" && current.status !== "waiting") return;

    let cancelled = false;

    const beat = async () => {
      const r = roomRef.current;
      if (!r || (r.status !== "running" && r.status !== "waiting")) return;

      // Mode Hardcore menuntut layar ini tetap di depan: tab tersembunyi berarti
      // tidak ada bukti kehadiran, jadi detaknya sengaja dihentikan. Mode Zen
      // memang menjanjikan "boleh buka aplikasi lain", jadi di sana detak tetap
      // dikirim — janji mode itu harus ditepati, bukan dilanggar diam-diam.
      if (r.mode === "hardcore" && typeof document !== "undefined" && document.hidden) return;

      try {
        const res = await fetch(`/api/focus/rooms/${roomId}/heartbeat`, {
          method: "POST",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.room) applyRoom(data.room);
      } catch {
        /* detak yang hilang akan dikejar detak berikutnya */
      }
    };

    void beat();
    const id = setInterval(beat, HEARTBEAT_MS);

    // Kembali ke tab harus langsung berdetak, jangan menunggu siklus berikutnya:
    // 20 detik keterlambatan bisa berarti selisih jatah interupsi.
    const onVisible = () => {
      if (!document.hidden) void beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [roomId, applyRoom, room?.status, room?.mode]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (!pollTimer) pollTimer = setInterval(() => void refresh(), POLL_FALLBACK_MS);
    };

    if (isPusherConfigured()) {
      import("pusher-js").then(({ default: PusherClient }) => {
        if (cancelled) return;
        const client = new PusherClient(PUSHER_KEY, {
          cluster: PUSHER_CLUSTER,
          authEndpoint: "/api/pusher/auth",
        });

        client.connection.bind("state_change", (states: any) => {
          if (["unavailable", "failed", "disconnected"].includes(states.current)) startPolling();
          else if (states.current === "connected" && pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
        });

        const channel = client.subscribe(`presence-focus-${roomId}`);
        // Server mengirim sinyal "ada yang berubah", bukan potongan state. Klien
        // lalu menarik keadaan penuh — jadi tidak mungkin ada dua sumber
        // kebenaran yang saling menyimpang.
        channel.bind("room-event", (event: any) => {
          onEventRef.current?.(event);
          void refresh();
        });

        cleanup = () => {
          channel.unbind_all();
          channel.unsubscribe();
          client.disconnect();
        };
      });
    } else {
      startPolling();
    }

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [roomId, refresh]);

  // ── Muat awal + tik tampilan ─────────────────────────────────────────────
  useEffect(() => {
    if (roomId) void refresh();
  }, [roomId, refresh]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const serverNowMs = nowTick + clockOffsetRef.current;

  const remainingSecs = useMemo(() => {
    if (!room?.endsAt) return room ? room.durationMins * 60 : 0;
    return Math.max(0, Math.round((new Date(room.endsAt).getTime() - serverNowMs) / 1000));
  }, [room, serverNowMs]);

  /** Berapa lama interupsi yang sedang berjalan, untuk peringatan bertingkat. */
  const interruptElapsedSecs = useMemo(() => {
    if (!room?.viewer?.interruptedAt) return 0;
    return Math.max(0, Math.round((serverNowMs - new Date(room.viewer.interruptedAt).getTime()) / 1000));
  }, [room, serverNowMs]);

  return {
    room,
    loading,
    error,
    refresh,
    act,
    remainingSecs,
    interruptElapsedSecs,
    setRoom: applyRoom,
  };
}
