  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════════
  const PRIORITY_CFG = {
    high: { color: '#ff8080', label: '🔴 Tinggi', order: 0 },
    med: { color: '#ffd43b', label: '🟡 Sedang', order: 1 },
    low: { color: '#69db7c', label: '🟢 Rendah', order: 2 },
  }
  const MOTIVATIONS = [
    { min: 0, max: 0, msg: 'Yuk mulai hari ini! 💪' },
    { min: 1, max: 25, msg: 'Langkah pertama sudah dimulai! 🚀' },
    { min: 26, max: 50, msg: 'Setengah perjalanan! 🔥' },
    { min: 51, max: 75, msg: 'Hampir sampai! \u2728' },
    { min: 76, max: 99, msg: 'Satu lagi, pasti bisa! 🎯' },
    { min: 100, max: 100, msg: 'Semua selesai! Luar biasa! 🎉' },
  ]

  let taskPriority = 'med'
  let taskFilter = 'all'

  // Priority selector
  root.querySelectorAll('.fb-task-pri-btn').forEach(btn => {
    btn.onclick = () => {
      taskPriority = btn.dataset.p
      root.querySelectorAll('.fb-task-pri-btn').forEach(b => b.classList.remove('sel'))
      btn.classList.add('sel')
    }
  })

  // Filter tabs
  root.querySelectorAll('.fb-task-filter-btn').forEach(btn => {
    btn.onclick = () => {
      taskFilter = btn.dataset.f
      root.querySelectorAll('.fb-task-filter-btn').forEach(b => b.classList.remove('act'))
      btn.classList.add('act')
      renderTasks()
    }
  })

  function relTimeTask(id) {
    const mins = Math.round((Date.now() - id) / 60000)
    if (mins < 1) return 'Baru saja'
    if (mins < 60) return `${mins}m lalu`
    const h = Math.floor(mins / 60)
    return h < 24 ? `${h}j lalu` : `${Math.floor(h / 24)}h lalu`
  }

  function getElapsedSeconds(timerStartedAt) {
    if (!timerStartedAt) return 0;
    const startTime = new Date(timerStartedAt).getTime();
    if (isNaN(startTime)) return 0;
    return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  }

  function formatTrackedTime(seconds, timerStartedAt) {
    const totalSeconds = (seconds || 0) + getElapsedSeconds(timerStartedAt);
    if (totalSeconds <= 0) return "0d";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h}j`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}d`);
    return parts.join(" ");
  }

  function toggleTaskTimer(id) {
    let changed = false;
    ctx.tasks.forEach(item => {
      if (String(item.id) === String(id)) {
        if (item.timerStartedAt) {
          // Pause timer
          const startTime = new Date(item.timerStartedAt).getTime();
          const sessionSeconds = isNaN(startTime) ? 0 : Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          item.timeTracked = (item.timeTracked || 0) + sessionSeconds;
          item.timerStartedAt = null;
        } else {
          // Start timer
          item.timerStartedAt = new Date().toISOString();
        }
        changed = true;
      } else {
        // Pause any other active timer
        if (item.timerStartedAt) {
          const startTime = new Date(item.timerStartedAt).getTime();
          const sessionSeconds = isNaN(startTime) ? 0 : Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          item.timeTracked = (item.timeTracked || 0) + sessionSeconds;
          item.timerStartedAt = null;
          changed = true;
        }
      }
    });

    if (changed) {
      save();
      renderTasks();
      flowbeeSyncAll();
    }
  }

  function setTaskAsFocus(id) {
    const task = ctx.tasks.find(t => String(t.id) === String(id));
    if (!task) return;
    
    ctx.focusTaskId = String(task.id);
    ctx.focusIntention = task.text || '';
    ctx.focusProgress = task.progress || 0;
    
    showToast('&#127919; Fokus Utama!', `"${task.text}" dijadikan fokus utama hari ini`, 2000);
    
    save();
    renderTasks();
    flowbeeSyncAll();
    
    if (isHappilyWebsite()) {
      window.postMessage({
        type: "FLOWBEE_SET_FOCUS",
        goal: task.text,
        progress: task.progress || 0
      }, "*");
    }
  }

  function renderTasks() {
    const td = ctx.tasks.filter(t => t.date === today())
    const done = td.filter(t => t.done).length
    const pct = td.length ? Math.round(done / td.length * 100) : 0

    // Progress bar
    $('fb-pgfill').style.width = pct + '%'
    $('fb-task-stat').textContent = `${done}/${td.length}`
    $('fb-task-pct').textContent = pct + '%'
    // Shimmer when running
    $('fb-pgfill').classList.toggle('running', done > 0 && done < td.length)

    // Milestone marks
    const marks = root.querySelectorAll('.fb-prog-mark')
    const thresholds = [25, 50, 75, 100]
    marks.forEach((m, i) => m.classList.toggle('passed', pct >= thresholds[i]))

    // Motivational message
    const mot = MOTIVATIONS.find(m => pct >= m.min && pct <= m.max) || MOTIVATIONS[0]
    const heroMsg = $('fb-task-hero-msg')
    if (heroMsg) {
      heroMsg.textContent = mot.msg
      heroMsg.classList.toggle('celebrating', pct === 100)
    }

    // Filter badge counts
    const active = td.filter(t => !t.done).length
    const doneC = td.filter(t => t.done).length
    const allEl = root.querySelector('#fb-fcount-all'); if (allEl) allEl.textContent = td.length
    const activeEl = root.querySelector('#fb-fcount-active'); if (activeEl) activeEl.textContent = active
    const doneEl = root.querySelector('#fb-fcount-done'); if (doneEl) doneEl.textContent = doneC

    const list = $('fb-task-list')

    // Filter + sort: undone first (by priority), done at bottom
    let filtered = [...td]
    if (taskFilter === 'active') filtered = td.filter(t => !t.done)
    if (taskFilter === 'done') filtered = td.filter(t => t.done)
    filtered.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const pa = (PRIORITY_CFG[a.priority] || PRIORITY_CFG.med).order
      const pb = (PRIORITY_CFG[b.priority] || PRIORITY_CFG.med).order
      return pa - pb || b.id - a.id
    })

    if (!filtered.length) {
      if (taskFilter === 'done' && done === 0) {
        list.innerHTML = `<div class="fb-empty"><span class="fb-empty-ico">&#9989;</span>Belum ada yang selesai</div>`
      } else if (taskFilter === 'active' && active === 0 && td.length > 0) {
        // All done! celebration
        list.innerHTML = `
          <div class="fb-task-celebrate">
            <span class="fb-task-celebrate-ico">&#127942;</span>
            <div class="fb-task-celebrate-msg">Semua tugas selesai!</div>
            <div class="fb-task-celebrate-sub">Kamu luar biasa hari ini &#10024;</div>
          </div>`
      } else {
        list.innerHTML = `<div class="fb-empty"><span class="fb-empty-ico">&#128203;</span>Belum ada tugas hari ini</div>`
      }
      return
    }

    list.innerHTML = ''
    filtered.forEach(task => {
      const pcfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.med
      const isFocused = String(ctx.focusTaskId) === String(task.id)
      const card = document.createElement('div')
      card.className = 'fb-task-card' + (task.done ? ' done' : '') + (isFocused ? ' focused' : '')
      card.style.setProperty('--task-color', pcfg.color)
      card.innerHTML = `
        <button class="fb-task-chk2">${task.done ? '&#10003;' : ''}</button>
        <div class="fb-task-card-body">
          <div class="fb-task-card-txt">${esc(task.text)}</div>
          <div class="fb-task-card-meta">
            ${task.kpiTitle ? `<span class="fb-task-kpi-tag">🎯 ${esc(task.kpiTitle)}</span>` : ''}
            ${(task.timeTracked > 0 || task.timerStartedAt) ? `
              <span style="color:var(--fb-line); font-size:10px;">•</span>
              <span style="font-size:11px;">&#9201;&#65039;</span>
              <span class="fb-task-time-tracked-tag ${task.timerStartedAt ? 'running' : ''}" style="
                font-size: 9px !important;
                font-weight: 800 !important;
                color: ${task.timerStartedAt ? '#2F9E44' : 'var(--fb-ink-mute)'} !important;
                background: ${task.timerStartedAt ? 'rgba(81, 207, 102, 0.15)' : 'transparent'} !important;
                padding: ${task.timerStartedAt ? '2px 6px' : '0'} !important;
                border-radius: 6px !important;
              ">
                ${task.timerStartedAt ? 'Sedang kerja: ' : 'Durasi: '}
                ${formatTrackedTime(task.timeTracked || 0, task.timerStartedAt)}
              </span>
            ` : ''}
          </div>
          ${(task.progress > 0 || isFocused) ? `
            <div style="width: 100%; height: 4px; background: var(--fb-line-soft); border-radius: 2px; margin-top: 6px; overflow: hidden;">
              <div style="
                width: ${isFocused ? (ctx.focusProgress || 0) : (task.progress || 0)}%;
                height: 100%;
                background: ${isFocused ? 'var(--fb-yellow)' : '#2F9E44'};
                border-radius: 2px;
                transition: width 0.3s ease;
              "></div>
            </div>
          ` : ''}
        </div>
        <div class="fb-task-actions-group">
          ${!task.done ? `
            <button class="fb-task-action-btn play-btn ${task.timerStartedAt ? 'running' : ''}" title="${task.timerStartedAt ? 'Jeda Pekerjaan' : 'Mulai Pekerjaan'}">
              ${task.timerStartedAt ? '&#9208;' : '&#9654;'}
            </button>
            <button class="fb-task-action-btn focus-btn" title="Set as Focus Today">
              &#10024;
            </button>
          ` : ''}
          <button class="fb-task-action-btn del-btn" title="Hapus Task">
            &#128465;
          </button>
        </div>`
      card.querySelector('.fb-task-chk2').onclick = () => toggleTask(task.id)
      if (!task.done) {
        card.querySelector('.play-btn').onclick = () => toggleTaskTimer(task.id)
        card.querySelector('.focus-btn').onclick = () => setTaskAsFocus(task.id)
      }
      card.querySelector('.del-btn').onclick = () => deleteTask(task.id, card)
      list.appendChild(card)
    })

    applyMood(currentState)
    renderHabits();
    renderCoachInsights();
  }

  function updateCharCount() {
    const inp = $('fb-task-in'); if (!inp) return;
    const count = $('fb-task-char-count');
    const btn = $('fb-task-add-btn');
    const txt = inp.value.trim();
    if (count) count.textContent = `${txt.length}`;
    if (txt.length > 0) {
      if (btn) btn.disabled = false;
    } else {
      if (btn) btn.disabled = true;
    }
  }

  function addTask() {
    const inp = $('fb-task-in'), txt = inp.value.trim(); if (txt.length === 0) return;
    const descInp = $('fb-task-desc'); const desc = descInp ? descInp.value.trim() : '';
    const dateInp = $('fb-task-date'); const tDate = dateInp && dateInp.value ? dateInp.value : today();
    const kpiInp = $('fb-task-kpi'); const kpiId = kpiInp ? kpiInp.value : '';
    let kpiTitle = '';
    if (kpiId && availableKPIs) {
      const found = availableKPIs.find(k => String(k.id) === String(kpiId));
      if (found) kpiTitle = found.title;
    }

    const newId = Date.now();
    ctx.tasks.push({ 
      id: newId, 
      text: txt, 
      description: desc,
      targetDate: tDate,
      kpiId: kpiId || null,
      kpiTitle: kpiTitle || null,
      goalId: kpiId || null,
      done: false, 
      date: tDate, 
      priority: taskPriority 
    });
    
    // Create KPI link via API immediately if applicable
    if (kpiId && flowbeeUserId) {
      window.__FB.fetch(FLOWBEE_API.replace('/ext', '/kpi/link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: String(newId), kpiId: kpiId })
      }).catch(e => {});
    }

    inp.value = ''; 
    if (descInp) descInp.value = '';
    if (dateInp) dateInp.value = today();
    if (kpiInp) kpiInp.value = '';
    updateCharCount(); save(); renderTasks(); burst();
    
    // Collapse advanced form drawer on success
    const taskDrawer = $('fb-task-form-drawer');
    if (taskDrawer) taskDrawer.classList.remove('open');
    const taskOptToggle = $('fb-task-opt-toggle');
    if (taskOptToggle) taskOptToggle.classList.remove('active');
    
    flowbeeSyncAll(); // Sync immediately when task added
  }

  let availableKPIs = [];
  async function loadKPIs() {
    if (!flowbeeUserId) return;
    try {
      const m = new Date().getMonth() + 1;
      const y = new Date().getFullYear();
      const mRes = await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/kpi')}?userId=${flowbeeUserId}&role=employee&month=${m}&year=${y}`);
      const mData = await mRes.json();
      const mKpis = (mData.kpis || []).map(k => ({ ...k, source: 'manager' }));

      const pRes = await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/kpi/personal')}?userId=${flowbeeUserId}&month=${m}&year=${y}`);
      const pData = await pRes.json();
      const pKpis = (pData.kpis || []).map(k => ({ ...k, source: 'personal' }));

      availableKPIs = [...mKpis, ...pKpis];
      
      const sel = $('fb-task-kpi');
      if (sel) {
        sel.innerHTML = '<option value="">Umum (tidak terkait KPI spesifik)</option>';
        if (mKpis.length) {
          const mGroup = document.createElement('optgroup');
          mGroup.label = 'KPI Bulanan (Manager)';
          mKpis.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k.id; opt.textContent = k.title; mGroup.appendChild(opt);
          });
          sel.appendChild(mGroup);
        }
        if (pKpis.length) {
          const pGroup = document.createElement('optgroup');
          pGroup.label = 'KPI Mandiri';
          pKpis.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k.id; opt.textContent = k.title; pGroup.appendChild(opt);
          });
          sel.appendChild(pGroup);
        }
      }
    } catch (e) {}
  }

  function toggleTask(id) {
    const t = ctx.tasks.find(t => t.id === id); if (!t) return
    t.done = !t.done;
    
    // Auto-pause timer if running when task is marked complete
    if (t.done && t.timerStartedAt) {
      const startTime = new Date(t.timerStartedAt).getTime();
      const sessionSeconds = isNaN(startTime) ? 0 : Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      t.timeTracked = (t.timeTracked || 0) + sessionSeconds;
      t.timerStartedAt = null;
    }
    
    save(); renderTasks();
    flowbeeSyncAll(); // Sync immediately when toggled
    if (t.done) {
      burst()
      const allDone = ctx.tasks.filter(t => t.date === today()).every(t => t.done)
      if (allDone && ctx.tasks.filter(t => t.date === today()).length > 0) {
        forceState('EXCITED', 6000); currentState = 'EXCITED'
        updateBuddySVG('EXCITED'); applyMood('EXCITED')
      } else {
        forceState('HAPPY', 2500); currentState = 'HAPPY'
        updateBuddySVG('HAPPY'); applyMood('HAPPY')
      }
    }
  }

  function deleteTask(id, card) {
    if (!ctx.deletedTaskIds) ctx.deletedTaskIds = []
    ctx.deletedTaskIds.push(String(id))
    if (card) {
      card.classList.add('removing')
      setTimeout(() => { 
        ctx.tasks = ctx.tasks.filter(t => String(t.id) !== String(id)); 
        save(); 
        renderTasks(); 
        flowbeeSyncAll(); 
      }, 280)
    } else {
      ctx.tasks = ctx.tasks.filter(t => String(t.id) !== String(id)); 
      save(); 
      renderTasks(); 
      flowbeeSyncAll();
    }
  }

