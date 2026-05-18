;(function () {
  'use strict'
  if (document.getElementById('fb-root')) return
  if (location.protocol === 'chrome-extension:' || location.protocol === 'devtools:') return

  // ═══════════════════════════════════════════════════════════════
  // STATE MACHINE  (FocusBuddy state → SVG state mapping)
  // ═══════════════════════════════════════════════════════════════
  const STATES = {
    IDLE:       { color:'#4d9fff', badge:'Halo! 👋',               svgState:'idle',      w1:'#dbe4ff', w2:'#5c8ee8', wp:'#ffc9c9', mouth:'M 90 125 Q 100 130 110 125' },
    HAPPY:      { color:'#00e87a', badge:'Yeay! 🎉',               svgState:'senang',    w1:'#d3f9d8', w2:'#51cf66', wp:'#8ce99a', mouth:'M 80 125 Q 100 155 120 125' },
    SAD:        { color:'#7b7bff', badge:'Sedih nih… 😢',          svgState:'sedih',     w1:'#e9ecef', w2:'#adb5bd', wp:'#ced4da', mouth:'M 85 135 Q 100 115 115 135' },
    SLEEPY:     { color:'#9b8fcc', badge:'Zzzz… 😴',              svgState:'ngantuk',   w1:'#a5d8ff', w2:'#3b5bdb', wp:'#5c7cfa', mouth:'M 95 130 Q 100 132 105 130' },
    FOCUS:      { color:'#ff9a1a', badge:'Fokus bareng! 🔥',       svgState:'fokus',     w1:'#e5dbff', w2:'#845ef7', wp:'#b197fc', mouth:'M 92 128 L 108 128' },
    EATING:     { color:'#ff6b6b', badge:'Makan dulu! 🍱',         svgState:'makan',     w1:'#ffe8cc', w2:'#ffa94d', wp:'#ffc078', mouth:'M 85 125 Q 100 155 115 125' },
    STRETCHING: { color:'#4ecdc4', badge:'Stretching~ 🤸',         svgState:'olahraga',  w1:'#ffc9c9', w2:'#ff8787', wp:'#ff6b6b', mouth:'M 85 125 Q 100 115 115 125' },
    EXCITED:    { color:'#ffd93d', badge:'Luar biasa!!! ✨',        svgState:'semangat',  w1:'#ffec99', w2:'#fcc419', wp:'#ffd43b', mouth:'M 75 120 Q 100 180 125 120' },
    ANNOYED:    { color:'#ff4757', badge:'Jangan digangguin! 😤',   svgState:'kesal',     w1:'#ffc9c9', w2:'#fa5252', wp:'#c92a2a', mouth:'M 85 135 Q 100 115 115 135' },
    WAITING:    { color:'#a8edea', badge:'Menunggu… ⏳',            svgState:'menunggu',  w1:'#c3fae8', w2:'#20c997', wp:'#63e6be', mouth:'M 95 125 A 5 5 0 1 1 105 125 A 5 5 0 1 1 95 125' },
  }

  const ctx = {
    tasks:[], notes:[], alarms:[], alarmHistory:[], timerRunning:false,
    lastActivity:Date.now(), clickCount:0, clickWindowStart:0,
    rubScore:0, rubLastTime:0,
  }

  function today()   { return new Date().toDateString() }
  function doneRate() {
    const t = ctx.tasks.filter(t => t.date === today())
    return t.length ? t.filter(t => t.done).length / t.length : 0
  }

  function evalState() {
    const now = Date.now(), hr = new Date().getHours(), mn = new Date().getMinutes()
    if (ctx.clickCount >= 6 && now - ctx.clickWindowStart < 3000) return 'ANNOYED'
    const td = ctx.tasks.filter(t => t.date === today())
    if (td.length >= 2 && td.every(t => t.done)) return 'EXCITED'
    if (ctx.rubScore > 14 || doneRate() >= 0.7) return 'HAPPY'
    if (ctx.timerRunning) return 'FOCUS'
    if ((hr === 12 || hr === 19) && mn < 15) return 'EATING'
    if (mn >= 55) return 'STRETCHING'
    if (ctx.alarms.some(a => a.timestamp > now && a.timestamp - now < 300000)) return 'WAITING'
    if (td.length > 0 && doneRate() < 0.3) return 'SAD'
    if (now - ctx.lastActivity > 300000 || hr >= 23 || hr < 6) return 'SLEEPY'
    return 'IDLE'
  }

  let currentState = 'IDLE'
  let forcedState = null, forcedUntil = 0, annoyedEndTime = 0
  let panelOpen = false, activeTab = 'tasks'
  let timerSec = 1500, timerMax = 1500, timerLabel = 'FOKUS', timerIv = null
  let pomodoroSessions = 0, evalIv = null

  function getState() {
    if (forcedState && Date.now() < forcedUntil) return forcedState
    if (forcedState === 'ANNOYED') {
      annoyedEndTime = Date.now()
      ctx.clickCount = 0; ctx.clickWindowStart = 0; ctx.rubScore = 0
    }
    forcedState = null
    if (annoyedEndTime && Date.now() - annoyedEndTime < 2000) return 'IDLE'
    return evalState()
  }
  function forceState(s, ms = 2500) { forcedState = s; forcedUntil = Date.now() + ms }

  // ── Storage ──
  function save() {
    chrome.storage.local.set({ fb3:{ tasks:ctx.tasks, notes:ctx.notes, alarms:ctx.alarms } })
  }
  function load(cb) {
    chrome.storage.local.get('fb3', r => {
      if (r.fb3) {
        ctx.tasks  = r.fb3.tasks  || []
        ctx.notes  = r.fb3.notes  || []
        ctx.alarms = (r.fb3.alarms||[]).filter(a => a.timestamp > Date.now())
      }
      cb && cb()
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // FLOWBEE SYNC MODULE — 2-way task + notes + calendar + notification sync
  // ═══════════════════════════════════════════════════════════════
  const FLOWBEE_API = 'http://localhost:3000/api/ext'
  let flowbeeUserId = null
  let flowbeeNotifCache = []

  // Try to get userId from Flowbee cookie/localStorage on the website
  function detectFlowbeeUser() {
    try {
      // Check if we can read from the website's localStorage
      const stored = localStorage.getItem('hp-user-id')
      if (stored) { flowbeeUserId = stored; return }
      // Fallback: check sessionStorage
      const session = sessionStorage.getItem('hp-user-id')
      if (session) { flowbeeUserId = session; return }
    } catch (e) { /* cross-origin blocked, expected */ }

    // Also check chrome.storage for manual config
    chrome.storage.local.get('flowbee_user_id', r => {
      if (r.flowbee_user_id) flowbeeUserId = r.flowbee_user_id
    })
  }

  async function flowbeeSyncAll() {
    if (!flowbeeUserId) return
    try {
      // Push local tasks that are for today — with enhanced fields
      const localTasks = ctx.tasks.filter(t => t.date === today()).map(t => ({
        id: String(t.id), title: t.text || t.title || '', done: !!t.done,
        energy: t.priority || 'mid', est: '30m', tone: 'sage',
        proofLink: t.proofLink || null,
        progress: t.progress || 0,
        isProject: !!t.isProject,
        projectDurationDays: t.projectDurationDays || null,
        projectDescription: t.projectDescription || null,
        metricValue: t.metricValue || null,
      }))

      // Push local notes
      const localNotes = ctx.notes.map(n => ({
        id: String(n.id), title: n.title || '', content: n.text || n.content || '',
        visibility: n.visibility || 'private',
        relatedEventId: n.relatedEventId || null,
      }))

      const res = await fetch(`${FLOWBEE_API}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: flowbeeUserId,
          tasks: localTasks,
          notes: localNotes,
          calendarRequest: true, // Request upcoming calendar events
        })
      })
      const data = await res.json()

      // Merge: web tasks not in local get added
      if (data.tasks) {
        data.tasks.forEach(wt => {
          const existing = ctx.tasks.find(lt => String(lt.id) === String(wt.id))
          if (!existing) {
            ctx.tasks.push({
              id: wt.id, text: wt.title, done: wt.done,
              date: today(), priority: wt.energy || 'mid',
              proofLink: wt.proofLink || '', progress: wt.progress || 0,
              isProject: wt.isProject || false, goalId: wt.goalId, kpiId: wt.kpiId,
            })
          } else {
            // Update status from web
            existing.done = wt.done
            existing.proofLink = wt.proofLink || existing.proofLink
            existing.progress = wt.progress || existing.progress
          }
        })
      }

      // Merge calendar events as local alarms
      if (data.calendar && data.calendar.length > 0) {
        data.calendar.forEach(ev => {
          const startMs = new Date(ev.startTime).getTime()
          const alarmMs = startMs - (ev.notificationOffsetMinutes || 15) * 60000
          if (alarmMs > Date.now() && !ctx.alarms.find(a => a.id === 'web_' + ev.id)) {
            ctx.alarms.push({
              id: 'web_' + ev.id,
              label: '📅 ' + ev.title + (ev.location ? ' @ ' + ev.location : ''),
              timestamp: alarmMs,
            })
          }
        })
      }

      // Show notifications from web
      if (data.notifications && data.notifications.length > 0) {
        const cachedIds = new Set(flowbeeNotifCache.map(n => n.id))
        const newNotifs = data.notifications.filter(n => !cachedIds.has(n.id))
        for (const n of newNotifs) {
          try {
            chrome.runtime.sendMessage({
              type: 'SHOW_NOTIFICATION',
              title: n.title,
              message: n.message || ''
            })
          } catch (e) { /* background might not handle this yet */ }
        }
        flowbeeNotifCache = data.notifications
      }

      save()
    } catch (e) { /* offline or server down — silent fail */ }
  }

  // Auto-sync every 30 seconds
  detectFlowbeeUser()
  setInterval(() => {
    detectFlowbeeUser()
    flowbeeSyncAll()
  }, 30000)

  // ═══════════════════════════════════════════════════════════════
  // DOM ROOT
  // ═══════════════════════════════════════════════════════════════
  const root = document.createElement('div')
  root.id = 'fb-root'
  root.style.cssText = [
    'all:initial!important','position:fixed!important',
    'z-index:2147483647!important','pointer-events:none!important',
    'font-family:Outfit,system-ui,sans-serif!important',
    'width:0!important','height:0!important',
  ].join(';')
  document.documentElement.appendChild(root)

  if (!document.querySelector('#fb-font')) {
    const l = document.createElement('link')
    l.id='fb-font'; l.rel='stylesheet'
    l.href='https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'
    document.head && document.head.appendChild(l)
  }

  // ═══════════════════════════════════════════════════════════════
  // HTML + CSS
  // ═══════════════════════════════════════════════════════════════
  root.innerHTML = `
<style>
#fb-genangan {
  position:absolute !important; bottom:0; left:50%; transform:translateX(-50%);
  width:120px !important; height:18px !important;
  background:rgba(116,192,252,0.6) !important; border-radius:50% !important; filter:blur(4px);
  pointer-events:none !important; opacity:0 !important; transition:opacity .3s;
}
@keyframes genanganMeluas { 0%{transform:translateX(-50%) scale(0);opacity:0} 100%{transform:translateX(-50%) scale(1);opacity:1} }
:where(#fb-root div,#fb-root button,#fb-root input,#fb-root textarea,#fb-root span,#fb-root p,#fb-root label) {
  box-sizing: border-box !important; font-family: Outfit,system-ui,sans-serif !important;
  margin: 0 !important; padding: 0 !important; border: 0 !important; outline: 0 !important;
  text-decoration: none !important; list-style: none !important;
  -webkit-tap-highlight-color: transparent !important;
}
:where(#fb-root button) { display:block !important; cursor:pointer !important }
:where(#fb-root input, #fb-root textarea) { display:block !important }

/* ══════════════════════════════════════════════
   BUDDY
══════════════════════════════════════════════ */
#fb-buddy {
  position:absolute !important; bottom:0; right:0;
  width:100px !important; height:130px !important;
  cursor:grab !important; pointer-events:all !important; user-select:none;
  perspective:500px;
}
#fb-buddy.dragging { cursor:grabbing !important }
#fb-drag-dot {
  position:absolute !important; top:8px; left:50%; transform:translateX(-50%);
  width:20px !important; height:4px !important; border-radius:2px !important;
  background:rgba(255,255,255,.25) !important; pointer-events:none !important; z-index:2;
  opacity:0 !important; transition:opacity .2s;
}
#fb-buddy:hover #fb-drag-dot { opacity:1 !important }
#fb-snap-ring {
  position:absolute !important; bottom:-5px; right:-5px;
  width:110px !important; height:110px !important; border-radius:50% !important;
  border:2px dashed rgba(255,255,255,.18) !important;
  pointer-events:none !important; opacity:0 !important; transition:opacity .3s;
  animation:fb-spin 4s linear infinite;
}
#fb-buddy.dragging #fb-snap-ring { opacity:1 !important }
@keyframes fb-spin { to { transform:rotate(360deg) } }

#fb-svg-wrap {
  position:absolute !important; bottom:10px; right:0;
  width:100px !important; height:100px !important;
  animation: melayangHalus 3s infinite ease-in-out;
  transform-style:preserve-3d;
  filter: drop-shadow(0 8px 18px rgba(0,0,0,.35)) drop-shadow(0 2px 4px rgba(0,0,0,.2));
  --w1:#dbe4ff; --w2:#5c8ee8; --wp:#ffc9c9;
}
#fb-bayangan {
  position:absolute !important; bottom:6px; left:50%; transform:translateX(-50%);
  width:56px !important; height:10px !important;
  background:rgba(0,0,0,.2) !important; border-radius:50% !important; filter:blur(4px);
  animation:bayanganHalus 3s infinite ease-in-out; pointer-events:none !important;
}
#fb-badge {
  position:absolute !important; bottom:110px; right:0;
  background:rgba(5,5,16,.97) !important; border:1px solid rgba(255,255,255,.12) !important;
  color:#fff !important; font-size:12px !important; font-weight:500 !important;
  padding:7px 16px !important; border-radius:22px !important; white-space:nowrap !important; pointer-events:none !important;
  backdrop-filter:blur(16px); box-shadow:0 8px 28px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.1);
  opacity:0 !important; transform:translateY(8px) scale(.95); transition:opacity .22s, transform .22s cubic-bezier(.34,1.56,.64,1);
}
#fb-buddy:hover #fb-badge { opacity:1 !important; transform:translateY(0) scale(1) }

/* ══════════════════════════════════════════════
   SVG CHARACTER — BASE STATE (hidden defaults)
══════════════════════════════════════════════ */
.stop-1 { stop-color: var(--w1); transition: stop-color .8s ease }
.stop-2 { stop-color: var(--w2); transition: stop-color .8s ease }
.pipi   { fill:var(--wp); transition:all .8s ease; transform-origin:center; transform-box:fill-box }
.mulut  { transform-origin:100px 125px; transition:d .5s cubic-bezier(.34,1.56,.64,1), fill .4s ease }
.mata-bisa-kedip { transform-origin:100px 95px; animation:mataKedip 4.5s infinite }
.pupil-mata { transition:all .3s ease }

.aura-api,.api-roket,.awan-hujan,.jam-menunggu,.kembang-api,.hati-banyak,
.elemen-mikir,.topi-tidur,.kacamata-tebal,.ikat-kepala,.urat-marah,.alis-sedih,
.alis-marah,.alis-fokus,.mata-tidur,.mata-ngotot,.mata-bintang,.mata-senang,
.mata-sedih,.mata-fokus,.gelembung-ingus,.keringat,.barbel,.biskuit-animasi,
.biskuit-digigit,.remah-terbang,.remah-mulut,.gelembung-zzz,.air-mata-imut,
.permen-karet,.holo-rings,.sparkles-senang,.asap-kepala {
  opacity:0 !important; pointer-events:none !important;
}
.api-roket    { transform-origin:100px 190px }
.kembang-api  { transform-origin:100px 100px }
.topi-tidur   { transform-origin:100px 30px; transform:translateY(-20px); transition:all .5s ease }
.kacamata-tebal { transform:translateY(-20px); transition:all .5s ease }
.ikat-kepala  { transform:translateY(-20px); transition:all .5s ease }
.urat-marah   { transform-origin:150px 50px }
.awan-hujan   { transform:translateY(-40px) scale(.85); transition:all .5s ease; transform-origin:top center }

/* ══════════════════════════════════════════════
   STATE-SPECIFIC CSS
══════════════════════════════════════════════ */

/* TIDUR */
.state-ngantuk #fb-svg-wrap  { animation:napasTidur 4s infinite ease-in-out }
.state-ngantuk .topi-tidur   { opacity:1 !important; transform:translateY(0) }
.state-ngantuk .gelembung-zzz{ opacity:1 !important; animation:zzzNaik 3s infinite linear }
.state-ngantuk .mata-bisa-kedip { opacity:0 !important }
.state-ngantuk .mata-tidur   { opacity:1 !important }
.state-ngantuk .gelembung-ingus { opacity:1 !important; animation:ingusMembesar 4s infinite ease-in-out }

/* SEDIH */
.state-sedih #fb-svg-wrap    { transform:translateY(15px) scale(.95); animation:gemetarSedih 2.5s infinite ease-in-out }
.state-sedih .mata-bisa-kedip{ opacity:0 !important }
.state-sedih .mata-sedih     { opacity:1 !important }
.state-sedih .alis-sedih     { opacity:1 !important }
.state-sedih .air-mata-imut  { opacity:1 !important }
.state-sedih .tetesan-mata   { animation:nangisBanjir 1s infinite ease-in }
.state-sedih .tetesan-mata.delay { animation-delay:.4s }
.state-sedih .awan-hujan     { opacity:1 !important; transform:translateY(-25px) scale(.8) }
.state-sedih .tetes-hujan    { opacity:1 !important; animation:hujanTurun .8s infinite linear }
.state-sedih .mulut          { animation:bibirGemetar 2.5s infinite }
.state-sedih ~ #fb-genangan    { opacity:1 !important; animation:genanganMeluas 3s forwards }

/* MENUNGGU */
.state-menunggu #fb-svg-wrap { animation:nungguBosan 3s infinite ease-in-out }
.state-menunggu .jam-menunggu { opacity:1 !important }
.state-menunggu .jarum-jam   { animation:putarJam 1s infinite steps(8); transform-origin:100px 40px }
.state-menunggu .pupil-mata  { animation:lirikKananKiri 3s infinite ease-in-out }
.state-menunggu .permen-karet{ opacity:1 !important }
.state-menunggu .balon-tiup  { animation:tiupBalon 4s infinite cubic-bezier(.2,.8,.2,1); transform-origin:100px 125px }
.state-menunggu .ledakan-permen { animation:ledakanBalon 4s infinite ease-out; transform-origin:100px 125px }
.state-menunggu .mulut       { transform:scale(0.3) }

/* OLAHRAGA */
.state-olahraga #fb-svg-wrap { animation:squatJump .8s infinite }
.state-olahraga .mata-bisa-kedip { opacity:0 !important }
.state-olahraga .mata-ngotot { opacity:1 !important }
.state-olahraga .ikat-kepala { opacity:1 !important; transform:translateY(0) }
.state-olahraga .pipi        { transform:scale(1.3) }
.state-olahraga .barbel      { opacity:1 !important; animation:angkatBarbel .8s infinite }
.state-olahraga .keringat    { opacity:1 !important; animation:keringatBercucuran .8s infinite }
.state-olahraga #fb-bayangan { animation:bayanganSquat .8s infinite }
.state-olahraga .aura-api    { opacity:1 !important; animation:auraMenyala .4s infinite alternate }

/* FOKUS */
.state-fokus .kacamata-tebal { opacity:1 !important; transform:translateY(0) }
.state-fokus .alis-fokus     { opacity:1 !important }
.state-fokus .elemen-mikir   { opacity:1 !important }
.state-fokus .bohlam         { animation:lampuNyala 1.5s infinite alternate }
.state-fokus .rumus          { animation:melayangRumus 3s infinite linear }
.state-fokus .garis-laser    { opacity:1 !important; animation:scanLaser 2s infinite ease-in-out }
.state-fokus .holo-rings     { opacity:1 !important }
.state-fokus .ring-1         { animation:putarRing1 8s linear infinite }
.state-fokus .ring-2         { animation:putarRing2 12s linear infinite }
.state-fokus .mata-laser     { animation:nyalaLaser 1.5s infinite alternate; transform-origin:center; transform-box:fill-box }

/* SENANG */
.state-senang #fb-svg-wrap   { animation:tarianSenang 1.5s infinite ease-in-out }
.state-senang .mata-bisa-kedip { opacity:0 !important }
.state-senang .mata-senang   { opacity:1 !important }
.state-senang .hati-banyak   { opacity:1 !important; animation:loveTerbangSuper 1.5s infinite ease-out }
.state-senang .sparkles-senang { opacity:1 !important; animation:sparkleKelapKelip 1.5s infinite alternate }
.state-senang .pipi          { transform:scale(1.4); opacity:1 !important }

/* SEMANGAT */
.state-semangat #fb-svg-wrap { animation:lompatRoket .5s infinite alternate cubic-bezier(.2,.8,.2,1) }
.state-semangat .mata-bisa-kedip { opacity:0 !important }
.state-semangat .mata-bintang { opacity:1 !important; transform:scale(1.1); transform-origin:center; transform-box:fill-box }
.state-semangat .kembang-api { opacity:1 !important; animation:kembangApiMeriah .8s infinite alternate }
.state-semangat .api-roket   { opacity:1 !important; animation:apiMembara .1s infinite alternate }
.state-semangat #fb-bayangan { animation:bayanganLompatSuper .5s infinite alternate ease-in }

/* MAKAN */
.state-makan #fb-svg-wrap    { animation:goyangSenang 1s infinite }
.state-makan .mulut          { animation:ngunyah .3s infinite alternate }
.state-makan .pipi           { animation:pipiNgunyah .3s infinite alternate }
.state-makan .biskuit-animasi { opacity:1 !important }
.state-makan .biskuit-utuh   { animation:toggleBiskuit 2.5s infinite }
.state-makan .biskuit-digigit { animation:toggleBiskuitBalik 2.5s infinite }
.state-makan .remah-mulut    { opacity:1 !important; animation:remahNempel 2.5s infinite }
.state-makan .remah-terbang  { opacity:1 !important; animation:hamburRemah 2.5s infinite }

/* KESAL */
.state-kesal #fb-svg-wrap    { animation:gemetarKesal .1s infinite }
.state-kesal .alis-marah     { opacity:1 !important }
.state-kesal .urat-marah     { opacity:1 !important; animation:denyut .5s infinite }
.state-kesal .asap-kepala    { opacity:1 !important; animation:ngepulAsap 1s infinite }
.state-kesal .pipi           { transform:scale(1.4) }

/* ══════════════════════════════════════════════
   KEYFRAMES
══════════════════════════════════════════════ */
@keyframes melayangHalus {
  0%   { transform: translateY(0)    rotateX(0deg)   scaleX(1)    scaleY(1); }
  30%  { transform: translateY(-7px) rotateX(-6deg)  scaleX(1.04) scaleY(1.03); }
  50%  { transform: translateY(-12px) rotateX(-3deg) scaleX(1.02) scaleY(1.06); }
  70%  { transform: translateY(-7px) rotateX(-6deg)  scaleX(1.04) scaleY(1.03); }
  100% { transform: translateY(0)    rotateX(0deg)   scaleX(1)    scaleY(1); }
}
@keyframes bayanganHalus { 0%,100%{transform:translateX(-50%) scale(1);opacity:.22} 50%{transform:translateX(-50%) scale(.65);opacity:.07} }
@keyframes mataKedip { 0%,96%,100%{transform:scaleY(1)} 98%{transform:scaleY(.1)} }

/* Tidur */
@keyframes napasTidur { 0%,100%{transform:translateY(20px) scaleY(.95)} 50%{transform:translateY(15px) scaleY(1)} }
@keyframes zzzNaik    { 0%{transform:translate(0,0) scale(.5);opacity:0} 20%{opacity:1} 100%{transform:translate(30px,-60px) scale(1.5) rotate(20deg);opacity:0} }
@keyframes ingusMembesar { 0%,100%{transform:scale(.5);opacity:.3} 50%{transform:scale(1.3);opacity:.9} }

/* Sedih */
@keyframes nangisBanjir { 0%{transform:translateY(-5px) scaleY(.5);opacity:0} 20%{opacity:1} 100%{transform:translateY(35px) scaleY(1.3);opacity:0} }
@keyframes bibirGemetar { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes gemetarSedih { 0%,100%{transform:translateY(15px) translateX(0)} 25%{transform:translateY(16px) translateX(1px)} 75%{transform:translateY(14px) translateX(-1px)} }
@keyframes hujanTurun   { 0%{transform:translateY(-5px);opacity:1} 100%{transform:translateY(25px);opacity:0} }

/* Menunggu */
@keyframes lirikKananKiri { 0%,100%{transform:translateX(0)} 20%,40%{transform:translateX(-6px)} 60%,80%{transform:translateX(6px)} }
@keyframes nungguBosan    { 0%,100%{transform:translateY(0) scaleY(1)} 50%{transform:translateY(8px) scaleY(.95)} }
@keyframes tiupBalon      { 0%{transform:scale(0);opacity:0} 10%{transform:scale(.5);opacity:.9} 75%{transform:scale(2.2);opacity:.9} 76%,100%{opacity:0;transform:scale(0)} }
@keyframes ledakanBalon   { 0%,75%{opacity:0;transform:scale(.5)} 76%{opacity:1;transform:scale(1.5)} 85%,100%{opacity:0;transform:scale(2.5)} }
@keyframes putarJam       { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

/* Olahraga */
@keyframes squatJump    { 0%,100%{transform:translateY(0)} 30%{transform:translateY(30px) scaleX(1.1) scaleY(.9)} 70%{transform:translateY(-40px) scaleX(.9) scaleY(1.1)} }
@keyframes angkatBarbel { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-10px)} 70%{transform:translateY(-60px)} }
@keyframes keringatBercucuran { 0%{transform:translateY(0);opacity:0} 30%{opacity:1} 100%{transform:translateY(30px) scale(0);opacity:0} }
@keyframes auraMenyala  { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.25);opacity:.8;filter:hue-rotate(15deg)} }
@keyframes bayanganSquat { 0%,100%{transform:translateX(-50%) scale(1.2);opacity:.2} 50%{transform:translateX(-50%) scale(.6);opacity:.04} }

