"use client";

import { useCallback, useEffect, useState } from "react";
import { useHP } from "@/lib/HPContext";

export interface QuotaEntry {
  used: number;
  /** null = aksi ini tidak punya kuota harian. */
  limit: number | null;
  value: number;
}

/**
 * Sisa jatah poin hari ini untuk sekumpulan aksi.
 *
 * Dipakai untuk penghitung hidup di widget ("Poin 3/5"). Kuota sengaja
 * ditampilkan di tempat aksinya dikerjakan, bukan sebagai tabel plafon di guide:
 * angka "3/5" di atas daftar task memberi dorongan pada saat yang tepat,
 * sementara tabel plafon hanya mengundang orang menjumlahkan seluruh kuota dan
 * mencari cara memerahnya.
 *
 * Ikut menyegarkan diri setiap kali ada poin diberikan, lewat event yang
 * dipancarkan HPContext — tanpa itu penghitungnya baru berubah setelah reload
 * dan justru terlihat seperti rusak.
 */
export function usePointsQuota(actions: string[]) {
  const { user } = useHP();
  const [quota, setQuota] = useState<Record<string, QuotaEntry>>({});

  // Distabilkan jadi string supaya array literal di pemanggil (`['task_complete']`,
  // yang identitasnya baru tiap render) tidak memicu fetch tanpa henti.
  const key = actions.join(",");

  const load = useCallback(async () => {
    if (!user?.id || !key) return;
    try {
      const res = await fetch(
        `/api/xp/award?userId=${encodeURIComponent(user.id)}&actions=${encodeURIComponent(key)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.quota) setQuota(data.quota);
    } catch {
      // Penghitung ini hiasan; kegagalannya tidak boleh mengganggu apa pun.
    }
  }, [user?.id, key]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("hp_points_changed", onChange);
    return () => window.removeEventListener("hp_points_changed", onChange);
  }, [load]);

  return quota;
}

/**
 * Label ringkas untuk satu aksi, atau null kalau aksinya tanpa kuota / belum
 * termuat. Pemanggil merender `null` sebagai "tidak menampilkan apa-apa" supaya
 * tidak ada kedipan "0/0" saat pemuatan pertama.
 */
export function quotaLabel(entry: QuotaEntry | undefined): string | null {
  if (!entry || entry.limit === null) return null;
  return `${Math.min(entry.used, entry.limit)}/${entry.limit}`;
}
