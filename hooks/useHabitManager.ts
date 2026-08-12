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
  /**
   * Latihan terakhir yang benar-benar dibayar, beserta jumlahnya. Kartu latihan
   * memakainya untuk pil "+N poin"-nya; hanya kartu dengan nama yang cocok yang
   * boleh menampilkannya.
   *
   * Dipegang di hook, bukan di tiap layar, karena ketiga layar rumah memakai
   * hook yang sama dan tidak ada satu pun dari mereka yang perlu tahu caranya.
   */
  const [lastHabitAward, setLastHabitAward] = useState<{ name: string; awarded: number } | null>(null);

  const handleHabitDayClick = useCallback((name: string, date: Date, isToday: boolean, done: boolean) => {
    setSelectedHabitDay({ name, date, isToday, done });
    setHabitNote("");
  }, []);

  const processHabitToggle = useCallback(async (name: string, date: Date, isToday: boolean, wasDone: boolean, newDone: boolean, note: string): Promise<number> => {
    // Poin latihan hanya untuk HARI INI.
    //
    // Kalender latihan boleh diisi mundur untuk merapikan catatan, tapi hari
    // lampau tidak berpoin: dulu setiap centang retroaktif membayar penuh, jadi
    // seseorang bisa menyisir mundur berminggu-minggu dan memanen poin dalam
    // hitungan detik.
    //
    // Kuncinya `habit:<nama>:<tanggal>`, sehingga satu latihan hanya dibayar
    // sekali per hari — mematikan-lalu-menyalakan ulang centangnya tidak
    // menambah poin lagi.
    // Poin yang benar-benar dibayar server untuk centang ini.
    //
    // Kuota `habit_complete` hanya 2 per hari, jadi nol adalah hasil yang biasa,
    // bukan kasus pinggiran: centang latihan ketiga tetap tercatat tapi tidak
    // berpoin. Notifikasinya dulu berbunyi "+15 Poin" dan dikirim SEBELUM
    // `awardXP` dipanggil — jadi latihan ketiga, sesi kedaluwarsa, dan koneksi
    // putus semuanya tetap dirayakan dengan angka yang tidak pernah masuk.
    let awarded = 0;
    if (newDone && !wasDone && isToday) {
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const outcome = await awardXP('habit_complete', `Latihan: ${name}`, `habit:${name}:${dateKey}`);
      awarded = outcome?.awarded ?? 0;
      setLastHabitAward({ name, awarded });
      // Kuota penuh sudah punya toast sendiri dari HPContext — jangan menimpanya
      // dengan perayaan kedua yang tidak menjelaskan apa-apa.
      if (awarded > 0) {
        notify('Latihan Selesai! 💪', `+${awarded} Poin`, 'success');
      } else if (outcome?.status !== 'quota_full') {
        notify('Latihan Tercatat 💪', 'Tersimpan, tanpa poin tambahan.', 'info');
      }
    } else if (newDone && !wasDone) {
      notify('Latihan Tercatat 💪', 'Catatan hari lampau tersimpan (tanpa poin).', 'info');
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
        points: awarded,
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

    return awarded;
  }, [updateState, awardXP, notify]);

  /**
   * Menamatkan sebuah training.
   *
   * Server yang memutuskan, bukan hook ini. Dulu urutannya terbalik: confetti
   * dan "+500 Poin" dinyalakan lebih dulu, `awardXP` dipanggil tanpa ditunggu,
   * dan habit-nya dibuang dari state. Tiga akibatnya:
   *
   * 1. Perayaannya berbohong. Kelulusan berkunci seumur hidup, jadi kelulusan
   *    kedua atas nama yang sama membayar nol — tapi tetap merayakan +500.
   *    Begitu juga saat sesi kedaluwarsa atau permintaannya gagal.
   * 2. Habit-nya tidak benar-benar hilang. `splice` hanya menyentuh state
   *    React, dan sinkronisasi blob sengaja tidak pernah menghapus baris habit,
   *    jadi training-nya hidup lagi setelah reload — beserta tombol "Tamat"
   *    yang sekarang membayar nol.
   * 3. Bayarannya tidak berhubungan dengan apa pun: 500 poin flat, jadi buat
   *    habit lalu langsung tamatkan berarti +500 per beberapa detik. Sekarang
   *    /api/habits/graduate menghitungnya dari hari yang benar-benar tercatat.
   *    Kapan tamatnya tetap keputusan penggunanya — yang mengikuti hari-hari
   *    itu adalah nilainya, bukan izin menekan tombolnya.
   *
   * Mengembalikan `true` kalau training-nya benar-benar tamat, supaya
   * pemanggilnya tahu kapan boleh menutup dialog konfirmasi.
   */
  const handleFinishTraining = useCallback(async (name: string): Promise<boolean> => {
    let res: Response;
    try {
      res = await fetch('/api/habits/graduate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } catch (e) {
      notify('Gagal menamatkan training', 'Koneksi bermasalah. Coba lagi sebentar lagi.', 'error');
      return false;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Training yang belum pernah dicentang adalah penolakan yang normal,
      // bukan error — nadanya peringatan, bukan kegagalan sistem.
      notify(
        data.status === 'not_ready' ? 'Belum bisa ditamatkan' : 'Gagal menamatkan training',
        data.error || 'Terjadi kesalahan. Coba lagi sebentar lagi.',
        data.status === 'not_ready' ? 'warning' : 'error',
      );
      return false;
    }

    // Habit-nya sudah dihapus di server; state lokal menyusul supaya kartunya
    // hilang tanpa menunggu putaran refresh berikutnya.
    updateState((s: any) => ({
      ...s,
      habits: (s.habits || []).filter((h: any) => h.name !== name),
      lastActivityDate: new Date().toISOString(),
      penaltyActive: false,
    }));

    if (data.awarded > 0) {
      setConfetti(true);
      setCelebrate({ show: true, points: data.awarded, message: `Tamat Training: ${name}` });
      setTimeout(() => setConfetti(false), 2000);
    } else {
      // Tetap tamat, cuma tidak berpoin. Dikatakan apa adanya — merayakannya
      // dengan angka karangan justru yang merusak kepercayaan pada angka poin.
      notify('Training ditamatkan 🎓', data.message || 'Tanpa poin tambahan.', 'info');
    }
    return true;
  }, [updateState, notify, setConfetti, setCelebrate]);

  const saveHabitDay = useCallback(async (newDone: boolean): Promise<number> => {
    if (!selectedHabitDay) return 0;
    const { name, date, isToday, done: wasDone } = selectedHabitDay;

    // Dialognya ditutup lebih dulu; poinnya menyusul dari server. Menahan
    // penutupan selama satu putaran jaringan membuat centang terasa macet.
    setSelectedHabitDay(null);
    setHabitNote("");

    return processHabitToggle(name, date, isToday, wasDone, newDone, habitNote);
  }, [selectedHabitDay, habitNote, processHabitToggle]);

  /** Mengembalikan poin yang benar-benar dibayar, supaya kartunya bisa
   *  menampilkan angka itu alih-alih "+15" yang dulu dipatok. */
  const handleQuickComplete = useCallback((name: string, date: Date, isToday: boolean, wasDone: boolean, newDone: boolean): Promise<number> => {
    return processHabitToggle(name, date, isToday, wasDone, newDone, "");
  }, [processHabitToggle]);

  return {
    selectedHabitDay,
    setSelectedHabitDay,
    habitNote,
    setHabitNote,
    handleHabitDayClick,
    handleFinishTraining,
    saveHabitDay,
    handleQuickComplete,
    lastHabitAward
  };
}
