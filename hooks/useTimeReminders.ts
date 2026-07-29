import { useState, useEffect, useRef, useMemo } from 'react';
import { scrollIntoViewSafely } from "@/lib/motion";

/**
 * Guard "sekali sehari" yang tahan remount.
 *
 * Sebelumnya guard-nya cuma `useRef` di dalam hook, jadi ikut hilang setiap
 * HomeScreen/ManagerHomeScreen/HRHomeScreen unmount (pindah tab, reload, HMR).
 * Akibatnya notifikasi istirahat/pulang dikirim ulang tiap kali user balik ke
 * tab Home selama jendela 15 menit masih aktif.
 *
 * Map di level modul menahan spam antar-mount dalam satu sesi halaman,
 * localStorage menahan spam antar-reload.
 */
const DAILY_CLAIM_PREFIX = 'hp_daily_notice_';
const memoryClaims = new Map<string, string>();

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function claimOncePerDay(key: string): boolean {
  const today = todayKey();
  if (memoryClaims.get(key) === today) return false;

  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(DAILY_CLAIM_PREFIX + key) === today) {
      memoryClaims.set(key, today);
      return false;
    }
  } catch {
    // localStorage tidak tersedia (private mode) — jatuh ke guard memori saja
  }

  memoryClaims.set(key, today);
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(DAILY_CLAIM_PREFIX + key, today);
  } catch {
    /* noop */
  }
  return true;
}

