"use client";

import { useState, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { queueOfflineCheckIn, queueOfflineXP } from "@/lib/offlineSync";

interface SaveMoodOptions {
  mood: string;
  energy?: string | null;
  tag?: string | null;
  /**
   * A quick save is the one-tap mood chip on the Wellbeing card: mood only, no
   * energy, no tag. It skips the morning-plan prompt, because that popup asks
   * you to plan a day you have only just started describing — the full check-in
   * has earned the right to interrupt, a single tap has not.
   */
  quick?: boolean;
  /** Caller shows its own toast. Avoids stacking two success messages on the
   *  mid-day and end-of-day flows, which already announce themselves. */
  silent?: boolean;
  /** Off for flows that award their own action (`midday_checkin`,
   *  `daily_reflection`), so recording a mood doesn't pay out twice. */
  awardPoints?: boolean;
}

/**
 * The one place mood check-ins are persisted.
 *
 * Extracted from CheckInModal so the inline chips on the Wellbeing card write
 * exactly the same state, hit the same endpoint, and fall back to the same
 * offline queue. Two copies of this would have drifted the first time one of
 * them learned something the other didn't.
 */
export function useMoodCheckIn() {
  const { updateState, awardXP, user, notify } = useHP();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveMood = useCallback(
    async ({ mood, energy = null, tag = null, quick = false, silent = false, awardPoints = true }: SaveMoodOptions) => {
      if (isSubmitting || !mood) return false;
      setIsSubmitting(true);

      // Optimistic: the UI must respond to the tap before the network does.
      // A quick save carries no energy or tag, and must not blank out values a
      // full check-in wrote earlier today — hence the functional update rather
      // than a flat patch of all three fields.
      const now = new Date().toISOString();
      updateState((s: any) => ({
        ...s,
        mood,
        energy: quick ? (s?.energy ?? null) : energy,
        tag: quick ? (s?.tag ?? null) : tag,
        // The engine's "two or more negative moods" rule reads moodHistory, and
        // until now only the mid-day and reflect modals ever wrote to it — the
        // morning check-in, the one people actually use, left no trace.
        moodHistory: [...(s?.moodHistory || []), { time: now, mood }],
        lastMoodCheckIn: now,
      }));

      const queueOffline = async () => {
        if (!user?.id) return;
        await queueOfflineCheckIn(user.id, mood, energy, tag);
        if (awardPoints) await queueOfflineXP(user.id, "mood_checkin", "Daily mood check-in");
      };

      if (typeof window !== "undefined" && !navigator.onLine) {
        await queueOffline();
        if (!silent) notify("Offline Check-In", "Tersimpan lokal. Akan disinkronkan otomatis saat online.", "warning");
        setIsSubmitting(false);
        return true;
      }

      try {
        const response = await fetch("/api/mood/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id, mood, energy, tag }),
        });

        if (!response.ok) {
          console.warn("API checkin returned non-OK status:", response.status);
          await queueOffline();
          if (!silent) notify("Check-In Tersimpan", "Tersimpan lokal karena kendala server. Akan disinkronkan otomatis.", "warning");
        } else {
          // Mood check-in berkunci per tanggal, jadi yang kedua di hari yang
          // sama bernilai nol. Poinnya disebut hanya kalau memang dibayar —
          // sebelumnya tidak pernah disebut sama sekali, jadi 5 poin masuk
          // tanpa ada yang tahu.
          const outcome = awardPoints
            ? await awardXP("mood_checkin", "Daily mood check-in")
            : null;
          const awarded = outcome?.awarded ?? 0;
          const bonus = awarded > 0 ? ` +${awarded} Poin` : "";

          if (silent) {
            // caller owns the messaging
          } else if (quick) {
            notify("Mood tercatat ✨", `Terima kasih!${bonus} Lengkapi energi dan catatan kapan saja.`, "success");
          } else {
            notify("Check-In Selesai ✨", `Terima kasih!${bonus} Jangan lupa untuk Clock In ya agar kehadiranmu tercatat.`, "success");
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("hp_show_morning_plan"));
            }, 300); // give it a moment to close the modal before continuing
          }
        }
      } catch (e) {
        console.error("Failed to save mood, queuing offline:", e);
        await queueOffline();
        if (!silent) notify("Check-In Tersimpan", "Tersimpan lokal karena kendala koneksi server.", "warning");
      } finally {
        setIsSubmitting(false);
      }

      return true;
    },
    [isSubmitting, updateState, user?.id, notify, awardXP],
  );

  return { saveMood, isSubmitting };
}
