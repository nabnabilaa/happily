"use client";

import React, { useState, useEffect, useCallback } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import { Row, Modal, HPButton, HPInput } from "@/components/ui";
import { useHP } from "@/lib/HPContext";
import { PUSHER_CLUSTER, PUSHER_KEY, isPusherConfigured } from "@/lib/realtimeConfig";
import SectionHeader from "./SectionHeader";

interface CoworkingWidgetProps {
  openModal: (name: string, props?: any) => void;
}

interface LobbyParticipant {
  id: string;
  name: string;
  avatar: string | null;
  isHost: boolean;
  role: string;
  status: string;
}

interface LobbyRoom {
  id: string;
  name: string;
  description?: string | null;
  mode: "hardcore" | "zen";
  status: "waiting" | "running";
  visibility: "public" | "code";
  durationMins: number;
  maxParticipants: number;
  participantCount: number;
  isFull: boolean;
  endsAt: string | null;
  remainingSecs: number | null;
  host: { id: string; name: string; avatar: string | null };
  participants: LobbyParticipant[];
  isParticipant: boolean;
  requiresCode: boolean;
}

export default function CoworkingWidget({ openModal }: CoworkingWidgetProps) {
  const { user } = useHP();

  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [search, setSearch] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codePrompt, setCodePrompt] = useState<LobbyRoom | null>(null);
  const [promptCode, setPromptCode] = useState("");
  const [joining, setJoining] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/focus/rooms", { credentials: "same-origin" });
      const data = await res.json();
      if (Array.isArray(data.rooms)) setRooms(data.rooms);
    } catch {
      /* lobby yang gagal dimuat cukup diam; percobaan berikutnya akan menyusul */
    }
  }, []);

  useEffect(() => {
    void fetchRooms();

    let cleanup: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const startPolling = () => {
      if (!pollTimer) pollTimer = setInterval(() => void fetchRooms(), 10000);
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

        const channel = client.subscribe("presence-lobby");
        channel.bind("lobby-update", () => void fetchRooms());

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
  }, [fetchRooms, user?.id]);

  /**
   * Masuk ruangan. Kode diverifikasi SERVER saat JOIN — modal ini hanya
   * mengumpulkannya. Versi lama membandingkan kode di browser terhadap kode
   * yang sudah dikirim ke browser itu juga, jadi gerbangnya tidak menjaga apa pun.
   */
  const enterRoom = (room: LobbyRoom, code?: string) => {
    openModal("focus", { roomId: room.id, joinCode: code ?? "" });
  };

  const handleJoinClick = (room: LobbyRoom) => {
    if (room.requiresCode && !room.isParticipant) {
      setCodePrompt(room);
      setPromptCode("");
      setCodeError("");
    } else {
      enterRoom(room);
    }
  };

  /** Kotak kode terpisah dari kotak pencarian — dulu satu kotak melakukan dua hal, dan yang satu melewati gerbang yang satunya. */
  const submitCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setCodeError("");
    try {
      const res = await fetch("/api/focus/rooms/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || "Kode tidak ditemukan.");
        return;
      }
      setCodeInput("");
      openModal("focus", { roomId: data.roomId, joinCode: code });
    } catch {
      setCodeError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setJoining(false);
    }
  };

  const visible = rooms.filter(
    (r) =>
      !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    // Spacing between blocks belongs to the screen's layout gap, not to the
    // widget — a self-applied marginTop stacks on top of it and breaks rhythm.
    <section>
      <SectionHeader icon="compass" label="Live Coworking Lounge" />

      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <HPInput
          aria-label="Cari ruang"
          placeholder="Cari ruang…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Row gap={2} align="flex-start" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <HPInput
            aria-label="Punya kode ruangan?"
            placeholder="Punya kode? Ketik di sini"
            value={codeInput}
            maxLength={6}
            onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submitCode()}
            error={codeError || undefined}
            style={{ textTransform: "uppercase", letterSpacing: 2 }}
          />
        </div>
        <HPButton variant="primary" onClick={submitCode} disabled={joining || !codeInput.trim()}>
          Gabung
        </HPButton>
      </Row>

      <div
        className="hide-scroll"
        style={{ display: "flex", overflowX: "auto", gap: 16, paddingBottom: 12, margin: "0 -4px", paddingLeft: 4, paddingRight: 4 }}
      >
        <button
          onClick={() => openModal("focus", { startAsTeam: true })}
          className="hp-tap"
          style={{
            minWidth: 160, flexShrink: 0, padding: 16, borderRadius: HP_TOKENS.radiusLg,
            background: "transparent", color: HP_TOKENS.inkMute,
            border: `2px dashed ${HP_TOKENS.line}`, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, transition: "all 0.2s",
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: HP_TOKENS.successWash, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HPGlyph name="plus" size={24} color={HP_TOKENS.sageInk} />
          </div>
          Buat Ruang
        </button>

        {visible.map((room) => (
          <div key={room.id} style={{ minWidth: 260, maxWidth: 280, flexShrink: 0 }}>
            <HPCard
              padding={16}
              style={{
                background: HP_TOKENS.sageWash,
                border: `1.5px solid ${HP_TOKENS.line}`,
                display: "flex", flexDirection: "column", gap: 12, height: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ display: "flex", marginTop: 3, flexShrink: 0 }}>
                  <HPGlyph
                    name={room.mode === "hardcore" ? "zap" : "leaf"}
                    size={18}
                    color={room.mode === "hardcore" ? HP_TOKENS.warning : HP_TOKENS.success}
                  />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.ink, wordBreak: "break-word", lineHeight: 1.3 }}>
                      {room.name}
                    </div>
                    <div style={{
                      ...HP_TEXT.tiny, padding: "2px 8px", borderRadius: HP_TOKENS.radiusXs,
                      background: room.mode === "hardcore" ? HP_TOKENS.coralWash : HP_TOKENS.blueWash,
                      color: room.mode === "hardcore" ? HP_TOKENS.coral : HP_TOKENS.blue,
                      whiteSpace: "nowrap",
                    }}>
                      {room.mode.toUpperCase()}
                    </div>
                  </div>
                  {room.description && (
                    <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft, marginTop: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {room.description}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px dashed ${HP_TOKENS.line}`, paddingTop: 12, marginTop: "auto" }}>
                <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft }}>
                  {/* Jam selesai, bukan "sisa 23 menit" yang basi begitu dirender. */}
                  {room.status === "running" && room.endsAt
                    ? <>Selesai <strong style={{ color: HP_TOKENS.ink }}>{new Date(room.endsAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</strong></>
                    : <>Belum mulai · <strong style={{ color: HP_TOKENS.ink }}>{room.durationMins} menit</strong></>}
                </div>
                <div style={{ ...HP_TEXT.small, fontSize: 12, color: HP_TOKENS.inkMute }}>
                  {room.participantCount}/{room.maxParticipants}
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {room.participants.slice(0, 4).map((p) => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: p.isHost ? HP_TOKENS.yellowWash : HP_TOKENS.sunken,
                    padding: "4px 12px 4px 4px", borderRadius: HP_TOKENS.radiusPill,
                  }}>
                    <div style={{
                      ...HP_TEXT.tiny, width: 24, height: 24, borderRadius: "50%",
                      background: p.isHost ? HP_TOKENS.yellow : HP_TOKENS.card,
                      color: HP_TOKENS.ink, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                    }}>
                      {p.avatar
                        ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : p.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ ...HP_TEXT.small, color: HP_TOKENS.ink }}>
                      {p.name.split(" ")[0]}
                      {p.isHost && <span className="hp-sr-only"> (host)</span>}
                    </span>
                    {p.isHost && <HPGlyph name="star" size={11} color={HP_TOKENS.yellowInk} />}
                  </div>
                ))}
                {room.participants.length > 4 && (
                  <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, alignSelf: "center" }}>
                    +{room.participants.length - 4}
                  </span>
                )}
              </div>

              <HPButton
                size="sm"
                fullWidth
                variant={room.isParticipant ? "secondary" : "primary"}
                onClick={() => handleJoinClick(room)}
                disabled={room.isFull && !room.isParticipant}
                style={{ marginTop: 8 }}
              >
                {room.isParticipant
                  ? "Masuk kembali"
                  : room.isFull
                    ? "Ruangan penuh"
                    : room.requiresCode
                      ? "Gabung (pakai kode)"
                      : "Gabung"}
              </HPButton>
            </HPCard>
          </div>
        ))}
      </div>

      {codePrompt && (
        <Modal
          onClose={() => setCodePrompt(null)}
          title="Masukkan kode ruangan"
          description={`Minta kode dari ${codePrompt.host.name} untuk bergabung ke ${codePrompt.name}.`}
          footer={
            <>
              <HPButton fullWidth onClick={() => setCodePrompt(null)}>Batal</HPButton>
              <HPButton
                variant="primary"
                fullWidth
                onClick={() => {
                  const room = codePrompt;
                  setCodePrompt(null);
                  enterRoom(room, promptCode.trim().toUpperCase());
                }}
              >
                Gabung
              </HPButton>
            </>
          }
        >
          <HPInput
            autoFocus
            aria-label="Kode ruangan"
            value={promptCode}
            onChange={(e) => setPromptCode(e.target.value.toUpperCase())}
            placeholder="ABC234"
            maxLength={6}
            style={{ ...HP_TEXT.metric, textAlign: "center", letterSpacing: 8, textTransform: "uppercase" }}
          />
        </Modal>
      )}
    </section>
  );
}