function greetingFor(h: number): string {
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export function useTimeReminders(
  rawState: any,
  rawUser: any,
  todayAttendance: any,
  updateState: any,
  openModal: any
) {
  // Seeded during render, not in an effect. It used to start as '' and only get
  // its value on the first effect pass — fine while nothing rendered it, but the
  // Home screen title now leads with the greeting, and an empty first paint
  // showed as a bare ", Nabila" for a frame. The effect below still runs, so the
  // greeting keeps updating when the clock crosses a boundary mid-session.
  const [greeting, setGreeting] = useState(() => greetingFor(new Date().getHours()));
  const [reminder, setReminder] = useState<{ type: 'break' | 'clockout' | 'meeting', mins: number, sessionWith?: string } | null>(null);
  const [midDayCheckInShown, setMidDayCheckInShown] = useState(false);

  // "Latest ref" supaya interval tidak perlu di-recreate tiap kali object state
  // dapat identity baru dari fetchData/SSE refresh.
  const latestRef = useRef<any>(null);
  latestRef.current = { rawState, rawUser, updateState, openModal };

  const isClockedIn = useMemo(() => {
    return !!todayAttendance?.checkInAt;
  }, [todayAttendance]);

  const isClockedOut = useMemo(() => {
    if (todayAttendance?.checkOutAt) return true;
    if (!rawState || !rawState.logbook) return false;
    const now = new Date();
    return rawState.logbook.some((l: any) => {
      if (l.type !== 'daily_reflection') return false;
      const d = new Date(l.created_at || l.id);
      return d.toDateString() === now.toDateString();
    });
  }, [rawState, todayAttendance]);

  // Dep primitif: interval hanya dibangun ulang kalau jadwal kerjanya benar-benar
  // berubah, bukan setiap kali object workSchedule di-replace oleh refresh.
  const ws = rawState?.workSchedule;
  const scheduleKey = ws
    ? `${ws.start}|${ws.end}|${ws.breakStart}|${ws.breakEnd}|${ws.midDayCheckInTime}`
    : '';

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));

    const triggerNotification = async (title: string, message: string, type: string) => {
      const { rawUser: currentUser, updateState: currentUpdateState } = latestRef.current;

      // 1. Browser Native HTML5 Notification
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission === "granted") {
          new Notification(title, {
            body: message,
            icon: "/icon-192.png"
          });
        }
      }

      // 2. Database persistent Notification
      if (currentUser?.id) {
        try {
          await fetch("/api/ext/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUser.id,
              title,
              message,
              type,
              // Pengaman kedua di server: kalau baris identik sudah ada hari ini,
              // insert (dan email-nya) dilewati.
              dedupeWindowMinutes: 720
            })
          });

          currentUpdateState((s: any) => ({
            ...s,
            notifications: (s.notifications || 0) + 1
          }));
        } catch (e) {
          console.error("Failed to persist time reminder:", e);
        }
      }
    };

    const handleScrollToClockIn = () => {
      let retries = 5;
      const tryScroll = () => {
        const el = document.getElementById('attendance-clock-in-btn');
        if (el) {
          scrollIntoViewSafely(el, { behavior: 'smooth', block: 'center' });
          el.style.transition = 'transform 0.3s ease';
          el.style.transform = 'scale(1.05)';
          setTimeout(() => el.style.transform = 'scale(1)', 350);
        } else if (retries > 0) {
          retries--;
          setTimeout(tryScroll, 200);
        }
      };
      setTimeout(tryScroll, 100);
    };
    window.addEventListener('hp_scroll_to_clock_in', handleScrollToClockIn);

    const checkTime = () => {
      const { rawState: currentState, rawUser: currentUser, openModal: currentOpenModal } = latestRef.current;
      if (!currentState?.workSchedule) return;

      // Both prompts below ask about a workday in progress. Neither question
      // makes sense to someone who never clocked in — "are you working
      // overtime?" at 17:15 on a day off is the app talking to itself.
      // `isClockedIn`/`isClockedOut` are in this effect's dep list, so the
      // interval is rebuilt when they flip.
      const onTheClock = isClockedIn && !isClockedOut;

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const userKey = currentUser?.id || 'anon';

      const parseTime = (t: string) => {
        const [hh, mm] = t.split(':').map(Number);
        return hh * 60 + mm;
      };

      const schedule = currentState.workSchedule;
      const breakStart = parseTime(schedule.breakStart);
      const workEnd = parseTime(schedule.end);
      const midDayTime = parseTime(schedule.midDayCheckInTime || "12:00");

      if (currentMins >= breakStart - 15 && currentMins < breakStart) {
        setReminder({ type: 'break', mins: breakStart - currentMins });

        if (claimOncePerDay(`${userKey}:break`)) {
          // Jangan tulis hitung mundur ke dalam pesan yang tersimpan permanen —
          // angkanya akan beku di "15 menit" selamanya di riwayat notifikasi.
          triggerNotification(
            "🥪 Bentar Lagi Istirahat!",
            `Waktu istirahat siangmu mulai pukul ${schedule.breakStart}. Yuk, bersiap untuk rehat sejenak! 🌿`,
            "reminder"
          );
        }
      } else if (currentMins >= workEnd - 15 && currentMins < workEnd && !currentState?.todayAttendance?.checkOut) {
        setReminder({ type: 'clockout', mins: workEnd - currentMins });

        if (claimOncePerDay(`${userKey}:clockout`)) {
          triggerNotification(
            "🌙 Bentar Lagi Pulang!",
            `Jam kerjamu selesai pukul ${schedule.end}. Yuk, persiapkan refleksi Tutup Hari kamu! ✨`,
            "reminder"
          );
        }
      } else if (currentMins >= midDayTime && currentMins < midDayTime + 15) {
        // Guard-nya dulu pakai state komponen, jadi modal ini muncul lagi tiap
        // kali screen remount selama jendela 15 menit.
        if (onTheClock && claimOncePerDay(`${userKey}:midday_checkin`)) {
          currentOpenModal('work_checkin');
          setMidDayCheckInShown(true);
        }
        setReminder(null);
      } else if (currentMins >= workEnd + 15) {
        // Cek status dulu, baru klaim — supaya slot harian tidak habis terpakai
        // saat prompt-nya memang sedang tidak boleh muncul.
        if (onTheClock && currentState.overtimeStatus !== 'forgot_clockout' && claimOncePerDay(`${userKey}:overtime_prompt`)) {
          currentOpenModal('overtime_prompt');
        }
        setReminder(null);
      } else {
        setReminder(null);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hp_scroll_to_clock_in', handleScrollToClockIn);
    };
  }, [scheduleKey, isClockedIn, isClockedOut, rawUser?.id]);

  // Auto-Popup Clock In
  useEffect(() => {
    if (!rawState || !rawUser || !rawState.workSchedule) return;
    if (todayAttendance === null) return; // wait for fetch
    if (isClockedIn || isClockedOut) return;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const parseTime = (t: string) => {
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };
    const workStart = parseTime(rawState.workSchedule.start || "08:00");

    if (currentMins >= workStart - 30) {
      if (claimOncePerDay(`${rawUser.id}:auto_clock_in`)) {
        const timer = setTimeout(() => {
          openModal('attendance_scanner');
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [rawState, rawUser, isClockedIn, isClockedOut, todayAttendance, openModal]);

  return { greeting, reminder, isClockedIn, isClockedOut, midDayCheckInShown };
}
