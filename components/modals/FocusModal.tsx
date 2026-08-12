"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPBar from "@/components/ui/HPBar";
import BeeMascot from "@/components/ui/BeeMascot";
import HPAvatar from "@/components/ui/HPAvatar";
import { QRCodeSVG } from "qrcode.react";
import { useFocusSession, type FocusParticipant, type FocusRoomState } from "@/lib/useFocusSession";

/**
 * Sesi fokus — solo maupun bersama.
 *
 * Komponen ini sengaja tidak memutuskan apa pun yang bernilai. Ia tidak
 * menghitung poin, tidak menentukan siapa host, dan tidak menyatakan sebuah
 * sesi gagal. Semua itu milik server (lihat lib/focusRoom.ts); di sini kita
 * hanya menggambar keadaan yang dikirim server dan mengirimkan niat user.
 *
 * Yang hilang dari versi sebelumnya, dan sengaja tidak dibawa kembali:
 *   • `awardXP()` di akhir timer — poin sekarang diselesaikan server.
 *   • Timer lokal sebagai sumber kebenaran — sekarang diturunkan dari `endsAt`.
 *   • Layar merah "Sesi Gagal! 😡" — diganti ringkasan jujur; layar itu
 *     mengajari user menghindari deteksi, bukan fokus.
 *   • Mock "Siska disconnect" 12 detik yang berjalan di produksi.
 */

interface FocusModalProps {
  onClose: () => void;
  /** Masuk / kembali ke ruangan yang sudah ada. */
  roomId?: string;
  /** Kode yang sudah diverifikasi di lobby, diteruskan ke JOIN. */
  joinCode?: string;
  /** Buka langsung di penyiapan sesi bersama, bukan solo. */
  startAsTeam?: boolean;
}

type Phase = "setup" | "lobby" | "running" | "away" | "summary" | "loading";

const DURATION_PRESETS = [15, 25, 50, 90];

/**
 * Batas ini bukan buatan layar ini — ia menyalin penjepitan milik server di
 * `app/api/focus/rooms/route.ts`. Disalin supaya kolom ketik bisa menolak
 * angka mustahil sebelum permintaan dikirim; servernya tetap yang memutuskan.
 */
const MIN_DURATION_MINS = 5;
const MAX_DURATION_MINS = 300;

/**
 * QR harus tetap gelap-di-atas-terang di tema apa pun. `HP_TOKENS.ink`
 * berbalik jadi terang di mode gelap, dan QR terang di atas latar putih tidak
 * terbaca pemindai sama sekali — jadi ini satu-satunya tempat di layar ini
 * yang sengaja mengabaikan token tema. Hitam-putih murni, bukan warna palet:
 * pemindai kamera HP mengandalkan kontras maksimal, dan ini bukan permukaan
 * yang boleh diperindah.
 */
const QR_LIGHT = "#FFFFFF";
const QR_DARK = "#000000";

const iconBtnStyle: React.CSSProperties = {
  position: "relative", width: 40, height: 40, borderRadius: "50%", border: "none",
  background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};

const overlayBtn = (tone: "primary" | "ghost" | "danger" | "warning"): React.CSSProperties => ({
  padding: "13px 16px",
  borderRadius: HP_TOKENS.radiusSm,
  fontFamily: HP_FONT,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  width: "100%",
  border: tone === "ghost" ? "1px solid rgba(255,255,255,0.25)" : "none",
  background:
    tone === "primary" ? HP_TOKENS.yellow
    : tone === "danger" ? HP_TOKENS.dangerWash
    : tone === "warning" ? HP_TOKENS.warningWash
    : "rgba(255,255,255,0.08)",
  color:
    tone === "primary" ? HP_TOKENS.ink
    : tone === "danger" ? HP_TOKENS.danger
    : tone === "warning" ? HP_TOKENS.warning
    : HP_TOKENS.onPrimary,
});

