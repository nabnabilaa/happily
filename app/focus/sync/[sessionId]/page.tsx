"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import PusherClient from "pusher-js";
import BeeMascot from "@/components/ui/BeeMascot";

type Phase = "loading" | "ready" | "running" | "ended" | "failed";

export default function FocusSyncPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const isSolo = searchParams.get('solo') === 'true';
  const queryDur = parseInt(searchParams.get('dur') || '25', 10);

  const [phase, setPhase] = useState<Phase>("loading");
  const [room, setRoom] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Timer
  const [secs, setSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Anti-cheat: detect if user leaves the page
  const graceRef = useRef<number | null>(null);
  const hasSignaled = useRef(false);

  // ── 1. Fetch room info ───────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    async function fetchRoom() {
      if (isSolo) {
        // Solo session bypasses DB fetch
        const dur = queryDur * 60;
        setTotalSecs(dur);
        
        let startedAt = localStorage.getItem(`focus_start_${sessionId}`);
        if (!startedAt) {
          startedAt = String(Date.now());
          localStorage.setItem(`focus_start_${sessionId}`, startedAt);
        }
        
        const elapsed = Math.floor((Date.now() - parseInt(startedAt)) / 1000);
        const remaining = Math.max(0, dur - elapsed);
        
        if (remaining <= 0) {
           setSecs(0);
           setPhase("ended");
        } else {
           setSecs(remaining);
           setPhase("running");
        }
        return;
      }

      try {
        const res = await fetch(`/api/focus/rooms/${sessionId}`);
        if (!res.ok) throw new Error("Room not found");
        const data = await res.json();
        setRoom(data.room);

        const dur = (data.room.durationMins || 25) * 60;
        setTotalSecs(dur);

        if (data.room.status === "started" && data.room.startedAt) {
          // Room already running — calculate remaining time
          const elapsed = Math.floor(
            (Date.now() - new Date(data.room.startedAt).getTime()) / 1000
          );
          const remaining = Math.max(0, dur - elapsed);
          setSecs(remaining);
          setPhase("running");
        } else if (data.room.status === "finished") {
          setPhase("ended");
        } else {
          // Waiting for host to start
          setSecs(dur);
          setPhase("ready");
        }
      } catch (e: any) {
        setErrorMsg(e.message || "Ruangan tidak ditemukan.");
        setPhase("failed");
      }
    }
    fetchRoom();
  }, [sessionId, isSolo, queryDur]);

  // ── 2. Send sync signal to desktop ──────────────────────────────────────
  const signalDesktop = useCallback(async () => {
    if (hasSignaled.current) return;
    hasSignaled.current = true;
    try {
      await fetch("/api/focus/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: sessionId }),
      });
    } catch (e) {
      console.error("Sync signal failed:", e);
    }
  }, [sessionId]);

  // ── 3. Start timer ───────────────────────────────────────────────────────
  const startTimer = useCallback((initialSecs?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (initialSecs !== undefined) setSecs(initialSecs);
    timerRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setPhase("ended");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  // ── 4. Start timer when phase becomes running ────────────────────────────
  useEffect(() => {
    if (phase === "running" && !timerRef.current) {
      startTimer();
      signalDesktop();
    }
  }, [phase, startTimer, signalDesktop]);

  // ── 5. Pusher subscription ───────────────────────────────────────────────
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";
    if (!pusherKey || !sessionId) return;

    const client = new PusherClient(pusherKey, { cluster: pusherCluster });
    const channel = client.subscribe(`presence-focus-${sessionId}`);

    channel.bind("room-event", (ev: any) => {
      if (ev.type === "START") {
        const dur = (ev.durationMins || 25) * 60;
        setTotalSecs(dur);
        startTimer(dur);
        setPhase("running");
      }
      if (ev.type === "FINISH" || ev.type === "ABORT_URGENT") {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setPhase("ended");
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      client.disconnect();
    };
  }, [sessionId, startTimer]);

  // ── 6. Anti-cheat: detect tab visibility change ──────────────────────────
  useEffect(() => {
    if (phase !== "running") return;
    const onVisChange = () => {
      if (document.hidden) {
        graceRef.current = Date.now();
      } else {
        if (graceRef.current) {
          const elapsed = Date.now() - graceRef.current;
          if (elapsed > 30000) {
            fetch(`/api/focus/rooms/${sessionId}/action`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "FAIL", userId: "mobile" }),
            }).catch(console.error);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            setPhase("failed");
            setErrorMsg(
              `Sesi gagal karena Anda meninggalkan halaman ini selama ${Math.round(elapsed / 1000)} detik.`
            );
          }
          graceRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [phase, sessionId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Cleanup localstorage on end
  useEffect(() => {
    if (phase === "ended" && isSolo) {
      localStorage.removeItem(`focus_start_${sessionId}`);
    }
  }, [phase, isSolo, sessionId]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const displayMins = Math.floor(secs / 60);
  const displaySecs = secs % 60;
  const progress = totalSecs > 0 ? ((totalSecs - secs) / totalSecs) * 100 : 0;

  const rootStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: "#2D6A4F",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    fontFamily: "'Nunito', sans-serif",
    color: "#F4F7F9",
    textAlign: "center",
  };

  // ── Render: Loading ──────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div style={rootStyle}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Menghubungkan...</div>
        <div style={{ fontSize: 14, opacity: 0.7 }}>Memuat data ruang fokus</div>
      </div>
    );
  }

  // ── Render: Failed ──────────────────────────────────────────────────────
  if (phase === "failed") {
    return (
      <div style={rootStyle}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Sesi Gagal</div>
        <div style={{ fontSize: 14, opacity: 0.75, maxWidth: 300 }}>{errorMsg || "Terjadi kesalahan."}</div>
      </div>
    );
  }

  // ── Render: Ended ───────────────────────────────────────────────────────
  if (phase === "ended") {
    return (
      <div style={{ ...rootStyle, background: "#1a472a" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Fokus Selesai!</div>
        <div style={{ fontSize: 14, opacity: 0.75, maxWidth: 300, marginBottom: 32 }}>
          Hebat! {room?.name ? `Sesi "${room.name}"` : "Sesi fokus"} berhasil diselesaikan.
        </div>
        <button 
          onClick={() => window.location.href = '/'} 
          style={{ padding: '14px 24px', borderRadius: 99, background: '#4ade80', color: '#064e3b', border: 'none', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  // ── Render: Ready (waiting for host) ───────────────────────────────────
  if (phase === "ready") {
    return (
      <div style={rootStyle}>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
          @keyframes spin { to{transform:rotate(360deg)} }
        `}</style>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>HP Tersambung!</div>
        <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 32, maxWidth: 300 }}>
          Ruang: <strong>{room?.name || sessionId}</strong>
          <br /><br />
          Menunggu host memulai sesi.<br />Jangan tutup halaman ini!
        </div>

        <div style={{
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 16,
          padding: "12px 20px",
          fontSize: 13,
          color: "#fca5a5",
          fontWeight: 700,
          marginBottom: 24,
          maxWidth: 300,
        }}>
          ⚠️ Mode Hardcore aktif. Tetap di halaman ini selama sesi berlangsung.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.6, fontSize: 13 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#4ade80", display: "inline-block",
            animation: "pulse 1.5s infinite",
          }} />
          Terhubung ke server
        </div>
      </div>
    );
  }

  // ── Render: Running ─────────────────────────────────────────────────────
  return (
    <div style={rootStyle}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
        {room?.name || "Sesi Fokus"}
      </div>
      
      <div style={{ position: 'relative', marginTop: 16, marginBottom: 16 }}>
        <div style={{
          position: 'absolute', top: -30, right: -20, background: '#000', color: '#fff', 
          padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 800,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          Fokus!
        </div>
        <BeeMascot mood="focus" size={80} />
      </div>

      {/* Timer */}
      <div style={{
        background: "rgba(0,0,0,0.25)",
        borderRadius: 24,
        padding: "32px 48px",
        marginBottom: 32,
      }}>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, fontFamily: "monospace" }}>
          {String(displayMins).padStart(2, "0")}:{String(displaySecs).padStart(2, "0")}
        </div>

        {/* Progress bar */}
        <div style={{
          width: "100%",
          height: 6,
          background: "rgba(255,255,255,0.15)",
          borderRadius: 99,
          overflow: "hidden",
          marginTop: 20,
        }}>
          <div style={{
            height: "100%",
            background: "#F5C842",
            borderRadius: 99,
            width: `${progress}%`,
            transition: "width 1s linear",
          }} />
        </div>
      </div>

      <div style={{
        background: "rgba(239,68,68,0.15)",
        border: "1px solid rgba(239,68,68,0.4)",
        borderRadius: 16,
        padding: "12px 20px",
        fontSize: 13,
        color: "#fca5a5",
        fontWeight: 700,
        marginBottom: 16,
        maxWidth: 300,
      }}>
        ⚠️ Jangan tutup atau tinggalkan halaman ini!
        <br />
        Keluar lebih dari 30 detik akan menggagalkan sesi.
      </div>

      <div style={{ fontSize: 13, opacity: 0.5 }}>
        Mode: {room?.mode === "hardcore" ? "🔥 Hardcore" : "🧘 Zen"}
      </div>
    </div>
  );
}
