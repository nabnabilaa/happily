import { useState, useEffect, useMemo } from 'react';
import { calculateWellbeingScore } from '@/lib/wellbeingEngine';

export function useCoachNudge(
  rawState: any, 
  rawUser: any, 
  todayAttendance: any, 
  isClockedIn: boolean, 
  isClockedOut: boolean, 
  openModal: any
) {
  const [coachNudge, setCoachNudge] = useState<{ text: string, type: 'support' | 'warning' | 'cheer' }>({ 
    text: "Semangat ya! Kamu sudah melakukan yang terbaik hari ini. ✨", 
    type: 'cheer' 
  });
  const [centralNudge, setCentralNudge] = useState<{ id: string; type: 'kudos' | 'senggol'; from: string; message: string; } | null>(null);

  useEffect(() => {
    const generateNudge = () => {
      if (!rawState || !rawState.workSchedule) return;
      
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const parseTime = (t: string) => {
        const [hh, mm] = t.split(':').map(Number);
        return hh * 60 + mm;
      };
      
      const breakStart = parseTime(rawState.workSchedule.breakStart || "12:00");
      const breakEnd = parseTime(rawState.workSchedule.breakEnd || "13:00");
      const workStart = parseTime(rawState.workSchedule.start || "08:00");
      
      if (isClockedOut) {
        setCoachNudge({
          text: "Kamu sudah selesai hari ini! Selamat istirahat dan pulihkan energimu. 🌙",
          type: 'cheer'
        });
        return;
      }
      
      if (!isClockedIn) {
         if (currentMins < workStart - 60) {
            setCoachNudge({ text: "Selamat pagi! Jam kerjamu belum dimulai, santai dulu ya! 🌅", type: 'cheer' });
         } else {
            setCoachNudge({ text: "Halo! Kamu belum clock-in nih. Yuk segera absen biar waktumu mulai dihitung! ⏰", type: 'warning' });
         }
         return;
      }

      if (currentMins >= breakStart && currentMins < breakEnd) {
         setCoachNudge({
            text: "Sekarang waktunya istirahat! Tinggalkan pekerjaan sejenak dan nikmati makan siangmu. 🥪",
            type: 'cheer'
         });
         return;
      }
      
      const lastAct = rawState.lastActivityDate ? new Date(rawState.lastActivityDate) : now;
      let lastActTime = lastAct.getTime();
      if (todayAttendance?.checkInAt) {
         const checkInTime = new Date(todayAttendance.checkInAt).getTime();
         if (checkInTime > lastActTime) {
            lastActTime = checkInTime;
         }
      }
      
      const hoursInactive = (now.getTime() - lastActTime) / (1000 * 60 * 60);

      if (hoursInactive >= 3) {
        setCoachNudge({
          text: "Hai! Aku lihat kamu belum update task selama 3 jam. Ada kendala yang bisa aku bantu? 🤔",
          type: 'warning'
        });
        return;
      }

      if (rawState.mood === 'tired' || rawState.mood === 'stress') {
        setCoachNudge({
          text: "Kamu terlihat lelah. Coba istirahat 5 menit atau minum air putih dulu yuk. Kesehatanmu prioritas utama! 💧",
          type: 'support'
        });
        return;
      }

      const cheerMessages = [
        "Progress KPI kamu keren hari ini! Pertahankan ritmenya. ✨",
        "Kecil tapi rutin itu lebih baik. Terus melangkah ya! 🌱",
        "Semangat! Jangan lupa minum air yang cukup hari ini. 💧",
        "Jangan lupa bernapas dalam-dalam. Kamu memegang kendali hari ini. 🧘‍♂️"
      ];
      setCoachNudge({
        text: cheerMessages[Math.floor(Math.random() * cheerMessages.length)],
        type: 'cheer'
      });
    };

    generateNudge();
    const interval = setInterval(generateNudge, 60000);
    return () => clearInterval(interval);
  }, [rawState?.workSchedule, rawState?.todayAttendance, isClockedIn, isClockedOut]);

  // Auto-Popup Coach for Critical Wellbeing
  useEffect(() => {
    if (!rawState || !rawUser) return;
    const { score } = calculateWellbeingScore(rawState, rawUser);
    
    if (score < 40) {
      const todayStr = new Date().toDateString();
      const lastPopupStr = localStorage.getItem('lastCoachPopupDay');
      
      if (lastPopupStr !== todayStr) {
        const timer = setTimeout(() => {
          openModal('coach');
          localStorage.setItem('lastCoachPopupDay', todayStr);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [rawState, rawUser, openModal]);

  // Auto-Popup Mascot for New Kudos (Apresiasi) & Senggol (Nudge)
  useEffect(() => {
    if (!rawState || !rawUser || !rawState.feed) return;
    
    const latestKudos = rawState.feed.find((f: any) => f.to === rawUser.name);
    if (latestKudos) {
      const lastSeenKudosId = localStorage.getItem(`lastSeenKudos_${rawUser.id}`);
      if (lastSeenKudosId !== String(latestKudos.id)) {
        localStorage.setItem(`lastSeenKudos_${rawUser.id}`, String(latestKudos.id));
        if (lastSeenKudosId !== null) {
          setCentralNudge({
            id: String(latestKudos.id),
            type: 'kudos',
            from: latestKudos.from,
            message: latestKudos.msg
          });
          return;
        }
      }
    }
    
    if (rawState.logbook) {
       const latestSenggol = rawState.logbook.find((l: any) => l.type === 'nudge_received');
       if (latestSenggol) {
          const lastSeenSenggolId = localStorage.getItem(`lastSeenSenggol_${rawUser.id}`);
          if (lastSeenSenggolId !== String(latestSenggol.id)) {
             localStorage.setItem(`lastSeenSenggol_${rawUser.id}`, String(latestSenggol.id));
             if (lastSeenSenggolId !== null) {
                setCentralNudge({
                   id: String(latestSenggol.id),
                   type: 'senggol',
                   from: latestSenggol.metadata_json ? JSON.parse(latestSenggol.metadata_json).from : 'Sistem',
                   message: latestSenggol.content || 'Ayo semangat, jangan melamun!'
                });
             }
          }
       }
    }
  }, [rawState?.feed, rawState?.logbook, rawUser?.id, rawUser?.name]);

  const beeMood = useMemo(() => {
    if (!rawState) return 'happy';
    const now = new Date();
    
    if (isClockedOut) return 'idle';
    if (!isClockedIn) return 'idle';

    const parseTime = (t: string) => {
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };
    
    if (rawState.workSchedule) {
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const breakStart = parseTime(rawState.workSchedule.breakStart || "12:00");
      const breakEnd = parseTime(rawState.workSchedule.breakEnd || "13:00");
      if (currentMins >= breakStart && currentMins < breakEnd) return 'eating';
    }

    const lastAct = rawState.lastActivityDate ? new Date(rawState.lastActivityDate) : now;
    const hoursInactive = (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60);

    if (hoursInactive >= 3) return 'sad';
    if (rawState.mood === 'tired' || rawState.mood === 'burnout') return 'sleepy';
    return 'idle';
  }, [rawState, isClockedOut, isClockedIn]);

  return { coachNudge, centralNudge, setCentralNudge, beeMood };
}