function fmt(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clockOf(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Peringatan bertingkat saat menjauh — tidak boleh ada kejutan.
 *
 * Rancangannya menolak ambang biner "30 detik lalu sesi hangus" yang dulu
 * dipakai. Yang sebenarnya menyakitkan bukan kehilangan poinnya, melainkan
 * kehilangan poin TANPA TAHU bahwa hitungannya sedang berjalan. Empat tingkat
 * di bawah membuat setiap detik yang mahal terlihat sebelum menjadi mahal.
 */
function awayStage(elapsedSecs: number, graceSecs: number, secsLeftTotal: number) {
  if (secsLeftTotal <= 30) {
    return {
      key: "critical",
      emoji: "⏳",
      tone: HP_TOKENS.danger,
      title: "Sesimu akan diselesaikan",
      body: "Waktu menjauhmu hampir habis. Menit yang sudah kamu jalani tetap dibayar.",
    };
  }
  if (elapsedSecs >= graceSecs) {
    return {
      key: "spending",
      emoji: "🕰️",
      tone: HP_TOKENS.warning,
      title: "Jatah mulai terpakai",
      body: "Zona bebas sudah lewat. Satu jatah interupsi terpakai saat kamu kembali — sesimu tetap lanjut.",
    };
  }
  if (elapsedSecs >= Math.max(15, Math.round(graceSecs / 3))) {
    return {
      key: "warning",
      emoji: "⏱️",
      tone: HP_TOKENS.yellow,
      title: "Masih dalam zona bebas",
      body: "Kembali sebelum hitungan di bawah habis dan jatahmu tidak berkurang sama sekali.",
    };
  }
  return {
    key: "calm",
    emoji: "☕",
    tone: HP_TOKENS.onPrimary,
    title: "Timermu dijeda",
    body: "Waktu fokusmu berhenti dihitung, bukan hangus. Tenang, urus dulu urusanmu.",
  };
}

/** Pola getar per tingkat. Diam saja kalau perangkatnya tidak mendukung. */
const BUZZ: Record<string, number | number[]> = {
  warning: 40,
  spending: [60, 80, 60],
  critical: [200, 100, 200],
};

export default function FocusModal({ onClose, roomId: initialRoomId, joinCode, startAsTeam }: FocusModalProps) {
  const { user, notify } = useHP();

  const [roomId, setRoomId] = useState<string | null>(initialRoomId ?? null);
  const [busy, setBusy] = useState(false);
  const [hostOffer, setHostOffer] = useState<{ fromId: string; expiresAt: number } | null>(null);
  const [confirmHide, setConfirmHide] = useState(false);
  const [showDnd, setShowDnd] = useState(false);

  const handleEvent = useCallback((event: any) => {
    if (event?.type === "HOST_OFFER" && String(event.targetId) === String(user?.id)) {
      setHostOffer({ fromId: String(event.fromId), expiresAt: Date.now() + (event.ttlSecs ?? 60) * 1000 });
    }
    if (event?.type === "HOST_OFFER_DECLINED") setHostOffer(null);
    if (event?.type === "REMOVED" && String(event.targetId) === String(user?.id)) {
      notify("Dikeluarkan", "Kamu dikeluarkan dari sesi ini oleh host.", "warning");
    }
  }, [user?.id, notify]);

  const { room, loading, error, act, refresh, remainingSecs, interruptElapsedSecs } =
    useFocusSession(roomId, handleEvent);

  // ── Penyiapan (sebelum ruangan ada) ──────────────────────────────────────
  const [isTeam, setIsTeam] = useState(Boolean(startAsTeam));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(25);
  const [mode, setMode] = useState<"zen" | "hardcore">("hardcore");
  const [visibility, setVisibility] = useState<"public" | "code">("public");
  const [setupError, setSetupError] = useState("");

  // Bergabung ke ruangan yang dibuka dari lobby.
  useEffect(() => {
    if (!initialRoomId || !user?.id) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/focus/rooms/${initialRoomId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "JOIN", joinCode: joinCode ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        notify("Tidak bisa bergabung", data.error || "Coba lagi sebentar lagi.", "warning");
        onClose();
        return;
      }
      // Ruangan `invite` menjawab 202: kita belum di dalam, permintaannya baru
      // mengantre. Membiarkan modal terbuka akan menampilkan ruangan yang
      // seolah-olah sudah kita masuki padahal belum.
      if (data.pending) {
        notify("Permintaan terkirim", data.message || "Menunggu persetujuan host.", "info");
        onClose();
        return;
      }
      void refresh();
    })();
    return () => { cancelled = true; };
    // Sengaja hanya bergantung pada identitas ruangan & user: efek ini adalah
    // "sekali saat masuk". Versi lama menaruh objek `user` di sini, sehingga
    // JOIN ditembakkan ulang setiap kali objek itu berganti identitas.
  }, [initialRoomId, user?.id, joinCode, notify, onClose, refresh]);

  const phase: Phase = useMemo(() => {
    if (!roomId) return "setup";
    if (loading && !room) return "loading";
    if (!room) return "loading";
    if (room.status === "finished" || room.status === "aborted") return "summary";
    if (room.status === "waiting") return "lobby";
    return room.viewer?.status === "interrupted" ? "away" : "running";
  }, [roomId, room, loading]);

  const viewerRole = room?.viewer?.role ?? "member";
  const isHost = viewerRole === "host";
  const canModerate = viewerRole === "host" || viewerRole === "comod";

  // ── Aksi ─────────────────────────────────────────────────────────────────

  const createRoom = useCallback(async () => {
    if (busy) return;
    const trimmed = title.trim();
    if (isTeam && trimmed.length < 3) {
      setSetupError("Judul sesi wajib diisi minimal 3 karakter.");
      return;
    }
    setBusy(true);
    setSetupError("");
    try {
      const res = await fetch("/api/focus/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: trimmed || "Sesi Fokus Solo",
          description,
          mode,
          durationMins: duration,
          solo: !isTeam,
          visibility: isTeam ? visibility : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSetupError(data.error || "Gagal membuat sesi.");
        return;
      }
      setRoomId(data.roomId);

      // Sesi solo tidak punya siapa pun untuk ditunggu, jadi langsung berjalan.
      if (!isTeam) {
        await fetch(`/api/focus/rooms/${data.roomId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "START", durationMins: duration, mode, title: trimmed || "Sesi Fokus Solo" }),
        });
      }
    } catch {
      setSetupError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }, [busy, title, description, mode, duration, isTeam, visibility]);

  const start = useCallback(async () => {
    setBusy(true);
    const res = await act("START", { durationMins: duration, mode, title: title.trim() || room?.name, description });
    setBusy(false);
    if (!res.ok) notify("Gagal memulai", res.error ?? "", "warning");
  }, [act, duration, mode, title, description, room?.name, notify]);

  const leave = useCallback(async () => {
    setBusy(true);
    await act("LEAVE");
    setBusy(false);
    onClose();
  }, [act, onClose]);

  const stepAway = useCallback(async () => {
    const res = await act("INTERRUPT_START");
    if (!res.ok) notify("Gagal", res.error ?? "", "warning");
  }, [act, notify]);

  const comeBack = useCallback(async () => {
    const res = await act("INTERRUPT_END");
    if (res.ok && res.data?.consumedAllowance) {
      notify("Jatah terpakai", "Satu jatah interupsi terpakai. Sesimu lanjut.", "info");
    }
  }, [act, notify]);

  /**
   * Menutup layar saat sesi Hardcore berjalan sama saja dengan menjauh: detak
   * jantung berhenti dan server memulai interupsi 45 detik kemudian. Dulu itu
   * terjadi dalam diam. Sekarang dinyatakan, dan kalau user tetap memilihnya
   * kita catat sebagai interupsi SUKARELA — yang zona bebasnya 1.5× lebih
   * panjang. Melapor memang harus lebih menguntungkan daripada menghilang.
   *
   * Zen tidak perlu dialog ini: modenya memang menjanjikan boleh membuka
   * aplikasi lain, dan FocusSessionKeeper meneruskan detaknya.
   */
  const requestClose = useCallback(() => {
    if (phase === "running" && room?.mode === "hardcore") {
      setConfirmHide(true);
      return;
    }
    onClose();
  }, [phase, room?.mode, onClose]);

  const hideWithPause = useCallback(async () => {
    setConfirmHide(false);
    await act("INTERRUPT_START");
    onClose();
  }, [act, onClose]);

  // Getar sekali setiap kali tingkat peringatan naik. Sengaja hanya pada
  // PERUBAHAN tingkat: getar tiap detik akan diabaikan orang dalam sepuluh
  // detik, dan peringatan yang diabaikan sama saja dengan tidak ada.
  const lastStageRef = useRef<string | null>(null);
  const awayStageKey =
    room?.viewer?.status === "interrupted"
      ? awayStage(
          interruptElapsedSecs,
          room.viewer.graceSecs ?? 60,
          room.viewer.interruptSecsLeft ?? room.interruptBudget.totalSecs,
        ).key
      : null;

  useEffect(() => {
    if (!awayStageKey) { lastStageRef.current = null; return; }
    if (lastStageRef.current === awayStageKey) return;
    lastStageRef.current = awayStageKey;
    const pattern = BUZZ[awayStageKey];
    if (pattern && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate(pattern); } catch { /* perangkat menolak; bukan masalah */ }
    }
  }, [awayStageKey]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <Shell onClose={onClose} label="Sesi Fokus">
        <div style={{ margin: "auto 0", textAlign: "center" }}>
          <div className="hp-spinner" style={{ margin: "0 auto 16px" }} />
          <div style={{ ...HP_TEXT.body, color: HP_TOKENS.onPrimary }}>Memuat sesi…</div>
        </div>
      </Shell>
    );
  }

  if (phase === "setup") {
    return (
      <Shell onClose={onClose} label={isTeam ? "Buat Ruang Bersama" : "Sesi Fokus"}>
        <div style={{ margin: "auto 0", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <BeeMascot mood="focus" size={92} showSpeech="Siap bekerja dalam diam?" />

          <div style={{ display: "flex", gap: 6, background: "rgba(0,0,0,0.2)", padding: 6, borderRadius: HP_TOKENS.radiusMd, width: "100%" }}>
            {[{ k: false, l: "Sendiri" }, { k: true, l: "Bareng tim" }].map((opt) => (
              <button
                key={String(opt.k)}
                onClick={() => setIsTeam(opt.k)}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: HP_TOKENS.radiusSm, border: "none",
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, cursor: "pointer",
                  background: isTeam === opt.k ? HP_TOKENS.card : "transparent",
                  color: isTeam === opt.k ? HP_TOKENS.ink : HP_TOKENS.onPrimary,
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>

          {isTeam && (
            <>
              <FieldInput
                placeholder="Judul sesi (wajib)"
                value={title}
                onChange={setTitle}
                invalid={Boolean(setupError) && title.trim().length < 3}
              />
              <FieldInput placeholder="Deskripsi singkat (opsional)" value={description} onChange={setDescription} />
            </>
          )}

          <ModePicker mode={mode} onChange={setMode} />
          <DurationPicker value={duration} onChange={setDuration} />

          {isTeam && (
            <div style={{ width: "100%" }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.onPrimary, opacity: 0.7, marginBottom: 8 }}>SIAPA YANG BOLEH MASUK</div>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { k: "public" as const, l: "Terbuka", d: "Siapa pun bisa langsung masuk" },
                  { k: "code" as const, l: "Pakai kode", d: "Perlu kode dari kamu" },
                ]).map((opt) => (
                  <button
                    key={opt.k}
                    onClick={() => setVisibility(opt.k)}
                    style={{
                      flex: 1, padding: 12, borderRadius: HP_TOKENS.radiusSm, cursor: "pointer",
                      textAlign: "left", fontFamily: HP_FONT,
                      background: visibility === opt.k ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)",
                      border: `1.5px solid ${visibility === opt.k ? HP_TOKENS.yellow : "rgba(255,255,255,0.12)"}`,
                      color: HP_TOKENS.onPrimary,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.l}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{opt.d}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {setupError && (
            <div role="alert" style={{ ...HP_TEXT.small, color: HP_TOKENS.dangerSoft }}>{setupError}</div>
          )}

          <button onClick={createRoom} disabled={busy} style={{ ...overlayBtn("primary"), opacity: busy ? 0.6 : 1 }}>
            {busy ? "Menyiapkan…" : isTeam ? "Buka Ruangan" : "Mulai Fokus"}
          </button>

          {/* Ditawarkan SEBELUM sesi mulai, bukan di tengahnya: menyiapkan
              lingkungan adalah bagian dari memulai, dan orang yang sudah masuk
              menit ketujuh tidak akan berhenti untuk mengutak-atik Settings.

              Penjelasannya ikut MASUK ke dalam tombol. Sebagai paragraf
              terpisah di bawah, ia terbaca sebagai keterangan layar — orang
              tidak menghubungkannya dengan tombol di atasnya, lalu tetap tidak
              tahu tombol itu sebenarnya untuk apa. Selebihnya di dalam lembar. */}
          <button
            onClick={() => setShowDnd(true)}
            style={{ ...overlayBtn("ghost"), textAlign: "left", padding: "11px 16px" }}
          >
            <span style={{ display: "block" }}>Matikan notifikasi lain dulu</span>
            <span style={{ display: "block", fontWeight: 500, fontSize: 12, opacity: 0.75, marginTop: 2 }}>
              WhatsApp dan aplikasi HP — cuma perangkatmu yang bisa
            </span>
          </button>

          {/* Dua paragraf, dua janji berbeda, dan keduanya harus bisa ditepati.
              Versi lama menulis "layar ini HARUS tetap di depan" — kata "harus"
              menyiratkan penegakan yang tidak pernah ada. Yang sebenarnya
              terjadi: layar ini dipakai sebagai bukti kehadiran, dan menutupnya
              menghentikan hitungan. Itu deteksi, bukan blokir, dan menyebutnya
              apa adanya justru membuat konsekuensinya lebih mudah dipahami. */}
          <p style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary, opacity: 0.65, textAlign: "center", margin: 0 }}>
            {mode === "hardcore"
              ? "Hardcore: layar ini jadi bukti kamu hadir — menutupnya menjeda timermu. Kamu punya jatah interupsi kalau ada hal mendadak."
              : "Zen: boleh buka aplikasi lain, timermu tetap jalan. Fokus pada targetmu, bukan pada layar."}
          </p>

        </div>

        {showDnd && <DndSheet onClose={() => setShowDnd(false)} />}
      </Shell>
    );
  }

  if (!room) return null;

  if (phase === "summary") return <Summary room={room} onClose={onClose} />;

  if (phase === "lobby") {
    return (
      <Shell onClose={onClose} label="Ruang Tunggu">
        <div style={{ margin: "auto 0", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ ...HP_TEXT.display, fontSize: 26, color: HP_TOKENS.onPrimary, textAlign: "center" }}>{room.name}</div>
          {room.description && (
            <div style={{ ...HP_TEXT.body, fontSize: 14, color: HP_TOKENS.onPrimary, opacity: 0.75, textAlign: "center" }}>{room.description}</div>
          )}

          {room.joinCode && <RoomInvite joinCode={room.joinCode} />}

          <Roster room={room} viewerId={String(user?.id ?? "")} canModerate={canModerate} onAct={act} />
          <JoinQueue room={room} canModerate={canModerate} onAct={act} />

          {isHost ? (
            <>
              <ModePicker mode={mode} onChange={setMode} />
              <DurationPicker value={duration} onChange={setDuration} />
              <button onClick={start} disabled={busy} style={{ ...overlayBtn("primary"), opacity: busy ? 0.6 : 1 }}>
                {busy ? "Memulai…" : "Mulai Sesi"}
              </button>
            </>
          ) : (
            <div style={{ padding: 28, borderRadius: HP_TOKENS.radiusLg, background: "rgba(0,0,0,0.2)", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div className="hp-spinner" />
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary }}>Menunggu host memulai sesi…</div>
            </div>
          )}

          <button onClick={leave} style={overlayBtn("ghost")}>Keluar dari ruangan</button>
          <button onClick={onClose} style={{ ...overlayBtn("ghost"), border: "none", opacity: 0.7 }}>
            Sembunyikan (tetap di ruangan)
          </button>
        </div>

        {hostOffer && <HostOfferPrompt onRespond={(accept) => { setHostOffer(null); void act(accept ? "ACCEPT_HOST" : "DECLINE_HOST"); }} />}
      </Shell>
    );
  }

  // ── Berjalan / Menjauh ───────────────────────────────────────────────────
  const budget = room.interruptBudget;
  const usedTurns = room.viewer?.interruptsUsed ?? 0;
  const progress = room.durationMins > 0 ? ((room.durationMins * 60 - remainingSecs) / (room.durationMins * 60)) * 100 : 0;

  if (phase === "away") {
    // Angka zona bebas datang dari server: sukarela dapat 1.5× lipat, dan Zen
    // jauh lebih longgar daripada Hardcore. Menghitungnya ulang di klien pernah
    // membuat hitungan mundur yang ditampilkan berbeda dari yang dipakai server.
    const graceSecs = room.viewer?.graceSecs ?? (room.mode === "zen" ? 180 : 60);
    const left = Math.max(0, graceSecs - interruptElapsedSecs);
    const secsLeftTotal = room.viewer?.interruptSecsLeft ?? budget.totalSecs;
    const stage = awayStage(interruptElapsedSecs, graceSecs, secsLeftTotal);

    return (
      <Shell onClose={onClose} label="Sedang Menjauh">
        <div style={{ margin: "auto 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, maxWidth: 360 }}>
          <div style={{ fontSize: 56 }}>{stage.emoji}</div>
          <div style={{ ...HP_TEXT.display, fontSize: 26, color: HP_TOKENS.onPrimary }}>{stage.title}</div>
          <div style={{ ...HP_TEXT.body, fontSize: 15, color: HP_TOKENS.onPrimary, opacity: 0.8 }}>
            {stage.body}
          </div>

          <div style={{ background: "rgba(0,0,0,0.22)", borderRadius: HP_TOKENS.radiusLg, padding: 20, width: "100%" }}>
            <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 40, color: stage.tone }}>
              {fmt(interruptElapsedSecs)}
            </div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary, opacity: 0.75, marginTop: 6 }}>
              {left > 0
                ? `Kembali dalam ${fmt(left)} agar tidak memakai jatah`
                : `Sisa total waktu menjauh: ${fmt(secsLeftTotal)}`}
            </div>
          </div>

          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary, opacity: 0.7 }}>
            Jatah interupsi terpakai: {usedTurns} dari {budget.allowance}
          </div>

          <button onClick={comeBack} style={overlayBtn("primary")}>Saya kembali</button>
          <button onClick={leave} style={overlayBtn("ghost")}>Akhiri sesi saya</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={requestClose} label={room.visibility === "solo" ? "Fokus Solo" : "Fokus Bersama"}>
      <div style={{ margin: "auto 0", width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.onPrimary, opacity: 0.6 }}>{room.name}</div>

        {room.visibility === "solo" && <BeeMascot mood="focus" size={72} />}

        <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 76, letterSpacing: -2, color: HP_TOKENS.onPrimary, lineHeight: 1 }}>
          {fmt(remainingSecs)}
        </div>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary, opacity: 0.7 }}>
          Selesai sekitar {clockOf(room.endsAt)}
        </div>

        <div style={{ width: 220 }}>
          <HPBar value={progress} tone="yellow" height={4} />
        </div>

        {room.visibility !== "solo" && (
          <>
            <Roster room={room} viewerId={String(user?.id ?? "")} canModerate={canModerate} onAct={act} />
            <JoinQueue room={room} canModerate={canModerate} onAct={act} />
          </>
        )}

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary, opacity: 0.65, textAlign: "center" }}>
          Jatah interupsi: {usedTurns}/{budget.allowance}
          {room.mode === "hardcore" && " · layar ini jadi bukti kehadiranmu"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
          <button onClick={stepAway} style={overlayBtn("ghost")}>Saya harus menjauh sebentar</button>
          {/* Jalan keluar kedua, untuk yang baru sadar HP-nya masih berbunyi.
              Di sini tanpa baris kedua: layarnya sudah padat, dan orang yang
              sampai ke sini biasanya sudah tahu tombol ini untuk apa. */}
          <button onClick={() => setShowDnd(true)} style={overlayBtn("ghost")}>Matikan notifikasi lain</button>
          {/* Memulai sendiri tidak seharusnya berarti terkunci sendirian sampai
              selesai. Timer tidak disentuh — hanya pintunya yang dibuka. */}
          {room.visibility === "solo" && isHost && (
            <button
              onClick={async () => {
                const res = await act("OPEN_TO_PUBLIC");
                if (res.ok) notify("Ruangan dibuka", "Sesimu sekarang tampil di lounge. Timermu tetap jalan.", "success");
                else notify("Gagal membuka", res.error ?? "", "warning");
              }}
              style={overlayBtn("ghost")}
            >
              Buka untuk umum
            </button>
          )}
          {isHost && room.visibility !== "solo" && (
            <button
              onClick={async () => { await act("END_FOR_ALL"); }}
              style={overlayBtn("warning")}
            >
              Akhiri sesi untuk semua
            </button>
          )}
          <button onClick={leave} style={overlayBtn("danger")}>
            {room.visibility === "solo" ? "Akhiri sesi" : "Keluar dari sesi"}
          </button>
        </div>

        <p style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary, opacity: 0.55, textAlign: "center", maxWidth: 320, margin: 0 }}>
          Keluar sekarang tetap dihitung: kamu dibayar untuk menit yang sudah kamu jalani.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ position: "absolute", bottom: 20, left: 20, right: 20, textAlign: "center", ...HP_TEXT.small, color: HP_TOKENS.dangerSoft }}>
          {error}
        </div>
      )}

      {hostOffer && <HostOfferPrompt onRespond={(accept) => { setHostOffer(null); void act(accept ? "ACCEPT_HOST" : "DECLINE_HOST"); }} />}

      {showDnd && <DndSheet onClose={() => setShowDnd(false)} />}

      {confirmHide && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: HP_TOKENS.card, borderRadius: HP_TOKENS.radiusLg, padding: 22,
            width: "100%", maxWidth: 380, textAlign: "left",
          }}>
            <div style={{ ...HP_TEXT.h, fontSize: 17, color: HP_TOKENS.ink }}>Menutup layar akan menjeda timermu</div>
            <div style={{ ...HP_TEXT.body, fontSize: 14, color: HP_TOKENS.inkSoft, marginTop: 8 }}>
              Mode Hardcore menghitung waktumu selama layar ini di depan. Menitmu
              yang sudah berjalan tetap aman — hitungannya hanya berhenti sampai
              kamu kembali.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <button onClick={hideWithPause} style={{ ...overlayBtn("warning"), background: HP_TOKENS.warningWash }}>
                Jeda &amp; tutup
              </button>
              <button
                onClick={() => setConfirmHide(false)}
                style={{ ...overlayBtn("ghost"), background: HP_TOKENS.sunken, color: HP_TOKENS.ink, border: "none" }}
              >
                Batal, lanjut fokus
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ── Bagian-bagian ───────────────────────────────────────────────────────────

function Shell({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: HP_TOKENS.sage,
      color: HP_TOKENS.onPrimary, fontFamily: HP_FONT, display: "flex", flexDirection: "column",
      animation: "hpFadeIn 300ms", overflowY: "auto",
    }}>
      <div style={{ padding: "40px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Sembunyikan" style={iconBtnStyle}>
          <HPGlyph name="close" size={18} color={HP_TOKENS.onPrimary} />
        </button>
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.onPrimary, opacity: 0.7 }}>{label}</div>
        <div style={{ width: 40 }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: 20, textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

function FieldInput({ placeholder, value, onChange, invalid }: {
  placeholder: string; value: string; onChange: (v: string) => void; invalid?: boolean;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "12px 16px", borderRadius: HP_TOKENS.radiusSm,
        border: `1.5px solid ${invalid ? HP_TOKENS.danger : "rgba(255,255,255,0.2)"}`,
        fontFamily: HP_FONT, fontSize: 14, outline: "none",
        background: "rgba(255,255,255,0.06)", color: HP_TOKENS.onPrimary,
      }}
    />
  );
}

function ModePicker({ mode, onChange }: { mode: "zen" | "hardcore"; onChange: (m: "zen" | "hardcore") => void }) {
  return (
    <div style={{ display: "flex", gap: 8, background: "rgba(0,0,0,0.2)", padding: 6, borderRadius: HP_TOKENS.radiusMd, width: "100%" }}>
      {([
        { k: "hardcore" as const, l: "🔥 Hardcore" },
        { k: "zen" as const, l: "🧘 Zen" },
      ]).map((opt) => (
        <button
          key={opt.k}
          onClick={() => onChange(opt.k)}
          style={{
            flex: 1, padding: "11px 12px", borderRadius: HP_TOKENS.radiusSm, border: "none",
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, cursor: "pointer",
            background: mode === opt.k ? HP_TOKENS.card : "transparent",
            color: mode === opt.k ? HP_TOKENS.ink : HP_TOKENS.onPrimary,
          }}
        >
          {opt.l}
        </button>
      ))}
    </div>
  );
}

/**
 * Durasi: empat pintasan, plus kolom ketik untuk sisanya.
 *
 * Presetnya tidak pernah salah — yang salah adalah menjadikannya satu-satunya
 * jalan. Server sudah menerima 5–300 menit sejak awal, dan `interruptBudget()`
 * di lib/focusRoom.ts bahkan punya cabang khusus untuk durasi di atas 90 menit.
 * Jadi empat angka ini murni batasan buatan layar, bukan batasan sistem.
 *
 * Kolom ketiknya menyimpan teksnya sendiri, bukan langsung angka milik induk.
 * Kalau tidak, "1" dalam perjalanan menuju "120" akan dijepit jadi 5 di tengah
 * ketikan — kolom yang melawan jarinya sendiri lebih buruk daripada tidak ada
 * kolom sama sekali. Penjepitan baru terjadi saat kolomnya ditinggalkan.
 */
function DurationPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // `null` berarti "ikut angka induk". Kolomnya sengaja tidak menyimpan salinan
  // dari `value`: salinan menuntut efek penyelaras, dan efek penyelaras adalah
  // cara paling umum kolom angka mulai berkelahi dengan tombol preset di
  // sebelahnya. Di sini preset cukup mengosongkan draft.
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const isCustom = !DURATION_PRESETS.includes(value);
  const shown = draft ?? String(value);

  const type = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 3);
    setDraft(digits);
    const n = Number(digits);
    // Hanya angka yang sudah sah yang diteruskan ke atas. Sisanya menunggu
    // blur — lihat catatan soal "120" di atas.
    if (digits !== "" && n >= MIN_DURATION_MINS && n <= MAX_DURATION_MINS) onChange(n);
  };

  const settle = () => {
    const n = Math.round(Number(shown));
    // Apa pun hasilnya, draft dilepas: kolom kembali menampilkan angka yang
    // benar-benar dipakai, bukan yang sempat diketik.
    setDraft(null);
    if (shown === "" || !Number.isFinite(n) || n <= 0) return;
    onChange(Math.min(MAX_DURATION_MINS, Math.max(MIN_DURATION_MINS, n)));
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.onPrimary, opacity: 0.7, marginBottom: 8 }}>DURASI</div>
      <div style={{ display: "flex", gap: 8 }}>
        {DURATION_PRESETS.map((d) => (
          <button
            key={d}
            onClick={() => { setDraft(null); onChange(d); }}
            aria-pressed={value === d}
            style={{
              flex: 1, padding: "12px 8px", borderRadius: HP_TOKENS.radiusSm, cursor: "pointer",
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 15,
              transition: "background 180ms ease, border-color 180ms ease",
              background: value === d ? HP_TOKENS.yellow : "rgba(255,255,255,0.06)",
              border: `1.5px solid ${value === d ? HP_TOKENS.yellow : "rgba(255,255,255,0.12)"}`,
              color: value === d ? HP_TOKENS.ink : HP_TOKENS.onPrimary,
            }}
          >
            {d}m
          </button>
        ))}
      </div>

      <label
        style={{
          display: "flex", alignItems: "center", gap: 10, marginTop: 8,
          padding: "11px 14px", borderRadius: HP_TOKENS.radiusSm, cursor: "text",
          transition: "background 180ms ease, border-color 180ms ease",
          background: isCustom ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
          border: `1.5px solid ${focused || isCustom ? HP_TOKENS.yellow : "rgba(255,255,255,0.12)"}`,
          outline: focused ? `2px solid ${HP_TOKENS.onPrimary}` : "none",
          outlineOffset: 2,
        }}
      >
        <span style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary, opacity: 0.75, flexShrink: 0 }}>
          Atau ketik sendiri
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={shown}
          onChange={(e) => type(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); settle(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); settle(); } }}
          aria-label={`Durasi dalam menit, ${MIN_DURATION_MINS} sampai ${MAX_DURATION_MINS}`}
          style={{
            flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 16, textAlign: "right",
            color: HP_TOKENS.onPrimary,
          }}
        />
        <span style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary, opacity: 0.75, flexShrink: 0 }}>menit</span>
      </label>

      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.onPrimary, opacity: 0.6, marginTop: 6, textAlign: "left" }}>
        Bebas antara {MIN_DURATION_MINS} sampai {MAX_DURATION_MINS} menit.
      </div>
    </div>
  );
}

type Platform = "ios" | "android" | "windows" | "mac" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPod/i.test(ua)) return "ios";
  // iPadOS 13+ menyamar sebagai Mac. Layar sentuh adalah pembeda yang tersisa.
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  return "other";
}

/** Nama shortcut yang diinstruksikan di panduan iOS; dipakai juga oleh deep link. */
const IOS_SHORTCUT_NAME = "Flowbee Fokus";

interface DndGuide {
  label: string;
  /**
   * Diatur SEKALI, lalu berjalan sendiri selamanya. Ini yang utama.
   *
   * Versi pertama panduan ini hanya punya langkah manual, dan itu keliru:
   * panduan yang harus dibaca ulang tiap sesi praktis sama dengan tidak ada
   * fitur. Yang mengubah perilaku orang bukan instruksi yang benar, melainkan
   * instruksi yang cukup dijalankan sekali.
   */
  once: { title: string; steps: string[] } | null;
  /** Cadangan untuk sekarang, saat setup sekali itu belum dikerjakan. */
  now: string[];
  note?: string;
}

/**
 * Panduan mendiamkan perangkat.
 *
 * Yang bisa kami tahan sendiri sudah ditahan tanpa minta izinmu: notifikasi
 * Flowbee (server + klien), situs distraksi, dan — sejak ekstensi memakai
 * `contentSettings` — SELURUH notifikasi web di Chrome. Yang tersisa hanyalah
 * aplikasi native di HP, dan tidak ada satu pun URL yang bisa menyalakan DND
 * dari halaman web: `App-Prefs:` API privat, `intent://` butuh aplikasi native.
 *
 * Tapi ada jalan yang bukan aplikasi native: mesin otomasi bawaan OS bisa
 * memicu DND "saat aplikasi dibuka", dan Flowbee memenuhi syarat sebagai
 * aplikasi begitu dipasang ke home screen (`app/manifest.ts` sudah
 * `display: standalone`). Itulah yang diinstruksikan `once` di bawah.
 */
const DND_STEPS: Record<Platform, DndGuide> = {
  ios: {
    // Label pendek: empat tab harus muat sebaris di layar HP 375px.
    label: "iPhone",
    once: {
      title: "Otomatis, atur sekali",
      steps: [
        "Pasang Flowbee ke home screen dulu: Share → “Add to Home Screen”. Kalau masih di tab Safari, otomasinya melihat “Safari dibuka”, bukan “Flowbee dibuka”.",
        "Buka app Shortcuts → tab Automation → “+” → “App”.",
        "Pilih app Flowbee, centang “Is Opened”, dan pilih “Run Immediately”.",
        "Tambah aksi “Set Focus” → Do Not Disturb → On. Simpan.",
      ],
    },
    now: [
      "Usap turun dari pojok kanan atas untuk membuka Control Center.",
      "Ketuk “Focus”, lalu pilih “Do Not Disturb”.",
    ],
    note: `Kalau kamu sudah punya shortcut bernama “${IOS_SHORTCUT_NAME}”, tombol di bawah bisa menjalankannya langsung.`,
  },
  android: {
    label: "Android",
    once: {
      title: "Otomatis, atur sekali (Samsung / Xiaomi)",
      steps: [
        "Pasang Flowbee ke home screen dulu: menu Chrome → “Install app”.",
        "Samsung: Settings → Modes and Routines → Routines → “+”. Xiaomi: Settings → Special features → Automation.",
        "Pemicu: “App opened” → pilih Flowbee.",
        "Aksi: “Do not disturb” → On. Simpan.",
      ],
    },
    now: [
      "Usap turun dua kali untuk membuka Quick Settings penuh.",
      "Ketuk “Jangan Ganggu” / “Do Not Disturb”.",
      "Tahan lama ikonnya untuk memilih pengecualian — mis. telepon keluarga tetap masuk.",
    ],
    note: "Android murni / Pixel belum punya pemicu “aplikasi dibuka”. Di sana pilihannya jadwal DND per jam kerja, atau tetap manual.",
  },
  windows: {
    label: "Windows",
    once: {
      title: "Otomatis per jam, atur sekali",
      steps: [
        "Settings → System → Notifications → “Turn on do not disturb automatically”.",
        "Centang “During these times”, lalu isi jam kerjamu.",
      ],
    },
    now: [
      "Tekan Win + N untuk membuka panel notifikasi.",
      "Klik “Do not disturb” / “Jangan ganggu”.",
    ],
    note: "Notifikasi situs web di Chrome sudah didiamkan otomatis oleh ekstensi FlowBuddy — langkah ini untuk aplikasi desktop seperti Slack atau Teams.",
  },
  mac: {
    label: "Mac",
    once: {
      title: "Otomatis per jam, atur sekali",
      steps: [
        "System Settings → Focus → Do Not Disturb → “Add Schedule”.",
        "Pilih “Time” dan isi jam kerjamu.",
      ],
    },
    now: [
      "Buka Control Center di menu bar kanan atas.",
      "Klik “Focus” → “Do Not Disturb” → pilih “For 1 hour”.",
    ],
    note: "Notifikasi situs web di Chrome sudah didiamkan otomatis oleh ekstensi FlowBuddy — langkah ini untuk aplikasi desktop seperti Slack atau Teams.",
  },
  other: {
    label: "Lainnya",
    once: null,
    now: [
      "Cari pengaturan “Do Not Disturb” atau “Jangan Ganggu” di sistemmu.",
      "Nyalakan selama sesi fokusmu berjalan.",
    ],
  },
};

/** Urutan tab. `other` sengaja tidak punya tab — ia hanya jaring pengaman deteksi. */
const DND_TABS: Platform[] = ["ios", "android", "windows", "mac"];

/**
 * Lembar panduan Jangan Ganggu. Memakai pola bottom-sheet yang sama dengan
 * konfirmasi tutup layar, supaya tidak ada bahasa visual baru untuk dipelajari.
 *
 * Deteksi otomatis dipakai untuk MEMILIH tab awal, bukan untuk mengunci
 * pilihannya. Bedanya menentukan: orang membuka Flowbee di laptop justru saat
 * yang berisik adalah HP-nya, dan panduan yang hanya mau menampilkan langkah
 * perangkat yang sedang dipegang akan menyembunyikan satu-satunya langkah yang
 * dia butuhkan.
 */
function DndSheet({ onClose }: { onClose: () => void }) {
  const detected = useMemo(() => detectPlatform(), []);
  const [tab, setTab] = useState<Platform>(() => (detected === "other" ? "android" : detected));
  const guide = DND_STEPS[tab];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: HP_TOKENS.card, borderRadius: HP_TOKENS.radiusLg, padding: 22,
        width: "100%", maxWidth: 380, textAlign: "left", maxHeight: "80vh", overflowY: "auto",
      }}>
        <div style={{ ...HP_TEXT.h, fontSize: 17, color: HP_TOKENS.ink }}>
          Matikan notifikasi lain
        </div>
        <div style={{ ...HP_TEXT.body, fontSize: 14, color: HP_TOKENS.inkSoft, marginTop: 8 }}>
          Notifikasi Flowbee sudah ditahan otomatis, dan ekstensi Chrome mendiamkan
          seluruh notifikasi web di laptop — WhatsApp Web, Gmail, Slack. Yang tersisa
          cuma aplikasi di HP, dan itu hanya perangkatnya sendiri yang bisa.
        </div>

        <div
          role="tablist"
          aria-label="Pilih perangkat"
          style={{
            display: "flex", gap: 4, marginTop: 16, padding: 4,
            background: HP_TOKENS.sunken, borderRadius: HP_TOKENS.radiusSm,
          }}
        >
          {DND_TABS.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={tab === p}
              onClick={() => setTab(p)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: HP_TOKENS.radiusXs, border: "none",
                cursor: "pointer", fontFamily: HP_FONT, fontWeight: 700, fontSize: 12,
                transition: "background 180ms ease, color 180ms ease",
                background: tab === p ? HP_TOKENS.card : "transparent",
                color: tab === p ? HP_TOKENS.ink : HP_TOKENS.inkMute,
              }}
            >
              {DND_STEPS[p].label}
            </button>
          ))}
        </div>

        {tab === detected && (
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 8 }}>
            Ini perangkat yang sedang kamu pakai.
          </div>
        )}

        {/* "Atur sekali" ditaruh DULU dan diberi latar, "cara sekarang"
            menyusul sebagai cadangan. Urutannya bukan selera: yang pertama
            dibaca orang adalah yang dianggap cara yang dimaksud, dan cara yang
            kita maksud memang yang dikerjakan sekali lalu berhenti menuntut. */}
        {guide.once && (
          <div style={{
            marginTop: 14, padding: 14, borderRadius: HP_TOKENS.radiusSm,
            background: HP_TOKENS.sunken,
          }}>
            <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.ink }}>
              {guide.once.title}
            </div>
            <ol style={{ margin: "10px 0 0", padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 7 }}>
              {guide.once.steps.map((s, i) => (
                <li key={i} style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.ink }}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.ink, marginTop: 16 }}>
          {guide.once ? "Atau nyalakan manual sekarang" : "Cara menyalakannya"}
        </div>
        <ol style={{ margin: "10px 0 0", padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 7 }}>
          {guide.now.map((s, i) => (
            <li key={i} style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.ink }}>{s}</li>
          ))}
        </ol>

        {/* Deep link hanya masuk akal di iOS, dan hanya kalau shortcut-nya sudah
            dibuat. Kalau belum ada, iOS membuka app Shortcuts dan tidak
            terjadi apa-apa — jadi tombolnya menyebut syaratnya, bukan berjanji. */}
        {tab === "ios" && (
          <a
            href={`shortcuts://run-shortcut?name=${encodeURIComponent(IOS_SHORTCUT_NAME)}`}
            style={{
              display: "block", marginTop: 14, padding: "11px 14px", textAlign: "center",
              borderRadius: HP_TOKENS.radiusSm, background: HP_TOKENS.primary,
              color: HP_TOKENS.onPrimary, fontFamily: HP_FONT, fontWeight: 700,
              fontSize: 13, textDecoration: "none",
            }}
          >
            Jalankan shortcut “{IOS_SHORTCUT_NAME}”
          </a>
        )}

        {guide.note && (
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 14 }}>
            {guide.note}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{ ...overlayBtn("ghost"), background: HP_TOKENS.sunken, color: HP_TOKENS.ink, border: "none" }}
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Undangan ruangan: kode yang bisa dibacakan, dan QR yang bisa dipindai.
 *
 * QR-nya membawa KODE, bukan id ruangan. Bedanya bukan kosmetik: id sengaja
 * berhenti identik dengan kode (lihat app/api/focus/rooms/resolve/route.ts —
 * endpoint itu ada persis untuk memisahkan keduanya), sementara kode memang
 * dibuat untuk dibagikan dan hangus begitu ruangannya selesai.
 *
 * Angka kodenya memakai `onPrimary`, bukan `yellowInk` seperti sebelumnya.
 * `yellowInk` adalah langkah warna untuk latar TERANG; di panel gelap ini ia
 * jatuh ke sekitar 1.6:1 — kode yang tidak terbaca sama saja dengan tidak ada
 * kode.
 */
