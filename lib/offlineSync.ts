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

export async function queueOfflineXP(userId: string, actionType: string, description?: string) {
  if (typeof window === 'undefined') return;
  const queue = await getOfflineXP();
  const newItem: OfflineXP = {
    id: Math.random().toString(36).substring(2, 9),
    userId,
    actionType,
    description,
    timestamp: Date.now(),
  };
  queue.push(newItem);
  await set(XP_QUEUE_KEY, queue);
}

export async function clearOfflineXP(id: string) {
  if (typeof window === 'undefined') return;
  const queue = await getOfflineXP();
  const filtered = queue.filter(item => item.id !== id);
  await set(XP_QUEUE_KEY, filtered);
}

export async function syncOfflineData(userId: string, awardXP: (actionType: string, description?: string) => Promise<void>): Promise<boolean> {
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