/* Fokus */
@keyframes lampuNyala    { 0%{opacity:.5;transform:scale(.9);filter:drop-shadow(0 0 5px #fcc419)} 100%{opacity:1;transform:scale(1.1);filter:drop-shadow(0 0 15px #fcc419)} }
@keyframes melayangRumus { 0%{transform:translateY(0) rotate(0);opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{transform:translateY(-40px) rotate(20deg);opacity:0} }
@keyframes scanLaser     { 0%,100%{transform:translateY(-15px);opacity:0} 10%,90%{opacity:1} 50%{transform:translateY(25px)} }
@keyframes putarRing1    { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes putarRing2    { 0%{transform:rotate(360deg)} 100%{transform:rotate(0deg)} }
@keyframes nyalaLaser    { 0%,100%{opacity:.4;transform:scale(.8)} 50%{opacity:1;transform:scale(1.4);filter:drop-shadow(0 0 5px #339af0)} }

/* Senang */
@keyframes tarianSenang  { 0%,100%{transform:translateY(0) scale(1,1)} 25%{transform:translateY(-25px) scale(.9,1.1) rotate(-8deg)} 50%{transform:translateY(0) scale(1.05,.95)} 75%{transform:translateY(-25px) scale(.9,1.1) rotate(8deg)} }
@keyframes loveTerbangSuper { 0%{transform:translate(0,0) scale(.5);opacity:0} 30%{opacity:1} 100%{transform:translate(30px,-80px) scale(1.5) rotate(20deg);opacity:0} }
@keyframes sparkleKelapKelip { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }

/* Semangat */
@keyframes lompatRoket   { 0%{transform:translateY(10px) scale(1.1,.9)} 100%{transform:translateY(-80px) scale(.9,1.1)} }
@keyframes apiMembara    { 0%{transform:scaleY(.6);opacity:.7} 100%{transform:scaleY(1.5);opacity:1;filter:brightness(1.5)} }
@keyframes kembangApiMeriah { 0%{transform:scale(.5);opacity:0} 50%{opacity:1} 100%{transform:scale(1.8);opacity:0} }
@keyframes bayanganLompatSuper { 0%{transform:translateX(-50%) scale(1.4);opacity:.2} 100%{transform:translateX(-50%) scale(.2);opacity:0} }

/* Makan */
@keyframes goyangSenang  { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-3deg)} 75%{transform:rotate(3deg)} }
@keyframes ngunyah       { 0%{transform:scaleY(1) translateY(0)} 100%{transform:scaleY(.4) translateY(-5px)} }
@keyframes pipiNgunyah   { 0%{transform:scaleX(1)} 100%{transform:scaleX(1.2) translateX(3px)} }
@keyframes toggleBiskuit { 0%,55%{opacity:1} 60%,100%{opacity:0} }
@keyframes toggleBiskuitBalik { 0%,55%{opacity:0} 60%,95%{opacity:1} 100%{opacity:0} }
@keyframes remahNempel   { 0%,55%{opacity:0} 60%,100%{opacity:1} }
@keyframes hamburRemah   { 0%,55%{opacity:0;transform:translate(0,0)} 60%{opacity:1;transform:translate(0,0)} 85%{opacity:.4} 100%{opacity:0;transform:translate(10px,-20px) scale(.4)} }

/* Kesal */
@keyframes gemetarKesal  { 0%{transform:translate(2px,2px)} 25%{transform:translate(-2px,-2px)} 50%{transform:translate(-2px,2px)} 75%{transform:translate(2px,-2px)} 100%{transform:translate(0,0)} }
@keyframes denyut        { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:.6} }
@keyframes ngepulAsap    { 0%{transform:translateY(0) scale(.5);opacity:0} 50%{opacity:.9} 100%{transform:translateY(-50px) scale(1.5);opacity:0} }

/* ══════════════════════════════════════════════
   PANEL
══════════════════════════════════════════════ */
#fb-panel {
  position:absolute !important; bottom:142px; right:0; width:360px !important; min-width:300px !important; max-width:calc(100vw - 48px) !important;
  background:rgba(7,9,22,1) !important;
  border:1px solid rgba(255,255,255,.08) !important;
  border-radius:28px !important; overflow:hidden !important;
  box-shadow:0 40px 100px rgba(0,0,0,.95), 0 0 0 1px rgba(255,255,255,.04), inset 0 1px 0 rgba(255,255,255,.07), 0 0 80px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px); transform-origin:bottom right;
  opacity:0 !important; pointer-events:none !important;
  transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .25s ease;
}
#fb-panel.open { transform:scale(1) translateY(0); opacity:1 !important; pointer-events:all !important }

#fb-hdr {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  padding:18px 20px 16px !important; border-bottom:1px solid rgba(255,255,255,.06) !important;
  background:linear-gradient(180deg, rgba(255,255,255,.03) 0%, transparent 100%) !important;
}
#fb-hdr-l { display:flex !important; align-items:center !important; gap:10px !important; min-width:0 !important }
.fb-logo   { font-size:16px !important; font-weight:700 !important; color:#fff !important; letter-spacing:-.5px !important }
.fb-date-s { font-size:12.5px !important; color:rgba(255,255,255,.30) !important; font-weight:400 !important; flex-shrink:0 !important }
.fb-pill   { font-size:10px !important; font-weight:800 !important; letter-spacing:1.2px !important; padding:5px 14px !important; border-radius:20px !important; text-transform:uppercase !important; flex-shrink:0 !important }
#fb-x {
  width:34px !important; height:34px !important; border-radius:50% !important; flex-shrink:0 !important;
  background:rgba(255,255,255,.08) !important; color:rgba(255,255,255,.4) !important;
  cursor:pointer !important; font-size:12px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:background .2s,color .2s; border:none !important;
}
#fb-x:hover { background:rgba(255,255,255,.16) !important; color:#fff !important }

#fb-tabs {
  display:flex !important; padding:0 8px !important;
  background:rgba(255,255,255,.015) !important; border-bottom:1px solid rgba(255,255,255,.06) !important;
  overflow:hidden !important; gap:2px !important;
}
.fb-tab {
  flex:1 !important; min-width:0 !important; padding:11px 4px 10px !important; border:none !important; background:none !important;
  color:rgba(255,255,255,.30) !important; font-size:9.5px !important; font-weight:700 !important;
  text-transform:uppercase !important; letter-spacing:.4px !important; cursor:pointer !important;
  display:flex !important; flex-direction:column !important; align-items:center !important; gap:5px !important;
  transition:color .2s, background .2s; border-bottom:2px solid transparent !important; margin-bottom:-1px !important;
  position:relative !important; white-space:nowrap !important; border-radius:8px 8px 0 0 !important;
}
.fb-tab .ti { font-size:17px !important; line-height:1 !important }
.fb-tab:hover { color:rgba(255,255,255,.65) !important; background:rgba(255,255,255,.03) !important }
.fb-tab.act   { color:#fff !important; border-bottom-color:var(--mc,#4d9fff) !important; background:rgba(255,255,255,.04) !important }
.fb-tab.act::after {
  content:''; position:absolute !important; bottom:-1px; left:50%; transform:translateX(-50%);
  width:28px !important; height:2px !important; background:var(--mc,#4d9fff) !important; border-radius:2px 2px 0 0 !important;
  box-shadow:0 0 8px var(--mc,#4d9fff) !important;
}

#fb-body { overflow-y:auto !important; max-height:min(520px,64vh) !important; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.06) transparent }
.fb-pane { padding:16px 16px 20px !important; display:none !important }
.fb-pane.show { display:block !important }

.fb-sec { display:flex !important; align-items:center !important; gap:8px !important; font-size:9.5px !important; font-weight:700 !important; color:rgba(255,255,255,.22) !important; text-transform:uppercase !important; letter-spacing:1.2px !important; margin-bottom:12px !important }
.fb-sec::after { content:''; flex:1 !important; height:1px !important; background:rgba(255,255,255,.06) !important }

.fb-prog-wrap { margin-bottom:18px !important }
.fb-prog-row  { display:flex !important; justify-content:space-between !important; align-items:baseline !important; margin-bottom:8px !important }
.fb-prog-stat { font-size:12px !important; color:rgba(255,255,255,.4) !important; font-weight:500 !important }
.fb-prog-pct  { font-size:12px !important; font-weight:700 !important; color:var(--mc,#4d9fff) !important }
.fb-prog      { height:5px !important; background:rgba(255,255,255,.07) !important; border-radius:99px !important; overflow:hidden !important }
.fb-prog-fill { height:100% !important; border-radius:99px !important; background:var(--mc,#4d9fff) !important; transition:width .6s cubic-bezier(.4,0,.2,1) }

.fb-in {
  width:100% !important; display:block !important;
  background:rgba(255,255,255,.05) !important; border:1.5px solid rgba(255,255,255,.08) !important;
  color:#fff !important; padding:11px 14px !important; border-radius:11px !important;
  font-size:13px !important; outline:none !important; transition:border-color .2s,background .2s;
}
.fb-in::placeholder { color:rgba(255,255,255,.2) !important }
.fb-in:focus { border-color:var(--mc,#4d9fff) !important; background:rgba(255,255,255,.07) !important }
textarea.fb-in { resize:none; min-height:88px !important; line-height:1.6 !important }
input[type="date"].fb-in, input[type="time"].fb-in { color-scheme:dark !important; cursor:pointer !important }

.fb-row { display:flex !important; gap:9px !important; align-items:stretch !important; margin-bottom:12px !important }
.fb-btn {
  display:block !important; cursor:pointer !important; border:none !important; flex-shrink:0 !important;
  padding:11px 17px !important; border-radius:11px !important;
  background:var(--mc,#4d9fff) !important; color:#000 !important;
  font-size:13px !important; font-weight:700 !important; white-space:nowrap !important;
  transition:opacity .2s,transform .15s;
}
.fb-btn:hover { opacity:.82 !important }
.fb-btn:active { transform:scale(.95) }
.fb-btn.sec  { background:rgba(255,255,255,.09) !important; color:rgba(255,255,255,.65) !important }
.fb-btn.sec:hover { background:rgba(255,255,255,.14) !important }
.fb-btn.del  { background:rgba(255,70,70,.1) !important; color:#ff7070 !important; padding:8px 13px !important; font-size:12px !important }
.fb-btn.del:hover { background:rgba(255,70,70,.22) !important }
.fb-btn.full { width:100% !important; text-align:center !important }

.fb-empty { text-align:center !important; padding:36px 0 20px !important; color:rgba(255,255,255,.20) !important; font-size:13px !important; font-weight:500 !important }
.fb-empty-ico { font-size:44px !important; margin-bottom:12px !important; opacity:.4 !important; display:block !important }
.fb-list { display:flex !important; flex-direction:column !important; gap:8px !important }

/* ── TASKS REDESIGN ── */

/* Section label: "0/0 SELESAI HARI INI" */
.fb-task-section-hdr {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  margin-bottom:14px !important;
}
.fb-task-section-lbl {
  font-size:10.5px !important; font-weight:700 !important;
  color:rgba(255,255,255,.25) !important; letter-spacing:1.5px !important; text-transform:uppercase !important;
}
.fb-task-section-stat {
  font-size:11px !important; font-weight:700 !important;
  color:var(--mc,#4d9fff) !important;
}

/* Progress bar */
.fb-prog-wrap { margin-bottom:16px !important }
.fb-prog { height:5px !important; background:rgba(255,255,255,.06) !important; border-radius:99px !important; overflow:hidden !important; position:relative !important }
.fb-prog-fill { height:100% !important; border-radius:99px !important; background:var(--mc,#4d9fff) !important; transition:width .7s cubic-bezier(.4,0,.2,1); position:relative !important; box-shadow:0 0 10px var(--mc,#4d9fff) !important; }
@keyframes progShimmer { 0%{left:-60px} 100%{left:calc(100% + 60px)} }
.fb-prog-fill.running::before {
  content:''; position:absolute !important; top:0; left:-60px; width:60px !important; height:100% !important;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent) !important;
  animation:progShimmer 1.4s infinite;
}

/* Hero message (hidden but kept for JS) */
.fb-task-hero { display:none !important }
.fb-task-hero-msg {}
.fb-prog-row  { display:none !important }
.fb-prog-stat {}
.fb-prog-pct  {}
.fb-prog-marks { display:none !important }
.fb-prog-mark {}

/* ── Input row ── */
.fb-task-add-row {
  display:flex !important; align-items:stretch !important; margin-bottom:18px !important;
}
.fb-task-composer {
  flex:1 !important; min-width:0 !important;
  background:rgba(255,255,255,.05) !important; border:1.5px solid rgba(255,255,255,.09) !important;
  border-radius:13px !important; overflow:visible !important; transition:border-color .2s, box-shadow .2s;
  display:flex !important; align-items:stretch !important;
}
.fb-task-composer:focus-within {
  border-color:var(--mc,#4d9fff) !important;
  box-shadow:0 0 0 3px color-mix(in srgb, var(--mc,#4d9fff) 12%, transparent);
}
.fb-task-input-row {
  display:flex !important; align-items:center !important; width:100% !important;
}
/* ── Priority dropdown (single, no double) ── */
.fb-pri-dd {
  position:relative !important; flex-shrink:0 !important;
  border-right:1px solid rgba(255,255,255,.07) !important;
}
.fb-pri-sel {
  display:flex !important; align-items:center !important; gap:5px !important;
  padding:0 12px !important; height:100% !important; min-height:48px !important;
  background:transparent !important; border:none !important; cursor:pointer !important;
  color:rgba(255,255,255,.55) !important; border-radius:0 !important;
}
.fb-pri-sel:hover { background:rgba(255,255,255,.04) !important; }
.fb-pri-dot-sm {
  width:9px !important; height:9px !important; border-radius:50% !important;
  flex-shrink:0 !important; transition:background .2s, box-shadow .2s;
}
.fb-pri-dd[data-p="high"] .fb-pri-dot-sm { background:#ff8080 !important; box-shadow:0 0 6px rgba(255,80,80,.6) !important }
.fb-pri-dd[data-p="med"]  .fb-pri-dot-sm { background:#ffd43b !important; box-shadow:0 0 6px rgba(255,193,7,.5) !important }
.fb-pri-dd[data-p="low"]  .fb-pri-dot-sm { background:#69db7c !important; box-shadow:0 0 6px rgba(80,200,120,.5) !important }
.fb-pri-arrow { transition:transform .2s !important; }
.fb-pri-dd.open .fb-pri-arrow { transform:rotate(180deg) !important; }
.fb-pri-menu {
  display:none !important; position:absolute !important; top:calc(100% + 6px) !important; left:0 !important;
  background:#1e2433 !important; border:1.5px solid rgba(255,255,255,.1) !important;
  border-radius:11px !important; padding:5px !important; z-index:9999 !important;
  min-width:120px !important; box-shadow:0 8px 24px rgba(0,0,0,.4) !important;
}
.fb-pri-dd.open .fb-pri-menu { display:flex !important; flex-direction:column !important; gap:2px !important; }
.fb-pri-opt {
  display:flex !important; align-items:center !important; gap:9px !important;
  padding:8px 12px !important; border:none !important; background:transparent !important;
  color:rgba(255,255,255,.8) !important; font-size:13px !important; font-weight:500 !important;
  border-radius:8px !important; cursor:pointer !important; text-align:left !important;
  font-family:Outfit,system-ui,sans-serif !important; white-space:nowrap !important;
}
.fb-pri-opt:hover { background:rgba(255,255,255,.07) !important; color:#fff !important; }
.fb-pri-opt.sel { background:rgba(255,255,255,.07) !important; color:#fff !important; font-weight:700 !important; }
.fb-pri-opt-dot {
  width:8px !important; height:8px !important; border-radius:50% !important; flex-shrink:0 !important;
}
/* ── Task input ── */
.fb-task-in2 {
  flex:1 !important; background:transparent !important; border:none !important;
  color:#fff !important; font-size:15px !important; outline:none !important;
  padding:15px 10px 15px 14px !important; font-family:Outfit,system-ui,sans-serif !important;
}
.fb-task-in2::placeholder { color:rgba(255,255,255,.22) !important }
/* ── Add icon button (replaces + Tambah) ── */
.fb-task-add-icon {
  flex-shrink:0 !important; width:44px !important; height:44px !important; margin:auto 6px auto 0 !important;
  border-radius:50% !important; background:var(--mc,#4d9fff) !important; color:#fff !important;
  border:none !important; cursor:pointer !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:opacity .15s, transform .12s, box-shadow .2s !important;
  box-shadow:0 4px 14px color-mix(in srgb, var(--mc,#4d9fff) 40%, transparent) !important;
}
.fb-task-add-icon:hover { opacity:.88 !important; box-shadow:0 6px 18px color-mix(in srgb, var(--mc,#4d9fff) 55%, transparent) !important; }
.fb-task-add-icon:active { transform:scale(.93) !important; }

/* Priority selector — hidden, replaced by dot in composer */
.fb-task-priority-row { display:none !important }
.fb-task-priority-lbl {}
.fb-task-pri-btn { display:none !important }
.fb-task-pri-btn[data-p="high"] {}
.fb-task-pri-btn[data-p="med"]  {}
.fb-task-pri-btn[data-p="low"]  {}
.fb-task-pri-btn.sel[data-p="high"] {}
.fb-task-pri-btn.sel[data-p="med"]  {}
.fb-task-pri-btn.sel[data-p="low"]  {}

/* Filter chips — minimal */
.fb-task-filters {
  display:flex !important; gap:8px !important; margin-bottom:18px !important;
}
.fb-task-filter-btn {
  flex:1 !important; min-width:0 !important; padding:8px 10px !important; border-radius:10px !important;
  font-size:11.5px !important; font-weight:600 !important;
  border:1px solid rgba(255,255,255,.07) !important; background:transparent !important;
  color:rgba(255,255,255,.28) !important; cursor:pointer !important; transition:all .18s; text-align:center !important;
  white-space:nowrap !important;
}
.fb-task-filter-btn:hover { color:rgba(255,255,255,.65) !important; border-color:rgba(255,255,255,.14) !important }
.fb-task-filter-btn.act {
  background:rgba(255,255,255,.06) !important;
  border-color:rgba(255,255,255,.13) !important;
  color:rgba(255,255,255,.92) !important;
}
.fb-task-count-badge {
  display:inline-flex !important; align-items:center !important; justify-content:center !important;
  min-width:16px !important; height:16px !important; border-radius:8px !important;
  background:rgba(255,255,255,.10) !important; color:rgba(255,255,255,.40) !important;
  font-size:10px !important; font-weight:700 !important; padding:0 4px !important;
  margin-left:3px !important; line-height:1 !important;
}

/* Task cards — V1-style compact */
.fb-task-list2 { display:flex !important; flex-direction:column !important; gap:5px !important }
@keyframes taskSlideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
.fb-task-card {
  display:flex !important; align-items:center !important; gap:10px !important;
  padding:11px 13px !important; border-radius:13px !important;
  background:rgba(255,255,255,.035) !important;
  border:1px solid rgba(255,255,255,.055) !important;
  animation:taskSlideIn .22s ease; transition:background .2s, border-color .2s, opacity .3s, transform .3s;
  position:relative !important; cursor:default !important;
}
.fb-task-card:hover { background:rgba(255,255,255,.065) !important; border-color:rgba(255,255,255,.10) !important }
.fb-task-card.done { opacity:.42 !important }
.fb-task-card.done .fb-task-card-txt { text-decoration:line-through !important; color:rgba(255,255,255,.28) !important }
.fb-task-card.removing { opacity:0 !important; transform:translateX(10px) scale(.97) !important }

/* Checkbox */
.fb-task-chk2 {
  width:18px !important; height:18px !important; border-radius:50% !important; flex-shrink:0 !important;
  border:2px solid var(--task-color, var(--mc,#4d9fff)) !important;
  background:none !important; cursor:pointer !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  font-size:9px !important; color:transparent !important;
  transition:all .2s;
}
.fb-task-chk2:hover { transform:scale(1.1) }
.fb-task-card.done .fb-task-chk2 {
  background:var(--task-color, var(--mc,#4d9fff)) !important;
  color:#000 !important;
  border-color:var(--task-color, var(--mc,#4d9fff)) !important;
}
.fb-task-card.done .fb-task-chk2 { animation:none }

.fb-task-card-body { flex:1 !important; min-width:0 !important }
.fb-task-card-txt {
  font-size:12.5px !important; color:rgba(255,255,255,.83) !important;
  line-height:1.3 !important; word-break:break-word;
  transition:color .2s, text-decoration .2s;
}
.fb-task-card-meta {
  display:flex !important; align-items:center !important; gap:6px !important; margin-top:4px !important;
}
.fb-task-pri-tag {
  font-size:9px !important; font-weight:800 !important; letter-spacing:.4px !important;
  text-transform:uppercase !important; padding:2px 6px !important; border-radius:6px !important;
  border:1px solid currentColor !important; opacity:.7 !important;
}
.fb-task-time-tag { font-size:9.5px !important; color:rgba(255,255,255,.22) !important }

.fb-task-del2 {
  flex-shrink:0 !important; opacity:0 !important; background:none !important; border:none !important;
  color:rgba(255,255,255,.2) !important; cursor:pointer !important; font-size:13px !important;
  padding:5px 7px !important; border-radius:8px !important; transition:all .15s;
}
.fb-task-card:hover .fb-task-del2 { opacity:1 !important }
.fb-task-del2:hover { color:#ff6060 !important; background:rgba(255,80,80,.12) !important }

/* All-done celebration banner */
.fb-task-celebrate {
  text-align:center !important; padding:18px 10px 14px !important; border-radius:14px !important;
  background:color-mix(in srgb, var(--mc,#4d9fff) 10%, transparent) !important;
  border:1px solid color-mix(in srgb, var(--mc,#4d9fff) 30%, transparent) !important;
  animation:taskSlideIn .3s ease;
}
.fb-task-celebrate-ico  { font-size:36px !important; display:block !important; margin-bottom:8px !important }
.fb-task-celebrate-msg  { font-size:13px !important; font-weight:700 !important; color:var(--mc,#4d9fff) !important }
.fb-task-celebrate-sub  { font-size:11px !important; color:rgba(255,255,255,.35) !important; margin-top:4px !important }

.fb-empty-ico { font-size:38px !important; margin-bottom:12px !important; opacity:.5 !important; display:block !important }
.fb-list { display:flex !important; flex-direction:column !important; gap:8px !important }

@keyframes fb-in { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
.fb-task {
  display:flex !important; align-items:center !important; gap:12px !important; padding:13px 14px !important; border-radius:13px !important;
  background:rgba(255,255,255,.04) !important; border:1px solid rgba(255,255,255,.07) !important;
  animation:fb-in .2s ease; transition:background .2s,border-color .2s;
}
.fb-task:hover { background:rgba(255,255,255,.07) !important; border-color:rgba(255,255,255,.12) !important }
.fb-task.done { opacity:.38 !important }
.fb-chk {
  width:22px !important; height:22px !important; border-radius:50% !important; flex-shrink:0 !important;
  border:2px solid var(--mc,#4d9fff) !important; background:none !important;
  color:transparent !important; cursor:pointer !important; font-size:11px !important;
  display:flex !important; align-items:center !important; justify-content:center !important; transition:all .2s;
}
.fb-task.done .fb-chk { background:var(--mc,#4d9fff) !important; color:#000 !important; border-color:var(--mc,#4d9fff) !important }
.fb-task-txt { flex:1 !important; font-size:13.5px !important; color:rgba(255,255,255,.85) !important; line-height:1.35 !important }
.fb-task.done .fb-task-txt { text-decoration:line-through !important; color:rgba(255,255,255,.3) !important }
.fb-del {
  opacity:0 !important; flex-shrink:0 !important; background:none !important; border:none !important;
  color:rgba(255,255,255,.2) !important; cursor:pointer !important; font-size:13px !important;
  padding:4px 6px !important; border-radius:7px !important; transition:opacity .15s,color .15s,background .15s;
}
.fb-task:hover .fb-del { opacity:1 !important }
.fb-del:hover { color:#ff6060 !important; background:rgba(255,80,80,.12) !important }

/* ── NOTES ── */
.fb-note-composer {
  position:relative !important; margin-bottom:16px !important;
  background:rgba(255,255,255,.035) !important;
  border:1.5px solid rgba(255,255,255,.08) !important;
  border-left:3px solid var(--nc,rgba(255,255,255,.16)) !important;
  border-radius:18px !important; transition:border-color .25s, box-shadow .25s, border-left-color .25s;
  overflow:hidden !important;
}
.fb-note-composer:focus-within {
  border-color:var(--nc,#4d9fff) !important;
  border-left-color:var(--nc,#4d9fff) !important;
  background:rgba(255,255,255,.06) !important;
  box-shadow:0 0 0 3px color-mix(in srgb, var(--nc,#4d9fff) 16%, transparent);
}
.fb-note-composer textarea {
  width:100% !important; display:block !important;
  background:transparent !important; border:none !important; outline:none !important;
  color:#fff !important; padding:16px 18px 12px !important; resize:none;
  font-size:14px !important; line-height:1.65 !important; min-height:100px !important; max-height:180px !important;
  font-family:Outfit,system-ui,sans-serif !important;
}
.fb-note-composer textarea::placeholder { color:rgba(255,255,255,.22) !important }
.fb-note-composer-bar {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  padding:8px 12px 10px !important; gap:8px !important; flex-wrap:wrap !important;
  border-top:1px solid rgba(255,255,255,.06) !important;
}

/* Color swatches */
.fb-note-clr-picks { display:flex !important; gap:6px !important; align-items:center !important }
.fb-clr-dot {
  width:20px !important; height:20px !important; border-radius:50% !important; cursor:pointer !important; position:relative !important;
  border:2px solid transparent !important; transition:transform .15s, border-color .15s, box-shadow .15s;
  flex-shrink:0 !important;
}
.fb-clr-dot::after {
  content:''; position:absolute !important; inset:0; border-radius:50% !important;
  background:rgba(0,0,0,.2) !important;
  opacity:0 !important; transition:opacity .15s;
}
.fb-clr-dot:hover { transform:scale(1.2) }
.fb-clr-dot.sel {
  border-color:#fff !important; transform:scale(1.15);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--dot-clr,#fff) 35%, transparent);
}
.fb-clr-dot.sel::before {
  content:'✓'; position:absolute !important; inset:0; display:flex !important;
  align-items:center !important; justify-content:center !important;
  font-size:11px !important; font-weight:900 !important; color:#fff !important;
  text-shadow:0 1px 3px rgba(0,0,0,.6); z-index:1;
  line-height:1 !important;
}

.fb-note-bar-r { display:flex !important; align-items:center !important; gap:8px !important }
.fb-note-cc2 { font-size:11.5px !important; color:rgba(255,255,255,.2) !important }
.fb-note-save-btn {
  padding:9px 20px !important; border-radius:11px !important; font-size:13px !important; font-weight:700 !important;
  background:var(--nc,var(--mc,#4d9fff)) !important; color:#fff !important;
  border:none !important; cursor:pointer !important; transition:opacity .15s, transform .1s, background .25s;
  letter-spacing:.2px !important; box-shadow:0 3px 12px color-mix(in srgb, var(--nc,var(--mc,#4d9fff)) 35%, transparent);
}
.fb-note-save-btn:hover { opacity:.85 !important }
.fb-note-save-btn:active { transform:scale(.96) }

.fb-note-search-wrap { position:relative !important; margin-bottom:12px !important }
.fb-note-search-wrap input {
  width:100% !important; display:block !important; padding:11px 14px 11px 38px !important;
  background:rgba(255,255,255,.05) !important; border:1.5px solid rgba(255,255,255,.07) !important;
  border-radius:12px !important; color:#fff !important; font-size:13.5px !important; outline:none !important;
  transition:border-color .2s;
}
.fb-note-search-wrap input:focus { border-color:var(--mc,#4d9fff) !important }
.fb-note-search-ico {
  position:absolute !important; left:10px; top:50%; transform:translateY(-50%);
  font-size:14px !important; pointer-events:none !important; opacity:.35 !important;
}

.fb-note-section-lbl {
  font-size:10px !important; font-weight:700 !important; letter-spacing:1px !important;
  text-transform:uppercase !important; color:rgba(255,255,255,.24) !important;
  margin:14px 0 7px !important; padding:0 2px !important;
}
.fb-note-section-lbl:first-child { margin-top:4px !important; }

/* Note cards — colored background + spaced */
.fb-note-list-wrap { display:flex !important; flex-direction:column !important; gap:8px !important; }
.fb-note {
  position:relative !important; padding:12px 34px 11px 14px !important;
  background:color-mix(in srgb, var(--nc,rgba(255,255,255,.08)) 11%, rgba(12,15,28,1)) !important;
  border:1px solid color-mix(in srgb, var(--nc,rgba(255,255,255,.12)) 28%, transparent) !important;
  border-radius:14px !important; animation:fb-in .2s ease;
  transition:background .2s, border-color .2s, transform .18s, box-shadow .2s;
  cursor:default !important;
}
.fb-note:hover {
  background:color-mix(in srgb, var(--nc,rgba(255,255,255,.08)) 18%, rgba(12,15,28,1)) !important;
  transform:translateY(-2px) !important;
  box-shadow:0 8px 24px rgba(0,0,0,.3) !important;
}
.fb-note.pinned {
  border-color:color-mix(in srgb, var(--nc,var(--mc,#4d9fff)) 60%, transparent) !important;
  background:color-mix(in srgb, var(--nc,var(--mc,#4d9fff)) 16%, rgba(18,22,35,1)) !important;
}
.fb-note-top { display:flex !important; align-items:flex-start !important; gap:6px !important; margin-bottom:2px !important }
.fb-note-pin-ico { font-size:10px !important; opacity:.6 !important; flex-shrink:0 !important; margin-top:1px !important }
.fb-note-txt {
  font-size:12.5px !important; color:rgba(255,255,255,.82) !important;
  line-height:1.55 !important; white-space:pre-wrap !important; word-break:break-word; flex:1 !important;
}
.fb-note-txt.clamped { display:-webkit-box !important; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden !important }
.fb-note-expand {
  font-size:10.5px !important; color:var(--nc,var(--mc,#4d9fff)) !important;
  background:none !important; border:none !important; cursor:pointer !important; padding:0 !important;
  margin-top:4px !important; display:block !important; transition:opacity .15s;
}
.fb-note-expand:hover { opacity:.75 !important }
.fb-note-meta { display:flex !important; align-items:center !important; justify-content:space-between !important; margin-top:8px !important }
.fb-note-ts { font-size:11px !important; color:rgba(255,255,255,.22) !important }
.fb-note-actions { display:flex !important; gap:4px !important; opacity:0 !important; transition:opacity .15s }
.fb-note:hover .fb-note-actions { opacity:1 !important }
.fb-note-act {
  padding:3px 7px !important; border-radius:6px !important; font-size:11px !important;
  background:rgba(255,255,255,.07) !important; border:none !important;
  color:rgba(255,255,255,.45) !important; cursor:pointer !important;
  transition:background .15s, color .15s;
}
.fb-note-act:hover { background:rgba(255,255,255,.14) !important; color:#fff !important }
.fb-note-act.del:hover { background:rgba(255,80,80,.25) !important; color:#ff6060 !important }
.fb-note-act.edit:hover { background:rgba(255,180,0,.2) !important; color:#ffd43b !important }
.fb-note-act.pin.active { color:#ffd43b !important }

/* ── TIMER DRUM PICKER ── */
#fb-timer-set-view { padding-bottom:4px !important }
#fb-timer-run-view { text-align:center !important }

/* Drum wrap */
.fb-drum-wrap {
  position:relative !important; display:flex !important; align-items:stretch !important;
  justify-content:center !important; gap:0 !important; height:152px !important;
  margin:0 0 20px !important; overflow:hidden !important; border-radius:16px !important;
  background:rgba(255,255,255,.025) !important;
  border:1px solid rgba(255,255,255,.06) !important;
  user-select:none; -webkit-user-select:none;
}

/* Top & bottom gradient fade */
.fb-drum-overlay {
  position:absolute !important; left:0; right:0; z-index:3; pointer-events:none !important;
  height:52px !important;
}
.fb-drum-overlay.top {
  top:0;
  background:linear-gradient(to bottom, rgba(12,12,28,1) 0%, rgba(12,12,28,0) 100%) !important;
}
.fb-drum-overlay.bottom {
  bottom:0;
  background:linear-gradient(to top, rgba(12,12,28,1) 0%, rgba(12,12,28,0) 100%) !important;
}

/* Center highlight bar */
.fb-drum-highlight {
  position:absolute !important; left:12px; right:12px; top:50%; z-index:2; pointer-events:none !important;
  height:36px !important; transform:translateY(-50%);
  background:rgba(255,255,255,.06) !important; border-radius:10px !important;
  border-top:1px solid rgba(255,255,255,.1) !important; border-bottom:1px solid rgba(255,255,255,.1) !important;
}

/* Column */
.fb-drum-col {
  flex:1 !important; display:flex !important; flex-direction:column !important; align-items:center !important;
  position:relative !important; cursor:ns-resize !important;
}

.fb-drum-label {
  position:absolute !important; bottom:4px;
  font-size:9px !important; font-weight:700 !important;
  color:rgba(255,255,255,.25) !important; letter-spacing:.8px !important; text-transform:uppercase !important;
  pointer-events:none !important; z-index:4; background:transparent !important;
}

/* Scroll track */
.fb-drum-scroll {
  width:100% !important; overflow-y:auto !important; overflow-x:hidden !important; height:152px !important;
  -webkit-overflow-scrolling:touch;
  scroll-snap-type:y mandatory;
  display:flex !important; flex-direction:column !important; align-items:center !important;
  scrollbar-width:none;
}
.fb-drum-scroll::-webkit-scrollbar { display:none !important }

/* Each drum item */
.fb-drum-item {
  flex-shrink:0 !important; height:36px !important; display:flex !important;
  align-items:center !important; justify-content:center !important;
  font-size:20px !important; font-weight:400 !important;
  color:rgba(255,255,255,.28) !important;
  width:100% !important; scroll-snap-align:center;
  transition:color .18s, font-weight .18s, font-size .18s;
  text-align:center !important;
}
.fb-drum-item.selected {
  color:#fff !important; font-size:27px !important; font-weight:200 !important;
  text-shadow:0 0 20px rgba(255,255,255,.25) !important;
}
.fb-drum-item.near {
  color:rgba(255,255,255,.55) !important; font-size:22px !important;
}

/* Buttons row */
.fb-drum-btns {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  margin:14px 4px 10px !important;
}
.fb-drum-btn {
  width:62px !important; height:62px !important; border-radius:50% !important; border:none !important;
  font-size:14px !important; font-weight:600 !important; cursor:pointer !important;
  transition:transform .12s, opacity .15s;
  display:flex !important; align-items:center !important; justify-content:center !important;
}
.fb-drum-btn:active { transform:scale(.92) }
.fb-drum-btn.cancel {
  background:rgba(255,255,255,.10) !important;
  color:rgba(255,255,255,.65) !important;
}
.fb-drum-btn.cancel:hover { background:rgba(255,255,255,.16) !important }
.fb-drum-btn.start {
  background:var(--mc,#4d9fff) !important; color:#fff !important;
  width:90px !important; font-size:15px !important;
  box-shadow:0 6px 24px color-mix(in srgb, var(--mc,#4d9fff) 45%, transparent);
}
.fb-drum-btn.start:hover { opacity:.88 !important }
.fb-drum-btn.start.zero { opacity:.38 !important; pointer-events:none !important }

/* Meta row (Label) */
.fb-drum-meta {
  border-radius:14px !important; overflow:hidden !important;
  background:rgba(255,255,255,.04) !important; border:1px solid rgba(255,255,255,.08) !important;
  margin-bottom:16px !important;
}
.fb-drum-meta-row {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  padding:13px 18px !important; border-bottom:1px solid rgba(255,255,255,.05) !important;
}
.fb-drum-meta-row:last-child { border-bottom:none !important }
.fb-drum-meta-lbl { font-size:13.5px !important; color:rgba(255,255,255,.80) !important; font-weight:500 !important }
.fb-drum-meta-val { font-size:13.5px !important; color:rgba(255,255,255,.35) !important }

/* Recents */
.fb-drum-recents { margin-top:16px !important; padding-top:14px !important; border-top:1px solid rgba(255,255,255,.07) !important; }
.fb-drum-recents-title {
  font-size:13px !important; font-weight:700 !important; color:rgba(255,255,255,.5) !important;
  margin-bottom:6px !important; letter-spacing:.5px !important; text-transform:uppercase !important;
}
.fb-drum-recent-item {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  padding:12px 0 !important; border-bottom:1px solid rgba(255,255,255,.06) !important;
  cursor:pointer !important;
}
.fb-drum-recent-item:last-child { border-bottom:none !important }
.fb-drum-recent-time { font-size:28px !important; font-weight:300 !important; color:#fff !important; letter-spacing:-1px !important }
.fb-drum-recent-sub { font-size:11px !important; color:rgba(255,255,255,.28) !important; margin-top:2px !important }
.fb-drum-recent-play {
  width:38px !important; height:38px !important; border-radius:50% !important; border:none !important;
  background:var(--mc,#4d9fff) !important; color:#fff !important;
  font-size:14px !important; cursor:pointer !important; display:flex !important;
  align-items:center !important; justify-content:center !important;
  transition:opacity .15s;
}
.fb-drum-recent-play:hover { opacity:.82 !important }

/* Running ring view */
.fb-timer-ring {
  width:160px !important; height:160px !important; margin:10px auto 14px !important;
  position:relative !important; filter:drop-shadow(0 0 0px transparent);
  transition:filter .6s ease;
}
.fb-timer-ring.running {
  filter:drop-shadow(0 0 18px var(--tc,#4d9fff)) drop-shadow(0 0 6px var(--tc,#4d9fff));
  animation:ringPulse 2s infinite ease-in-out;
}
@keyframes ringPulse {
  0%,100% { filter:drop-shadow(0 0 12px var(--tc,#4d9fff)) drop-shadow(0 0 3px var(--tc,#4d9fff)) }
  50%      { filter:drop-shadow(0 0 28px var(--tc,#4d9fff)) drop-shadow(0 0 12px var(--tc,#4d9fff)) }
}
.fb-timer-ring svg { display:block !important; transform:rotate(-90deg) }
.fb-tc {
  position:absolute !important; inset:0; display:flex !important;
  flex-direction:column !important; align-items:center !important; justify-content:center !important; z-index:2;
}
.fb-t-digits {
  font-size:34px !important; font-weight:300 !important; color:#fff !important;
  letter-spacing:-1px !important; font-variant-numeric:tabular-nums;
}
.fb-t-lbl {
  font-size:11px !important; font-weight:700 !important; letter-spacing:2px !important;
  text-transform:uppercase !important; margin-top:4px !important; transition:color .5s;
  color:rgba(255,255,255,.4) !important;
}
.fb-timer-ring-bg {
  position:absolute !important; inset:-20px; border-radius:50% !important;
  background:radial-gradient(circle, var(--tc,#4d9fff) 0%, transparent 70%) !important;
  opacity:0 !important; transition:opacity .6s ease; pointer-events:none !important; filter:blur(20px); z-index:0;
}
.fb-timer-ring.running .fb-timer-ring-bg { opacity:0.13 !important }

/* Running view buttons */
.fb-timer-run-btns {
  display:flex !important; gap:12px !important; justify-content:center !important; margin-bottom:12px !important;
}
.fb-run-btn {
  width:52px !important; height:52px !important; border-radius:50% !important; border:none !important;
  font-size:17px !important; cursor:pointer !important; transition:transform .12s, opacity .15s;
  display:flex !important; align-items:center !important; justify-content:center !important;
}
.fb-run-btn:active { transform:scale(.92) }
.fb-run-btn.pause {
  background:rgba(255,255,255,.12) !important; color:#fff !important;
}
.fb-run-btn.stop {
  background:rgba(255,70,70,.2) !important; color:#ff6060 !important;
  font-size:12px !important;
}
.fb-run-btn.pause.running { background:var(--mc,#4d9fff) !important }

/* Stats bar */
.fb-timer-stats {
  display:flex !important; justify-content:space-between !important; align-items:center !important;
  padding:14px 18px !important; border-radius:16px !important;
  background:rgba(255,255,255,.04) !important; border:1px solid rgba(255,255,255,.07) !important;
  margin-top:4px !important;
}
.fb-tstat { text-align:center !important; flex:1 !important }
.fb-tstat-val { font-size:19px !important; font-weight:700 !important; color:#fff !important }
.fb-tstat-lbl { font-size:11px !important; color:rgba(255,255,255,.28) !important; margin-top:3px !important; letter-spacing:.5px !important; text-transform:uppercase !important }
.fb-tstat-div { width:1px !important; height:34px !important; background:rgba(255,255,255,.09) !important; flex-shrink:0 !important }

@keyframes timerComplete {
  0%{transform:scale(1)} 18%{transform:scale(1.09)} 36%{transform:scale(.97)} 54%{transform:scale(1.04)} 100%{transform:scale(1)}
}
.fb-timer-ring.complete { animation:timerComplete .65s ease-out }


/* ── ALARM — clean redesign ── */

/* Creator */
.fb-alarm-creator {
  margin-bottom:16px !important;
}
.fb-alarm-input-wrap {
  position:relative !important; margin-bottom:10px !important;
}
.fb-alarm-lbl-in {
  width:100% !important; background:rgba(255,255,255,.05) !important;
  border:1.5px solid rgba(255,255,255,.08) !important;
  border-radius:14px !important; color:#fff !important;
  font-size:14px !important; font-weight:400 !important;
  padding:13px 16px !important; outline:none !important;
  transition:border-color .2s, box-shadow .2s;
}
.fb-alarm-lbl-in:focus {
  border-color:var(--mc,#4d9fff) !important;
  box-shadow:0 0 0 3px color-mix(in srgb,var(--mc,#4d9fff) 12%,transparent);
}
.fb-alarm-lbl-in::placeholder { color:rgba(255,255,255,.20) !important }

/* Quick time chips */
.fb-al-quick-row {
  display:flex !important; gap:6px !important; margin-bottom:10px !important; flex-wrap:nowrap !important;
  overflow-x:auto !important; scrollbar-width:none !important;
}
.fb-al-quickbtn {
  padding:7px 13px !important; border-radius:99px !important;
  font-size:11.5px !important; font-weight:600 !important; letter-spacing:.1px !important;
  border:1.5px solid rgba(255,255,255,.09) !important;
  background:rgba(255,255,255,.035) !important; color:rgba(255,255,255,.42) !important;
  cursor:pointer !important; transition:all .18s; white-space:nowrap !important;
}
.fb-al-quickbtn:hover { background:rgba(255,255,255,.09) !important; color:#fff !important; border-color:rgba(255,255,255,.16) !important }
.fb-al-quickbtn.active {
  background:color-mix(in srgb,var(--mc,#4d9fff) 16%,transparent) !important;
  border-color:var(--mc,#4d9fff) !important; color:#fff !important;
  box-shadow:0 0 10px color-mix(in srgb,var(--mc,#4d9fff) 25%,transparent) !important;
}

/* Date+time row */
.fb-alarm-timepick {
  display:grid !important; grid-template-columns:1fr 1fr; gap:10px !important; margin-bottom:10px !important;
}

/* Set button */
.fb-al-set-btn {
  width:100% !important; padding:14px !important; border-radius:14px !important;
  font-size:14.5px !important; font-weight:700 !important; letter-spacing:.3px !important;
  background:var(--mc,#4d9fff) !important; color:#000 !important;
  border:none !important; cursor:pointer !important;
  transition:opacity .15s, transform .1s, box-shadow .25s;
  box-shadow:0 6px 22px color-mix(in srgb, var(--mc,#4d9fff) 40%, transparent);
}
.fb-al-set-btn:hover { opacity:.88 !important; box-shadow:0 8px 28px color-mix(in srgb, var(--mc,#4d9fff) 55%, transparent) }
.fb-al-set-btn:active { transform:scale(.97) }

/* Feedback */
.fb-fb { font-size:12px !important; min-height:18px !important; margin:4px 2px 10px !important; }

/* Section header */
.fb-al-section-hdr {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  margin-bottom:10px !important;
}
.fb-al-section-title {
  font-size:12px !important; font-weight:700 !important; letter-spacing:.8px !important;
  text-transform:uppercase !important; color:rgba(255,255,255,.28) !important;
}
.fb-al-section-count {
  font-size:11px !important; font-weight:600 !important;
  color:rgba(255,255,255,.25) !important;
}

/* Alarm cards — V1-style with background */
.fb-alarm-card {
  display:flex !important; align-items:center !important; gap:10px !important;
  padding:12px 14px !important; border-radius:14px !important;
  background:rgba(255,255,255,.035) !important;
  border:1px solid rgba(255,255,255,.055) !important;
  animation:fb-in .22s ease;
  transition:background .2s, opacity .2s, transform .2s;
  margin-bottom:6px !important;
}
.fb-alarm-card:last-child { margin-bottom:0 !important }
.fb-alarm-card:hover { background:rgba(255,255,255,.065) !important }
.fb-alarm-card.urgent .fb-alcard-time-big { color:#ff8080 !important }

/* Left: big time + label */
.fb-alcard-left { flex:1 !important; min-width:0 !important }
.fb-alcard-time-big {
  font-size:18px !important; font-weight:600 !important; letter-spacing:-.3px !important;
  color:rgba(255,255,255,.90) !important; font-variant-numeric:tabular-nums; line-height:1 !important;
}
.fb-alarm-card.urgent .fb-alcard-time-big { color:#ff8080 !important }
.fb-alcard-label {
  font-size:11px !important; font-weight:500 !important;
  color:rgba(255,255,255,.38) !important; margin-top:3px !important;
  white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis;
  max-width:180px !important;
}

/* Right: countdown + delete */
.fb-alcard-right {
  display:flex !important; align-items:center !important; gap:8px !important; flex-shrink:0 !important;
}
.fb-alcard-cd {
  font-size:11px !important; font-weight:600 !important;
  color:var(--mc,#4d9fff) !important; font-variant-numeric:tabular-nums;
  text-align:right !important; white-space:nowrap !important;
}
.fb-alarm-card.urgent .fb-alcard-cd { color:#ff8080 !important }
.fb-alcard-del {
  width:24px !important; height:24px !important; border-radius:50% !important; flex-shrink:0 !important;
  background:none !important; border:none !important;
  color:rgba(255,255,255,.2) !important; font-size:11px !important;
  cursor:pointer !important; display:flex !important; align-items:center !important; justify-content:center !important;
  transition:all .15s;
}
.fb-alcard-del:hover { background:rgba(255,70,70,.15) !important; color:#ff8080 !important }

/* Empty state */
.fb-al-empty {
  text-align:center !important; padding:28px 0 8px !important;
  font-size:12px !important; color:rgba(255,255,255,.2) !important; line-height:1.7 !important;
}
.fb-al-empty-ico { font-size:28px !important; display:block !important; margin-bottom:8px !important; opacity:.35 !important }

.fb-alarm-fields { display:flex !important; flex-direction:column !important; gap:10px !important; margin-bottom:10px !important }
.fb-fb { font-size:12.5px !important; min-height:20px !important; margin:2px 0 12px !important; padding:0 2px !important }

#fb-toast {
  position:absolute !important; bottom:112px; right:0; width:320px !important;
  background:rgba(7,9,24,.98) !important; border:1px solid rgba(255,210,0,.30) !important;
  border-radius:20px !important; padding:16px 48px 16px 18px !important; box-shadow:0 24px 60px rgba(0,0,0,.80), 0 0 0 1px rgba(255,255,255,.05);
  transform:translateY(12px) scale(.94); opacity:0 !important; pointer-events:none !important;
  transition:all .3s cubic-bezier(.34,1.56,.64,1);
}
#fb-toast.show { transform:translateY(0) scale(1); opacity:1 !important; pointer-events:all !important }
#fb-toast-ttl { font-size:13.5px !important; font-weight:700 !important; color:#ffd600 !important; margin-bottom:5px !important }
#fb-toast-msg { font-size:13px !important; color:rgba(255,255,255,.65) !important; line-height:1.45 !important }
#fb-toast-action {
  margin-top:10px !important; padding:7px 18px !important; border-radius:20px !important;
  background:#ff4444 !important; color:#fff !important; font-size:12px !important; font-weight:700 !important;
  border:none !important; cursor:pointer !important; display:none !important; transition:opacity .15s;
}
#fb-toast-action:hover { opacity:.85 !important }
#fb-toast-x { position:absolute !important; top:13px; right:15px; background:none !important; border:none !important; color:rgba(255,255,255,.3) !important; cursor:pointer !important; font-size:15px !important; transition:color .15s }
#fb-toast-x:hover { color:#fff !important }

.fb-pt { position:absolute !important; border-radius:50% !important; pointer-events:none !important; animation:fb-burst .7s ease-out forwards }
@keyframes fb-burst { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(.1)} }

/* fb-task-pri-lbl2 removed — replaced by fb-pri-dd dropdown */

/* ── Note title input ── */
.fb-note-title-in {
  width:100% !important; background:transparent !important;
  color:#fff !important; font-size:13px !important; font-weight:600 !important;
  border:none !important; border-bottom:1px solid rgba(255,255,255,.08) !important;
  padding:6px 2px !important; margin-bottom:6px !important;
}
.fb-note-title-in::placeholder { color:rgba(255,255,255,.3) !important; font-weight:400 !important }
.fb-note-title-lbl {
  font-size:13px !important; font-weight:700 !important; color:#fff !important;
  margin-bottom:4px !important;
}

/* ── Timer label inline input ── */
.fb-drum-label-input {
  background:transparent !important; color:rgba(255,255,255,.7) !important;
  font-size:13px !important; font-weight:500 !important;
  border:none !important; border-bottom:1px solid rgba(255,255,255,.1) !important;
  text-align:right !important; width:120px !important; padding:2px 4px !important;
}
.fb-drum-label-input:focus { border-bottom-color:rgba(255,255,255,.35) !important; color:#fff !important }

/* ── Alarm & Timer history items ── */
.fb-alarm-history-item {
  display:flex !important; align-items:center !important; gap:10px !important;
  padding:8px 0 !important; border-bottom:1px solid rgba(255,255,255,.05) !important;
}
.fb-alarm-history-item:last-child { border-bottom:none !important }
.fb-al-history { margin-top:12px !important; padding-top:10px !important; border-top:1px solid rgba(255,255,255,.08) !important }
/* timer history removed */

/* ── Alarm ringing banner ── */
.fb-al-ringing {
  align-items:center !important; gap:12px !important;
  background:rgba(255,60,60,.18) !important; border:1.5px solid rgba(255,80,80,.40) !important;
  border-radius:16px !important; padding:14px 16px !important; margin-bottom:14px !important;
  animation:fb-pulse-red .9s ease-in-out infinite;
  box-shadow:0 0 30px rgba(255,60,60,.15) !important;
}
.fb-al-ringing.visible {
  display:flex !important;
}
@keyframes fb-pulse-red { 0%,100%{box-shadow:0 0 0 0 rgba(255,80,80,.4), 0 0 30px rgba(255,60,60,.1)} 50%{box-shadow:0 0 0 8px rgba(255,80,80,0), 0 0 40px rgba(255,60,60,.2)} }
.fb-al-ring-ico { font-size:22px !important; animation:fb-ring-shake .4s ease infinite }
@keyframes fb-ring-shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-18deg)} 75%{transform:rotate(18deg)} }
.fb-al-ring-lbl { flex:1 !important; font-size:14px !important; font-weight:700 !important; color:#ff9090 !important; line-height:1.3 !important }
.fb-al-stop-btn {
  padding:8px 18px !important; border-radius:20px !important;
  background:#ff4444 !important; color:#fff !important; font-size:12px !important; font-weight:800 !important;
  border:none !important; cursor:pointer !important;
  box-shadow:0 4px 14px rgba(255,60,60,.4) !important; transition:opacity .15s;
}
.fb-al-stop-btn:hover { opacity:.88 !important }

/* ── Alarm creator new layout ── */
.fb-al-create-row {
  display:flex !important; gap:8px !important; margin-bottom:8px !important;
}
.fb-al-time-in {
  background:rgba(255,255,255,.06) !important; color:#fff !important;
  border:1px solid rgba(255,255,255,.10) !important; border-radius:12px !important;
  padding:10px 12px !important; font-size:17px !important; font-weight:600 !important;
  width:110px !important; flex-shrink:0 !important; cursor:pointer !important;
  letter-spacing:.5px !important; text-align:center !important;
}
.fb-al-date-in {
  width:100% !important; background:rgba(255,255,255,.04) !important; color:rgba(255,255,255,.55) !important;
  border:1px solid rgba(255,255,255,.07) !important; border-radius:11px !important;
  padding:8px 12px !important; font-size:12.5px !important; margin-bottom:10px !important;
  cursor:pointer !important;
}
.fb-alarm-lbl-in { flex:1 !important }

/* ── Repeat days row ── */
.fb-al-repeat-row {
  display:none !important;
}
.fb-al-repeat-lbl { font-size:11px !important; color:rgba(255,255,255,.4) !important; white-space:nowrap !important; font-weight:600 !important }
.fb-al-repeat-btns { display:flex !important; gap:4px !important; flex-wrap:wrap !important }
.fb-al-day {
  width:32px !important; height:28px !important; border-radius:6px !important;
  background:rgba(255,255,255,.06) !important; color:rgba(255,255,255,.45) !important;
  border:1px solid rgba(255,255,255,.08) !important; font-size:10px !important; font-weight:600 !important;
  cursor:pointer !important; transition:all .15s;
}
.fb-al-day.active { background:var(--mc,#4d9fff) !important; color:#fff !important; border-color:transparent !important }
.fb-al-repeat-presets { display:none !important }
.fb-al-preset {
  padding:4px 10px !important; border-radius:20px !important; font-size:11px !important; font-weight:600 !important;
  background:rgba(255,255,255,.06) !important; color:rgba(255,255,255,.5) !important;
  border:1px solid rgba(255,255,255,.08) !important; cursor:pointer !important; transition:all .15s;
}
.fb-al-preset.active { background:var(--mc,#4d9fff) !important; color:#fff !important; border-color:transparent !important }

/* ── Alarm card toggle ── */
.fb-alcard-toggle {
  padding:3px 9px !important; border-radius:20px !important; font-size:10px !important; font-weight:800 !important;
  border:none !important; cursor:pointer !important; transition:all .15s;
}
.fb-alcard-toggle.on { background:var(--mc,#4d9fff) !important; color:#fff !important }
.fb-alcard-toggle.off { background:rgba(255,255,255,.08) !important; color:rgba(255,255,255,.35) !important }
.fb-alcard-repeat { font-size:10px !important; color:rgba(255,255,255,.3) !important; margin-top:2px !important }
.fb-alarm-card.disabled { opacity:.45 !important }
.fb-al-active-hdr { display:flex !important; align-items:center !important; gap:6px !important; margin-bottom:6px !important }

/* ── Note card title/preview ── */
.fb-note-card-content { flex:1 !important; min-width:0 !important }
.fb-note-card-title { font-size:13px !important; font-weight:700 !important; color:#fff !important; margin-bottom:2px !important }
.fb-note-card-preview { font-size:11.5px !important; color:rgba(255,255,255,.45) !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important }

/* ── Priority emoji label ── */
/* fb-task-pri-lbl2 mobile removed */
/* ── Compact repeat row ── */
.fb-al-repeat-compact {
  display:flex !important; align-items:center !important; gap:10px !important;
  margin-bottom:12px !important;
}
.fb-al-repeat-lbl2 {
  font-size:11px !important; font-weight:700 !important; color:rgba(255,255,255,.35) !important;
  letter-spacing:.5px !important; text-transform:uppercase !important; flex-shrink:0 !important;
  white-space:nowrap !important;
}
.fb-al-repeat-chips {
  display:flex !important; gap:6px !important; flex-wrap:nowrap !important; overflow-x:auto !important;
  scrollbar-width:none;
}
.fb-al-repeat-chips::-webkit-scrollbar { display:none !important }
.fb-al-chip {
  padding:6px 12px !important; border-radius:99px !important;
  font-size:11.5px !important; font-weight:600 !important;
  background:rgba(255,255,255,.05) !important; color:rgba(255,255,255,.40) !important;
  border:1.5px solid rgba(255,255,255,.08) !important; cursor:pointer !important;
  transition:all .18s; white-space:nowrap !important; flex-shrink:0 !important;
}
.fb-al-chip:hover { color:rgba(255,255,255,.75) !important; border-color:rgba(255,255,255,.15) !important }
.fb-al-chip.act {
  background:color-mix(in srgb,var(--mc,#4d9fff) 15%,transparent) !important;
  border-color:var(--mc,#4d9fff) !important; color:#fff !important;
}

</style>

<!-- Toast -->
<div id="fb-toast">
  <div id="fb-toast-ttl"></div>
  <div id="fb-toast-msg"></div>
  <button id="fb-toast-action" style="display:none"></button>
  <button id="fb-toast-x">✕</button>
</div>

<!-- Panel -->
<div id="fb-panel">
  <div id="fb-hdr">
    <div id="fb-hdr-l">
      <span class="fb-logo">FocusBuddy</span>
      <span class="fb-date-s" id="fb-date"></span>
      <span class="fb-pill" id="fb-spill">IDLE</span>
    </div>
    <button id="fb-x">✕</button>
  </div>
  <div id="fb-tabs">
    <button class="fb-tab act" data-tab="tasks"><span class="ti">✅</span>Tugas</button>
    <button class="fb-tab"     data-tab="notes"><span class="ti">📝</span>Catatan</button>
    <button class="fb-tab"     data-tab="timer"><span class="ti">⏱</span>Timer</button>
    <button class="fb-tab"     data-tab="alarm"><span class="ti">🗓️</span>Kalender</button>
  </div>
  <div id="fb-body">

    <!-- TASKS -->
    <div class="fb-pane show" id="pane-tasks">

      <!-- Section header + slim progress -->
      <div class="fb-task-section-hdr">
        <span class="fb-task-section-lbl">Selesai Hari Ini</span>
        <span class="fb-task-section-stat" id="fb-task-stat">0/0</span>
      </div>
      <div class="fb-prog-wrap">
        <div class="fb-prog">
          <div class="fb-prog-fill" id="fb-pgfill" style="width:0%"></div>
        </div>
      </div>

      <!-- Hidden for JS compat -->
      <div class="fb-task-hero" style="display:none!important">
        <div class="fb-task-hero-msg" id="fb-task-hero-msg"></div>
        <div class="fb-prog-row">
          <span class="fb-prog-stat"></span>
          <span class="fb-prog-pct" id="fb-task-pct">0%</span>
        </div>
        <div class="fb-prog-marks" id="fb-prog-marks"></div>
      </div>

      <!-- Add row: [priority dropdown] [input] [icon btn] -->
      <div class="fb-task-add-row">
        <div class="fb-task-composer">
          <div class="fb-task-input-row">
            <!-- Single priority dropdown -->
            <div class="fb-pri-dd" id="fb-pri-dd">
              <button class="fb-pri-sel" id="fb-pri-sel" data-p="med" title="Pilih prioritas">
                <span class="fb-pri-dot-sm" id="fb-pri-dot-sm"></span>
                <svg class="fb-pri-arrow" width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <div class="fb-pri-menu" id="fb-pri-menu">
                <button class="fb-pri-opt" data-p="high"><span class="fb-pri-opt-dot" style="background:#ff8080"></span>Tinggi</button>
                <button class="fb-pri-opt" data-p="med"><span class="fb-pri-opt-dot" style="background:#ffd43b"></span>Sedang</button>
                <button class="fb-pri-opt" data-p="low"><span class="fb-pri-opt-dot" style="background:#69db7c"></span>Rendah</button>
              </div>
            </div>
            <input class="fb-task-in2" id="fb-task-in" placeholder="Tambah tugas baru…" maxlength="80"/>
            <button class="fb-task-add-icon" id="fb-task-add" title="Tambah tugas">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Priority selector — hidden, kept for JS compat -->
      <div class="fb-task-priority-row" style="display:none">
        <span class="fb-task-priority-lbl">Prioritas</span>
        <button class="fb-task-pri-btn" data-p="high">🔴 Tinggi</button>
        <button class="fb-task-pri-btn sel" data-p="med">🟡 Sedang</button>
        <button class="fb-task-pri-btn" data-p="low">🟢 Rendah</button>
      </div>

      <!-- Filter tabs -->
      <div class="fb-task-filters">
        <button class="fb-task-filter-btn act" data-f="all">Semua <span class="fb-task-count-badge" id="fb-fcount-all">0</span></button>
        <button class="fb-task-filter-btn" data-f="active">Aktif <span class="fb-task-count-badge" id="fb-fcount-active">0</span></button>
        <button class="fb-task-filter-btn" data-f="done">Selesai <span class="fb-task-count-badge" id="fb-fcount-done">0</span></button>
      </div>

      <!-- Task list -->
      <div class="fb-task-list2" id="fb-task-list"></div>

    </div>

    <!-- NOTES -->
    <div class="fb-pane" id="pane-notes">
      <!-- Composer -->
      <div class="fb-note-composer">
        <input class="fb-note-title-in" id="fb-note-title" placeholder="Judul (opsional)…" maxlength="80"/>
        <textarea id="fb-note-in" placeholder="Tulis catatan… (Ctrl+Enter simpan)" maxlength="800"></textarea>
        <div class="fb-note-composer-bar">
          <div class="fb-note-clr-picks" id="fb-note-clrs"></div>
          <div class="fb-note-bar-r" style="display:flex;gap:6px;align-items:center">
            <select id="fb-note-vis" style="background:#2a2a3a;color:#ccc;border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:3px 6px;font-size:10px;font-family:inherit;outline:none">
              <option value="private">🔒 Pribadi</option>
              <option value="division">👥 Divisi</option>
              <option value="company">🏢 Semua</option>
            </select>
            <span class="fb-note-cc2" id="fb-note-cc">0/800</span>
            <button class="fb-note-save-btn" id="fb-note-save">Simpan</button>
          </div>
        </div>
      </div>
      <!-- Search (shown when notes > 2) -->
      <div class="fb-note-search-wrap" id="fb-note-search-wrap" style="display:none">
        <span class="fb-note-search-ico">🔍</span>
        <input type="text" id="fb-note-search" placeholder="Cari catatan…" maxlength="80"/>
      </div>
      <!-- Lists -->
      <div id="fb-note-list"></div>
    </div>

    <!-- TIMER -->
    <div class="fb-pane" id="pane-timer">

      <!-- SET VIEW (drum picker) -->
      <div id="fb-timer-set-view">

        <!-- Drum picker -->
        <div class="fb-drum-wrap">
          <!-- Overlay gradients for depth -->
          <div class="fb-drum-overlay top"></div>
          <div class="fb-drum-overlay bottom"></div>
          <!-- Highlight bar -->
          <div class="fb-drum-highlight"></div>

          <div class="fb-drum-col" id="fb-drum-h">
            <div class="fb-drum-scroll" id="fb-drum-h-scroll"></div>
            <div class="fb-drum-label">jam</div>
          </div>
          <div class="fb-drum-col" id="fb-drum-m">
            <div class="fb-drum-scroll" id="fb-drum-m-scroll"></div>
            <div class="fb-drum-label">mnt</div>
          </div>
          <div class="fb-drum-col" id="fb-drum-s">
            <div class="fb-drum-scroll" id="fb-drum-s-scroll"></div>
            <div class="fb-drum-label">dtk</div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="fb-drum-btns">
          <button class="fb-drum-btn cancel" id="fb-t-cancel">Batalkan</button>
          <button class="fb-drum-btn start" id="fb-t-start-drum">Mulai</button>
        </div>

        <!-- Label row -->
        <div class="fb-drum-meta">
          <div class="fb-drum-meta-row">
            <span class="fb-drum-meta-lbl">Label</span>
            <input class="fb-drum-label-input" id="fb-t-label-val" placeholder="Timer" maxlength="30" value="Timer"/>
          </div>
        </div>

        <!-- Saved presets -->
        <div class="fb-drum-recents" id="fb-drum-recents" style="display:none">
          <div class="fb-drum-recents-title">Tersimpan</div>
          <div id="fb-drum-recents-list"></div>
        </div>
      </div>

      <!-- RUNNING VIEW (ring countdown) -->
      <div id="fb-timer-run-view" style="display:none">
        <div class="fb-timer-ring" id="fb-timer-ring-wrap">
          <div class="fb-timer-ring-bg"></div>
          <svg viewBox="0 0 176 176" width="140" height="140">
            <circle cx="88" cy="88" r="74" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="9"/>
            <circle cx="88" cy="88" r="74" fill="none" stroke="rgba(255,255,255,.03)" stroke-width="18"/>
            <circle id="fb-tring" cx="88" cy="88" r="74" fill="none" stroke-width="9" stroke-linecap="round"
              stroke-dasharray="465" stroke-dashoffset="0" style="transition:stroke-dashoffset 1s linear,stroke .6s ease"/>
          </svg>
          <div class="fb-tc">
            <div class="fb-t-digits" id="fb-tdisp">00:00</div>
            <div class="fb-t-lbl" id="fb-tlbl">TIMER</div>
          </div>
        </div>

        <div class="fb-timer-run-btns">
          <button class="fb-run-btn pause" id="fb-t-pause">⏸</button>
          <button class="fb-run-btn stop"  id="fb-t-stop">■</button>
        </div>

        <!-- Stats -->
        <div class="fb-timer-stats">
          <div class="fb-tstat">
            <div class="fb-tstat-val" id="fb-tstat-sess">0</div>
            <div class="fb-tstat-lbl">Sesi</div>
          </div>
          <div class="fb-tstat-div"></div>
          <div class="fb-tstat">
            <div class="fb-tstat-val" id="fb-tstat-min">0m</div>
            <div class="fb-tstat-lbl">Fokus</div>
          </div>

        </div>
      </div>




      </div>


    <!-- ALARM -->
    <div class="fb-pane" id="pane-alarm">

      <!-- RINGING BANNER (hidden until alarm fires) -->
      <div class="fb-al-ringing" id="fb-al-ringing" style="display:none">
        <span class="fb-al-ring-ico">🔔</span>
        <div class="fb-al-ring-lbl" id="fb-al-ring-lbl">Alarm!</div>
        <button class="fb-al-stop-btn" id="fb-al-stop">Matikan</button>
      </div>

      <!-- Creator -->
      <div class="fb-alarm-creator">
        <!-- Label + time row -->
        <div class="fb-al-create-row">
          <input class="fb-alarm-lbl-in" id="fb-al-lbl" placeholder="Agenda / Alarm…" maxlength="50" autocomplete="off"/>
          <input class="fb-al-time-in" type="time" id="fb-al-time"/>
        </div>
        <!-- Date row -->
        <input class="fb-al-date-in" type="date" id="fb-al-date"/>

        <!-- Quick offset chips -->
        <div class="fb-al-quick-row" id="fb-al-quick-row">
          <button class="fb-al-quickbtn" data-min="15">+15m</button>
          <button class="fb-al-quickbtn" data-min="30">+30m</button>
          <button class="fb-al-quickbtn" data-min="60">+1j</button>
          <button class="fb-al-quickbtn" data-min="120">+2j</button>
        </div>

        <!-- Repeat — compact row -->
        <!-- Hidden day-picker kept for JS compat -->
        <div class="fb-al-repeat-row" style="display:none!important">
          <div class="fb-al-repeat-btns">
            <button class="fb-al-day" data-d="0">Min</button>
            <button class="fb-al-day" data-d="1">Sen</button>
            <button class="fb-al-day" data-d="2">Sel</button>
            <button class="fb-al-day" data-d="3">Rab</button>
            <button class="fb-al-day" data-d="4">Kam</button>
            <button class="fb-al-day" data-d="5">Jum</button>
            <button class="fb-al-day" data-d="6">Sab</button>
          </div>
        </div>
        <!-- Visible: just 4 compact chips in one row -->
        <div class="fb-al-repeat-compact">
          <span class="fb-al-repeat-lbl2">Ulangi</span>
          <div class="fb-al-repeat-chips">
            <button class="fb-al-chip act" data-preset="once">Sekali</button>
            <button class="fb-al-chip" data-preset="daily">Tiap Hari</button>
            <button class="fb-al-chip" data-preset="weekday">Kerja</button>
            <button class="fb-al-chip" data-preset="weekend">Weekend</button>
          </div>
        </div>

        <!-- Set button -->
        <button class="fb-al-set-btn" id="fb-al-add">Simpan Agenda</button>
      </div>

      <!-- Feedback -->
      <div class="fb-fb" id="fb-al-fb"></div>

      <!-- Active alarms -->
      <div class="fb-al-active-hdr">
        <span class="fb-al-active-lbl">AGENDA AKTIF</span>
        <span id="fb-al-cnt-lbl"></span>
      </div>
      <div id="fb-alarm-list"></div>

      <!-- Past alarms history -->
      <div class="fb-al-history" id="fb-al-history" style="display:none">
        <span class="fb-al-active-lbl">RIWAYAT</span>
        <div id="fb-alarm-history-list"></div>
      </div>

    </div>

  </div>
</div>

<!-- Buddy (SVG character) -->
<div id="fb-buddy">
  <div id="fb-snap-ring"></div>
  <div id="fb-drag-dot"></div>

  <div id="fb-svg-wrap" class="state-idle">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100" height="100" overflow="visible">
      <defs>
        <radialGradient id="fb-grad-badan" cx="40%" cy="30%" r="70%">
          <stop class="stop-1" offset="0%"/>
          <stop class="stop-2" offset="100%"/>
        </radialGradient>
        <!-- Specular highlight (upper-left gloss for 3D sphere effect) -->
        <radialGradient id="fb-grad-specular" cx="35%" cy="25%" r="45%">
          <stop offset="0%"   stop-color="rgba(255,255,255,0.65)"/>
          <stop offset="60%"  stop-color="rgba(255,255,255,0.15)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <!-- Rim shadow (bottom-right darkening for depth) -->
        <radialGradient id="fb-grad-rim" cx="70%" cy="75%" r="55%">
          <stop offset="0%"   stop-color="rgba(0,0,0,0.22)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <filter id="fb-blur-pipi" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4"/>
        </filter>
        <!-- Text/glow drop shadow for ZZZ and other text elements -->
        <filter id="fb-text-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="2" stdDeviation="1.5" flood-color="#3b5bdb" flood-opacity="0.9"/>
        </filter>
      </defs>

      <!-- ── BACKGROUND EFFECTS ── -->

      <!-- Api Roket (semangat) -->
      <g class="api-roket">
        <path d="M 80 195 C 88 170 100 158 100 158 C 100 158 112 170 120 195 Z" fill="#fcc419"/>
        <path d="M 85 195 C 92 175 100 163 100 163 C 100 163 108 175 115 195 Z" fill="#ff922b"/>
        <path d="M 88 195 C 94 180 100 170 100 170 C 100 170 106 180 112 195 Z" fill="#ff6b6b"/>
      </g>

      <!-- Aura Api (olahraga) -->
      <g class="aura-api">
        <ellipse cx="100" cy="168" rx="85" ry="18" fill="#ff6b6b" opacity="0.35"/>
        <ellipse cx="100" cy="172" rx="60" ry="12" fill="#ff922b" opacity="0.4"/>
      </g>

      <!-- Awan Hujan (sedih) -->
      <g class="awan-hujan">
        <circle cx="60"  cy="32" r="22" fill="#dee2e6"/>
        <circle cx="85"  cy="20" r="28" fill="#dee2e6"/>
        <circle cx="115" cy="20" r="28" fill="#dee2e6"/>
        <circle cx="140" cy="32" r="22" fill="#dee2e6"/>
        <circle cx="160" cy="44" r="16" fill="#dee2e6"/>
        <g class="tetes-hujan">
          <line x1="72"  y1="52" x2="66"  y2="74" stroke="#74c0fc" stroke-width="3" stroke-linecap="round"/>
          <line x1="100" y1="48" x2="94"  y2="70" stroke="#74c0fc" stroke-width="3" stroke-linecap="round"/>
          <line x1="128" y1="48" x2="122" y2="70" stroke="#74c0fc" stroke-width="3" stroke-linecap="round"/>
          <line x1="150" y1="55" x2="144" y2="77" stroke="#74c0fc" stroke-width="3" stroke-linecap="round"/>
        </g>
      </g>

      <!-- Jam Menunggu (menunggu) -->
      <g class="jam-menunggu">
        <circle cx="165" cy="38" r="26" fill="white" stroke="#20c997" stroke-width="4"/>
        <line x1="165" y1="38" x2="165" y2="16" stroke="#20c997" stroke-width="3.5" stroke-linecap="round" class="jarum-jam"/>
        <line x1="165" y1="38" x2="183" y2="38" stroke="#20c997" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="165" cy="38" r="4" fill="#20c997"/>
        <!-- Tick marks -->
        <line x1="165" y1="14" x2="165" y2="18" stroke="#20c997" stroke-width="2"/>
        <line x1="165" y1="58" x2="165" y2="62" stroke="#20c997" stroke-width="2"/>
        <line x1="141" y1="38" x2="145" y2="38" stroke="#20c997" stroke-width="2"/>
        <line x1="185" y1="38" x2="189" y2="38" stroke="#20c997" stroke-width="2"/>
      </g>

      <!-- Kembang Api (semangat) -->
      <g class="kembang-api">
        <g transform="translate(18,45)">
          <line x1="0" y1="0" x2="0"  y2="-18" stroke="#ff922b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="13" y2="-13" stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="18" y2="0"   stroke="#ff922b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="0"  y2="18"  stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="-13" y2="-13" stroke="#ff6b6b" stroke-width="3" stroke-linecap="round"/>
        </g>
        <g transform="translate(182,42)">
          <line x1="0" y1="0" x2="0"   y2="-18" stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="-13" y2="-13" stroke="#ff922b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="-18" y2="0"   stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="13"  y2="-13" stroke="#ff6b6b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="0"   y2="18"  stroke="#ff922b" stroke-width="3" stroke-linecap="round"/>
        </g>
        <g transform="translate(22,162)">
          <circle cx="0" cy="0" r="4" fill="#ff6b6b"/>
          <line x1="0" y1="0" x2="0"  y2="-14" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="10" y2="-10" stroke="#ffd43b" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="14" y2="0"   stroke="#ff922b" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </g>

      <!-- Hati Banyak (senang) -->
      <g class="hati-banyak">
        <path d="M 22 70 A 8 8 0 0 1 38 70 A 8 8 0 0 1 54 70 Q 54 82 38 94 Q 22 82 22 70 Z" fill="#ff8787" opacity="0.9"/>
        <path d="M 155 25 A 7 7 0 0 1 169 25 A 7 7 0 0 1 183 25 Q 183 35 169 45 Q 155 35 155 25 Z" fill="#ff8787" opacity="0.9"/>
        <path d="M 8 128 A 5 5 0 0 1 18 128 A 5 5 0 0 1 28 128 Q 28 136 18 144 Q 8 136 8 128 Z" fill="#ff8787" opacity="0.7"/>
      </g>

      <!-- Elemen Mikir (fokus) -->
      <g class="elemen-mikir">
        <g class="bohlam">
          <path d="M 90 18 Q 100 0 110 18 Q 116 32 106 44 L 94 44 Q 84 32 90 18 Z" fill="#fcc419"/>
          <rect x="96" y="44" width="8" height="10" rx="3" fill="#adb5bd"/>
          <line x1="93" y1="52" x2="107" y2="52" stroke="#adb5bd" stroke-width="2"/>
        </g>
        <g class="rumus">
          <text x="5" y="38" fill="#845ef7" font-size="18" font-weight="bold" font-family="monospace">E=mc²</text>
          <text x="168" y="60" fill="#845ef7" font-size="26" font-weight="bold">∞</text>
          <text x="172" y="20" fill="#845ef7" font-size="22" font-weight="bold">∑</text>
        </g>
      </g>

      <!-- Asap Kepala (kesal) -->
      <g class="asap-kepala">
        <circle cx="65"  cy="18" r="9"  fill="#adb5bd" opacity="0.8"/>
        <circle cx="100" cy="8"  r="13" fill="#adb5bd" opacity="0.8"/>
        <circle cx="135" cy="18" r="9"  fill="#adb5bd" opacity="0.8"/>
        <circle cx="82"  cy="4"  r="7"  fill="#ced4da" opacity="0.6"/>
        <circle cx="118" cy="4"  r="7"  fill="#ced4da" opacity="0.6"/>
      </g>

      <!-- Sparkles Senang -->
      <g class="sparkles-senang">
        <path d="M 24 90 L 28 100 L 18 100 Z" fill="#ffd43b"/>
        <path d="M 176 90 L 180 100 L 170 100 Z" fill="#ffd43b"/>
        <path d="M 14 140 L 18 150 L 8 150 Z"  fill="#ffd43b"/>
        <path d="M 186 135 L 190 145 L 180 145 Z" fill="#ffd43b"/>
        <circle cx="20"  cy="60" r="3" fill="#ffd43b"/>
        <circle cx="180" cy="60" r="3" fill="#ffd43b"/>
        <circle cx="10"  cy="115" r="2" fill="#ffd43b"/>
        <circle cx="190" cy="115" r="2" fill="#ffd43b"/>
      </g>

      <!-- Holo Rings (fokus) -->
      <g class="holo-rings" style="transform-origin:100px 110px">
        <ellipse class="ring-1" cx="100" cy="110" rx="96" ry="30" fill="none" stroke="#339af0" stroke-width="2" opacity="0.5" style="transform-origin:100px 110px"/>
        <ellipse class="ring-2" cx="100" cy="110" rx="78" ry="24" fill="none" stroke="#845ef7" stroke-width="1.5" opacity="0.4" style="transform-origin:100px 110px"/>
      </g>

      <!-- ── BADAN UTAMA ── -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z"
            fill="url(#fb-grad-badan)"/>
      <!-- Specular gloss (upper-left) for 3D sphere look -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z"
            fill="url(#fb-grad-specular)" pointer-events="none"/>
      <!-- Rim shadow (lower-right) for depth -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z"
            fill="url(#fb-grad-rim)" pointer-events="none"/>

      <!-- ── AKSESORI ── -->

      <!-- Topi Tidur -->
      <g class="topi-tidur">
        <path d="M 48 42 L 142 42 L 178 62 L 148 18 Z" fill="#3b5bdb"/>
        <rect x="48" y="37" width="94" height="14" rx="7" fill="white"/>
        <circle cx="172" cy="68" r="13" fill="#fcc419"/>
        <path d="M 160 62 L 172 55 L 184 62" fill="none" stroke="#fcc419" stroke-width="2"/>
      </g>

      <!-- Kacamata Tebal (fokus) -->
      <g class="kacamata-tebal">
        <rect x="34" y="76" width="54" height="38" rx="10" fill="rgba(255,255,255,0.35)" stroke="#212529" stroke-width="6"/>
        <rect x="112" y="76" width="54" height="38" rx="10" fill="rgba(255,255,255,0.35)" stroke="#212529" stroke-width="6"/>
        <line x1="88"  y1="95" x2="112" y2="95" stroke="#212529" stroke-width="6"/>
        <line x1="8"   y1="95" x2="34"  y2="95" stroke="#212529" stroke-width="5"/>
        <line x1="166" y1="95" x2="192" y2="95" stroke="#212529" stroke-width="5"/>
        <line x1="40"  y1="95" x2="160" y2="95" stroke="#339af0" stroke-width="3.5" class="garis-laser" opacity="0"/>
      </g>

      <!-- Ikat Kepala (olahraga) -->
      <g class="ikat-kepala">
        <path d="M 16 72 Q 100 92 184 72 L 178 52 Q 100 72 22 52 Z" fill="#ff6b6b"/>
        <path d="M 16 72 Q 100 92 184 72" fill="none" stroke="#fa5252" stroke-width="2.5"/>
      </g>

      <!-- Urat Marah (kesal) -->
      <g class="urat-marah">
        <path d="M 148 48 L 158 48 L 158 38 L 163 38 L 163 48 L 173 48 L 173 53 L 163 53 L 163 63 L 158 63 L 158 53 L 148 53 Z" fill="#fa5252"/>
      </g>

      <!-- Pipi -->
      <g class="pipi-container">
        <ellipse class="pipi" cx="44"  cy="122" rx="17" ry="10" filter="url(#fb-blur-pipi)" opacity="0.75"/>
        <ellipse class="pipi" cx="156" cy="122" rx="17" ry="10" filter="url(#fb-blur-pipi)" opacity="0.75"/>
      </g>

      <!-- ── ALIS ── -->
      <g class="alis-group">
        <g class="alis-sedih">
          <path d="M 44 80 Q 60 64 76 75" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
          <path d="M 156 80 Q 140 64 124 75" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
        </g>
        <g class="alis-marah">
          <line x1="44" y1="74" x2="80" y2="94" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
          <line x1="156" y1="74" x2="120" y2="94" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
        </g>
        <g class="alis-fokus">
          <line x1="44" y1="80" x2="80" y2="85" stroke="#212529" stroke-width="5" stroke-linecap="round"/>
          <line x1="156" y1="76" x2="120" y2="85" stroke="#212529" stroke-width="5" stroke-linecap="round"/>
        </g>
      </g>

      <!-- ── MATA (default kedip) ── -->
      <g class="mata-bisa-kedip">
        <g class="mata-kiri">
          <circle cx="65" cy="95" r="14" fill="#212529"/>
          <g class="pupil-mata">
            <circle cx="68" cy="90" r="5.5" fill="#ffffff"/>
            <circle cx="60" cy="99" r="2.5" fill="#ffffff"/>
          </g>
        </g>
        <g class="mata-kanan">
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <g class="pupil-mata">
            <circle cx="132" cy="90" r="5.5" fill="#ffffff"/>
            <circle cx="140" cy="99" r="2.5" fill="#ffffff"/>
          </g>
        </g>
      </g>

      <!-- ── MATA KHUSUS ── -->
      <g class="mata-khusus">
        <!-- Sedih -->
        <g class="mata-sedih">
          <circle cx="65" cy="95" r="14" fill="#212529"/>
          <path d="M 52 95 A 13 13 0 0 0 78 95 Z" fill="#74c0fc" opacity="0.8"/>
          <circle cx="68" cy="90" r="4.5" fill="#ffffff"/>
          <circle cx="60" cy="99" r="2" fill="#ffffff"/>
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <path d="M 122 95 A 13 13 0 0 0 148 95 Z" fill="#74c0fc" opacity="0.8"/>
          <circle cx="132" cy="90" r="4.5" fill="#ffffff"/>
          <circle cx="140" cy="99" r="2" fill="#ffffff"/>
        </g>
        <!-- Fokus laser -->
        <g class="mata-fokus">
          <circle cx="65"  cy="95" r="14" fill="#212529"/>
          <circle cx="65"  cy="95" r="5"  fill="#339af0" class="mata-laser"/>
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <circle cx="135" cy="95" r="5"  fill="#339af0" class="mata-laser"/>
        </g>
        <!-- Tidur -->
        <g class="mata-tidur">
          <path d="M 50 100 L 80 100" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
          <path d="M 120 100 L 150 100" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
        </g>
        <!-- Olahraga (> <) -->
        <g class="mata-ngotot">
          <path d="M 48 88 L 74 100 L 48 112" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 152 88 L 126 100 L 152 112" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <!-- Semangat bintang -->
        <g class="mata-bintang">
          <path d="M 65 74 L 72 88 L 88 90 L 76 102 L 80 117 L 65 109 L 50 117 L 54 102 L 42 90 L 58 88 Z" fill="#212529"/>
          <path d="M 65 82 L 69 90 L 77 91 L 71 97 L 73 105 L 65 101 L 57 105 L 59 97 L 53 91 L 61 90 Z" fill="#fff"/>
          <path d="M 135 74 L 142 88 L 158 90 L 146 102 L 150 117 L 135 109 L 120 117 L 124 102 L 112 90 L 128 88 Z" fill="#212529"/>
          <path d="M 135 82 L 139 90 L 147 91 L 141 97 L 143 105 L 135 101 L 127 105 L 129 97 L 123 91 L 131 90 Z" fill="#fff"/>
        </g>
        <!-- Senang (^ ^) -->
        <g class="mata-senang">
          <path d="M 50 105 Q 65 84 80 105" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
          <path d="M 120 105 Q 135 84 150 105" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
        </g>
      </g>

      <!-- ── MULUT ── -->
      <path class="mulut" d="M 90 125 Q 100 130 110 125"
            fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- ── PROPERTI DEPAN ── -->

      <!-- Permen Karet (menunggu) -->
      <g class="permen-karet">
        <circle cx="100" cy="140" r="16" fill="#ffb8fc" stroke="#f06595" stroke-width="2.5" class="balon-tiup"/>
        <g class="ledakan-permen">
          <line x1="100" y1="120" x2="100" y2="106" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="100" y1="160" x2="100" y2="174" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="80"  y1="140" x2="66"  y2="140" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="120" y1="140" x2="134" y2="140" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="86"  y1="126" x2="76"  y2="116" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="114" y1="126" x2="124" y2="116" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="86"  y1="154" x2="76"  y2="164" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="114" y1="154" x2="124" y2="164" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
        </g>
      </g>

      <!-- Gelembung Ingus (tidur) -->
      <path class="gelembung-ingus"
            d="M 108 108 C 130 98 136 124 116 130 C 96 136 90 118 108 108 Z"
            fill="rgba(255,255,255,0.65)" stroke="white" stroke-width="2.5"/>

      <!-- Air Mata (sedih) -->
      <g class="air-mata-imut">
        <rect class="tetesan-mata"       x="60" y="107" width="9" height="16" rx="4.5" fill="#74c0fc"/>
        <rect class="tetesan-mata delay" x="130" y="107" width="9" height="16" rx="4.5" fill="#74c0fc"/>
      </g>

      <!-- Keringat (olahraga) -->
      <g class="keringat">
        <path d="M 168 78 C 178 93 178 106 168 106 C 158 106 158 93 168 78 Z" fill="#74c0fc"/>
        <path d="M 32  88 C 42  103 42  116 32  116 C 22  116 22  103 32  88 Z" fill="#74c0fc"/>
      </g>

      <!-- Barbel (olahraga) -->
      <g class="barbel">
        <rect x="0"   y="114" width="46" height="12" fill="#adb5bd" rx="6"/>
        <rect x="4"   y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="25"  y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="154" y="114" width="46" height="12" fill="#adb5bd" rx="6"/>
        <rect x="158" y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="179" y="99"  width="16" height="42" fill="#212529" rx="5"/>
      </g>

      <!-- Biskuit (makan) -->
      <g class="biskuit-animasi">
        <g class="biskuit-utuh">
          <circle cx="100" cy="148" r="26" fill="#e85d04"/>
          <circle cx="90"  cy="138" r="4.5" fill="#370617"/>
          <circle cx="112" cy="143" r="5.5" fill="#370617"/>
          <circle cx="94"  cy="158" r="3.5" fill="#370617"/>
          <circle cx="116" cy="155" r="4"   fill="#370617"/>
          <circle cx="103" cy="148" r="3"   fill="#370617"/>
        </g>
        <g class="biskuit-digigit">
          <path d="M 74 148 A 26 26 0 1 0 126 148 A 10 10 0 0 1 116 136 A 10 10 0 0 1 94 130 A 10 10 0 0 1 78 140 Z" fill="#e85d04"/>
          <circle cx="94"  cy="158" r="3.5" fill="#370617"/>
          <circle cx="116" cy="155" r="4"   fill="#370617"/>
          <circle cx="107" cy="162" r="3"   fill="#370617"/>
        </g>
        <g class="remah-terbang">
          <circle cx="88"  cy="142" r="4.5" fill="#e85d04"/>
          <circle cx="112" cy="136" r="3.5" fill="#e85d04"/>
          <circle cx="100" cy="130" r="5.5" fill="#e85d04"/>
          <circle cx="94"  cy="136" r="2.5" fill="#370617"/>
          <circle cx="106" cy="147" r="3"   fill="#e85d04"/>
        </g>
      </g>

      <!-- Remah Mulut (makan) -->
      <g class="remah-mulut">
        <circle cx="80"  cy="148" r="4"   fill="#d9480f"/>
        <circle cx="85"  cy="156" r="2.5" fill="#d9480f"/>
        <circle cx="120" cy="150" r="4.5" fill="#d9480f"/>
        <circle cx="116" cy="158" r="3"   fill="#d9480f"/>
        <circle cx="104" cy="163" r="3.5" fill="#370617" opacity="0.8"/>
      </g>

      <!-- ZZZ (tidur) -->
      <g class="gelembung-zzz">
        <text x="138" y="50" fill="white" font-size="32" font-weight="900" font-family="Outfit,sans-serif" filter="url(#fb-text-shadow)">Z</text>
        <text x="163" y="28" fill="white" font-size="22" font-weight="900" font-family="Outfit,sans-serif" filter="url(#fb-text-shadow)">z</text>
        <text x="178" y="12" fill="white" font-size="15" font-weight="900" font-family="Outfit,sans-serif" filter="url(#fb-text-shadow)">z</text>
      </g>

    </svg>
  </div>

  <div id="fb-bayangan"></div>
  <div id="fb-genangan"></div>
  <div id="fb-badge"></div>
</div>`

  // ── Refs ──
  const $ = id => root.querySelector('#' + id)
  const panel  = $('fb-panel')
  const buddy  = $('fb-buddy')
  const badge  = $('fb-badge')
  const toast  = $('fb-toast')
  const svgWrap = $('fb-svg-wrap')

  $('fb-date').textContent = new Date().toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' })

  const da = new Date(Date.now() + 3600000); da.setSeconds(0, 0)
  const p2 = n => String(n).padStart(2,'0')
  // Pre-fill hidden manual fields with +1hr as a sensible default
  if ($('fb-al-date')) $('fb-al-date').value = `${da.getFullYear()}-${p2(da.getMonth()+1)}-${p2(da.getDate())}`
  if ($('fb-al-time')) $('fb-al-time').value = `${p2(da.getHours())}:${p2(da.getMinutes())}`

  // ═══════════════════════════════════════════════════════════════
  // UPDATE SVG CHARACTER
  // ═══════════════════════════════════════════════════════════════
  function updateBuddySVG(s) {
    const cfg = STATES[s]
    if (!svgWrap) return

    // Switch state class (drives all CSS animations)
    svgWrap.className = `state-${cfg.svgState}`
    buddy.dataset.state = cfg.svgState

    // Update body gradient colors via CSS custom properties on the wrapper
    svgWrap.style.setProperty('--w1', cfg.w1)
    svgWrap.style.setProperty('--w2', cfg.w2)
    svgWrap.style.setProperty('--wp', cfg.wp)

    // Update mouth path dynamically
    const mouth = svgWrap.querySelector('.mulut')
    if (mouth) {
      mouth.setAttribute('d', cfg.mouth)
      const fillStates = ['senang','semangat','makan']
      mouth.setAttribute('fill', fillStates.includes(cfg.svgState) ? '#fa5252' : 'none')
    }
  }

  // ── Panel UI accent color (--mc) ──
  function applyMood(s) {
    const cfg = STATES[s]
    root.style.setProperty('--mc', cfg.color)
    root.style.setProperty('--tc', cfg.color)
    badge.textContent = cfg.badge
    const pill = $('fb-spill')
    pill.textContent = s
    pill.style.cssText = `font-size:9px!important;font-weight:800!important;letter-spacing:.9px!important;padding:3px 9px;border-radius:20px;text-transform:uppercase;background:${cfg.color}22;color:${cfg.color}`
    const tring = $('fb-tring')
    if (tring) tring.style.stroke = cfg.color
    const tlbl = $('fb-tlbl')
    if (tlbl) tlbl.style.color = cfg.color
    $('fb-pgfill').style.background = cfg.color
    root.querySelectorAll('.fb-tmode.act').forEach(b => { b.style.borderColor = cfg.color; b.style.color = cfg.color })
    root.querySelectorAll('.fb-alarm-time').forEach(b => b.style.color = cfg.color)
  }

  // ═══════════════════════════════════════════════════════════════
  // POSITION & DRAG
  // ═══════════════════════════════════════════════════════════════
  let isDragging = false, dragDidMove = false, dragOffX = 0, dragOffY = 0
  let dragOverlay = null

  function applyPos(ax, ay) {
    const W = window.innerWidth, H = window.innerHeight
    // Clamp buddy (100x130) with 8px margin from all edges
    ax = Math.max(100 + 8, Math.min(W - 8, ax))
    ay = Math.max(130 + 8, Math.min(H - 8, ay))
    root.style.setProperty('left',   ax + 'px', 'important')
    root.style.setProperty('top',    ay + 'px', 'important')
    root.style.setProperty('right',  'auto',    'important')
    root.style.setProperty('bottom', 'auto',    'important')
    positionPanel(ax, ay)
  }

  function positionPanel(ax, ay) {
    const W = window.innerWidth, H = window.innerHeight
    const GAP = 24
    const BUDDY_W = 100, BUDDY_H = 130

    // Responsive panel width: up to 460px, min 340
    const PW = Math.max(340, Math.min(460, W - GAP * 2))
    panel.style.width = PW + 'px'

    // Buddy edges in viewport coords
    const bLeft = ax - BUDDY_W   // buddy left edge
    const bTop  = ay - BUDDY_H   // buddy top edge

    // Measured panel height AFTER setting width (reflow)
    const PH = Math.min(panel.scrollHeight || 480, H - GAP * 2)

    // ── 4 candidate positions (top-left corner of panel in viewport coords) ──
    // Vertically: above buddy OR below buddy
    // Horizontally: right-aligned (panel right = buddy right = ax) OR left-aligned (panel left = buddy left)
    const aboveT = bTop - GAP - PH   // panel sits above buddy
    const belowT = ay + GAP           // panel sits below buddy
    const rightL = ax - PW            // panel right-edge aligns with buddy right
    const leftL  = Math.max(GAP, Math.min(bLeft, W - PW - GAP))  // panel left aligns with buddy left, clamped

    const candidates = [
      { pl: rightL, pt: aboveT, ox:'right', oy:'bottom' },  // above, right-aligned
      { pl: leftL,  pt: aboveT, ox:'left',  oy:'bottom' },  // above, left-aligned
      { pl: rightL, pt: belowT, ox:'right', oy:'top'    },  // below, right-aligned
      { pl: leftL,  pt: belowT, ox:'left',  oy:'top'    },  // below, left-aligned
    ]

    // Score = visible area inside viewport (prefer fully visible + prefer above)
    function score(c) {
      const pr = c.pl + PW, pb = c.pt + PH
      const visW = Math.max(0, Math.min(pr, W) - Math.max(c.pl, 0))
      const visH = Math.max(0, Math.min(pb, H) - Math.max(c.pt, 0))
      // Bonus for "above" positions so panel prefers sitting above buddy
      const aboveBonus = c.pt < ay ? 0.05 : 0
      return (visW / PW) * (visH / PH) + aboveBonus
    }

    let best = candidates[0]
    for (const c of candidates) if (score(c) > score(best)) best = c

    // Hard-clamp so panel is always fully within viewport
    const finalL = Math.max(GAP, Math.min(W - PW - GAP, best.pl))
    const finalT = Math.max(GAP, Math.min(H - PH - GAP, best.pt))

    // Set position relative to root anchor (ax, ay)
    panel.style.left   = (finalL - ax) + 'px'
    panel.style.top    = (finalT - ay) + 'px'
    panel.style.right  = 'auto'
    panel.style.bottom = 'auto'
    panel.style.transformOrigin = best.oy + ' ' + best.ox
  }

  function savePos(ax, ay) {
    chrome.storage.local.get('fb3', r => {
      const d = r.fb3 || {}
      chrome.storage.local.set({ fb3:{ ...d, pos:{ ax, ay } } })
    })
  }

  // Transparent full-page overlay: captures all pointer events during drag
  // so buddy stays responsive even over iframes, videos, or elements
  // that would normally intercept mouse/touch events
  function createDragOverlay() {
    const ov = document.createElement('div')
    ov.style.position   = 'fixed'
    ov.style.top        = '0'
    ov.style.left       = '0'
    ov.style.width      = '100vw'
    ov.style.height     = '100vh'
    ov.style.zIndex     = '2147483646'
    ov.style.cursor     = 'grabbing'
    ov.style.userSelect = 'none'
    document.documentElement.appendChild(ov)
    return ov
  }

  function endDrag() {
    if (!isDragging) return
    isDragging = false
    buddy.classList.remove('dragging')
    if (dragOverlay) { dragOverlay.remove(); dragOverlay = null }
    if (dragDidMove) savePos(parseInt(root.style.left), parseInt(root.style.top))
  }

  // ── Mouse drag ──
  buddy.addEventListener('mousedown', e => {
    if (e.button !== 0) return
    isDragging = true; dragDidMove = false
    const rect = buddy.getBoundingClientRect()
    dragOffX = e.clientX - rect.left
    dragOffY = e.clientY - rect.top
    buddy.classList.add('dragging')
    dragOverlay = createDragOverlay()
    e.preventDefault()
  })

  // Use capture phase on window so events fire before any page handler can stop them
  window.addEventListener('mousemove', e => {
    if (!isDragging) return
    dragDidMove = true
    applyPos(e.clientX - dragOffX + 100, e.clientY - dragOffY + 130)
  }, true)

  window.addEventListener('mouseup', endDrag, true)

  // ── Touch drag ──
  buddy.addEventListener('touchstart', e => {
    const t = e.touches[0]; isDragging = true; dragDidMove = false
    const rect = buddy.getBoundingClientRect()
    dragOffX = t.clientX - rect.left; dragOffY = t.clientY - rect.top
    buddy.classList.add('dragging')
    dragOverlay = createDragOverlay()
    e.preventDefault()
  }, { passive:false })

  window.addEventListener('touchmove', e => {
    if (!isDragging) return; dragDidMove = true
    const t = e.touches[0]
    applyPos(t.clientX - dragOffX + 100, t.clientY - dragOffY + 130)
    e.preventDefault()
  }, { capture:true, passive:false })

  window.addEventListener('touchend',   endDrag, true)
  window.addEventListener('touchcancel', endDrag, true)

  // Reposition on resize so buddy + panel stay on-screen
  window.addEventListener('resize', () => {
    const ax = parseInt(root.style.left) || window.innerWidth - 28
    const ay = parseInt(root.style.top)  || window.innerHeight - 28
    applyPos(ax, ay)  // re-clamps buddy to new viewport size
    if (panelOpen) positionPanel(parseInt(root.style.left), parseInt(root.style.top))
  })

  // ── Click: toggle panel ──
  buddy.addEventListener('click', () => {
    if (dragDidMove) { dragDidMove = false; return }
    const now = Date.now()
    if (now - ctx.clickWindowStart > 3000) { ctx.clickCount = 1; ctx.clickWindowStart = now }
    else ctx.clickCount++
    if (ctx.clickCount >= 6 && now - ctx.clickWindowStart < 3000) {
      ctx.rubScore = 0; forceState('ANNOYED', 5000)
      currentState = 'ANNOYED'; updateBuddySVG('ANNOYED'); applyMood('ANNOYED')
    }
    panelOpen = !panelOpen
    panel.classList.toggle('open', panelOpen)
    if (panelOpen) {
      positionPanel(parseInt(root.style.left) || window.innerWidth - 28, parseInt(root.style.top) || window.innerHeight - 28)
      renderAll()
    }
  })

  buddy.addEventListener('mousemove', () => {
    if (isDragging) return
    const now = Date.now()
    const decayed = Math.max(0, ctx.rubScore - (now - ctx.rubLastTime) * 0.012)
    ctx.rubScore = Math.min(30, decayed + 1.2)
    ctx.rubLastTime = now; ctx.lastActivity = now
    if (ctx.rubScore > 14 && currentState !== 'HAPPY') {
      forceState('HAPPY', 3000); currentState = 'HAPPY'; updateBuddySVG('HAPPY'); applyMood('HAPPY')
    }
  })
  buddy.addEventListener('mouseleave', () => {
    setTimeout(() => { ctx.rubScore = Math.max(0, ctx.rubScore - 5) }, 500)
  })
  document.addEventListener('mousemove', () => { ctx.lastActivity = Date.now() }, { passive:true })
  document.addEventListener('keydown',   () => { ctx.lastActivity = Date.now() }, { passive:true })

  $('fb-x').addEventListener('click', () => { panelOpen = false; panel.classList.remove('open') })
  $('fb-toast-x').addEventListener('click', () => { toast.classList.remove('show'); const actBtn = $('fb-toast-action'); if (actBtn) actBtn.style.display = 'none' })

  root.querySelectorAll('.fb-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.fb-tab').forEach(b => b.classList.remove('act'))
      root.querySelectorAll('.fb-pane').forEach(p => p.classList.remove('show'))
      btn.classList.add('act'); activeTab = btn.dataset.tab
      root.querySelector('#pane-' + activeTab).classList.add('show')
      renderTab(activeTab)
    })
  })

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'FB_ALARM' || msg.type === 'FB_ALARM_FIRED') {
      burst()
      forceState('EXCITED', 6000)
      currentState = 'EXCITED'; updateBuddySVG('EXCITED'); applyMood('EXCITED')
      startAlarmRing(msg.label || 'Alarm!')
      // Switch to alarm pane so user can stop it, but also show toast with stop
      if (!panelOpen) { panelOpen = true; panel.classList.add('open'); positionPanel(parseInt(root.style.left)||window.innerWidth-28, parseInt(root.style.top)||window.innerHeight-28) }
      root.querySelectorAll('.fb-tab').forEach(b => b.classList.remove('act'))
      root.querySelectorAll('.fb-pane').forEach(p => p.classList.remove('show'))
      const alarmTab = root.querySelector('.fb-tab[data-tab="alarm"]')
      if (alarmTab) alarmTab.classList.add('act')
      const alarmPane = root.querySelector('#pane-alarm')
      if (alarmPane) alarmPane.classList.add('show')
      activeTab = 'alarm'
      showToast('⏰ Alarm berbunyi!', msg.label || 'Waktunya!', 0, '🔇 Matikan', stopAlarmRing)
      ctx.alarms = ctx.alarms.filter(a => Math.abs(a.timestamp - Date.now()) > 90000)
      save(); renderAlarms()
    }
    if (msg.type === 'FB_TOGGLE') {
      panelOpen = !panelOpen; panel.classList.toggle('open', panelOpen)
      if (panelOpen) renderAll()
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // TOAST & FX
  // ═══════════════════════════════════════════════════════════════
  function showToast(title, msg, ms = 4500, actionLabel, actionFn) {
    $('fb-toast-ttl').textContent = title
    $('fb-toast-msg').textContent = msg
    const actBtn = $('fb-toast-action')
    if (actBtn) {
      if (actionLabel && actionFn) {
        actBtn.textContent = actionLabel
        actBtn.style.display = 'block'
        actBtn.onclick = () => { actionFn(); toast.classList.remove('show'); actBtn.style.display = 'none' }
      } else {
        actBtn.style.display = 'none'
      }
    }
    toast.classList.add('show')
    if (ms > 0) setTimeout(() => toast.classList.remove('show'), ms)
  }

  function burst() {
    const color = STATES[currentState].color
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div')
      p.className = 'fb-pt'
      const ang = (i/10)*360, d = 30+Math.random()*22, sz = 4+Math.random()*5
      p.style.cssText = `width:${sz}px;height:${sz}px;background:${color};bottom:${38+Math.random()*10}px;right:${38+Math.random()*10}px;--tx:${Math.cos(ang*Math.PI/180)*d}px;--ty:${Math.sin(ang*Math.PI/180)*d}px`
      root.appendChild(p); setTimeout(() => p.remove(), 750)
    }
  }

  let _chimeAC = null, _chimeNodes = [], _chimeLoopIv = null
  function stopChime() {
    clearInterval(_chimeLoopIv); _chimeLoopIv = null
    _chimeNodes.forEach(n => { try { n.stop() } catch(_) {} }); _chimeNodes = []
    if (_chimeAC) { try { _chimeAC.close() } catch(_) {} ; _chimeAC = null }
  }
  function playChimeCycle(ac) {
    const freqs = [880,1100,1320,880]
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain()
      o.connect(g); g.connect(ac.destination)
      o.type = 'sine'; o.frequency.setValueAtTime(f, ac.currentTime + i*.22)
      g.gain.setValueAtTime(0, ac.currentTime + i*.22)
      g.gain.linearRampToValueAtTime(.28, ac.currentTime + i*.22 + .04)
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + i*.22 + .44)
      o.start(ac.currentTime + i*.22); o.stop(ac.currentTime + i*.22 + .5)
      _chimeNodes.push(o)
    })
  }
  function playChime(loop) {
    try {
      stopChime()
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return
      _chimeAC = new AC()
      playChimeCycle(_chimeAC)
      if (loop) {
        _chimeLoopIv = setInterval(() => {
          if (_chimeAC) { _chimeNodes = []; playChimeCycle(_chimeAC) }
        }, 1200)
      }
    } catch(_) {}
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════════
  const PRIORITY_CFG = {
    high: { color:'#ff8080', label:'🔴 Tinggi', order:0 },
    med:  { color:'#ffd43b', label:'🟡 Sedang', order:1 },
    low:  { color:'#69db7c', label:'🟢 Rendah', order:2 },
  }
  const MOTIVATIONS = [
    { min:0,   max:0,   msg:'Yuk mulai hari ini! 💪' },
    { min:1,   max:25,  msg:'Langkah pertama sudah dimulai! 🚀' },
    { min:26,  max:50,  msg:'Setengah perjalanan! 🔥' },
    { min:51,  max:75,  msg:'Hampir sampai! ✨' },
    { min:76,  max:99,  msg:'Satu lagi, pasti bisa! 🎯' },
    { min:100, max:100, msg:'Semua selesai! Luar biasa! 🎉' },
  ]

  let taskPriority = 'med'
  let taskFilter   = 'all'

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
    return h < 24 ? `${h}j lalu` : `${Math.floor(h/24)}h lalu`
  }

  function renderTasks() {
    const td   = ctx.tasks.filter(t => t.date === today())
    const done = td.filter(t => t.done).length
    const pct  = td.length ? Math.round(done / td.length * 100) : 0

    // Progress bar
    $('fb-pgfill').style.width   = pct + '%'
    $('fb-task-stat').textContent = `${done}/${td.length}`
    $('fb-task-pct').textContent  = pct + '%'
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
    const doneC  = td.filter(t => t.done).length
    const allEl    = root.querySelector('#fb-fcount-all');    if (allEl) allEl.textContent = td.length
    const activeEl = root.querySelector('#fb-fcount-active'); if (activeEl) activeEl.textContent = active
    const doneEl   = root.querySelector('#fb-fcount-done');   if (doneEl) doneEl.textContent = doneC

    const list = $('fb-task-list')

    // Filter + sort: undone first (by priority), done at bottom
    let filtered = [...td]
    if (taskFilter === 'active') filtered = td.filter(t => !t.done)
    if (taskFilter === 'done')   filtered = td.filter(t => t.done)
    filtered.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const pa = (PRIORITY_CFG[a.priority] || PRIORITY_CFG.med).order
      const pb = (PRIORITY_CFG[b.priority] || PRIORITY_CFG.med).order
      return pa - pb || b.id - a.id
    })

    if (!filtered.length) {
      if (taskFilter === 'done' && done === 0) {
        list.innerHTML = `<div class="fb-empty"><span class="fb-empty-ico">✅</span>Belum ada yang selesai</div>`
      } else if (taskFilter === 'active' && active === 0 && td.length > 0) {
        // All done! celebration
        list.innerHTML = `
          <div class="fb-task-celebrate">
            <span class="fb-task-celebrate-ico">🏆</span>
            <div class="fb-task-celebrate-msg">Semua tugas selesai!</div>
            <div class="fb-task-celebrate-sub">Kamu luar biasa hari ini ✨</div>
          </div>`
      } else {
        list.innerHTML = `<div class="fb-empty"><span class="fb-empty-ico">📋</span>Belum ada tugas hari ini</div>`
      }
      return
    }

    list.innerHTML = ''
    filtered.forEach(task => {
      const pcfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.med
      const card = document.createElement('div')
      card.className = 'fb-task-card' + (task.done ? ' done' : '')
      card.style.setProperty('--task-color', pcfg.color)
      card.innerHTML = `
        <button class="fb-task-chk2">${task.done ? '✓' : ''}</button>
        <div class="fb-task-card-body">
          <div class="fb-task-card-txt">${esc(task.text)}</div>
          <div class="fb-task-card-meta">
            <span class="fb-task-pri-tag" style="color:${pcfg.color}">${pcfg.label.replace(/🔴|🟡|🟢/,'').trim()}</span>
            <span class="fb-task-time-tag">${relTimeTask(task.id)}</span>
          </div>
        </div>
        <button class="fb-task-del2">✕</button>`
      card.querySelector('.fb-task-chk2').onclick = () => toggleTask(task.id)
      card.querySelector('.fb-task-del2').onclick = () => deleteTask(task.id, card)
      list.appendChild(card)
    })

    applyMood(currentState)
  }

  function addTask() {
    const inp = $('fb-task-in'), txt = inp.value.trim(); if (!txt) return
    ctx.tasks.push({ id:Date.now(), text:txt, done:false, date:today(), priority:taskPriority })
    inp.value = ''; save(); renderTasks(); burst()
  }

  function toggleTask(id) {
    const t = ctx.tasks.find(t => t.id === id); if (!t) return
    t.done = !t.done; save(); renderTasks()
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
    if (card) {
      card.classList.add('removing')
      setTimeout(() => { ctx.tasks = ctx.tasks.filter(t => t.id !== id); save(); renderTasks() }, 280)
    } else {
      ctx.tasks = ctx.tasks.filter(t => t.id !== id); save(); renderTasks()
    }
  }

  $('fb-task-add').onclick = addTask
  $('fb-task-in').onkeydown = e => { if (e.key === 'Enter') addTask() }

  // Priority dropdown
  const priDD   = $('fb-pri-dd')
  const priSel  = $('fb-pri-sel')
  const priDotSm = $('fb-pri-dot-sm')
  const priMenu  = $('fb-pri-menu')
  const PRI_NAMES  = { high:'Tinggi', med:'Sedang', low:'Rendah' }
  const PRI_COLORS = { high:'#ff8080', med:'#ffd43b', low:'#69db7c' }
  function updatePriDD() {
    if (priDD)   priDD.dataset.p   = taskPriority
    if (priSel)  priSel.dataset.p  = taskPriority
    if (priDotSm) priDotSm.title   = PRI_NAMES[taskPriority]
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


  // ═══════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════
  // ── Notes ──────────────────────────────────────────────────────
  const NOTE_COLORS = [
    { id:'blue',   hex:'#4d9fff', bg:'rgba(77,159,255,.14)'  },
    { id:'purple', hex:'#b197fc', bg:'rgba(177,151,252,.14)' },
    { id:'green',  hex:'#69db7c', bg:'rgba(105,219,124,.14)' },
    { id:'yellow', hex:'#ffd43b', bg:'rgba(255,212,59,.14)'  },
    { id:'orange', hex:'#ff922b', bg:'rgba(255,146,43,.14)'  },
    { id:'pink',   hex:'#f783ac', bg:'rgba(247,131,172,.14)' },
  ]
  let noteColor = NOTE_COLORS[0].id
  let editingNoteId = null

  // Build color picker dots
  const clrWrap = $('fb-note-clrs')
  const noteComposer = $('fb-note-in') ? $('fb-note-in').closest('.fb-note-composer') : null
  const noteSaveBtn  = $('fb-note-save')

  function applyNoteColor(colorId) {
    const c = NOTE_COLORS.find(x => x.id === colorId) || NOTE_COLORS[0]
    noteColor = c.id
    // Live preview: composer border + save button color update
    if (noteComposer) noteComposer.style.setProperty('--nc', c.hex)
    if (noteSaveBtn)  noteSaveBtn.style.setProperty('--nc', c.hex)
    clrWrap.querySelectorAll('.fb-clr-dot').forEach(d => d.classList.remove('sel'))
    const selDot = clrWrap.querySelector(`[data-cid="${c.id}"]`)
    if (selDot) selDot.classList.add('sel')
  }

  NOTE_COLORS.forEach(c => {
    const dot = document.createElement('button')
    dot.className = 'fb-clr-dot' + (c.id === noteColor ? ' sel' : '')
    dot.style.background = c.hex
    dot.style.setProperty('--dot-clr', c.hex)
    dot.dataset.cid = c.id
    dot.title = c.id.charAt(0).toUpperCase() + c.id.slice(1)
    dot.onclick = () => applyNoteColor(c.id)
    clrWrap.appendChild(dot)
  })

  // Init with default color
  applyNoteColor(NOTE_COLORS[0].id)

  function relTime(ts) {
    const d = Date.now() - ts, m = Math.floor(d/60000), h = Math.floor(d/3600000), dy = Math.floor(d/86400000)
    if (d < 45000) return 'Baru saja'
    if (m < 60) return `${m} mnt lalu`
    if (h < 24) return `${h} jam lalu`
    if (dy < 7) return `${dy} hari lalu`
    return new Date(ts).toLocaleDateString('id-ID',{day:'numeric',month:'short'})
  }

  function renderNotes(filter) {
    const list = $('fb-note-list')
    const q = (filter || $('fb-note-search')?.value || '').toLowerCase().trim()
    let notes = [...(ctx.notes || [])]
    if (q) notes = notes.filter(n => n.text.toLowerCase().includes(q) || (n.title||'').toLowerCase().includes(q))

    // Show/hide search bar
    const sw = $('fb-note-search-wrap')
    if (sw) sw.style.display = (ctx.notes||[]).length > 2 ? 'block' : 'none'

    if (!notes.length) {
      list.innerHTML = q
        ? `<div class="fb-empty"><span class="fb-empty-ico">🔍</span>Tidak ditemukan</div>`
        : `<div class="fb-empty"><span class="fb-empty-ico">📝</span>Belum ada catatan</div>`
      return
    }

    list.innerHTML = ''
    const pinned  = notes.filter(n => n.pinned).reverse()
    const regular = notes.filter(n => !n.pinned).reverse()

    function mkCard(note) {
      const c = NOTE_COLORS.find(x => x.id === note.color) || NOTE_COLORS[0]
      const el = document.createElement('div')
      el.className = 'fb-note' + (note.pinned ? ' pinned' : '')
      el.style.setProperty('--nc', c.hex)

      // Render full text; CSS handles truncation. Click preview to expand/collapse.
      el.innerHTML = `
        <div class="fb-note-top">
          ${note.pinned ? `<span class="fb-note-pin-ico">📌</span>` : ''}
          <div class="fb-note-card-content">
            ${note.title ? `<div class="fb-note-card-title">${esc(note.title)}</div>` : ''}
            <div class="fb-note-txt clamped">${esc(note.text)}</div>
            <button class="fb-note-expand" style="display:none">Lihat semua ▾</button>
          </div>
        </div>
        <div class="fb-note-meta">
          <span class="fb-note-ts">${relTime(note.createdAt)}</span>
          <div class="fb-note-actions">
            <button class="fb-note-act pin${note.pinned?' active':''}" title="${note.pinned?'Unpin':'Pin'}">📌</button>
            <button class="fb-note-act edit" title="Edit">✏️</button>
            <button class="fb-note-act copy" title="Salin">📋</button>
            <button class="fb-note-act del" title="Hapus">🗑</button>
          </div>
        </div>`

      // Show expand button only if text is actually clamped
      const txtEl    = el.querySelector('.fb-note-txt')
      const expandBtn = el.querySelector('.fb-note-expand')
      requestAnimationFrame(() => {
        if (txtEl.scrollHeight > txtEl.clientHeight + 4) {
          expandBtn.style.display = 'block'
        }
      })

      let expanded = false
      expandBtn.onclick = e => {
        e.stopPropagation()
        expanded = !expanded
        txtEl.classList.toggle('clamped', !expanded)
        expandBtn.textContent = expanded ? 'Sembunyikan ▴' : 'Lihat semua ▾'
      }

      el.querySelector('.fb-note-act.pin').onclick = () => {
        note.pinned = !note.pinned; save(); renderNotes()
      }
      el.querySelector('.fb-note-act.edit').onclick = () => {
        // Load note into composer for editing
        const inp = $('fb-note-in'), titleInp = $('fb-note-title')
        if (inp) { inp.value = note.text; $('fb-note-cc').textContent = note.text.length + '/800' }
        if (titleInp) titleInp.value = note.title || ''
        // Set color
        noteColor = note.color || NOTE_COLORS[0].id
        root.querySelectorAll('.fb-note-clr').forEach(b => b.classList.toggle('active', b.dataset.c === noteColor))
        // Mark editing state
        editingNoteId = note.id
        const saveBtn = $('fb-note-save')
        if (saveBtn) { saveBtn.textContent = 'Update'; saveBtn.style.background = '#f0a500' }
        inp.focus()
        inp.scrollIntoView({ behavior:'smooth', block:'nearest' })
      }
      el.querySelector('.fb-note-act.copy').onclick = () => {
        const fullText = (note.title ? note.title + '\n' : '') + note.text
        navigator.clipboard?.writeText(fullText).catch(()=>{})
        const btn = el.querySelector('.fb-note-act.copy')
        btn.textContent = '✅'; setTimeout(()=>{ btn.textContent='📋' }, 1200)
      }
      el.querySelector('.fb-note-act.del').onclick = () => {
        if (editingNoteId === note.id) cancelNoteEdit()
        el.style.transition = 'opacity .2s,transform .2s'
        el.style.opacity = '0'; el.style.transform = 'translateX(12px)'
        setTimeout(() => { ctx.notes = ctx.notes.filter(n=>n.id!==note.id); save(); renderNotes() }, 200)
      }
      return el
    }

    function mkSectionLbl(txt) {
      const lbl = document.createElement('div')
      lbl.className = 'fb-note-section-lbl'; lbl.textContent = txt
      return lbl
    }

    function mkGroup(notesArr) {
      const wrap = document.createElement('div')
      wrap.className = 'fb-note-list-wrap'
      notesArr.forEach(n => wrap.appendChild(mkCard(n)))
      return wrap
    }

    // Date grouping helper
    function dateKey(ts) {
      const d = new Date(ts)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    }
    function dateLabel(ts) {
      const d = new Date(ts)
      return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
    }

    // Pinned section first
    if (pinned.length) {
      list.appendChild(mkSectionLbl('📌 Disematkan'))
      list.appendChild(mkGroup(pinned))
    }

    // Group regular by date
    if (regular.length) {
      const groups = []
      const seen = new Map()
      regular.forEach(n => {
        const lbl = dateLabel(n.createdAt || n.id)
        if (!seen.has(lbl)) { seen.set(lbl, []); groups.push(lbl) }
        seen.get(lbl).push(n)
      })
      groups.forEach(lbl => {
        list.appendChild(mkSectionLbl(lbl))
        list.appendChild(mkGroup(seen.get(lbl)))
      })
    }
  }

  function saveNote() {
    const inp = $('fb-note-in'), txt = inp.value.trim(); if (!txt) return
    const titleInp = $('fb-note-title')
    const title = titleInp ? titleInp.value.trim() : ''
    if (!ctx.notes) ctx.notes = []
    const c = NOTE_COLORS.find(x => x.id === noteColor) || NOTE_COLORS[0]
    if (editingNoteId) {
      // Update existing note
      const idx = ctx.notes.findIndex(n => n.id === editingNoteId)
      if (idx !== -1) {
        ctx.notes[idx] = { ...ctx.notes[idx], text:txt, title, color:noteColor }
      }
      cancelNoteEdit()
    } else {
      const vis = $('fb-note-vis') ? $('fb-note-vis').value : 'private'
      ctx.notes.push({ id:Date.now(), text:txt, title, color:noteColor, pinned:false, createdAt:Date.now(), visibility:vis })
      inp.value = ''; if (titleInp) titleInp.value = ''
      $('fb-note-cc').textContent = '0/800'
    }
    save(); renderNotes(); burst()
    // Pulse with selected color
    const comp = inp.closest('.fb-note-composer')
    comp.style.transition='box-shadow .15s'
    comp.style.boxShadow=`0 0 0 3px color-mix(in srgb, ${c.hex} 40%, transparent)`
    setTimeout(()=>{ comp.style.boxShadow='' }, 500)
  }

  function cancelNoteEdit() {
    editingNoteId = null
    const inp = $('fb-note-in'), titleInp = $('fb-note-title')
    if (inp) { inp.value = ''; $('fb-note-cc').textContent = '0/800' }
    if (titleInp) titleInp.value = ''
    const saveBtn = $('fb-note-save')
    if (saveBtn) { saveBtn.textContent = 'Simpan'; saveBtn.style.background = '' }
  }

  $('fb-note-save').onclick = saveNote
  $('fb-note-in').oninput  = () => { $('fb-note-cc').textContent = $('fb-note-in').value.length + '/800' }
  $('fb-note-in').onkeydown = e => { if (e.key==='Enter' && e.ctrlKey) saveNote() }
  // Search
  const srch = $('fb-note-search')
  if (srch) srch.oninput = () => renderNotes(srch.value)

  // ═══════════════════════════════════════════════════════════════
  // TIMER — Drum Picker + Running View
  // ═══════════════════════════════════════════════════════════════
  const CIRC = 465
  let focusMinutesTotal = 0
  let timerRecents = []   // [{h,m,s,label}]

  // ── Drum picker state ──
  let drumH = 0, drumM = 0, drumS = 0   // current picker values
  let drumLabel = 'Timer'

  // ── Build one drum column ──
  function buildDrumScroll(elId, max, padded) {
    const el = $(elId)
    if (!el) return
    el.innerHTML = ''
    // Padding items top
    for (let i = 0; i < 2; i++) {
      const d = document.createElement('div')
      d.className = 'fb-drum-item'; d.textContent = ''; el.appendChild(d)
    }
    for (let v = 0; v <= max; v++) {
      const d = document.createElement('div')
      d.className = 'fb-drum-item'
      d.textContent = padded ? String(v).padStart(2,'0') : v
      d.dataset.val = v
      el.appendChild(d)
    }
    // Padding items bottom
    for (let i = 0; i < 2; i++) {
      const d = document.createElement('div')
      d.className = 'fb-drum-item'; d.textContent = ''; el.appendChild(d)
    }
  }

  // ── Scroll to a value (instant or smooth) — centers item in 152px container ──
  function drumScrollTo(elId, val, smooth) {
    const el = $(elId)
    if (!el) return
    const ITEM_H = 36, PADDING = 2, CONTAINER_H = 152
    const offset = PADDING * ITEM_H - (CONTAINER_H / 2 - ITEM_H / 2) // = 14px
    el.scrollTo({ top: Math.max(0, val * ITEM_H + offset), behavior: smooth ? 'smooth' : 'instant' })
  }

  // ── Read currently snapped value from a drum scroll ──
  function readDrum(elId) {
    const el = $(elId)
    if (!el) return 0
    const ITEM_H = 36, PADDING = 2, CONTAINER_H = 152
    const offset = PADDING * ITEM_H - (CONTAINER_H / 2 - ITEM_H / 2) // = 14px
    return Math.max(0, Math.round((el.scrollTop - offset) / ITEM_H))
  }

  // ── Update item highlight classes ──
  function syncDrumHighlight(elId) {
    const el = $(elId)
    if (!el) return
    const ITEM_H = 36, PADDING = 2, CONTAINER_H = 152
    const offset = PADDING * ITEM_H - (CONTAINER_H / 2 - ITEM_H / 2) // = 14px
    const center = (el.scrollTop - offset) / ITEM_H
    el.querySelectorAll('.fb-drum-item').forEach((d, i) => {
      const realIdx = i - 2  // account for 2 padding items
      const dist = Math.abs(realIdx - center)
      d.classList.remove('selected','near')
      if (dist < 0.6)      d.classList.add('selected')
      else if (dist < 1.5) d.classList.add('near')
    })
  }

  // ── Format drum values for display in recents ──
  function fmtDrumTime(h, m, s) {
    if (h > 0) return `${h}.${String(m).padStart(2,'0')}`
    return `${m}.${String(s).padStart(2,'0')}`
  }
  function fmtDrumSub(h, m, s) {
    const parts = []
    if (h) parts.push(`${h} jam`)
    if (m) parts.push(`${m} mnt`)
    if (s) parts.push(`${s} dtk`)
    return parts.join(', ') || '0 dtk'
  }

  // ── Render recent timers ──
  function renderDrumRecents() {
    const wrap = $('fb-drum-recents')
    const list = $('fb-drum-recents-list')
    if (!wrap || !list) return
    if (!timerRecents.length) { wrap.style.display = 'none'; return }
    wrap.style.display = 'block'
    list.innerHTML = ''
    timerRecents.slice(0,5).forEach(r => {
      const item = document.createElement('div')
      item.className = 'fb-drum-recent-item'
      item.innerHTML = `
        <div>
          <div class="fb-drum-recent-time">${fmtDrumTime(r.h, r.m, r.s)}</div>
          <div class="fb-drum-recent-sub">${fmtDrumSub(r.h, r.m, r.s)}</div>
        </div>
        <button class="fb-drum-recent-play" title="Pakai lagi">▶ Mulai</button>`
      item.querySelector('.fb-drum-recent-play').onclick = e => {
        e.stopPropagation()
        launchTimer(r.h * 3600 + r.m * 60 + r.s, r.label || 'Timer')
      }
      item.onclick = () => {
        drumScrollTo('fb-drum-h-scroll', r.h, true)
        drumScrollTo('fb-drum-m-scroll', r.m, true)
        drumScrollTo('fb-drum-s-scroll', r.s, true)
        drumH = r.h; drumM = r.m; drumS = r.s
        syncDrumHighlight('fb-drum-h-scroll')
        syncDrumHighlight('fb-drum-m-scroll')
        syncDrumHighlight('fb-drum-s-scroll')
        checkDrumStartBtn()
      }
      list.appendChild(item)
    })
  }

  // ── Enable/disable start button when all zeros ──
  function checkDrumStartBtn() {
    const btn = $('fb-t-start-drum')
    if (!btn) return
    const zero = (drumH + drumM + drumS === 0)
    btn.classList.toggle('zero', zero)
  }

  // ── Initialize drum columns ──
  function initDrumPicker() {
    buildDrumScroll('fb-drum-h-scroll', 23, false)
    buildDrumScroll('fb-drum-m-scroll', 59, true)
    buildDrumScroll('fb-drum-s-scroll', 59, true)

    // Set defaults: 0h 0m 0s
    setTimeout(() => {
      drumScrollTo('fb-drum-h-scroll', 0,  false)
      drumScrollTo('fb-drum-m-scroll', 0, false)
      drumScrollTo('fb-drum-s-scroll', 0,  false)
      syncDrumHighlight('fb-drum-h-scroll')
      syncDrumHighlight('fb-drum-m-scroll')
      syncDrumHighlight('fb-drum-s-scroll')
      checkDrumStartBtn()
      renderDrumRecents()
    }, 50)

    // Scroll listeners
    ;[
      ['fb-drum-h-scroll', v => { drumH = v }],
      ['fb-drum-m-scroll', v => { drumM = v }],
      ['fb-drum-s-scroll', v => { drumS = v }],
    ].forEach(([id, setter]) => {
      const el = $(id)
      if (!el) return
      let scrollTimer = null
      el.addEventListener('scroll', () => {
        syncDrumHighlight(id)
        clearTimeout(scrollTimer)
        scrollTimer = setTimeout(() => {
          const v = readDrum(id)
          setter(v)
          drumScrollTo(id, v, true)
          syncDrumHighlight(id)
          checkDrumStartBtn()
        }, 120)
      }, { passive: true })
    })
  }

  // ── Switch views ──
  function showDrumView() {
    const sv = $('fb-timer-set-view'), rv = $('fb-timer-run-view')
    if (sv) sv.style.display = ''
    if (rv) rv.style.display = 'none'
  }
  function showRunView() {
    const sv = $('fb-timer-set-view'), rv = $('fb-timer-run-view')
    if (sv) sv.style.display = 'none'
    if (rv) rv.style.display = ''
  }

  // ── Launch timer with given total seconds ──
  function launchTimer(totalSec, lbl) {
    clearInterval(timerIv)
    timerMax = totalSec; timerSec = totalSec; timerLabel = lbl || 'Timer'
    ctx.timerRunning = false
    showRunView()
    updateTimer()
    // Auto-start
    startRunTimer()
  }

  // ── Update ring / display in running view ──
  function updateTimerStats() {
    const sessEl = $('fb-tstat-sess')
    const minEl  = $('fb-tstat-min')
    if (sessEl) sessEl.textContent = pomodoroSessions
    if (minEl)  minEl.textContent  = focusMinutesTotal + 'm'
  }

  function updateTimer() {
    const color = STATES[currentState].color
    const totalM = Math.floor(timerSec / 60)
    const h = Math.floor(totalM / 60)
    const m = totalM % 60
    const s = timerSec % 60
    const disp = $('fb-tdisp')
    const timeStr = h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    if (disp && disp.textContent !== timeStr) {
      disp.textContent = timeStr
      disp.classList.remove('tick')
      void disp.offsetWidth
      disp.classList.add('tick')
    }
    const tlbl = $('fb-tlbl')
    if (tlbl) { tlbl.textContent = timerLabel; tlbl.style.color = color }
    const ring = $('fb-tring')
    if (ring) { ring.style.strokeDashoffset = CIRC * (1 - timerSec / timerMax); ring.style.stroke = color }
    const ringWrap = $('fb-timer-ring-wrap')
    if (ringWrap) ringWrap.classList.toggle('running', ctx.timerRunning)
    const pauseBtn = $('fb-t-pause')
    if (pauseBtn) pauseBtn.innerHTML = ctx.timerRunning ? '⏸' : '▶'
    root.style.setProperty('--tc', color)
    updateTimerStats()
  }

  // ── Start the countdown ──
  function startRunTimer() {
    if (ctx.timerRunning) return
    ctx.timerRunning = true
    timerIv = setInterval(() => {
      if (timerSec <= 0) {
        clearInterval(timerIv); ctx.timerRunning = false; timerSec = 0
        if (timerLabel === 'FOKUS') {
          pomodoroSessions++
          focusMinutesTotal += Math.round(timerMax / 60)
          // Persist timer stats so they survive page navigation
          chrome.storage.local.set({ fb3_timerStats: { sessions: pomodoroSessions, minutes: focusMinutesTotal } })
          // Sync focus session to Flowbee for XP
          if (flowbeeUserId) {
            fetch(`${FLOWBEE_API}/timer-complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: flowbeeUserId, durationMinutes: Math.round(timerMax / 60), label: timerLabel })
            }).catch(() => {})
          }
        }
        const rw = $('fb-timer-ring-wrap')
        if (rw) { rw.classList.add('complete'); setTimeout(() => rw.classList.remove('complete'), 700) }
        playChime(true); burst(); forceState('EXCITED', 5000)
        currentState = 'EXCITED'; updateBuddySVG('EXCITED'); applyMood('EXCITED')
        showToast('⏱ Timer Selesai!', `${timerLabel} berakhir. Istirahat yuk! ☕`)
      } else timerSec--
      updateTimer()
    }, 1000)
    updateTimer()
  }

  // ── Pause / resume ──
  function pauseResumeTimer() {
    if (ctx.timerRunning) {
      clearInterval(timerIv); ctx.timerRunning = false; updateTimer()
    } else {
      startRunTimer()
    }
  }

  // ── Wire up drum "Mulai" button ──
  const drumStartBtn = $('fb-t-start-drum')
  if (drumStartBtn) {
    drumStartBtn.onclick = () => {
      // Read fresh values directly from scroll position to avoid debounce lag
      drumH = readDrum('fb-drum-h-scroll')
      drumM = readDrum('fb-drum-m-scroll')
      drumS = readDrum('fb-drum-s-scroll')
      const total = drumH * 3600 + drumM * 60 + drumS
      if (total <= 0) return
      // Save to recents (deduplicate)
      const lbl = $('fb-t-label-val') ? ($('fb-t-label-val').value || $('fb-t-label-val').textContent || 'Timer') : 'Timer'
      timerRecents = timerRecents.filter(r => !(r.h===drumH && r.m===drumM && r.s===drumS))
      timerRecents.unshift({ h: drumH, m: drumM, s: drumS, label: lbl })
      timerRecents = timerRecents.slice(0, 5)
      chrome.storage.local.set({ fb3_timerRecents: timerRecents })
      launchTimer(total, lbl)
    }
  }

  // ── Wire up "Batalkan" button ──
  const cancelBtn = $('fb-t-cancel')
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      clearInterval(timerIv); ctx.timerRunning = false
      showDrumView()
      // reset drum to 0h 0m 0s
      drumScrollTo('fb-drum-h-scroll', 0,  true)
      drumScrollTo('fb-drum-m-scroll', 0, true)
      drumScrollTo('fb-drum-s-scroll', 0,  true)
      drumH = 0; drumM = 0; drumS = 0
      checkDrumStartBtn()
      applyMood(currentState)
    }
  }

  // ── Wire up running view pause/stop ──
  const pauseBtn = $('fb-t-pause')
  const stopBtn  = $('fb-t-stop')
  if (pauseBtn) pauseBtn.onclick = pauseResumeTimer
  if (stopBtn)  stopBtn.onclick  = () => {
    clearInterval(timerIv); ctx.timerRunning = false; timerSec = timerMax
    stopChime()
    showDrumView()
    // Restore drum picker to the values that were set when timer was started
    setTimeout(() => {
      drumScrollTo('fb-drum-h-scroll', drumH, true)
      drumScrollTo('fb-drum-m-scroll', drumM, true)
      drumScrollTo('fb-drum-s-scroll', drumS, true)
      syncDrumHighlight('fb-drum-h-scroll')
      syncDrumHighlight('fb-drum-m-scroll')
      syncDrumHighlight('fb-drum-s-scroll')
      checkDrumStartBtn()
    }, 60)
    updateTimer(); applyMood(currentState)
  }

  // Label is now an inline input field

  // (Timer history removed — presets in Tersimpan section)

  // ── Init ──
  initDrumPicker()
  chrome.storage.local.get(['fb3_timerRecents', 'fb3_timerStats'], r => {
    if (r.fb3_timerRecents) timerRecents = r.fb3_timerRecents
    if (r.fb3_timerStats) {
      pomodoroSessions   = r.fb3_timerStats.sessions || 0
      focusMinutesTotal  = r.fb3_timerStats.minutes  || 0
    }
    renderDrumRecents()
  })
  chrome.storage.local.get('fb3_alarmHistory', r => {
    if (r.fb3_alarmHistory) ctx.alarmHistory = r.fb3_alarmHistory
    renderAlarmHistory()
  })


  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // ALARMS
  // ═══════════════════════════════════════════════════════════════
  const AL_ICONS = ['🔔','⏰','💊','🏃','☕','🍱','📅','💤','🎯','🎉','🔥','💡','📞','🚗','✈️','🎵']
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
      const p2 = n => String(n).padStart(2,'0')
      if (timeIn) timeIn.value = p2(d.getHours()) + ':' + p2(d.getMinutes())
      if (dateIn) dateIn.value = d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())
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
      alarmRepeatDays = p==='daily' ? [0,1,2,3,4,5,6] : p==='weekday' ? [1,2,3,4,5] : p==='weekend' ? [0,6] : []
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
      alarmRepeatDays = p==='daily' ? [0,1,2,3,4,5,6] : p==='weekday' ? [1,2,3,4,5] : p==='weekend' ? [0,6] : []
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
            chrome.runtime.sendMessage({ type:'SET_ALARM', id:a.id, label:a.label, timestamp:a.timestamp })
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
    hist.slice(0,10).forEach(a => {
      const dt = new Date(a.timestamp)
      const hh = String(dt.getHours()).padStart(2,'0')
      const mm = String(dt.getMinutes()).padStart(2,'0')
      const item = document.createElement('div')
      item.className = 'fb-alarm-history-item'
      item.innerHTML = `
        <span style="opacity:.4;font-size:15px">⏰</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:#fff">${esc(a.label)}</div>
          <div style="font-size:11px;opacity:.4">${hh}:${mm} · ${relTime(a.firedAt)}</div>
        </div>`
      list.appendChild(item)
    })
  }

  function renderAlarms() {
    const active = ctx.alarms.filter(a => a.timestamp > Date.now()).sort((a, b) => a.timestamp - b.timestamp)
    const cntEl = $('fb-al-cnt-lbl')
    if (cntEl) cntEl.textContent = active.length || ''
    const list = $('fb-alarm-list')
    if (!active.length) {
      list.innerHTML = `<div class="fb-al-empty"><span class="fb-al-empty-ico">🗓️</span>Belum ada agenda terdaftar</div>`
      clearInterval(alarmCdIv); return
    }
    list.innerHTML = ''
    active.forEach(alarm => {
      const ms = alarm.timestamp - Date.now()
      const urgent = ms < 30 * 60 * 1000
      const dt = new Date(alarm.timestamp)
      const hh = String(dt.getHours()).padStart(2,'0')
      const mm = String(dt.getMinutes()).padStart(2,'0')
      const dateLabel = fmtAlarmTime(alarm.timestamp)
      const DAY_NAMES = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
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
          <button class="fb-alcard-toggle ${enabled?'on':'off'}" title="${enabled?'Matikan':'Aktifkan'}">${enabled?'ON':'OFF'}</button>
          <button class="fb-alcard-del" title="Hapus">✕</button>
        </div>`
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
    const lbl = $('fb-al-lbl').value.trim() || 'Alarm'
    const fb  = $('fb-al-fb')
    const dateVal = $('fb-al-date').value, timeVal = $('fb-al-time').value
    if (!dateVal || !timeVal) { fb.style.color='#ff6060'; fb.textContent='⚠️ Set waktu dulu!'; return }
    const ts = new Date(`${dateVal}T${timeVal}`).getTime()
    if (isNaN(ts) || ts <= Date.now()) { fb.style.color='#ff6060'; fb.textContent='⚠️ Waktu sudah lewat!'; return }
    const id = Date.now()
    
    // Sync to Flowbee Web API if user is known
    if (flowbeeUserId) {
      const startDateTime = new Date(ts);
      const endDateTime = new Date(ts + 60*60*1000);
      try {
        await fetch(`${FLOWBEE_API.replace('/ext', '/calendar')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: flowbeeUserId,
            title: lbl,
            description: 'Dibuat dari ekstensi FocusBuddy',
            startTime: startDateTime.toISOString().slice(0, 19).replace('T', ' '),
            endTime: endDateTime.toISOString().slice(0, 19).replace('T', ' '),
            notificationOffsetMinutes: 0
          })
        });
      } catch (e) {
        console.error("Failed to sync calendar to web:", e);
      }
    }

    ctx.alarms.push({ id, label:lbl, icon:alarmIcon, timestamp:ts, repeat:alarmRepeatDays.slice(), enabled:true })
    chrome.runtime.sendMessage({ type:'SET_ALARM', id, label:lbl, timestamp:ts })
    save(); renderAlarms()
    $('fb-al-lbl').value = ''
    root.querySelectorAll('.fb-al-quickbtn').forEach(b => b.classList.remove('active'))
    fb.style.color = STATES[currentState].color
    fb.textContent = `✅ "${lbl}" di-set!`
    setTimeout(() => { fb.textContent = '' }, 2500)
    burst()
  }
  $('fb-al-add').onclick = addAlarm


  // ═══════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════
  function renderAll() { renderTasks(); renderNotes(); updateTimer(); renderAlarms() }
  function renderTab(t) {
    if(t==='tasks') renderTasks()
    if(t==='notes') renderNotes()
    if(t==='timer') updateTimer()
    if(t==='alarm') renderAlarms()
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  load(() => {
    updateBuddySVG(currentState)
    applyMood(currentState)
    updateTimer()

    // Restore saved position or default bottom-right
    chrome.storage.local.get('fb3', r => {
      if (r.fb3?.pos) applyPos(r.fb3.pos.ax, r.fb3.pos.ay)
      else applyPos(window.innerWidth - 28, window.innerHeight - 28)
    })

    // State eval loop — 4s interval for responsive state transitions
    evalIv = setInterval(() => {
      const s = getState()
      if (s !== currentState) {
        currentState = s
        updateBuddySVG(s)
        applyMood(s)
      }
    }, 4000)

    // Listen to events from Flowbee Web App
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'FLOWBEE_SET_ALARM') {
        const { id, label, timestamp } = event.data;
        if (timestamp > Date.now()) {
          ctx.alarms.push({ id, label, icon: '⏰', timestamp, repeat: [], enabled: true });
          chrome.runtime.sendMessage({ type: 'SET_ALARM', id, label, timestamp });
          save(); renderAlarms();
        }
      }
      if (event.data?.type === 'FLOWBEE_SET_FOCUS') {
        const { goal } = event.data;
        timerLabel = goal;
        $('fb-tm-lbl').value = goal;
        forceState('FOCUS', 5000);
      }
    });
  })

})()
