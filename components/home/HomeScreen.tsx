"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useHP, calculateLevelProgress } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT,
  HP_MOODS,
  HP_ENERGY
} from "@/lib/constants";
import { generateAIInsights } from "@/lib/aiInsights";
import { calculateWellbeingScore } from "@/lib/wellbeingEngine";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
import BlobBackground from "@/components/home/BlobBackground";
import Confetti from "@/components/home/Confetti";
import EmotionalHero from "@/components/home/EmotionalHero";
import SectionHeader from "@/components/home/SectionHeader";
import InsightCard from "@/components/home/InsightCard";
import HabitCell from "@/components/home/HabitCell";
import BeeMascot from "@/components/ui/BeeMascot";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";
import TaskCompleteModal from "@/components/modals/TaskCompleteModal";
import OvertimePromptModal from "@/components/modals/OvertimePromptModal";
import WellbeingGauge from "@/components/home/WellbeingGauge";
import AttendanceWidget from "@/components/home/AttendanceWidget";
import TaskHarianWidget from "@/components/home/TaskHarianWidget";
import SurveySection from "@/components/home/SurveySection";
import PresenceBoard from "@/components/home/PresenceBoard";
import MoodWall from "@/components/home/MoodWall";


interface HomeScreenProps {
  tab: string;
  openModal: (name: string, props?: any) => void;
}



