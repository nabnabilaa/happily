"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useHP, calculateLevelProgress } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import { 
  HP_MOODS, 
  HP_ENERGY, 
  HP_AI_INSIGHTS, 
  HP_HABITS, 
} from "@/lib/mockData";
import { generateAIInsights } from "@/lib/aiInsights";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
import BlobBackground from "@/components/home/BlobBackground";
import Confetti from "@/components/home/Confetti";
import EmotionalHero from "@/components/home/EmotionalHero";
import SectionHeader from "@/components/home/SectionHeader";
import PriorityCard from "@/components/home/PriorityCard";
import InsightCard from "@/components/home/InsightCard";
import HabitCell from "@/components/home/HabitCell";
import BeeMascot from "@/components/ui/BeeMascot";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";
import TaskCompleteModal from "@/components/modals/TaskCompleteModal";
import AttendanceWidget from "@/components/home/AttendanceWidget";
import SurveySection from "@/components/home/SurveySection";
import PresenceBoard from "@/components/home/PresenceBoard";


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


  useEffect(() => {
    const h = new Date().getHours();
    if (h < 11) setGreeting('Selamat pagi');
    else if (h < 15) setGreeting('Selamat siang');
    else if (h < 19) setGreeting('Selamat sore');
    else setGreeting('Selamat malam');

    // Time Check for Reminders
    const checkTime = () => {
      if (!rawState?.workSchedule) return;
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();

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
      } else if (currentMins >= workEnd - 15 && currentMins < workEnd) {
        setReminder({ type: 'clockout', mins: workEnd - currentMins });
      } else if (currentMins >= midDayTime && currentMins < midDayTime + 15 && !midDayCheckInShown) {
        // Trigger Mid-day Check-in at the scheduled time
        openModal('work_checkin');
        setMidDayCheckInShown(true);
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

  // When checking a task — if not done yet, open TaskCompleteModal. If already done, just un-check.
  const togglePriority = useCallback((id: number) => {
    const priority = rawState?.priorities?.find((p: any) => p.id === id);
    if (!priority) return;
    
    if (!priority.done) {
      // Task is being marked DONE → open completion modal
      setCompletingTask(priority);
    } else {
      // Task is being un-checked → just toggle
      updateState((s: any) => {
        const newPriorities = s.priorities.map((p: any) => 
          p.id === id ? { ...p, done: false } : p
        );

        const task = s.priorities.find((p: any) => p.id === id);
        const targetId = task?.goal_id || task?.kpi_id;
        const updatedGoals = s.goals.map((goal: any) => {
          if (targetId && String(goal.id) === String(targetId)) {
            let total = 0;
            let completed = 0;
            const match = String(goal.metric || '').match(/^(\d+)\/(\d+)\s+task/);
            if (match) {
              completed = parseInt(match[1]);
              total = parseInt(match[2]);
            } else {
              const todayTasks = newPriorities.filter((p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id)));
              total = todayTasks.length;
              completed = todayTasks.filter((p: any) => p.done).length;
            }

            const newCompleted = Math.max(0, completed - 1);
            const newProgress = total > 0 ? Math.round((newCompleted / total) * 100) : goal.progress;
            return { ...goal, progress: newProgress, metric: total > 0 ? `${newCompleted}/${total} task selesai` : goal.metric };
          }
          return goal;
        });

        return { ...s, priorities: newPriorities, goals: updatedGoals };
      });
    }
  }, [rawState, updateState]);

  // Called when user confirms task completion from TaskCompleteModal
  const confirmTaskComplete = useCallback((data: {
    proofLinks: string[]; isProject: boolean; metricValue?: number; notes?: string;
  }) => {
    if (!completingTask) return;
    const id = completingTask.id;

    setConfetti(true);
    setCelebrate(true);
    setTimeout(() => setConfetti(false), 1200);
    awardXP('priority_complete', `Selesaikan: ${completingTask.title}`);

    updateState((s: any) => {
      const pIndex = s.priorities.findIndex((p: any) => p.id === id);
      if (pIndex === -1) return s;

      const newPriorities = [...s.priorities];
      newPriorities[pIndex] = { 
        ...newPriorities[pIndex], 
        done: true,
        proof_links: data.proofLinks,
        is_project: data.isProject,
        metric_value: data.metricValue || null,
        completion_notes: data.notes || null,
        completed_at: new Date().toISOString(),
      };

      const now = new Date();
      const newLog = {
        id: Date.now(),
        type: 'quest_completion',
        title: newPriorities[pIndex].title,
        points: 15, // Spec v2: task_approved = 15 XP
        date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      // Submit metric value to KPI daily input API if applicable
      if (data.metricValue && newPriorities[pIndex].kpi_id) {
        fetch('/api/kpi/daily-input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: rawUser?.id,
            kpiId: newPriorities[pIndex].kpi_id,
            date: new Date().toISOString().slice(0, 10),
            value: data.metricValue,
            notes: data.notes || newPriorities[pIndex].title,
            proofLink: data.proofLinks[0] || null,
          })
        }).catch(e => console.error('KPI input failed:', e));
      }

      syncSkillProgress(newPriorities[pIndex].title + " " + (newPriorities[pIndex].kpi_title || ""), 2);

      // Recalculate goal progress for linked goals
      const task = newPriorities[pIndex];
      const targetId = task.goal_id || task.kpi_id;
      const updatedGoals = s.goals.map((goal: any) => {
        if (targetId && String(goal.id) === String(targetId)) {
          let total = 0;
          let completed = 0;
          const match = String(goal.metric || '').match(/^(\d+)\/(\d+)\s+task/);
          if (match) {
            completed = parseInt(match[1]);
            total = parseInt(match[2]);
          } else {
            const todayTasks = newPriorities.filter((p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id)));
            total = todayTasks.length;
            completed = todayTasks.filter((p: any) => p.done).length;
          }

          const newCompleted = Math.max(0, Math.min(total, completed + 1));
          const newProgress = total > 0 ? Math.round((newCompleted / total) * 100) : goal.progress;
          return { ...goal, progress: newProgress, metric: total > 0 ? `${newCompleted}/${total} task selesai` : goal.metric };
        }
        return goal;
      });

      return { 
        ...s, 
        priorities: newPriorities,
        goals: updatedGoals,
        logbook: [newLog, ...(s.logbook || [])],
        lastActivityDate: now.toISOString(),
        penaltyActive: false,
      };
    });

    setCompletingTask(null);
  }, [completingTask, updateState, awardXP, syncSkillProgress, rawUser]);

  const toggleHabit = useCallback((name: string) => {
    updateState((s: any) => {
      const hIndex = s.habits.findIndex((h: any) => h.name === name);
      if (hIndex === -1) return s;
      const habit = s.habits[hIndex];
      const wasDone = habit.done;
      
      const newHabits = [...s.habits];
      newHabits[hIndex] = { ...newHabits[hIndex], done: !wasDone };

      if (!wasDone) { 
        setConfetti(true); 
        setCelebrate(true);
        setTimeout(() => setConfetti(false), 1200); 
        awardXP('habit_complete', `Latihan: ${name}`);

        const now = new Date();
        const newLog = {
          id: Date.now(),
          type: 'habit_completion',
          habitName: name,
          glyph: habit.glyph,
          points: 30,
          date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };

        return { ...s, habits: newHabits, logbook: [newLog, ...(s.logbook || [])], lastActivityDate: now.toISOString(), penaltyActive: false };
      } else {
        return { ...s, habits: newHabits };
      }
    });
  }, [updateState, awardXP]);

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
          <div style={{ position: 'absolute', top: 18, right: 18 }}>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 openModal('system_guide');
               }}
               style={{
                 width: 34, height: 34, borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`,
                 background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                 cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
               }}
               className="hp-tap"
             >
               <HPGlyph name="book" size={16} color={HP_TOKENS.blue} />
             </button>
          </div>

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
                  {user.rank}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Total Points</div>
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
        <div style={{ marginTop: 24 }}>
          <SectionHeader 
            icon="target" 
            label="Task Harian" 
            count={`${done}/${total}`} 
            action="+ Tambah Task"
            onAction={() => openModal('manage_priorities')}
          />
          
          {/* Realization Progress Card */}
          <HPCard padding={20} style={{ 
            marginBottom: 20, 
            background: `linear-gradient(135deg, ${HP_TOKENS.sageWash} 0%, #fff 100%)`, 
            border: `1.5px solid ${HP_TOKENS.sage}20`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative background element */}
            <div style={{ 
              position: 'absolute', right: -20, top: -20, width: 100, height: 100, 
              borderRadius: 50, background: `${HP_TOKENS.sage}10`, zIndex: 0 
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                <div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>PROGRESS TASK HARI INI</div>
                  <div style={{ ...HP_TEXT.h, fontSize: 28, color: HP_TOKENS.ink }}>
                    {total > 0 ? Math.round((done / total) * 100) : 0}% 
                    <span style={{ fontSize: 14, color: HP_TOKENS.inkFade, fontWeight: 600, marginLeft: 8 }}>Tercapai</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 18, color: HP_TOKENS.sage }}>{done}/{total}</div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>Task Selesai</div>
                </div>
              </div>
              
              <div style={{ position: 'relative', height: 12, background: HP_TOKENS.lineSoft, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ 
                   width: `${total > 0 ? (done / total) * 100 : 0}%`, 
                   height: '100%', 
                   background: `linear-gradient(to right, ${HP_TOKENS.sage}, #4ADE80)`, 
                   borderRadius: 6,
                   transition: '1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                   boxShadow: `0 0 12px ${HP_TOKENS.sage}40`
                }} />
              </div>

              {/* Focus Task Sync Display */}
              {state.focusTaskId && (
                <div style={{ 
                  marginTop: 16, padding: '12px 16px', borderRadius: 12, 
                  background: 'rgba(255,255,255,0.6)', border: `1px dashed ${HP_TOKENS.yellow}`,
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: HP_TOKENS.yellowSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HPGlyph name="sparkle" size={16} color={HP_TOKENS.yellow} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>SEDANG FOKUS:</div>
                    <div style={{ ...HP_TEXT.body, fontSize: 13, fontWeight: 700, color: HP_TOKENS.ink }}>
                      {priorities.find((p: any) => p.id === state.focusTaskId)?.title || "Focus Task"}
                    </div>
                  </div>
                  <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.yellow }}>{state.focusProgress || 0}%</div>
                </div>
              )}


            </div>
          </HPCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {priorities.length > 0 ? (
              priorities.map((p: any) => (
                <PriorityCard key={p.id} p={p} onToggle={() => togglePriority(p.id)}/>
              ))
            ) : (
              <div style={{ 
                padding: '40px 20px', textAlign: 'center', 
                background: HP_TOKENS.card, borderRadius: 24, border: `1.5px dashed ${HP_TOKENS.line}`
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.inkMute }}>Belum ada target untuk hari ini.</div>
              </div>
            )}
            
            {priorities.length > 0 && (
              <button onClick={() => openModal('focus')} className="hp-tap" style={{
                padding: '18px', borderRadius: 20, border: 'none',
                background: HP_TOKENS.sage,
                color: '#fff', cursor: 'pointer', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                marginTop: 8,
                boxShadow: `0 8px 24px ${HP_TOKENS.sage}30`
              }}>
                <HPGlyph name="sparkle" size={20} color={HP_TOKENS.yellow}/>
                <span>Mulai Sesi Fokus Deep Work</span>
              </button>
            )}
          </div>
        </div>




        {/* Survey Section — Smart targeting + internal questions */}
        <SurveySection openModal={openModal} />

        {/* Presence Board — Team status */}
        <div style={{ marginTop: 24 }}>
          <SectionHeader icon="people" label="Status Tim" />
          <PresenceBoard openModal={openModal} />
        </div>


        {/* Habits - Moved to Wellbeing for Employee */}
        {user.role !== 'employee' && (
          <div style={{ marginTop: 24 }}>
            <SectionHeader 
              icon="leaf" 
              label="Daily Training" 
              action="Settings"
              onAction={() => openModal('manage_habits')}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {state.habits.map((h: any, i: number) => (
                <HabitCell key={i} h={h} onToggle={() => toggleHabit(h.name)}/>
              ))}
            </div>
          </div>
        )}

        {/* Professional Growth */}
        <div style={{ marginTop: 24 }}>
          <SectionHeader icon="heart" label="AI Coach Insights" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aiInsights.map((ins, i) => (
              <InsightCard key={i} ins={ins} idx={i}/>
            ))}
          </div>
        </div>

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

      {/* Task Completion Modal */}
      {completingTask && (
        <TaskCompleteModal 
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onConfirm={confirmTaskComplete}
        />
      )}
    </div>
  );
}

