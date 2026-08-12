"use client";

import React, { useCallback, useEffect, useState } from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import HPButton from "@/components/ui/HPButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Stack, Row, HPChip, IconBadge } from "@/components/ui";

/**
 * Halaman alat vendor. Tidak ditautkan dari mana pun di aplikasi.
 *
 * Alamat yang tidak ditautkan BUKAN pengamanannya — yang mengamankan adalah
 * daftar `REVIEW_MODE_OWNERS` di environment, yang diperiksa di server (lihat
 * `app/api/owner/review-mode/route.ts`). Alamat tersembunyi hanya menjawab
 * masalah yang berbeda: saat aplikasi ditunjukkan ke perusahaan yang menilai,
 * yang memegang layar adalah pemiliknya sendiri. Tombol "Mode review: Menyala"
 * yang nangkring di konsol HR akan memberi tahu penonton persis apa yang sedang
 * mereka lihat. Halaman terpisah membuatnya tidak pernah muncul di layar selama
 * demo berjalan.
 *
 * Yang bukan pemilik menerima 404 dari API, dan halaman ini ikut tidak
 * menampilkan apa-apa — sama seperti alamat yang memang tidak ada.
 */

type Status = { enabled: boolean; lockedByEnv: boolean; updatedAt: string | null };

export default function StudioPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/owner/review-mode");
        if (!alive) return;
        if (!res.ok) { setDenied(true); return; }
        setStatus(await res.json());
      } catch {
        if (alive) setDenied(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const apply = useCallback(async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/review-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengubah mode review");
        if (typeof data.enabled === "boolean") {
          setStatus({ enabled: data.enabled, lockedByEnv: Boolean(data.lockedByEnv), updatedAt: null });
        }
        return;
      }
      setStatus(data);
    } catch {
      setError("Mode review tidak berubah. Coba lagi.");
    } finally {
      setBusy(false);
      setConfirmOff(false);
    }
  }, []);

  const page: React.CSSProperties = {
    height: "100dvh", overflowY: "auto", background: HP_TOKENS.paper,
    padding: "40px 20px", display: "flex", justifyContent: "center",
  };

  // Persis seperti alamat yang tidak ada. Tidak menyebut "kamu tidak berhak",
  // karena itu sudah memberi tahu bahwa ada sesuatu di sini.
  if (denied) {
    return (
      <div style={{ ...page, alignItems: "center" }}>
        <span style={{ ...HP_TEXT.small }}>404</span>
      </div>
    );
  }

  if (!status) return <div style={page} />;

  const { enabled, lockedByEnv } = status;

  return (
    <div style={page}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Stack gap={4}>
          <Stack gap={1}>
            <span style={{ ...HP_TEXT.sub, fontSize: 17 }}>Studio</span>
            <span style={{ ...HP_TEXT.small }}>
              Alat pemilik aplikasi. Halaman ini tidak ditautkan dari mana pun dan
              tidak terlihat oleh pengguna lain.
            </span>
          </Stack>

          <HPCard
            padding={16}
            style={enabled ? { background: HP_TOKENS.yellowSoft, borderColor: HP_TOKENS.yellowInk } : undefined}
          >
            <Stack gap={3}>
              <Row gap={3} align="flex-start">
                <IconBadge size={32} tone={enabled ? HP_TOKENS.yellowSoft : HP_TOKENS.sunken}>
                  <HPGlyph
                    name={enabled ? "lock" : "eye"}
                    size={16}
                    color={enabled ? HP_TOKENS.yellowInk : HP_TOKENS.inkSoft}
                  />
                </IconBadge>
                <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                  <Row gap={2}>
                    <span style={{ ...HP_TEXT.sub, fontSize: 14 }}>Mode review</span>
                    <HPChip tone={enabled ? "warning" : "neutral"} dot>
                      {enabled ? "Menyala" : "Mati"}
                    </HPChip>
                  </Row>
                  <span style={{ ...HP_TEXT.small }}>
                    {enabled
                      ? "Nama, email, foto, departemen, dan jabatan semua akun sedang diganti nama palsu — termasuk milikmu sendiri, di semua perangkat. Isi task, chat, KPI, dan poin tetap apa adanya."
                      : "Ganti identitas semua akun dengan nama palsu saat aplikasi ditunjukkan ke pihak luar. Data di database tidak diubah, jadi mematikannya memulihkan tampilan seketika."}
                  </span>
                </Stack>
              </Row>

              {lockedByEnv ? (
                <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft }}>
                  Dikunci lewat environment (ANONYMIZE_DATA) supaya tidak bisa
                  dimatikan dari dalam aplikasi selama sesi review berlangsung.
                  Hapus variabel itu di dashboard hosting untuk membuka kuncinya.
                </span>
              ) : (
                <HPButton
                  variant={enabled ? "secondary" : "primary"}
                  size="sm"
                  fullWidth
                  loading={busy}
                  icon={enabled ? "eye" : "lock"}
                  onClick={() => (enabled ? setConfirmOff(true) : apply(true))}
                >
                  {enabled ? "Matikan mode review" : "Nyalakan mode review"}
                </HPButton>
              )}

              {error && (
                <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft }}>{error}</span>
              )}

              <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft }}>
                Perubahan berlaku di perangkat lain dalam hitungan detik. Muat
                ulang layar yang sedang terbuka agar tidak setengah tersamar.
              </span>
            </Stack>
          </HPCard>
        </Stack>
      </div>

      {confirmOff && (
        <ConfirmDialog
          title="Matikan mode review?"
          description="Nama, email, dan foto asli seluruh karyawan akan kembali terlihat di semua perangkat. Pastikan tidak ada orang luar yang sedang melihat aplikasi."
          confirmLabel="Ya, tampilkan data asli"
          tone="danger"
          onConfirm={async () => { await apply(false); }}
          onCancel={() => setConfirmOff(false)}
        />
      )}
    </div>
  );
}
