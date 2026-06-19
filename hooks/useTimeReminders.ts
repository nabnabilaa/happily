import { useState, useEffect, useRef, useMemo } from 'react';

export function useTimeReminders(
  rawState: any, 
  rawUser: any, 
  todayAttendance: any, 
  updateState: any, 
  openModal: any
) {
  const [greeting, setGreeting] = useState('');
  const [reminder, setReminder] = useState<{ type: 'break' | 'clockout' | 'meeting', mins: number, sessionWith?: string } | null>(null);
  const [midDayCheckInShown, setMidDayCheckInShown] = useState(false);
  
  const notifiedBreakDay = useRef<string>("");
  const notifiedClockoutDay = useRef<string>("");

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

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 11) setGreeting('Selamat pagi');
    else if (h < 15) setGreeting('Selamat siang');
    else if (h < 19) setGreeting('Selamat sore');
    else setGreeting('Selamat malam');

    const triggerNotification = async (title: string, message: string, type: string) => {
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
      if (rawUser?.id) {
        try {
          await fetch("/api/ext/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: rawUser.id,
              title,
              message,
              type
            })
          });
          
          updateState((s: any) => ({
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
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      if (!rawState?.workSchedule) return;
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toDateString();

      const parseTime = (t: string) => {
        const [hh, mm] = t.split(':').map(Number);
        return hh * 60 + mm;
      };

      const breakStart = parseTime(rawState.workSchedule.breakStart);
      const workEnd = parseTime(rawState.workSchedule.end);
      const midDayTime = parseTime(rawState.workSchedule.midDayCheckInTime || "12:00");

      if (currentMins >= breakStart - 15 && currentMins < breakStart) {
        setReminder({ type: 'break', mins: breakStart - currentMins });
        
        if (notifiedBreakDay.current !== todayStr) {
          notifiedBreakDay.current = todayStr;
          triggerNotification(
            "🥪 Bentar Lagi Istirahat!",
            `Kurang dari ${breakStart - currentMins} menit lagi waktu istirahat siangmu tiba. Yuk, bersiap-siap untuk rehat sejenak! 🌿`,
            "reminder"
          );
        }
      } else if (currentMins >= workEnd - 15 && currentMins < workEnd && !rawState?.todayAttendance?.checkOut) {
        setReminder({ type: 'clockout', mins: workEnd - currentMins });

        if (notifiedClockoutDay.current !== todayStr) {
          notifiedClockoutDay.current = todayStr;
          triggerNotification(
            "🌙 Bentar Lagi Pulang!",
            `Kurang dari ${workEnd - currentMins} menit lagi jam kerjamu selesai. Yuk, persiapkan refleksi Tutup Hari kamu! ✨`,
            "reminder"
          );
        }
      } else if (currentMins >= midDayTime && currentMins < midDayTime + 15 && !midDayCheckInShown) {
        openModal('work_checkin');
        setMidDayCheckInShown(true);
        setReminder(null);
      } else if (currentMins >= workEnd + 15) {
        const todayStr = now.toDateString();
        const lastOvertimePrompt = localStorage.getItem('lastOvertimePromptDay');
        
        if (lastOvertimePrompt !== todayStr && rawState.overtimeStatus !== 'forgot_clockout') {
           localStorage.setItem('lastOvertimePromptDay', todayStr);
           openModal('overtime_prompt');
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
  }, [rawState?.workSchedule, rawState?.todayAttendance, isClockedIn, isClockedOut, rawUser?.id, updateState, midDayCheckInShown, openModal]);

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
      const todayStr = now.toDateString();
      const lastPopupStr = localStorage.getItem('lastAutoClockInPrompt');
      
      if (lastPopupStr !== todayStr) {
        localStorage.setItem('lastAutoClockInPrompt', todayStr);
        const timer = setTimeout(() => {
          openModal('attendance_scanner');
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [rawState, rawUser, isClockedIn, isClockedOut, todayAttendance, openModal]);

  return { greeting, reminder, isClockedIn, isClockedOut, midDayCheckInShown };
}
