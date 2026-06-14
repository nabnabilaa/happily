  // ═══════════════════════════════════════════════════════════════
  
  // ═══════════════════════════════════════════════════════════════
  // MINI CALENDAR WIDGET
  // ═══════════════════════════════════════════════════════════════
  const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  let calYear  = new Date().getFullYear()
  let calMonth = new Date().getMonth()   // 0-indexed
  let calSelDate = null   // 'YYYY-MM-DD' or null

  function calDateKey(ts) {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  function renderMiniCalendar() {
    const grid   = $('fb-mini-cal-grid')
    const mlabel = $('fb-cal-month-lbl')
    if (!grid || !mlabel) return
    mlabel.textContent = `${BULAN_ID[calMonth]} ${calYear}`
    grid.innerHTML = ''

    const todayKey = calDateKey(Date.now())
    // Build event density map for this month's events
    const evMap = {}
    ctx.alarms.filter(a => a.enabled !== false).forEach(a => {
      const k = calDateKey(a.timestamp)
      const urgent = (a.timestamp - Date.now()) < 30 * 60 * 1000 && a.timestamp > Date.now()
      if (!evMap[k]) evMap[k] = { count: 0, urgent: false }
      evMap[k].count++
      if (urgent) evMap[k].urgent = true
    })

    // First day of month (0=Sun … 6=Sat)
    const firstDow = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const daysInPrev  = new Date(calYear, calMonth, 0).getDate()

    // Prev month fill
    for (let i = 0; i < firstDow; i++) {
      const day = daysInPrev - firstDow + 1 + i
      const prevMonth = calMonth === 0 ? 11 : calMonth - 1
      const prevYear  = calMonth === 0 ? calYear - 1 : calYear
      const k = `${prevYear}-${String(prevMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      grid.appendChild(makeCalDay(day, k, true, todayKey, evMap))
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const k = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      grid.appendChild(makeCalDay(d, k, false, todayKey, evMap))
    }
    // Next month fill to complete grid rows
    const total = firstDow + daysInMonth
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7)
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = calMonth === 11 ? 0 : calMonth + 1
      const nextYear  = calMonth === 11 ? calYear + 1 : calYear
      const k = `${nextYear}-${String(nextMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      grid.appendChild(makeCalDay(d, k, true, todayKey, evMap))
    }
  }

  function makeCalDay(dayNum, dateKey, otherMonth, todayKey, evMap) {
    const cell = document.createElement('div')
    cell.className = 'fb-cal-day2'
      + (otherMonth ? ' fb-cd-other' : '')
      + (dateKey === todayKey ? ' fb-cd-today' : '')
      + (dateKey === calSelDate ? ' fb-cd-sel' : '')
    const numSpan = document.createElement('span')
    numSpan.textContent = dayNum
    cell.appendChild(numSpan)
    // Dots row
    const dotsRow = document.createElement('div')
    dotsRow.className = 'fb-cd-dots'
    const ev = evMap[dateKey]
    if (ev && ev.count > 0) {
      const dotsToShow = Math.min(ev.count, 3)
      for (let i = 0; i < dotsToShow; i++) {
        const dot = document.createElement('div')
        dot.className = 'fb-cd-dot' + (ev.urgent ? ' urg' : '')
        dotsRow.appendChild(dot)
      }
    }
    cell.appendChild(dotsRow)
    cell.onclick = () => {
      calSelDate = calSelDate === dateKey ? null : dateKey
      renderMiniCalendar()
      updateCalFilterBar()
      renderAlarms()
      // Pre-fill date input with selected date
      const dInput = $('fb-cal-date')
      if (dInput && calSelDate) dInput.value = calSelDate
    }
    return cell
  }

  function updateCalFilterBar() {
    const bar = $('fb-cal-filter-bar')
    const lbl = $('fb-cal-filter-lbl')
    if (!bar || !lbl) return
    if (calSelDate) {
      const [y, m, d] = calSelDate.split('-')
      lbl.textContent = `📅 ${parseInt(d)} ${BULAN_ID[parseInt(m)-1]} ${y}`
      bar.style.display = 'flex'
    } else {
      bar.style.display = 'none'
    }
  }

  // Nav buttons
  const calPrev = $('fb-cal-prev-btn'), calNext = $('fb-cal-next-btn')
  if (calPrev) calPrev.onclick = () => {
    if (calMonth === 0) { calMonth = 11; calYear-- } else calMonth--
    calSelDate = null; renderMiniCalendar(); updateCalFilterBar(); renderAlarms()
  }
  if (calNext) calNext.onclick = () => {
    if (calMonth === 11) { calMonth = 0; calYear++ } else calMonth++
    calSelDate = null; renderMiniCalendar(); updateCalFilterBar(); renderAlarms()
  }

  // Clear filter button
  const calFilterClr = $('fb-cal-filter-clr')
  if (calFilterClr) calFilterClr.onclick = () => {
    calSelDate = null; renderMiniCalendar(); updateCalFilterBar(); renderAlarms()
  }

  // Calendar form toggle (button-based, not details/summary)
  const calFormToggle = $('fb-cal-form-toggle')
  const calFormBody   = $('fb-cal-form-body')
  const calArrow      = $('fb-cal-form-arrow')
  if (calFormToggle && calFormBody) {
    let calFormOpen = false
    calFormToggle.onclick = () => {
      calFormOpen = !calFormOpen
      calFormBody.style.display = calFormOpen ? 'block' : 'none'
      if (calArrow) calArrow.style.transform = calFormOpen ? 'rotate(90deg)' : 'rotate(0deg)'
      calFormToggle.style.borderRadius = '0'
      calFormToggle.style.borderBottomColor = calFormOpen ? 'transparent' : 'rgba(31,29,27,.09)'
    }
  }

  renderMiniCalendar()