export default function HomeScreen({ openModal }: any) {
  const { state: rawState, updateState, updateUser, user: rawUser, syncSkillProgress, awardXP } = useHP();
  const [greeting, setGreeting] = useState('');
  const [confetti, setConfetti] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [reminder, setReminder] = useState<{ type: 'break' | 'clockout' | 'meeting', mins: number, sessionWith?: string } | null>(null);
  const [coachNudge, setCoachNudge] = useState<{ text: string, type: 'support' | 'warning' | 'cheer' }>({ 
    text: "Semangat ya! Kamu sudah melakukan yang terbaik hari ini. ✨", 
    type: 'cheer' 
  });
  const [midDayCheckInShown, setMidDayCheckInShown] = useState(false);
  const [completingTask, setCompletingTask] = useState<any>(null);
  const [selectedHabitDay, setSelectedHabitDay] = useState<{ name: string, date: Date, isToday: boolean, done: boolean } | null>(null);
  const [habitNote, setHabitNote] = useState("");

  const notifiedBreakDay = useRef<string>("");
  const notifiedClockoutDay = useRef<string>("");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 11) setGreeting('Selamat pagi');
    else if (h < 15) setGreeting('Selamat siang');
    else if (h < 19) setGreeting('Selamat sore');
    else setGreeting('Selamat malam');

    // Helper: Trigger browser and DB notifications
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

    // Time Check for Reminders
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

      // Check break reminder (15 mins before)
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
      } else if (currentMins >= workEnd - 15 && currentMins < workEnd) {
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
        // Trigger Mid-day Check-in at the scheduled time
        openModal('work_checkin');
        setMidDayCheckInShown(true);
        setReminder(null);
      } else if (currentMins >= workEnd + 15) {
        // Trigger Overtime Check Prompt if it's past work end + 15 mins
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

    // AI Nudge Logic (Duolingo Style)
    const generateNudge = () => {
      if (!rawState) return;
      
      const now = new Date();
      const lastAct = rawState.lastActivityDate ? new Date(rawState.lastActivityDate) : now;
      const hoursInactive = (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60);

      // 1. Inactivity Check (> 3 hours)
      if (hoursInactive >= 3) {
        setCoachNudge({
          text: "Hai! Aku lihat kamu belum update task selama 3 jam. Ada kendala yang bisa aku bantu? 🤔",
          type: 'warning'
        });
        return;
      }

      // 2. Fatigue/Stress Check
      if (rawState.mood === 'tired' || rawState.mood === 'stress') {
        setCoachNudge({
          text: "Kamu terlihat lelah. Coba istirahat 5 menit atau minum air putih dulu yuk. Kesehatanmu prioritas utama! 💧",
          type: 'support'
        });
        return;
      }

      // 3. Positive Reinforcement
      const cheerMessages = [
        "Progress KPI kamu keren hari ini! Pertahankan ritmenya. ✨",
        "Kecil tapi rutin itu lebih baik. Terus melangkah ya! 🌱",
        "Kamu luar biasa! Sudah 12 hari streak check-in tanpa putus. 🔥",
        "Jangan lupa bernapas dalam-dalam. Kamu memegang kendali hari ini. 🧘‍♂️"
      ];
      setCoachNudge({
        text: cheerMessages[Math.floor(Math.random() * cheerMessages.length)],
        type: 'cheer'
      });
    };

    generateNudge();
    
    return () => clearInterval(interval);
  }, [rawState?.workSchedule, rawState?.mood, rawState?.lastActivityDate]);

  // Auto-Popup Coach for Critical Wellbeing
  useEffect(() => {
    if (!rawState || !rawUser) return;
    const { score } = calculateWellbeingScore(rawState, rawUser);
    
    if (score < 40) {
      const todayStr = new Date().toDateString();
      const lastPopupStr = localStorage.getItem('lastCoachPopupDay');
      
      if (lastPopupStr !== todayStr) {
        // Delay popup slightly for better UX
        const timer = setTimeout(() => {
          openModal('coach');
          localStorage.setItem('lastCoachPopupDay', todayStr);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [rawState, rawUser, openModal]);



  const beeMood = useMemo(() => {
    if (!rawState) return 'happy';
    const now = new Date();
    const lastAct = rawState.lastActivityDate ? new Date(rawState.lastActivityDate) : now;
    const hoursInactive = (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60);

    if (hoursInactive > 4) return 'sad';
    if (rawState.mood === 'tired' || rawState.mood === 'burnout') return 'sleepy';
    if (rawState.mood === 'stress' || rawState.mood === 'anxious') return 'surprised';
    return 'happy';
  }, [rawState]);



  const handleHabitDayClick = useCallback((name: string, date: Date, isToday: boolean, done: boolean) => {
    setSelectedHabitDay({ name, date, isToday, done });
    setHabitNote("");
  }, []);

  const processHabitToggle = useCallback((name: string, date: Date, isToday: boolean, wasDone: boolean, newDone: boolean, note: string) => {
    if (newDone && !wasDone) { 
      setConfetti(true); 
      setCelebrate(true);
      setTimeout(() => setConfetti(false), 1200); 
      awardXP('habit_complete', `Latihan: ${name}`);
    }

    updateState((s: any) => {
      const hIndex = s.habits.findIndex((h: any) => h.name === name);
      if (hIndex === -1) return s;
      
      const newHabits = [...s.habits];
      const habit = newHabits[hIndex];

      let newDoneToday = habit.done;
      let newStreak = habit.streak;

      if (isToday) {
        newDoneToday = newDone;
      } else {
        if (newDone && !wasDone) newStreak += 1;
        if (!newDone && wasDone) newStreak = Math.max(0, newStreak - 1);
      }

      let newCompletedDates = habit.completedDates ? [...habit.completedDates] : [];
      if (!habit.completedDates) {
        const todayReal = new Date();
        for (let i = 0; i <= habit.streak; i++) {
          const d = new Date(todayReal);
          d.setDate(todayReal.getDate() - i);
          const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          if (i === 0) {
            if (habit.done) newCompletedDates.push(dStr);
          } else {
            newCompletedDates.push(dStr);
          }
        }
      }

      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (newDone && !newCompletedDates.includes(dateStr)) {
        newCompletedDates.push(dateStr);
      } else if (!newDone) {
        newCompletedDates = newCompletedDates.filter((d: string) => d !== dateStr);
      }

      newHabits[hIndex] = { ...habit, done: newDoneToday, streak: newStreak, completedDates: newCompletedDates };

      const newLog = {
        id: Date.now(),
        type: 'habit_completion',
        title: `Latihan: ${name}`,
        content: note || (newDone ? 'Selesai' : 'Belum Selesai'),
        habitName: name,
        glyph: habit.glyph,
        points: newDone && !wasDone ? 30 : 0,
        date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        day: date.toLocaleDateString('id-ID', { weekday: 'long' }),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        metadata_json: JSON.stringify({ isRetroactive: !isToday, status: newDone, notes: note })
      };

      return { 
        ...s, 
        habits: newHabits, 
        logbook: [newLog, ...(s.logbook || [])], 
        lastActivityDate: new Date().toISOString(), 
        penaltyActive: false 
      };
    });
  }, [updateState, awardXP]);

  const handleFinishTraining = useCallback((name: string) => {
    setConfetti(true);
    setCelebrate(true);
    setTimeout(() => setConfetti(false), 2000);
    awardXP('training_graduated', `Tamat Training: ${name}`);

    updateState((s: any) => {
      const hIndex = s.habits.findIndex((h: any) => h.name === name);
      if (hIndex === -1) return s;
      
      const newHabits = [...s.habits];
      const habit = newHabits[hIndex];
      newHabits.splice(hIndex, 1); // Remove from active training

      const newLog = {
        id: Date.now(),
        type: 'habit_completion', // Using same type or maybe milestone
        title: `Tamat Training: ${name} 🎓`,
        content: `Luar biasa! Kamu telah menyelesaikan program training ini.`,
        habitName: name,
        glyph: habit.glyph,
        points: 500,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        day: new Date().toLocaleDateString('id-ID', { weekday: 'long' }),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        metadata_json: JSON.stringify({ isRetroactive: false, status: true, notes: "Graduated" })
      };

      return { 
        ...s, 
        habits: newHabits, 
        logbook: [newLog, ...(s.logbook || [])], 
        lastActivityDate: new Date().toISOString(), 
        penaltyActive: false 
      };
    });
  }, [updateState, awardXP]);

  const saveHabitDay = useCallback((newDone: boolean) => {
    if (!selectedHabitDay) return;
    const { name, date, isToday, done: wasDone } = selectedHabitDay;
    
    processHabitToggle(name, date, isToday, wasDone, newDone, habitNote);

    setSelectedHabitDay(null);
    setHabitNote("");
  }, [selectedHabitDay, habitNote, processHabitToggle]);

  const handleQuickComplete = useCallback((name: string, date: Date, isToday: boolean, wasDone: boolean, newDone: boolean) => {
    processHabitToggle(name, date, isToday, wasDone, newDone, "");
  }, [processHabitToggle]);

  const aiInsights = useMemo(() => generateAIInsights(rawState, rawUser), [rawState, rawUser]);

  const levelProgress = calculateLevelProgress(rawUser?.points || 0);

  const energyHint = (e: string) => {
    if (e === 'low') return 'Energimu sedang rendah 🌱 Mulai dari task ringan dulu — handoff sinkron ikon cocok sekarang.';
    if (e === 'mid') return 'Energi sedang pas untuk kolaborasi 🌿 Review wireframe dulu, kirim handoff setelah lunch.';
    return 'Energi tinggi — cocok untuk deep work 🔥 Blok 90 menit tanpa gangguan?';
  };

  const state = rawState;
  const user = rawUser;
  if (!state || !user) return null;

  const priorities = state.priorities || [];
  const moodsList = state.moods || HP_MOODS;
  const energyList = state.energyOpts || HP_ENERGY;
  const currentMood = state.mood ?? null;
  const currentEnergy = state.energy ?? null;
  const moodObj = moodsList.find((m: any) => m.key === currentMood);
  const energyObj = energyList.find((e: any) => e.key === currentEnergy);
  const done = priorities.filter((p: any) => p.done).length;
  const total = priorities.length;

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 120, fontFamily: HP_FONT }}>
      <BlobBackground colors={[HP_TOKENS.yellowWash, '#fff', HP_TOKENS.paper]}/>
      <Confetti show={confetti}/>
      <CelebrationOverlay show={celebrate} onComplete={() => setCelebrate(false)} />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }} className="hp-stagger">
        
        {/* 🌡️ Wellbeing Score (Advanced Feature) */}
        <WellbeingGauge state={state} user={user} />

        {/* Top Card - Profile & Level */}
        <div style={{ 
          background: HP_TOKENS.card,
          borderRadius: 24,
          padding: '24px',
          marginTop: 16,
          border: `1px solid ${HP_TOKENS.line}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
          position: 'relative',
        }}>
          <div 
            onClick={() => openModal('profile_editor')}
            className="hp-tap"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <HPAvatar 
                  name={user.name} 
                  size={56} 
                  rank={user.rank}
                  levelProgress={levelProgress} 
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 20 }}>{user.name.split(' ')[0]}</div>
                  <div style={{ 
                    background: HP_TOKENS.yellow, color: HP_TOKENS.ink, fontSize: 10, fontWeight: 900, 
                    padding: '2px 8px', borderRadius: 6, letterSpacing: 0.5 
                  }}>
                    LV. {user.level}
                  </div>
                </div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, fontSize: 12, marginTop: 2 }}>
                  Rank {user.rank}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('system_guide');
                }}
                style={{
                  width: 36, height: 36, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
                className="hp-tap"
              >
                <HPGlyph name="book" size={16} color={HP_TOKENS.blue} />
              </button>
              <div className="hp-tap" style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12,
                background: HP_TOKENS.yellowSoft, fontFamily: HP_FONT, fontWeight: 900, fontSize: 14, color: HP_TOKENS.ink,
                border: `1px solid ${HP_TOKENS.yellow}`,
              }}>
                <HPGlyph name="zap" size={14} color={HP_TOKENS.ink} />
                <span>{user.streak}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Level Progress</div>
              <div style={{ width: '100%', height: 6, background: HP_TOKENS.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ 
                  width: `${levelProgress * 100}%`, height: '100%', 
                  background: HP_TOKENS.yellow, 
                  transition: '1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Total Point</div>
              <div style={{ ...HP_TEXT.h, fontSize: 24 }}>{user.points.toLocaleString()}</div>
            </div>
          </div>

          {/* AI Coach Nudge with Bee Mascot */}
          <div style={{ 
            background: HP_TOKENS.blueWash,
            borderRadius: 20,
            padding: '16px 20px',
            border: `1px solid ${HP_TOKENS.blue}30`,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 20
          }}>
            <BeeMascot mood={beeMood} size={60} showSpeech="" />
            <div style={{ ...HP_TEXT.body, fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: HP_TOKENS.ink }}>
              {coachNudge.text}
            </div>
          </div>
          <div style={{ 
            display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 16, 
            background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.line}`,
            marginBottom: 16
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 2 }}>JAM KERJA</div>
              <div style={{ ...HP_TEXT.body, fontSize: 13, fontWeight: 800 }}>
                {state.todayAttendance?.checkIn || state.workSchedule?.start} - {state.todayAttendance?.checkOut || state.workSchedule?.end}
              </div>
            </div>
            <div style={{ width: 1, background: HP_TOKENS.line }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 2 }}>ISTIRAHAT</div>
              <div style={{ ...HP_TEXT.body, fontSize: 13, fontWeight: 800 }}>
                {state.workSchedule?.breakStart} - {state.workSchedule?.breakEnd}
              </div>
            </div>
          </div>


          {/* Attendance Widget — Smart: Clock-in / Clock-out / Done */}
          <div style={{ marginTop: 12 }}>
            <AttendanceWidget openModal={openModal} />
          </div>
        </div>

        {/* HERO — Emotional check-in */}
        <div style={{ marginTop: 16 }}>
          <EmotionalHero 
            state={state} 
            moodObj={moodObj} 
            energyObj={energyObj} 
            onOpenCheckIn={() => openModal('checkin')}
          />
        </div>

        {/* Mindful Breathing Reset Card */}
        <div style={{ marginTop: 16 }}>
          <HPCard 
            padding={16} 
            style={{ 
              background: `linear-gradient(135deg, ${HP_TOKENS.sageWash} 0%, ${HP_TOKENS.blueWash} 100%)`, 
              border: `1.5px solid ${HP_TOKENS.sage}20`,
              boxShadow: '0 8px 24px rgba(74, 124, 89, 0.04)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ 
                width: 44, height: 44, borderRadius: 14, 
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)', fontSize: 20
              }}>
                🧘‍♂️
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.ink }}>
                  Butuh Jeda Sejenak?
                </div>
                <div style={{ ...HP_TEXT.body, fontSize: 12, color: HP_TOKENS.inkSoft, marginTop: 2, lineHeight: 1.4 }}>
                  Latihan bernapas Box Breathing 1 menit untuk menurunkan stress dan mengembalikan fokusmu.
                </div>
              </div>
              <button 
                onClick={() => openModal('pause')}
                className="hp-tap"
                style={{
                  padding: '10px 16px', borderRadius: 12, border: 'none',
                  background: HP_TOKENS.sage, color: '#fff',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  boxShadow: `0 4px 12px ${HP_TOKENS.sage}30`,
                  whiteSpace: 'nowrap'
                }}
              >
                Mulai Reset
              </button>
            </div>
          </HPCard>
        </div>

        {/* Smart Reminders */}
        {reminder && (
          <div style={{ marginTop: 16 }}>
            <HPCard padding={16} style={{ 
              background: reminder.type === 'break' ? HP_TOKENS.yellowWash : HP_TOKENS.sageWash, 
              border: `1.5px solid ${reminder.type === 'break' ? HP_TOKENS.yellow : HP_TOKENS.sage}`,
              animation: 'hpBounce 1s infinite'
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ 
                  width: 44, height: 44, borderRadius: 14, 
                  background: reminder.type === 'break' ? HP_TOKENS.yellow : reminder.type === 'meeting' ? HP_TOKENS.blue : HP_TOKENS.sage,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>
                  {reminder.type === 'break' ? '🥪' : reminder.type === 'meeting' ? '🎥' : '🌙'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 15 }}>
                    {reminder.type === 'break' ? 'Waktunya Istirahat!' : 'Bentar lagi Pulang!'}
                  </div>
                  <div style={{ ...HP_TEXT.body, fontSize: 13, marginTop: 2 }}>
                    {reminder.type === 'break' && `${reminder.mins} menit lagi istirahat. Yuk, siap-siap rehat sejenak! 🌿`}
                    {reminder.type === 'meeting' && `${reminder.mins} menit lagi meeting dengan ${reminder.sessionWith}. Link Meet sudah siap! 🚀`}
                    {reminder.type === 'clockout' && `${reminder.mins} menit lagi jam kerja selesai. Yuk, persiapkan refleksi Tutup Hari kamu! ✨`}
                  </div>
                </div>

                {reminder.type === 'clockout' && (
                  <button 
                    onClick={() => openModal('reflect')}
                    className="hp-tap"
                    style={{ 
                      padding: '8px 14px', borderRadius: 10, border: 'none', 
                      background: HP_TOKENS.sage, color: '#fff', 
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer'
                    }}
                  >
                    Tutup Hari
                  </button>
                )}
                {reminder.type === 'meeting' && (
                  <button 
                    onClick={() => state.coaching?.meetLink && window.open(state.coaching.meetLink, '_blank')}
                    className="hp-tap"
                    style={{ 
                      padding: '8px 14px', borderRadius: 10, border: 'none', 
                      background: HP_TOKENS.blue, color: '#fff', 
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <HPGlyph name="video" size={12} color="#fff" />
                    Join Meet
                  </button>
                )}
              </div>
            </HPCard>
          </div>
        )}




        {/* LAYER 2 — Task Harian */}
        <TaskHarianWidget 
          openModal={openModal} 
          onTaskComplete={() => {
            setConfetti(true);
            setCelebrate(true);
            setTimeout(() => setConfetti(false), 1200);
          }} 
        />




        {/* Survey Section — Smart targeting + internal questions */}
        <SurveySection openModal={openModal} />

        {/* Presence Board — Team status */}
        <div style={{ marginTop: 24 }}>
          <SectionHeader icon="people" label="Status Tim" />
          <PresenceBoard openModal={openModal} />
        </div>


        {/* Daily Training Habits */}
        <div style={{ marginTop: 24 }}>
          <SectionHeader 
            icon="leaf" 
            label="Daily Training" 
            action="Settings"
            onAction={() => openModal('manage_habits')}
          />
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', alignItems: 'stretch' }}>
            {state.habits.map((h: any, i: number) => (
              <div key={i} style={{ minWidth: 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <HabitCell 
                  h={h} 
                  onToggle={(date, isToday, done) => handleHabitDayClick(h.name, date, isToday, done)}
                  onQuickComplete={(date, isToday, wasDone, newDone) => handleQuickComplete(h.name, date, isToday, wasDone, newDone)}
                  onFinish={() => handleFinishTraining(h.name)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Professional Growth */}
        <div style={{ marginTop: 24 }}>
          <SectionHeader icon="heart" label="AI Coach Insights" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aiInsights.map((ins, i) => (
              <InsightCard key={i} ins={ins} idx={i}/>
            ))}
          </div>
        </div>

        {/* Anonymous Mood Wall */}
        {/* <MoodWall /> */}

        {/* Closing actions */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => openModal('reflect')} className="hp-tap" style={{
            width: '100%', padding: '18px', borderRadius: 16,
            background: HP_TOKENS.yellow, color: HP_TOKENS.ink,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
          }}>
            <HPGlyph name="moon" size={20} color={HP_TOKENS.ink} />
            <span>Evening Reflection</span>
          </button>

          <button onClick={() => openModal('logbook')} className="hp-tap" style={{
            width: '100%', padding: '16px', borderRadius: 16,
            background: 'transparent', color: HP_TOKENS.inkMute,
            border: `1.5px solid ${HP_TOKENS.line}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
          }}>
            <HPGlyph name="book" size={18} color={HP_TOKENS.inkMute}/>
            <span>View Activity Logbook</span>
          </button>

        </div>
      </div>



      {/* Habit Day Details Modal */}
      {selectedHabitDay && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', width: '100%', maxWidth: 500, borderRadius: '24px 24px 0 0',
            padding: 24, paddingBottom: 40, animation: 'hpSlideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ ...HP_TEXT.h, fontSize: 20 }}>{selectedHabitDay.name}</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                  {selectedHabitDay.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <button 
                onClick={() => setSelectedHabitDay(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, color: HP_TOKENS.inkFade }}
              >
                ✕
              </button>
            </div>

            {!selectedHabitDay.isToday && (
              <div style={{
                background: HP_TOKENS.yellowSoft, padding: 12, borderRadius: 12, marginBottom: 16,
                border: `1px solid ${HP_TOKENS.yellow}`, display: 'flex', gap: 10, alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div style={{ ...HP_TEXT.small, color: '#8A6814', lineHeight: 1.4 }}>
                  <strong>Konfirmasi:</strong> Kamu sedang mengubah data untuk hari yang sudah lewat. Apakah kamu terlewat atau salah pencet?
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkMute, display: 'block', marginBottom: 8 }}>
                Catatan Harian (Opsional)
              </label>
              <textarea 
                value={habitNote}
                onChange={(e) => setHabitNote(e.target.value)}
                placeholder="Ada yang ingin dicatat untuk sesi ini?"
                style={{
                  width: '100%', padding: 12, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: '#fafafa', fontFamily: HP_FONT, fontSize: 14, minHeight: 80, resize: 'vertical'
                }}
              />
              
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {[
                  { title: "Follow Up Meeting", content: "Melakukan diskusi terkait kebutuhan sistem pelaporan penjualan bulanan. Klien meminta penambahan fitur filter berdasarkan wilayah dan kategori produk. Tindak lanjut: tim development melakukan analisis kebutuhan dan estimasi waktu pengerjaan." },
                  { title: "Evaluasi Progress", content: "Progress pengembangan modul autentikasi dan dashboard telah mencapai 80%. Ditemukan beberapa kendala pada integrasi API eksternal. Dibutuhkan proses pengujian tambahan sebelum tahap deployment." },
                  { title: "Review Uji Coba", content: "Pengujian fungsi utama aplikasi berjalan sesuai kebutuhan. Ditemukan bug minor pada fitur pencarian data dan validasi input formulir. Perbaikan dijadwalkan pada sprint berikutnya." },
                  { title: "Rencana Fitur Baru", content: "Direncanakan penambahan fitur notifikasi otomatis untuk pengguna terkait aktivitas sistem dan pengingat tugas. Tahapan berikutnya adalah pembuatan desain antarmuka dan penyesuaian database." },
                  { title: "Monitoring Tim", content: "Seluruh anggota tim telah menyelesaikan tugas prioritas minggu ini. Fokus pekerjaan selanjutnya adalah optimalisasi performa aplikasi dan penyempurnaan pengalaman pengguna." },
                  { title: "Analisis Kebutuhan", content: "Berdasarkan hasil wawancara, pengguna membutuhkan tampilan data yang lebih ringkas dan mudah dipahami. Direkomendasikan penambahan grafik visual serta fitur ekspor laporan." }
                ].map(dummy => (
                  <button 
                    key={dummy.title}
                    onClick={() => setHabitNote(dummy.content)}
                    className="hp-tap"
                    style={{
                      padding: '6px 12px', borderRadius: 20, border: `1px solid ${HP_TOKENS.lineSoft}`,
                      background: HP_TOKENS.card, color: HP_TOKENS.inkFade, fontFamily: HP_FONT, fontSize: 11,
                      cursor: 'pointer', transition: '0.2s'
                    }}
                  >
                    {dummy.title}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button 
                onClick={() => saveHabitDay(true)}
                className="hp-tap"
                style={{
                  padding: '16px', borderRadius: 14, border: 'none',
                  background: HP_TOKENS.yellow, color: HP_TOKENS.ink,
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer'
                }}
              >
                Tandai Selesai
              </button>
              <button 
                onClick={() => saveHabitDay(false)}
                className="hp-tap"
                style={{
                  padding: '16px', borderRadius: 14, border: 'none',
                  background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkMute,
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer'
                }}
              >
                Belum Selesai
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