function RoomInvite({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/?action=focus&focusCode=${encodeURIComponent(joinCode)}`;
  }, [joinCode]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard ditolak (halaman non-HTTPS, izin dicabut). Bukan jalan buntu:
      // kode di sebelahnya tetap bisa dibaca dan diketik manual.
    }
  }, [url]);

  return (
    <div style={{
      width: "100%", background: "rgba(0,0,0,0.2)", borderRadius: HP_TOKENS.radiusMd,
      padding: 16, display: "flex", gap: 16, alignItems: "center",
    }}>
      <div style={{ background: QR_LIGHT, padding: 8, borderRadius: HP_TOKENS.radiusSm, lineHeight: 0, flexShrink: 0 }}>
        {url ? (
          <QRCodeSVG
            value={url}
            size={100}
            level="M"
            bgColor={QR_LIGHT}
            fgColor={QR_DARK}
            marginSize={0}
            title={`Pindai untuk masuk ruangan, kode ${joinCode}`}
          />
        ) : (
          <div style={{ width: 100, height: 100 }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.onPrimary, opacity: 0.6 }}>KODE RUANGAN</div>
        <div style={{
          fontFamily: HP_FONT, fontWeight: 700, fontSize: 24, letterSpacing: 4,
          color: HP_TOKENS.onPrimary, wordBreak: "break-all",
        }}>
          {joinCode}
        </div>
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.onPrimary, opacity: 0.6, marginTop: 4 }}>
          Pindai dari HP untuk langsung masuk.
        </div>
        <button
          onClick={copy}
          style={{
            marginTop: 10, display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: HP_TOKENS.radiusXs, cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.25)", background: "transparent",
            color: HP_TOKENS.onPrimary, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12,
            transition: "background 180ms ease",
          }}
        >
          <HPGlyph name={copied ? "check" : "link"} size={13} color={HP_TOKENS.onPrimary} />
          {copied ? "Tautan disalin" : "Salin tautan"}
        </button>
      </div>
    </div>
  );
}

const STATUS_DOT: Record<string, { label: string; color: string }> = {
  focusing: { label: "fokus", color: HP_TOKENS.successInk },
  interrupted: { label: "menjauh", color: HP_TOKENS.warningInk },
  joined: { label: "siap", color: HP_TOKENS.infoInk },
};

/**
 * Daftar peserta — terlihat oleh SEMUA orang di ruangan, bukan hanya host.
 * Kehadiran sosial inilah yang membuat orang bertahan dalam sesi; versi lama
 * sengaja mengabaikan event JOIN untuk tamu, jadi tamu melihat ruangan kosong.
 */
function Roster({ room, viewerId, canModerate, onAct }: {
  room: FocusRoomState;
  viewerId: string;
  canModerate: boolean;
  onAct: (action: string, body?: Record<string, any>) => Promise<any>;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.onPrimary, opacity: 0.6, marginBottom: 10 }}>
        {room.participantCount} DARI {room.maxParticipants} ORANG
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {room.participants.map((p: FocusParticipant) => {
          const dot = STATUS_DOT[p.status] ?? STATUS_DOT.joined;
          const isSelf = String(p.id) === viewerId;
          return (
            <div key={p.id} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: 72 }}>
              <button
                onClick={() => canModerate && !isSelf ? setMenuFor(menuFor === p.id ? null : p.id) : undefined}
                style={{
                  border: `2px solid ${dot.color}`, borderRadius: "50%", padding: 2,
                  background: "transparent", cursor: canModerate && !isSelf ? "pointer" : "default",
                  opacity: p.status === "interrupted" ? 0.55 : 1,
                }}
                aria-label={p.name}
              >
                <HPAvatar name={p.name} image={p.avatar ?? undefined} size={44} />
              </button>
              <div style={{ ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.onPrimary, marginTop: 6, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name.split(" ")[0]}{p.isHost ? " ⭐" : ""}
              </div>
              <div style={{ ...HP_TEXT.small, fontSize: 10, color: dot.color }}>{dot.label}</div>
              {p.joinedAtMin !== null && (
                <div style={{ ...HP_TEXT.small, fontSize: 9, color: HP_TOKENS.onPrimary, opacity: 0.5 }}>
                  gabung menit ke-{p.joinedAtMin}
                </div>
              )}

              {menuFor === p.id && (
                <div style={{
                  position: "absolute", top: 56, zIndex: 5, background: HP_TOKENS.card,
                  borderRadius: HP_TOKENS.radiusSm, padding: 6, display: "flex", flexDirection: "column",
                  gap: 4, minWidth: 148, boxShadow: HP_TOKENS.shadowLg,
                }}>
                  <MenuItem label="Beri dispensasi" onClick={() => { setMenuFor(null); void onAct("EXCUSE", { targetId: p.id }); }} />
                  {room.viewer?.role === "host" && (
                    <>
                      <MenuItem
                        label={p.role === "comod" ? "Cabut co-moderator" : "Jadikan co-moderator"}
                        onClick={() => { setMenuFor(null); void onAct(p.role === "comod" ? "DEMOTE_COMOD" : "PROMOTE_COMOD", { targetId: p.id }); }}
                      />
                      <MenuItem label="Serahkan host" onClick={() => { setMenuFor(null); void onAct("OFFER_HOST", { targetId: p.id }); }} />
                    </>
                  )}
                  <MenuItem label="Keluarkan" tone="danger" onClick={() => { setMenuFor(null); void onAct("KICK", { targetId: p.id }); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Antrean permintaan masuk untuk ruangan `invite`.
 *
 * Sebelumnya tingkat visibilitas ini menolak semua orang tanpa pengecualian —
 * tidak ada jalan dari luar ke dalam, jadi ia praktis mengunci ruangan
 * selamanya. Sekarang permintaannya mengantre di sini, dan menjawabnya adalah
 * dua ketukan yang tidak menghentikan timer siapa pun.
 */
function JoinQueue({ room, canModerate, onAct }: {
  room: FocusRoomState;
  canModerate: boolean;
  onAct: (action: string, body?: Record<string, any>) => Promise<any>;
}) {
  const queue = room.pendingRequests ?? [];
  if (!canModerate || queue.length === 0) return null;

  return (
    <div style={{ width: "100%", background: "rgba(0,0,0,0.2)", borderRadius: HP_TOKENS.radiusMd, padding: 12 }}>
      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.onPrimary, opacity: 0.6, marginBottom: 10 }}>
        {queue.length} MENUNGGU PERSETUJUAN
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {queue.map((req) => (
          <div key={req.userId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <HPAvatar name={req.name} image={req.avatar ?? undefined} size={30} />
            <div style={{ ...HP_TEXT.small, flex: 1, minWidth: 0, color: HP_TOKENS.onPrimary, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {req.name}
            </div>
            <button
              onClick={() => void onAct("REJECT_JOIN", { targetId: req.userId })}
              style={{
                padding: "6px 10px", borderRadius: HP_TOKENS.radiusXs, cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.25)", background: "transparent",
                color: HP_TOKENS.onPrimary, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12,
              }}
            >
              Tolak
            </button>
            <button
              onClick={() => void onAct("APPROVE_JOIN", { targetId: req.userId })}
              style={{
                padding: "6px 12px", borderRadius: HP_TOKENS.radiusXs, cursor: "pointer",
                border: "none", background: HP_TOKENS.yellow, color: HP_TOKENS.ink,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 12,
              }}
            >
              Terima
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuItem({ label, onClick, tone }: { label: string; onClick: () => void; tone?: "danger" }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 10px", borderRadius: HP_TOKENS.radiusXs, border: "none", cursor: "pointer",
        background: "transparent", textAlign: "left", fontFamily: HP_FONT, fontWeight: 600, fontSize: 12,
        color: tone === "danger" ? HP_TOKENS.danger : HP_TOKENS.ink,
      }}
    >
      {label}
    </button>
  );
}

/**
 * Tawaran host muncul sebagai bar tipis, bukan layar penuh. Orang yang sedang
 * deep-work tidak boleh dihentikan oleh urusan administratif.
 */
function HostOfferPrompt({ onRespond }: { onRespond: (accept: boolean) => void }) {
  return (
    <div style={{
      position: "absolute", top: 88, left: 16, right: 16, zIndex: 60,
      background: HP_TOKENS.card, borderRadius: HP_TOKENS.radiusMd, padding: 14,
      display: "flex", alignItems: "center", gap: 12, boxShadow: HP_TOKENS.shadowLg,
    }}>
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.ink }}>Kamu ditawari jadi host</div>
        <div style={{ ...HP_TEXT.small, fontSize: 12, color: HP_TOKENS.inkMute }}>Timer tetap jalan. Peran ini pasif kecuali ada yang butuh.</div>
      </div>
      <button onClick={() => onRespond(false)} style={{ padding: "8px 12px", borderRadius: HP_TOKENS.radiusXs, border: `1px solid ${HP_TOKENS.line}`, background: "transparent", color: HP_TOKENS.inkMute, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: HP_FONT }}>Tolak</button>
      <button onClick={() => onRespond(true)} style={{ padding: "8px 12px", borderRadius: HP_TOKENS.radiusXs, border: "none", background: HP_TOKENS.primary, color: HP_TOKENS.onPrimary, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: HP_FONT }}>Terima</button>
    </div>
  );
}

const OUTCOME_COPY: Record<string, { emoji: string; title: string; body: string }> = {
  completed: { emoji: "🎉", title: "Fokus penuh selesai", body: "Kamu bertahan sampai akhir." },
  partial: { emoji: "👏", title: "Sesi selesai sebagian", body: "Tidak sampai akhir, tapi menitmu tetap dihitung." },
  excused: { emoji: "🤝", title: "Sesi selesai dengan dispensasi", body: "Host menandai kepergianmu sebagai hal yang wajar." },
  abandoned: { emoji: "🌱", title: "Sesi tidak terlanjutkan", body: "Sesi ini berhenti di tengah jalan. Tidak apa-apa — coba lagi nanti." },
  removed: { emoji: "🚪", title: "Kamu dikeluarkan dari sesi", body: "Sesi ini tidak menghasilkan poin." },
};

/**
 * Ringkasan yang menggantikan dua layar lama: "TEAM COMBO BERHASIL!" dan layar
 * merah "Sesi Gagal! 😡". Keduanya berbohong dengan cara berbeda — yang satu
 * menampilkan multiplier yang tidak pernah aktif, yang satu menghanguskan kerja
 * yang sudah nyata dilakukan.
 */
function Summary({ room, onClose }: { room: FocusRoomState; onClose: () => void }) {
  const outcome = room.viewer?.outcome ?? "abandoned";
  const copy = OUTCOME_COPY[outcome] ?? OUTCOME_COPY.abandoned;
  const mins = room.viewer?.focusedMins ?? 0;
  const points = room.viewer?.awardedPoints;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: HP_TOKENS.sage, color: HP_TOKENS.onPrimary,
      fontFamily: HP_FONT, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 24, textAlign: "center", gap: 8,
    }}>
      <div style={{ fontSize: 60 }}>{copy.emoji}</div>
      <div style={{ ...HP_TEXT.display, fontSize: 26, color: HP_TOKENS.onPrimary }}>{copy.title}</div>
      <div style={{ ...HP_TEXT.body, fontSize: 15, color: HP_TOKENS.onPrimary, opacity: 0.8, maxWidth: 320 }}>{copy.body}</div>

      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: HP_TOKENS.radiusLg, padding: "20px 28px", marginTop: 16, minWidth: 220 }}>
        <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 40, color: HP_TOKENS.onPrimary }}>{mins}</div>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.onPrimary, opacity: 0.75 }}>menit fokus terbukti</div>
        {typeof points === "number" && (
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.yellowInk, marginTop: 10, fontWeight: 700 }}>
            {points > 0 ? `+${points} Poin` : "Belum cukup untuk berpoin (minimal 10 menit)"}
          </div>
        )}
      </div>

      <button onClick={onClose} style={{ ...overlayBtn("primary"), marginTop: 28, maxWidth: 240 }}>Selesai</button>
    </div>
  );
}
