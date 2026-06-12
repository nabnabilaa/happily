import { useState, useCallback } from 'react';

export function useHabitManager(
  updateState: any, 
  awardXP: any, 
  notify: any, 
  setConfetti: any, 
  setCelebrate: any
) {
  const [selectedHabitDay, setSelectedHabitDay] = useState<{ name: string, date: Date, isToday: boolean, done: boolean } | null>(null);
  const [habitNote, setHabitNote] = useState("");

  const handleHabitDayClick = useCallback((name: string, date: Date, isToday: boolean, done: boolean) => {
    setSelectedHabitDay({ name, date, isToday, done });
    setHabitNote("");
  }, []);

  const processHabitToggle = useCallback((name: string, date: Date, isToday: boolean, wasDone: boolean, newDone: boolean, note: string) => {
    if (newDone && !wasDone) { 
      notify('Latihan Selesai! 💪', '+20 Point', 'success');
      awardXP('habit_complete', `Latihan: ${name}`);
    }

    updateState((s: any) => {
      const hIndex = s.habits.findIndex((h: any) => h.name === name);
      if (hIndex === -1) return s;
      
      const newHabits = [...s.habits];
      const habit = newHabits[hIndex];

      let newDoneToday = habit.done;
      let newStreak = habit.streak;

      if (newDone && !wasDone) newStreak += 1;
      if (!newDone && wasDone) newStreak = Math.max(0, newStreak - 1);

      if (isToday) {
        newDoneToday = newDone;
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
        points: newDone && !wasDone ? 20 : 0,
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
  }, [updateState, awardXP, notify]);

  const handleFinishTraining = useCallback((name: string) => {
    setConfetti(true);
    setCelebrate({show: true, points: 500, message: `Tamat Training: ${name}`});
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
  }, [updateState, awardXP, setConfetti, setCelebrate]);

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

  return {
    selectedHabitDay,
    setSelectedHabitDay,
    habitNote,
    setHabitNote,
    handleHabitDayClick,
    handleFinishTraining,
    saveHabitDay,
    handleQuickComplete
  };
}
