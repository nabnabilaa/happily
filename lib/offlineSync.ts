'use client';

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

export function getOfflineCheckIns(): OfflineCheckIn[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CHECKIN_QUEUE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function queueOfflineCheckIn(userId: string, mood: string, energy: string | null, tag: string | null) {
  if (typeof window === 'undefined') return;
  const queue = getOfflineCheckIns();
  const newItem: OfflineCheckIn = {
    id: Math.random().toString(36).substring(2, 9),
    userId,
    mood,
    energy,
    tag,
    timestamp: Date.now(),
  };
  queue.push(newItem);
  localStorage.setItem(CHECKIN_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineCheckIn(id: string) {
  if (typeof window === 'undefined') return;
  const queue = getOfflineCheckIns().filter(item => item.id !== id);
  localStorage.setItem(CHECKIN_QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineXP(): OfflineXP[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(XP_QUEUE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function queueOfflineXP(userId: string, actionType: string, description?: string) {
  if (typeof window === 'undefined') return;
  const queue = getOfflineXP();
  const newItem: OfflineXP = {
    id: Math.random().toString(36).substring(2, 9),
    userId,
    actionType,
    description,
    timestamp: Date.now(),
  };
  queue.push(newItem);
  localStorage.setItem(XP_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineXP(id: string) {
  if (typeof window === 'undefined') return;
  const queue = getOfflineXP().filter(item => item.id !== id);
  localStorage.setItem(XP_QUEUE_KEY, JSON.stringify(queue));
}

export async function syncOfflineData(userId: string, awardXP: (actionType: string, description?: string) => Promise<void>): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) return false;

  const checkins = getOfflineCheckIns().filter(item => item.userId === userId);
  const xps = getOfflineXP().filter(item => item.userId === userId);

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
        clearOfflineCheckIn(item.id);
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
      clearOfflineXP(item.id);
      successCount++;
    } catch (e) {
      console.error('Failed to sync XP item:', item, e);
    }
  }

  return successCount > 0;
}
