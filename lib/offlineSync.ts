'use client';

import { get, set } from 'idb-keyval';

export interface OfflineCheckIn {
  id: string;
  userId: string;
  mood: string;
  energy: string | null;
  tag: string | null;
  timestamp: number;
}

export interface OfflineXP {
  id: string;
  userId: string;
  actionType: string;
  description?: string;
  /**
   * Identitas kejadian yang dibayar (`task:123`, `habit:nama:2026-08-07`).
   *
   * Inilah yang membuat pengiriman ulang aman: server memakainya sebagai kunci
   * idempoten dan membalas `already_awarded` kalau kejadian itu sudah dibayar.
   * Tanpa `refId`, mengosongkan antrean berisiko membayar dua kali untuk satu
   * pekerjaan — jadi antrean tanpa field ini lebih berbahaya daripada berguna.
   */
  refId?: string;
  timestamp: number;
}

const CHECKIN_QUEUE_KEY = 'hp_offline_checkins';
const XP_QUEUE_KEY = 'hp_offline_xp';

export async function getOfflineCheckIns(): Promise<OfflineCheckIn[]> {
  if (typeof window === 'undefined') return [];
  try {
    const data = await get(CHECKIN_QUEUE_KEY);
    return data || [];
  } catch (e) {
    return [];
  }
}

export async function queueOfflineCheckIn(userId: string, mood: string, energy: string | null, tag: string | null) {
  if (typeof window === 'undefined') return;
  const queue = await getOfflineCheckIns();
  const newItem: OfflineCheckIn = {
    id: Math.random().toString(36).substring(2, 9),
    userId,
    mood,
    energy,
    tag,
    timestamp: Date.now(),
  };
  queue.push(newItem);
  await set(CHECKIN_QUEUE_KEY, queue);
}

export async function clearOfflineCheckIn(id: string) {
  if (typeof window === 'undefined') return;
  const queue = await getOfflineCheckIns();
  const filtered = queue.filter(item => item.id !== id);
  await set(CHECKIN_QUEUE_KEY, filtered);
}

export async function getOfflineXP(): Promise<OfflineXP[]> {
  if (typeof window === 'undefined') return [];
  try {
    const data = await get(XP_QUEUE_KEY);
    return data || [];
  } catch (e) {
    return [];
  }
}

export async function queueOfflineXP(
  userId: string,
  actionType: string,
  description?: string,
  refId?: string
) {
  if (typeof window === 'undefined') return;
  const queue = await getOfflineXP();
  // Kejadian yang sama tidak perlu diantre dua kali; server akan menolaknya
  // lewat refId, tapi antrean yang menggelembung juga tidak ada gunanya.
  if (refId && queue.some((q) => q.refId === refId)) return;
  const newItem: OfflineXP = {
    id: Math.random().toString(36).substring(2, 9),
    userId,
    actionType,
    description,
    refId,
    timestamp: Date.now(),
  };
  queue.push(newItem);
  await set(XP_QUEUE_KEY, queue);
}

/**
 * Mengosongkan antrean XP yang tertunda.
 *
 * Sebelumnya tidak ada pemanggil sama sekali: `queueOfflineXP` hanya dipakai
 * satu tempat dan `getOfflineXP` tidak dipakai di mana pun, jadi apa pun yang
 * masuk antrean tinggal di sana selamanya. Pengiriman aman diulang karena
 * setiap butir membawa `refId` (lihat catatan di interface).
 *
 * Butir yang gagal DIPERTAHANKAN supaya bisa dicoba lagi nanti; hanya yang
 * benar-benar diterima server yang dibuang.
 */
export async function flushOfflineXP(): Promise<{ sent: number; kept: number }> {
  if (typeof window === 'undefined') return { sent: 0, kept: 0 };
  const queue = await getOfflineXP();
  if (queue.length === 0) return { sent: 0, kept: 0 };

  const remaining: OfflineXP[] = [];
  let sent = 0;

  for (const item of queue) {
    try {
      const res = await fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: item.userId,
          actionType: item.actionType,
          description: item.description,
          refId: item.refId,
        }),
      });
      // 2xx berarti server sudah memutuskan — termasuk `already_awarded`, yang
      // juga berarti selesai. Sisanya (401/5xx/jaringan) ditahan untuk nanti.
      if (res.ok) sent += 1;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  await set(XP_QUEUE_KEY, remaining);
  return { sent, kept: remaining.length };
}

export async function clearOfflineXP(id: string) {
  if (typeof window === 'undefined') return;
  const queue = await getOfflineXP();
  const filtered = queue.filter(item => item.id !== id);
  await set(XP_QUEUE_KEY, filtered);
}

// `awardXP` mengembalikan hasil pemberian poin, tapi di sini hasilnya memang
// tidak dipakai — antrean offline hanya perlu tahu permintaannya sudah dikirim.
// Tipe kembaliannya `unknown` supaya sinkronisasi tidak ikut berubah tiap kali
// bentuk jawabannya berubah.
export async function syncOfflineData(userId: string, awardXP: (actionType: string, description?: string) => Promise<unknown>): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) return false;

  const allCheckins = await getOfflineCheckIns();
  const checkins = allCheckins.filter(item => item.userId === userId);
  
  const allXPs = await getOfflineXP();
  const xps = allXPs.filter(item => item.userId === userId);

  if (checkins.length === 0 && xps.length === 0) return false;

  let successCount = 0;

  // 1. Sync Checkins
  for (const item of checkins) {
    try {
      const res = await fetch('/api/mood/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: item.userId,
          mood: item.mood,
          energy: item.energy,
          tag: item.tag,
        }),
      });
      if (res.ok) {
        await clearOfflineCheckIn(item.id);
        successCount++;
      }
    } catch (e) {
      console.error('Failed to sync check-in item:', item, e);
    }
  }

  // 2. Sync XP
  for (const item of xps) {
    try {
      await awardXP(item.actionType, item.description);
      await clearOfflineXP(item.id);
      successCount++;
    } catch (e) {
      console.error('Failed to sync XP item:', item, e);
    }
  }

  return successCount > 0;
}
