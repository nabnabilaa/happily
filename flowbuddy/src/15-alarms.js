  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // ALARMS
  // ═══════════════════════════════════════════════════════════════
  const AL_ICONS = ['🔔', '⏰', '💊', '🏃', '☕', '🍱', '📅', '💤', '🎯', '🎉', '🔥', '💡', '📞', '🚗', '✈️', '🎵']
  let alarmIcon = '🔔'
  let alarmQuickMin = null  // null = manual, number = relative minutes

  // Build icon picker (removed from UI, kept as no-op)
  const iconRow = null

  // Quick offset chips: bump time field
  root.querySelectorAll('.fb-al-quickbtn').forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll('.fb-al-quickbtn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const min = parseInt(btn.dataset.min)
      const d = new Date(Date.now() + min * 60000)
      const timeIn = $('fb-al-time'), dateIn = $('fb-al-date')
      const p2 = n => String(n).padStart(2, '0')
      if (timeIn) timeIn.value = p2(d.getHours()) + ':' + p2(d.getMinutes())
      if (dateIn) dateIn.value = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate())
    }
  })

    // Deselect quick chips when user manually edits time/date
    ;[$('fb-al-time'), $('fb-al-date')].forEach(inp => {
      if (inp) inp.addEventListener('change', () => {
        root.querySelectorAll('.fb-al-quickbtn').forEach(b => b.classList.remove('active'))
      })
    })

  // Repeat day toggles
  let alarmRepeatDays = []  // [0..6]
  root.querySelectorAll('.fb-al-day').forEach(btn => {
    btn.onclick = () => {
      const d = parseInt(btn.dataset.d)
      if (alarmRepeatDays.includes(d)) {
        alarmRepeatDays = alarmRepeatDays.filter(x => x !== d)
        btn.classList.remove('active')
      } else {
        alarmRepeatDays.push(d)
        btn.classList.add('active')
      }
      // clear preset selection
      root.querySelectorAll('.fb-al-preset').forEach(b => b.classList.remove('active'))
    }
  })
  root.querySelectorAll('.fb-al-preset').forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll('.fb-al-preset').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const p = btn.dataset.preset
      alarmRepeatDays = p === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : p === 'weekday' ? [1, 2, 3, 4, 5] : p === 'weekend' ? [0, 6] : []
      root.querySelectorAll('.fb-al-day').forEach(b => {
        b.classList.toggle('active', alarmRepeatDays.includes(parseInt(b.dataset.d)))
      })
    }
  })

  // New compact chips wire-up
  root.querySelectorAll('.fb-al-chip').forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll('.fb-al-chip').forEach(b => b.classList.remove('act'))
      btn.classList.add('act')
      const p = btn.dataset.preset
      alarmRepeatDays = p === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : p === 'weekday' ? [1, 2, 3, 4, 5] : p === 'weekend' ? [0, 6] : []
      root.querySelectorAll('.fb-al-day').forEach(b => {
        b.classList.toggle('active', alarmRepeatDays.includes(parseInt(b.dataset.d)))
      })
    }
  })

  // Ringing state
  let _alarmRinging = false, _alarmRingIv = null
  let _alarmStopCooldown = 0  // timestamp until which re-trigger is blocked

  function startAlarmRing(label) {
    // Don't re-trigger if already ringing or user just stopped it (5s cooldown)
    if (_alarmRinging) return
    if (Date.now() < _alarmStopCooldown) return
    _alarmRinging = true
    const banner = $('fb-al-ringing'), lbl = $('fb-al-ring-lbl')
    if (banner) { banner.style.display = 'flex'; banner.classList.add('visible') }
    if (lbl) lbl.textContent = label || 'Alarm!'
    playChime(true)
  }

  function stopAlarmRing() {
    _alarmRinging = false
    _alarmStopCooldown = Date.now() + 5000  // block re-trigger for 5s
    const banner = $('fb-al-ringing')
    if (banner) { banner.style.display = 'none'; banner.classList.remove('visible') }
    stopChime()
    // Clear any past alarms so countdown interval doesn't re-fire
    const now = Date.now()
    ctx.alarms = ctx.alarms.filter(a => a.timestamp > now + 2000)
    clearInterval(alarmCdIv)
    save()
    if (activeTab === 'alarm') renderAlarms()
  }

  const stopAlarmBtn = $('fb-al-stop')
  if (stopAlarmBtn) stopAlarmBtn.addEventListener('click', stopAlarmRing)

  function fmtCountdown(ms) {
    if (ms <= 0) return 'Lewat'
    const totalSec = Math.floor(ms / 1000)
    const d = Math.floor(totalSec / 86400)
    const h = Math.floor((totalSec % 86400) / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (d > 0) return `${d}h ${h}j lagi`
    if (h > 0) return `${h}j ${m}m lagi`
    if (m > 0) return `${m}m ${s}s lagi`
    return `${s}dtk lagi`
  }

  function fmtAlarmTime(ts) {
    const dt = new Date(ts)
    const now = new Date()
    const isToday = dt.toDateString() === now.toDateString()
    const isTomorrow = dt.toDateString() === new Date(now.getTime() + 86400000).toDateString()
    const timeStr = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    if (isToday) return `Hari ini, ${timeStr}`
    if (isTomorrow) return `Besok, ${timeStr}`
    return dt.toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  let alarmCdIv = null
  function startAlarmCountdowns() {
    clearInterval(alarmCdIv)
    alarmCdIv = setInterval(() => {
      root.querySelectorAll('.fb-alcard-cd[data-ts]').forEach(el => {
        const ts = parseInt(el.dataset.ts)
        const ms = ts - Date.now()
        el.textContent = fmtCountdown(ms)
        // urgency class
        const card = el.closest('.fb-alarm-card')
        if (card) card.classList.toggle('urgent', ms > 0 && ms < 30 * 60 * 1000)
      })
      // prune past alarms, keep history
      const now2 = Date.now()
      const justFired = ctx.alarms.filter(a => a.enabled !== false && a.timestamp <= now2)
      if (justFired.length) {
        ctx.alarmHistory = ctx.alarmHistory || []
        justFired.forEach(a => {
          ctx.alarmHistory.unshift({ ...a, firedAt: now2 })
          // Ring! (startAlarmRing has cooldown check built in)
          startAlarmRing(a.label || 'Alarm!')
          // If repeat: reschedule for next matching day
          if (a.repeat && a.repeat.length) {
            const base = new Date(a.timestamp)
            const baseHH = base.getHours(), baseMM = base.getMinutes()
            let next = new Date(now2 + 86400000)
            for (let i = 1; i <= 7; i++) {
              const candidate = new Date(now2 + i * 86400000)
              if (a.repeat.includes(candidate.getDay())) {
                next = candidate; break
              }
            }
            next.setHours(baseHH, baseMM, 0, 0)
            a.timestamp = next.getTime()
            chrome.runtime.sendMessage({ type: 'SET_ALARM', id: a.id, label: a.label, timestamp: a.timestamp })
          }
        })
        ctx.alarmHistory = ctx.alarmHistory.slice(0, 20)
        chrome.storage.local.set({ fb3_alarmHistory: ctx.alarmHistory })
        renderAlarmHistory()
      }
      // Remove non-repeating fired alarms
      ctx.alarms = ctx.alarms.filter(a => a.timestamp > now2)
    }, 1000)
  }

  function renderAlarmHistory() {
    const wrap = $('fb-al-history')
    const list = $('fb-alarm-history-list')
    if (!wrap || !list) return
    const hist = ctx.alarmHistory || []
    if (!hist.length) { wrap.style.display = 'none'; return }
    wrap.style.display = 'block'
    list.innerHTML = ''
    hist.slice(0, 10).forEach(a => {
      const dt = new Date(a.timestamp)
      const hh = String(dt.getHours()).padStart(2, '0')
      const mm = String(dt.getMinutes()).padStart(2, '0')
      const item = document.createElement('div')
      item.className = 'fb-alarm-history-item'
      item.innerHTML = `
        <span style="opacity:.4;font-size:15px">&#9200;</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:#fff">${esc(a.label)}</div>
          <div style="font-size:11px;opacity:.4">${hh}:${mm} · ${relTime(a.firedAt)}</div>
        </div>`
      list.appendChild(item)
    })
  }

  function renderAlarms() {
    renderMiniCalendar()   // refresh event dots whenever alarms change
    const allActive = ctx.alarms.filter(a => a.timestamp > Date.now()).sort((a, b) => a.timestamp - b.timestamp)
    // Apply date filter if one is selected
    const active = calSelDate
      ? allActive.filter(a => calDateKey(a.timestamp) === calSelDate)
      : allActive
    const cntEl = $('fb-al-cnt-lbl')
    if (cntEl) cntEl.textContent = active.length || ''
    const list = $('fb-alarm-list')
    if (!active.length) {
      list.innerHTML = `<div class="fb-al-empty"><span class="fb-al-empty-ico">&#128197;&#65039;</span>Belum ada agenda terdaftar</div>`
      clearInterval(alarmCdIv); return
    }
    list.innerHTML = ''
    active.forEach(alarm => {
      const ms = alarm.timestamp - Date.now()
      const urgent = ms < 30 * 60 * 1000
      const dt = new Date(alarm.timestamp)
      const hh = String(dt.getHours()).padStart(2, '0')
      const mm = String(dt.getMinutes()).padStart(2, '0')
      const dateLabel = fmtAlarmTime(alarm.timestamp)
      const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      const repeatStr = alarm.repeat && alarm.repeat.length
        ? (alarm.repeat.length === 7 ? 'Setiap hari'
          : alarm.repeat.length === 5 && !alarm.repeat.includes(0) ? 'Hari kerja'
            : alarm.repeat.map(d => DAY_NAMES[d]).join(', '))
        : 'Sekali'
      const enabled = alarm.enabled !== false
      const card = document.createElement('div')
      card.className = 'fb-alarm-card' + (urgent ? ' urgent' : '') + (enabled ? '' : ' disabled')
      card.innerHTML = `
        <div class="fb-alcard-left">
          <div class="fb-alcard-time-big">${hh}:${mm}</div>
          <div class="fb-alcard-label">${esc(alarm.label)}</div>
          <div class="fb-alcard-repeat">${repeatStr} · ${fmtCountdown(ms)}</div>
        </div>
        <div class="fb-alcard-right">
          <button class="fb-alcard-gcal" title="Simpan ke Google Calendar" style="padding:4px 6px;border-radius:6px;background:transparent;border:1.5px solid var(--fb-line);cursor:pointer;font-size:12px;transition:all 0.2s;color:var(--fb-ink);display:flex;align-items:center;">&#128197;</button>
          <button class="fb-alcard-toggle ${enabled ? 'on' : 'off'}" title="${enabled ? 'Matikan' : 'Aktifkan'}">${enabled ? 'ON' : 'OFF'}</button>
          <button class="fb-alcard-del" title="Hapus">&#10006;</button>
        </div>`
      card.querySelector('.fb-alcard-gcal').onclick = () => {
        const start = new Date(alarm.timestamp)
        const end = new Date(alarm.timestamp + 60 * 60 * 1000) // Default 1 hour
        const fmt = d => d.toISOString().replace(/-|:|\.\d\d\d/g, '')
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(alarm.label)}&dates=${fmt(start)}/${fmt(end)}&details=Ditambahkan%20dari%20FocusBuddy`
        window.open(url, '_blank')
      }
      card.querySelector('.fb-alcard-toggle').onclick = () => {
        alarm.enabled = !alarm.enabled; save(); renderAlarms()
      }
      card.querySelector('.fb-alcard-del').onclick = () => {
        card.style.opacity = '0'; card.style.transform = 'translateX(10px)'
        setTimeout(() => {
          ctx.alarms = ctx.alarms.filter(a => a.id !== alarm.id)
          chrome.runtime.sendMessage({ type: 'CLEAR_ALARM', id: alarm.id })
          save(); renderAlarms()
        }, 200)
      }
      list.appendChild(card)
    })
    startAlarmCountdowns()
  }

  async function addAlarm() {
    const title = $('fb-cal-title') ? $('fb-cal-title').value.trim() : 'Agenda Baru';
    const finalTitle = title || 'Agenda Baru';
    const descEl = $('fb-cal-desc'); const desc = descEl ? descEl.value.trim() : '';
    const dateEl = $('fb-cal-date'); const dVal = dateEl ? dateEl.value : '';
    const startEl = $('fb-cal-start'); const sVal = startEl ? startEl.value : '';
    const endEl = $('fb-cal-end'); const eVal = endEl ? endEl.value : '';
    const visEl = $('fb-cal-vis'); const vis = visEl ? visEl.value : 'private';

    if (!dVal || !sVal) { showToast('⚠️ Gagal', 'Tanggal dan jam mulai wajib diisi!', 3000); return; }
    const startTs = new Date(`${dVal}T${sVal}`).getTime();
    if (isNaN(startTs)) { showToast('⚠️ Error', 'Waktu tidak valid!', 3000); return; }
    
    let endTs = startTs + 60*60*1000;
    if (eVal) {
      const ets = new Date(`${dVal}T${eVal}`).getTime();
      if (!isNaN(ets) && ets > startTs) endTs = ets;
    }
    
    const id = Date.now();

    // Sync to Flowbee Web API if user is known
    if (flowbeeUserId) {
      const startDateTime = new Date(startTs);
      const endDateTime = new Date(endTs);
      try {
        await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/calendar')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: flowbeeUserId,
            title: finalTitle,
            description: desc || 'Dibuat dari ekstensi FocusBuddy',
            startTime: startDateTime.toISOString().slice(0, 19).replace('T', ' '),
            endTime: endDateTime.toISOString().slice(0, 19).replace('T', ' '),
            visibility: vis,
            notificationOffsetMinutes: 0
          })
        });
      } catch (e) {
        console.error("Failed to sync calendar to web:", e);
      }
    }

    ctx.alarms.push({ id, label: finalTitle, timestamp: startTs, repeat: [], enabled: true });
    chrome.runtime.sendMessage({ type: 'SET_ALARM', id, label: finalTitle, timestamp: startTs });
    save(); renderAlarms();
    
    if ($('fb-cal-title')) $('fb-cal-title').value = '';
    if ($('fb-cal-desc')) $('fb-cal-desc').value = '';
    
    showToast('✅ Berhasil', `Acara "${finalTitle}" disimpan!`, 2500);
    burst();
  }
  const calAddBtn = $('fb-cal-add-btn');
  if (calAddBtn) calAddBtn.onclick = addAlarm;


