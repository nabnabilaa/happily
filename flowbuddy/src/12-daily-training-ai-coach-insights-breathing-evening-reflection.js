  // ═══════════════════════════════════════════════════════════════
  // DAILY TRAINING & AI COACH INSIGHTS & BREATHING & EVENING REFLECTION
  // ═══════════════════════════════════════════════════════════════

  function renderHabits() {
    const list = $('fb-habits-list');
    const sec = $('fb-habits-section');
    if (!list || !sec) return;

    if (!flowbeeUserId || !ctx.habits || ctx.habits.length === 0) {
      sec.style.display = 'none';
      return;
    }

    sec.style.display = 'block';
    list.innerHTML = '';

    ctx.habits.forEach(h => {
      const card = document.createElement('div');
      card.className = 'fb-task-card' + (h.done ? ' done' : '');
      card.style.setProperty('--task-color', '#dfb875'); // gold/yellow for habits
      card.style.padding = '8px 12px !important';
      card.style.marginBottom = '6px !important';

      const glyphMap = {
        leaf: '\ud83c\udf3f',
        brain: '🧠',
        heart: '❤️',
        smile: '😊',
        coffee: '☕',
        check: '✅',
        book: '📚',
        activity: '🏃',
        sun: '☀️'
      };
      const glyphIcon = glyphMap[h.glyph] || h.glyph || '🌿';

      card.innerHTML = `
        <button class="fb-habit-chk" style="
          width: 18px !important;
          height: 18px !important;
          border-radius: 6px !important;
          border: 1.5px solid var(--fb-line) !important;
          background: ${h.done ? 'var(--fb-yellow)' : 'transparent'} !important;
          color: var(--fb-ink) !important;
          font-size: 10px !important;
          font-weight: 900 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          padding: 0 !important;
          margin-right: 8px !important;
          flex-shrink: 0 !important;
          outline: none !important;
        ">${h.done ? '&#10003;' : ''}</button>
        <div style="flex: 1 !important; min-width: 0 !important;">
          <div style="font-size: 12px !important; font-weight: 700 !important; color: var(--fb-ink) !important; text-decoration: ${h.done ? 'line-through' : 'none'} !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">
            ${glyphIcon} ${esc(h.name)}
          </div>
          <div style="font-size: 10px !important; color: var(--fb-ink-mute) !important; font-weight: 600 !important; margin-top: 1px !important;">
            &#128293; ${h.streak || 0} streak &#8226; Target: ${h.target || 30} hari
          </div>
        </div>
      `;

      const chkBtn = card.querySelector('.fb-habit-chk');
      chkBtn.onclick = () => {
        h.done = !h.done;
        const todayStr = today();
        h.completedDates = h.completedDates || [];
        if (h.done) {
          h.streak = (h.streak || 0) + 1;
          if (!h.completedDates.includes(todayStr)) {
            h.completedDates.push(todayStr);
          }
          burst();
          forceState('HAPPY', 3000);
          currentState = 'HAPPY';
          updateBuddySVG('HAPPY');
          applyMood('HAPPY');
        } else {
          h.streak = Math.max(0, (h.streak || 0) - 1);
          h.completedDates = h.completedDates.filter(d => d !== todayStr);
        }
        save();
        renderHabits();
        flowbeeSyncAll();
      };

      list.appendChild(card);
    });
  }

  function generateLocalAIInsights() {
    const insights = [];
    const user = flowbeeUser;
    
    // 1. Streak Insight
    if (user && user.streak > 0) {
      insights.push({
        tone: 'yellow',
        title: `Streak ${user.streak} hari &#127881;`,
        body: `Kamu rutin menyapa diri sendiri — ini kebiasaan kecil yang dampaknya besar bagi produktivitasmu.`
      });
    }

    // 2. Mood & Energy Insight (derived from evaluated state)
    const stateEval = getState();
    if (stateEval === 'SLEEPY' || stateEval === 'SAD' || stateEval === 'ANNOYED') {
      insights.push({
        tone: 'coral',
        title: 'Energi kamu butuh perhatian',
        body: `Kondisi kamu sedang lelah/stres. Coba 5-menit reset atau istirahat sejenak untuk memulihkan fokus.`
      });
    } else if (stateEval === 'HAPPY' || stateEval === 'EXCITED') {
      insights.push({
        tone: 'sage',
        title: 'Vibe kamu positif hari ini!',
        body: 'Gunakan energi positif ini untuk menyelesaikan tugas-tugas "Deep Work" atau bantu rekan tim.'
      });
    }

    // 3. Task Progress Insight
    const td = ctx.tasks.filter(t => t.date === today());
    const doneTasks = td.filter(t => t.done).length;
    const totalTasks = td.length;

    if (doneTasks > 0 && doneTasks === totalTasks) {
      insights.push({
        tone: 'blue',
        title: 'Semua prioritas selesai! &#128640;',
        body: 'Luar biasa, kamu menyelesaikan semua target hari ini. Jangan lupa istirahat yang cukup ya.'
      });
    } else if (doneTasks > 0) {
      insights.push({
        tone: 'blue',
        title: `${doneTasks} dari ${totalTasks} tugas selesai`,
        body: 'Kamu sudah di jalur yang benar. Fokus selesaikan sisa tugas dengan perlahan tapi pasti.'
      });
    } else if (totalTasks > 0) {
       insights.push({
        tone: 'lavender',
        title: 'Ayo mulai hari kamu',
        body: `Ada ${totalTasks} tugas menunggu. Coba mulai dari yang paling ringan untuk memicu momentum.`
      });
    }

    // Fallback if no insights generated
    if (insights.length === 0) {
      insights.push({
        tone: 'sage',
        title: 'Siap untuk hari ini?',
        body: 'Tentukan prioritasmu dan biarkan aku membantumu tetap fokus dan sehat.'
      });
    }

    return insights.slice(0, 3);
  }

  function renderCoachInsights() {
    const list = $('fb-coach-list');
    const sec = $('fb-coach-section');
    if (!list || !sec) return;

    if (!flowbeeUserId) {
      sec.style.display = 'none';
      return;
    }

    sec.style.display = 'block';
    const insights = generateLocalAIInsights();
    list.innerHTML = '';

    const toneColors = {
      sage: { bg: 'rgba(255, 253, 240, 0.7)', border: '#FDB913', fg: 'var(--fb-ink)', emoji: '\u2728' },
      blue: { bg: 'rgba(235, 244, 255, 0.7)', border: 'rgba(0, 176, 255, 0.3)', fg: '#1a56db', emoji: '🏃' },
      yellow: { bg: 'rgba(255, 253, 240, 0.8)', border: '#FDB913', fg: 'var(--fb-ink)', emoji: '🎯' },
      coral: { bg: 'rgba(232, 139, 125, 0.12)', border: '#E88B7D', fg: '#E88B7D', emoji: '⚡' },
      lavender: { bg: 'rgba(177, 151, 252, 0.12)', border: '#b197fc', fg: '#b197fc', emoji: '\u2728' }
    };

    insights.forEach(ins => {
      const t = toneColors[ins.tone] || toneColors.sage;
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 10px !important;
        border-radius: 12px !important;
        background: var(--fb-card) !important;
        border: 1px solid var(--fb-line) !important;
        display: flex !important;
        gap: 10px !important;
        align-items: flex-start !important;
      `;
      card.innerHTML = `
        <div style="
          width: 28px !important;
          height: 28px !important;
          border-radius: 8px !important;
          background: ${t.bg} !important;
          border: 1px solid ${t.border} !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 14px !important;
          flex-shrink: 0 !important;
        ">${t.emoji}</div>
        <div style="flex: 1 !important; min-width: 0 !important;">
          <div style="font-size: 11.5px !important; font-weight: 700 !important; color: var(--fb-ink) !important;">
            ${esc(ins.title)}
          </div>
          <div style="font-size: 10.5px !important; color: var(--fb-ink-mute) !important; margin-top: 2px !important; line-height: 1.4 !important;">
            ${esc(ins.body)}
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  let selectedReflectMood = 'joy';
  let selectedReflectProd = 'high';
  let selectedReflectWl = 'balanced';

  function initClockInModal() {
    const modalEl = $('fb-clockin-modal');
    const masukBtn = $('fb-absen-masuk-btn');
    if (!modalEl) return;

    if (masukBtn) {
      masukBtn.onclick = () => {
        showClockInModal();
      };
    }

    // Close button
    const closeBtn = $('fb-clockin-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modalEl.style.display = 'none';
      };
    }

    // Handle Type Change
    const typeSelect = $('fb-clockin-type');
    const officeContainer = $('fb-clockin-office-container');
    if (typeSelect && officeContainer) {
      typeSelect.onchange = () => {
        if (typeSelect.value === 'WFO') {
          officeContainer.style.display = 'block';
        } else {
          officeContainer.style.display = 'none';
        }
      };
    }

    // Submit button
    const submitBtn = $('fb-clockin-submit');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        if (!flowbeeUserId) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Menyimpan...';

        const checkInType = $('fb-clockin-type')?.value || 'WFO';
        const officeId = $('fb-clockin-office')?.value || '';
        const notes = $('fb-clockin-notes')?.value.trim() || '';

        // Get coordinates
        let lat = null;
        let lng = null;
        if (navigator.geolocation) {
          try {
            const pos = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } catch (e) {
            console.warn("Could not get geolocation, continuing with null:", e);
          }
        }

        try {
          // Clock-in API call
          const res = await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/attendance/check-in')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: flowbeeUserId,
              token: "manual_checkin",
              lat,
              lng,
              checkInType,
              officeId: checkInType === 'WFO' ? officeId : undefined,
              notes: checkInType !== 'WFO' ? notes : undefined
            })
          });
          const data = await res.json();

          if (data.success) {
            showToast('Clock In Berhasil!', 'Selamat bekerja! Semangat untuk hari ini &#9728;&#65039;');
            modalEl.style.display = 'none';
            if ($('fb-clockin-notes')) $('fb-clockin-notes').value = '';
            
            // Re-sync to get updated attendance status immediately
            await flowbeeSyncAll();
          } else {
            showToast('Gagal Clock In', data.error || 'Terjadi kesalahan.', 'error');
          }
        } catch (e) {
          showToast('Koneksi Gagal', 'Gagal menyimpan kehadiran. Coba lagi.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Clock In Sekarang (+20 EXP)';
        }
      };
    }
  }

  async function showClockInModal() {
    const modalEl = $('fb-clockin-modal');
    if (!modalEl) return;

    modalEl.style.display = 'flex';

    // Fetch offices
    const officeSelect = $('fb-clockin-office');
    if (officeSelect) {
      try {
        officeSelect.innerHTML = '<option value="">Memuat kantor...</option>';
        const res = await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/settings/office')}`);
        const data = await res.json();
        if (data && data.offices) {
          officeSelect.innerHTML = data.offices.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
        } else {
          officeSelect.innerHTML = '<option value="">Gagal memuat daftar kantor</option>';
        }
      } catch (e) {
        officeSelect.innerHTML = '<option value="">Gagal memuat daftar kantor</option>';
      }
    }

    // Geolocation retrieval indicator
    const geoEl = $('fb-clockin-geo');
    if (geoEl) {
      geoEl.innerHTML = '<span>&#128205; Mengambil lokasi GPS...</span>';
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            geoEl.innerHTML = `<span>&#128205; Lokasi didapatkan: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}</span>`;
          },
          (err) => {
            geoEl.innerHTML = '<span>&#9888;&#65039; GPS tidak aktif / izin ditolak (absen manual tetap bisa dilakukan)</span>';
          }
        );
      } else {
        geoEl.innerHTML = '<span>&#9888;&#65039; Geolocation tidak didukung browser</span>';
      }
    }
  }

  function initReflectionModal() {
    const modalEl = $('fb-reflection-modal');
    const tutupHariBtn = $('fb-tutup-hari-btn');
    if (!modalEl) return;

    if (tutupHariBtn) {
      tutupHariBtn.onclick = () => {
        showReflectionModal();
      };
    }

    // Mood click handlers
    modalEl.querySelectorAll('.fb-reflect-mood-btn').forEach(btn => {
      btn.onclick = () => {
        modalEl.querySelectorAll('.fb-reflect-mood-btn').forEach(b => {
          b.classList.remove('sel');
          b.style.borderColor = 'var(--fb-line)';
          b.style.background = 'var(--fb-card)';
        });
        btn.classList.add('sel');
        btn.style.borderColor = '#86C0A9';
        btn.style.background = 'rgba(134,192,169,0.06)';
        selectedReflectMood = btn.getAttribute('data-mood');
      };
    });

    // Productivity click handlers
    modalEl.querySelectorAll('.fb-reflect-prod-btn').forEach(btn => {
      btn.onclick = () => {
        modalEl.querySelectorAll('.fb-reflect-prod-btn').forEach(b => {
          b.classList.remove('sel');
          b.style.borderColor = 'var(--fb-line)';
          b.style.background = 'var(--fb-card)';
        });
        btn.classList.add('sel');
        btn.style.borderColor = '#86C0A9';
        btn.style.background = 'rgba(134,192,169,0.06)';
        selectedReflectProd = btn.getAttribute('data-prod');
      };
    });

    // Work-life click handlers
    modalEl.querySelectorAll('.fb-reflect-wl-btn').forEach(btn => {
      btn.onclick = () => {
        modalEl.querySelectorAll('.fb-reflect-wl-btn').forEach(b => {
          b.classList.remove('sel');
          b.style.borderColor = 'var(--fb-line)';
          b.style.background = 'var(--fb-card)';
        });
        btn.classList.add('sel');
        btn.style.borderColor = '#86C0A9';
        btn.style.background = 'rgba(134,192,169,0.06)';
        selectedReflectWl = btn.getAttribute('data-wl');
      };
    });

    // Close button
    const closeBtn = $('fb-reflection-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modalEl.style.display = 'none';
      };
    }

    // Submit button
    const submitBtn = $('fb-reflect-submit');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        if (!flowbeeUserId) return;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menyimpan...';

        const moodLabels = { joy: 'Senang', calm: 'Tenang', neutral: 'Biasa', tired: 'Lelah', stress: 'Stres' };
        const prodLabels = { high: 'Tinggi', mid: 'Sedang', low: 'Rendah' };
        const wlLabels = { balanced: 'Seimbang', ok: 'Lumayan', burnout: 'Kewalahan' };

        const summary = `Mood: ${moodLabels[selectedReflectMood]}\nProduktivitas: ${prodLabels[selectedReflectProd]}\nWork-Life Balance: ${wlLabels[selectedReflectWl]}`;
        const blockers = $('fb-reflect-blockers')?.value.trim() || '';

        const now = new Date();
        const timestamp = {
          date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };

        try {
          // 1. Save logbook
          await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/logbook')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: flowbeeUserId,
              type: 'daily_reflection',
              title: 'Tutup Hari (Clock Out)',
              content: blockers ? `${summary}\nHambatan: ${blockers}` : summary,
              points: 30,
              metadata: {
                mood: selectedReflectMood,
                productivity: selectedReflectProd,
                workLife: selectedReflectWl,
                blockers,
                ...timestamp,
                taskCount: ctx.tasks.filter(t => t.date === today() && t.done).length
              }
            })
          });

          // 2. Clock out
          await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/attendance/check-out')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: flowbeeUserId,
              mood: selectedReflectMood,
              notes: blockers
            })
          });

          // 3. Award daily reflection XP (+100 XP)
          await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/xp/award')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: flowbeeUserId,
              actionType: 'daily_reflection',
              description: 'Tutup Hari (Clock Out) via Extension'
            })
          });

          ctx.reflectionDoneDate = today();
          save();

          await flowbeeSyncAll();

          showToast('Tutup Hari Berhasil!', 'Sampai jumpa besok! Selamat beristirahat &#127775;');
          modalEl.style.display = 'none';

          if ($('fb-reflect-blockers')) $('fb-reflect-blockers').value = '';

        } catch (e) {
          showToast('Koneksi Gagal', 'Gagal menyimpan refleksi. Coba lagi.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Simpan & Tutup Hari (+30 Poin)';
        }
      };
    }
  }

  function showReflectionModal() {
    const modalEl = $('fb-reflection-modal');
    if (modalEl) {
      modalEl.style.display = 'flex';
      modalEl.querySelectorAll('.fb-reflect-mood-btn').forEach(b => {
        const isSel = b.getAttribute('data-mood') === 'joy';
        b.style.borderColor = isSel ? '#86C0A9' : 'var(--fb-line)';
        b.style.background = isSel ? 'rgba(134,192,169,0.06)' : 'var(--fb-card)';
      });
      modalEl.querySelectorAll('.fb-reflect-prod-btn').forEach(b => {
        const isSel = b.getAttribute('data-prod') === 'high';
        b.style.borderColor = isSel ? '#86C0A9' : 'var(--fb-line)';
        b.style.background = isSel ? 'rgba(134,192,169,0.06)' : 'var(--fb-card)';
      });
      modalEl.querySelectorAll('.fb-reflect-wl-btn').forEach(b => {
        const isSel = b.getAttribute('data-wl') === 'balanced';
        b.style.borderColor = isSel ? '#86C0A9' : 'var(--fb-line)';
        b.style.background = isSel ? 'rgba(134,192,169,0.06)' : 'var(--fb-card)';
      });
      selectedReflectMood = 'joy';
      selectedReflectProd = 'high';
      selectedReflectWl = 'balanced';
    }
  }

  function checkReflectionReminder() {
    if (!flowbeeUserId) return;
    if (ctx.reflectionDoneDate === today()) return;

    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    
    if (hrs > 16 || (hrs === 16 && mins >= 45)) {
      const lastPromptTime = ctx.lastReflectionPromptTime || 0;
      if (Date.now() - lastPromptTime > 900000) { // 15 mins
        ctx.lastReflectionPromptTime = Date.now();
        save();
        
        showToast(
          'Waktunya Tutup Hari \u{1F4DD}', 
          'Shift kamu hampir selesai! Luangkan waktu 1 menit untuk mengisi refleksi harian.', 
          8000, 
          'Isi Sekarang', 
          () => {
            showReflectionModal();
          }
        );
      }
    }
  }

  const fbTaskAddBtn = $('fb-task-add-btn');
  if (fbTaskAddBtn) fbTaskAddBtn.onclick = addTask;
  
  const fbTaskIn = $('fb-task-in');
  const taskDrawer = $('fb-task-form-drawer');
  const taskCancelBtn = $('fb-task-cancel-btn');
  const taskOptToggle = $('fb-task-opt-toggle');

  if (taskOptToggle && taskDrawer) {
    taskOptToggle.onclick = (e) => {
      e.stopPropagation();
      const isOpen = taskDrawer.classList.contains('open');
      taskDrawer.classList.toggle('open', !isOpen);
      taskOptToggle.classList.toggle('active', !isOpen);
    };
  }

  if (fbTaskIn) {
    fbTaskIn.onkeydown = e => { if (e.key === 'Enter') addTask() };
    fbTaskIn.oninput = () => {
      updateCharCount();
      if (taskDrawer && !taskDrawer.classList.contains('open')) {
        taskDrawer.classList.add('open');
        if (taskOptToggle) taskOptToggle.classList.add('active');
      }
    };
    fbTaskIn.onfocus = () => {
      if (taskDrawer && !taskDrawer.classList.contains('open')) {
        taskDrawer.classList.add('open');
        if (taskOptToggle) taskOptToggle.classList.add('active');
      }
    };
  }

  if (taskCancelBtn) {
    taskCancelBtn.onclick = () => {
      if (fbTaskIn) fbTaskIn.value = '';
      const descInp = $('fb-task-desc'); if (descInp) descInp.value = '';
      const dateInp = $('fb-task-date'); if (dateInp) dateInp.value = today();
      const kpiInp = $('fb-task-kpi'); if (kpiInp) kpiInp.value = '';
      if (taskDrawer) taskDrawer.classList.remove('open');
      if (taskOptToggle) taskOptToggle.classList.remove('active');
      updateCharCount();
    };
  }

  // Priority dropdown
  const priDD = $('fb-pri-dd')
  const priSel = $('fb-pri-sel')
  const priDotSm = $('fb-pri-dot-sm')
  const priMenu = $('fb-pri-menu')
  const PRI_NAMES = { high: 'Tinggi', med: 'Sedang', low: 'Rendah' }
  const PRI_COLORS = { high: '#ff8080', med: '#ffd43b', low: '#69db7c' }
  function updatePriDD() {
    if (priDD) priDD.dataset.p = taskPriority
    if (priSel) priSel.dataset.p = taskPriority
    if (priDotSm) priDotSm.title = PRI_NAMES[taskPriority]
    priMenu && priMenu.querySelectorAll('.fb-pri-opt').forEach(b =>
      b.classList.toggle('sel', b.dataset.p === taskPriority)
    )
    root.querySelectorAll('.fb-task-pri-btn').forEach(b => b.classList.toggle('sel', b.dataset.p === taskPriority))
  }
  // Toggle dropdown open/close
  if (priSel) {
    priSel.onclick = e => {
      e.stopPropagation()
      priDD.classList.toggle('open')
    }
  }
  // Select option
  if (priMenu) {
    priMenu.querySelectorAll('.fb-pri-opt').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation()
        taskPriority = btn.dataset.p
        priDD.classList.remove('open')
        updatePriDD()
      }
    })
  }
  // Close on outside click — use bubble phase so stopPropagation() in priSel.onclick works
  document.addEventListener('click', () => { if (priDD) priDD.classList.remove('open') })
  updatePriDD()


