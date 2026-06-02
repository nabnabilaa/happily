; (function () {
  'use strict'
  if (document.getElementById('fb-root')) return
  if (location.protocol === 'chrome-extension:' || location.protocol === 'devtools:') return

  // Safety wrapper to prevent "Extension context invalidated" errors when developer reloads extension
  function isContextValid() {
    try {
      return !!(window.chrome && window.chrome.runtime && window.chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  // Shadow global chrome object inside IIFE to automatically catch invalidation on all calls
  const chrome = {
    get storage() {
      if (!isContextValid()) {
        return {
          local: {
            set: (data, cb) => { if (cb) cb(); },
            get: (keys, cb) => { if (cb) cb({}); },
            remove: (keys, cb) => { if (cb) cb(); }
          }
        };
      }
      return window.chrome.storage;
    },
    get runtime() {
      if (!isContextValid()) {
        return {
          sendMessage: (msg, cb) => { if (cb) cb(); },
          getURL: (path) => "",
          onMessage: {
            addListener: () => {},
            removeListener: () => {}
          }
        };
      }
      return window.chrome.runtime;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // STATE MACHINE  (FocusBuddy state → SVG state mapping)
  // ═══════════════════════════════════════════════════════════════
  const STATES = {
    IDLE: { color: '#4d9fff', badge: 'Halo! 👋', svgState: 'idle', w1: '#dbe4ff', w2: '#5c8ee8', wp: '#ffc9c9', mouth: 'M 90 125 Q 100 130 110 125' },
    HAPPY: { color: '#00e87a', badge: 'Yeay! 🎉', svgState: 'senang', w1: '#d3f9d8', w2: '#51cf66', wp: '#8ce99a', mouth: 'M 80 125 Q 100 155 120 125' },
    SAD: { color: '#7b7bff', badge: 'Sedih nih… 😢', svgState: 'sedih', w1: '#e9ecef', w2: '#adb5bd', wp: '#ced4da', mouth: 'M 85 135 Q 100 115 115 135' },
    SLEEPY: { color: '#9b8fcc', badge: 'Zzzz… 😴', svgState: 'ngantuk', w1: '#a5d8ff', w2: '#3b5bdb', wp: '#5c7cfa', mouth: 'M 95 130 Q 100 132 105 130' },
    FOCUS: { color: '#ff9a1a', badge: 'Fokus bareng! 🔥', svgState: 'fokus', w1: '#e5dbff', w2: '#845ef7', wp: '#b197fc', mouth: 'M 92 128 L 108 128' },
    EATING: { color: '#ff6b6b', badge: 'Makan dulu! 🍱', svgState: 'makan', w1: '#ffe8cc', w2: '#ffa94d', wp: '#ffc078', mouth: 'M 85 125 Q 100 155 115 125' },
    STRETCHING: { color: '#4ecdc4', badge: 'Stretching~ 🤸', svgState: 'olahraga', w1: '#ffc9c9', w2: '#ff8787', wp: '#ff6b6b', mouth: 'M 85 125 Q 100 115 115 125' },
    EXCITED: { color: '#ffd93d', badge: 'Luar biasa!!! ✨', svgState: 'semangat', w1: '#ffec99', w2: '#fcc419', wp: '#ffd43b', mouth: 'M 75 120 Q 100 180 125 120' },
    ANNOYED: { color: '#ff4757', badge: 'Jangan digangguin! 😤', svgState: 'kesal', w1: '#ffc9c9', w2: '#fa5252', wp: '#c92a2a', mouth: 'M 85 135 Q 100 115 115 135' },
    WAITING: { color: '#a8edea', badge: 'Menunggu… ⏳', svgState: 'menunggu', w1: '#c3fae8', w2: '#20c997', wp: '#63e6be', mouth: 'M 95 125 A 5 5 0 1 1 105 125 A 5 5 0 1 1 95 125' },
  }

  const ctx = {
    tasks: [], notes: [], alarms: [], alarmHistory: [], timerRunning: false,
    lastActivity: Date.now(), clickCount: 0, clickWindowStart: 0,
    rubScore: 0, rubLastTime: 0,
    deletedTaskIds: [], deletedNoteIds: [],
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
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
    chrome.storage.local.set({
      fb3: {
        tasks: ctx.tasks,
        notes: ctx.notes,
        alarms: ctx.alarms,
        deletedTaskIds: ctx.deletedTaskIds || [],
        deletedNoteIds: ctx.deletedNoteIds || [],
        flowbeeNotifCache: flowbeeNotifCache
      }
    })
  }
  function load(cb) {
    chrome.storage.local.get('fb3', r => {
      if (r.fb3) {
        ctx.tasks = r.fb3.tasks || []
        ctx.notes = r.fb3.notes || []
        ctx.alarms = (r.fb3.alarms || []).filter(a => a.timestamp > Date.now())
        ctx.deletedTaskIds = r.fb3.deletedTaskIds || []
        ctx.deletedNoteIds = r.fb3.deletedNoteIds || []
        flowbeeNotifCache = r.fb3.flowbeeNotifCache || []
      }
      cb && cb()
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // FLOWBEE SYNC MODULE — 2-way task + notes + calendar + notification sync
  // ═══════════════════════════════════════════════════════════════
  let FLOWBEE_API = 'http://localhost:3000/api/ext'
  let flowbeeUserId = null
  let flowbeeUser = null // {id, name, role, points, coins, level, rank, streak, avatarImage}
  let flowbeeNotifCache = []
  let extensionEnabled = true
  let mascotAnimated = true

  // Try to get userId and base URL from Flowbee cookie/localStorage on the website
  function detectFlowbeeUser() {
    try {
      // Check if we can read from the website's localStorage
      const stored = localStorage.getItem('hp_user_id')
      const storedMascotAnim = localStorage.getItem('hp_mascot_animated')
      if (storedMascotAnim !== null) {
        const nextAnim = storedMascotAnim === '1';
        if (mascotAnimated !== nextAnim) {
          mascotAnimated = nextAnim;
          try {
            chrome.storage.local.set({ hp_mascot_animated: mascotAnimated });
            applyMascotAnimated();
          } catch (e) {}
        }
      }
      if (stored) {
        // Detect account change: if different user logged in, reset local data
        if (flowbeeUserId && flowbeeUserId !== stored) {
          ctx.tasks = []; ctx.notes = []; ctx.alarms = [];
          ctx.deletedTaskIds = []; ctx.deletedNoteIds = [];
          flowbeeUser = null;
          save();
        }
        flowbeeUserId = stored; 
        const origin = location.origin;
        FLOWBEE_API = origin.replace(/\/$/, '') + '/api/ext';
        try { 
          chrome.storage.local.set({ 
            flowbee_user_id: stored,
            flowbee_base_url: origin
          }); 
        } catch (e) {}
        return;
      } else if (flowbeeUserId) {
        // User logged out on website — keep extension data but note the disconnection
        // Extension stays active per user requirement (manual deactivate only)
      }
      // Fallback: check sessionStorage
      const session = sessionStorage.getItem('hp_user_id')
      if (session) { 
        if (flowbeeUserId && flowbeeUserId !== session) {
          ctx.tasks = []; ctx.notes = []; ctx.alarms = [];
          ctx.deletedTaskIds = []; ctx.deletedNoteIds = [];
          flowbeeUser = null;
          save();
        }
        flowbeeUserId = session; 
        const origin = location.origin;
        FLOWBEE_API = origin.replace(/\/$/, '') + '/api/ext';
        try { 
          chrome.storage.local.set({ 
            flowbee_user_id: session,
            flowbee_base_url: origin
          }); 
        } catch (e) {}
        return;
      }
    } catch (e) { /* cross-origin blocked, expected */ }

    // Also check chrome.storage for stored values
    try {
      chrome.storage.local.get(['flowbee_user_id', 'flowbee_base_url', 'flowbee_user', 'fb_ext_enabled', 'fb3', 'hp_mascot_animated'], r => {
        if (r) {
          if (r.flowbee_user_id) {
            flowbeeUserId = r.flowbee_user_id;
          }
          if (r.flowbee_base_url) {
            FLOWBEE_API = r.flowbee_base_url.replace(/\/$/, '') + '/api/ext';
          }
          if (r.flowbee_user && !flowbeeUser) {
            flowbeeUser = r.flowbee_user;
            updateIdentityUI();
          }
          if (typeof r.fb_ext_enabled === 'boolean') {
            extensionEnabled = r.fb_ext_enabled;
            applyExtensionEnabled();
          }
          if (typeof r.hp_mascot_animated === 'boolean') {
            mascotAnimated = r.hp_mascot_animated;
            applyMascotAnimated();
          }
          if (r.fb3 && r.fb3.flowbeeNotifCache) {
            flowbeeNotifCache = r.fb3.flowbeeNotifCache;
          }
        }
      })
    } catch (e) {}
  }

  function updateIdentityUI() {
    if (window.__FB) {
      window.__FB.currentUser = flowbeeUser;
      window.__FB.FLOWBEE_API = FLOWBEE_API;
      window.__FB.flowbeeSyncAll = flowbeeSyncAll;
      
      const newRole = window.__FB.getActiveRole();
      if (window.__FB.lastKnownRole !== newRole) {
        if (typeof buildTabs === 'function') buildTabs();
        if (typeof applyRoleTheme === 'function') applyRoleTheme();
      }
      window.__FB.lastKnownRole = newRole;
    }

    const nameEl = root.querySelector('#fb-user-name');
    const roleEl = root.querySelector('#fb-user-role');
    const levelEl = root.querySelector('#fb-user-level');
    const idRow = root.querySelector('#fb-identity-row');
    const loginMsg = root.querySelector('#fb-login-msg');

    const settingsUserCard = root.querySelector('#fb-settings-user-card');
    const settingsName = root.querySelector('#fb-settings-user-name');
    const settingsMeta = root.querySelector('#fb-settings-user-meta');
    const settingsAvatar = root.querySelector('#fb-settings-avatar');

    if (flowbeeUser) {
      if (nameEl) nameEl.textContent = flowbeeUser.name || 'User';
      if (roleEl) {
        const role = (flowbeeUser.role || 'employee').toLowerCase();
        const roleLabels = { employee: 'Employee', manager: 'Manager', hr: 'HR' };
        const isDark = root.classList.contains('dark');
        const roleColors = isDark 
          ? { employee: '#00e5ff', manager: '#ffd700', hr: '#b197fc' }
          : { employee: '#00b4d8', manager: '#c5a059', hr: '#7B6BB5' };
        roleEl.textContent = roleLabels[role] || 'Employee';
        roleEl.style.background = (roleColors[role] || '#00b4d8') + '24';
        roleEl.style.color = roleColors[role] || '#00b4d8';
      }
      if (levelEl) levelEl.textContent = 'Lv.' + (flowbeeUser.level || 1) + ' • ' + (flowbeeUser.points || 0) + ' XP';
      if (idRow) idRow.style.setProperty('display', 'flex', 'important');
      if (loginMsg) loginMsg.style.display = 'none';

      if (settingsUserCard) settingsUserCard.style.display = 'flex';
      if (settingsName) settingsName.textContent = flowbeeUser.name || 'User';
      if (settingsMeta) {
        const role = (flowbeeUser.role || 'employee').toLowerCase();
        const roleLabels = { employee: 'Employee', manager: 'Manager', hr: 'HR' };
        const displayRole = roleLabels[role] || 'Employee';
        settingsMeta.textContent = displayRole + ' • Lv.' + (flowbeeUser.level || 1) + ' (' + (flowbeeUser.points || 0) + ' XP)';
      }
      if (settingsAvatar) {
        const initials = flowbeeUser.name ? flowbeeUser.name.charAt(0).toUpperCase() : '👤';
        settingsAvatar.textContent = initials;
      }
      
      // Auto-load KPIs if not yet loaded
      if (typeof loadKPIs === 'function' && (!availableKPIs || availableKPIs.length === 0)) {
        loadKPIs();
      }
    } else {
      if (idRow) idRow.style.setProperty('display', 'none', 'important');
      if (loginMsg) loginMsg.style.display = flowbeeUserId ? 'none' : 'block';

      if (settingsUserCard) settingsUserCard.style.display = 'none';
    }
  }

  function applyExtensionEnabled() {
    // Safety: skip if root or DOM not ready yet
    if (!root || !root.querySelector) return;
    const buddyEl = root.querySelector('#fb-buddy');
    const panelEl = root.querySelector('#fb-panel');
    if (!extensionEnabled) {
      if (buddyEl) { buddyEl.style.display = 'none'; buddyEl.style.visibility = 'hidden'; }
      if (panelEl) { panelEl.classList.remove('open'); panelOpen = false; }
    } else {
      if (buddyEl) { buddyEl.style.display = ''; buddyEl.style.visibility = 'visible'; buddyEl.style.opacity = '1'; }
    }
    // Update toggle UI
    const toggle = root.querySelector('#fb-settings-toggle');
    if (toggle) toggle.checked = extensionEnabled;
  }

  function applyMascotAnimated() {
    if (!root || !root.querySelector) return;
    root.classList.toggle('quiet-mode', !mascotAnimated);
    const toggle = root.querySelector('#fb-settings-mascot-anim-toggle');
    if (toggle) toggle.checked = mascotAnimated;
    
    // Re-snap position so mini-buddy is flush with screen edge
    const ax = parseInt(root.style.left) || window.innerWidth - 28;
    const ay = parseInt(root.style.top) || window.innerHeight - 28;
    applyPos(ax, ay);
  }

  async function flowbeeSyncAll() {
    if (!flowbeeUserId || !extensionEnabled) return
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
        description: t.description || null,
        targetDate: t.targetDate || null,
        kpiId: t.kpiId || null,
        goalId: t.goalId || null,
      }))

      // Push local notes
      const localNotes = ctx.notes.map(n => ({
        id: String(n.id), title: n.title || '', content: n.text || n.content || '',
        visibility: n.visibility || 'private',
        relatedEventId: n.relatedEventId || null,
      }))

      const res = await window.__FB.fetch(`${FLOWBEE_API}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: flowbeeUserId,
          tasks: localTasks,
          notes: localNotes,
          calendarRequest: true, // Request upcoming calendar events
          deletedTaskIds: ctx.deletedTaskIds || [],
          deletedNoteIds: ctx.deletedNoteIds || []
        })
      })
      const data = await res.json()

      if (data.success) {
        ctx.deletedTaskIds = []
        ctx.deletedNoteIds = []
        if (window.__FB) {
          window.__FB.roleData = data;
        }
      }

      // Update user identity from server
      if (data.user) {
        flowbeeUser = data.user;
        try { chrome.storage.local.set({ flowbee_user: data.user }); } catch(e) {}
        updateIdentityUI();
      }

      // Re-render role-specific panels if active
      if (window.__FB) {
        if (activeTab === 'team' && typeof window.__FB.renderTeamPane === 'function') {
          window.__FB.renderTeamPane();
        } else if (activeTab === 'people' && typeof window.__FB.renderPeoplePane === 'function') {
          window.__FB.renderPeoplePane();
        }
      }

      // Merge: web tasks not in local get added
      if (data.tasks) {
        let changed = false;

        // 1. Add/update tasks from web
        data.tasks.forEach(wt => {
          const existing = ctx.tasks.find(lt => String(lt.id) === String(wt.id))
          if (!existing) {
            ctx.tasks.push({
              id: wt.id, text: wt.title, done: wt.done,
              date: wt.date || today(), priority: wt.energy || 'mid',
              proofLink: wt.proofLink || '', progress: wt.progress || 0,
              isProject: wt.isProject || false, goalId: wt.goalId, kpiId: wt.kpiId,
              description: wt.description || '', targetDate: wt.targetDate || '',
            })
            changed = true;
          } else {
            // Update fields if changed
            if (existing.done !== wt.done || 
                existing.text !== wt.title ||
                existing.proofLink !== (wt.proofLink || '') ||
                existing.progress !== (wt.progress || 0) ||
                existing.description !== (wt.description || '') ||
                existing.targetDate !== (wt.targetDate || '') ||
                existing.date !== (wt.date || today())) {
              existing.done = wt.done
              existing.text = wt.title
              existing.proofLink = wt.proofLink || ''
              existing.progress = wt.progress || 0
              existing.description = wt.description || ''
              existing.targetDate = wt.targetDate || ''
              existing.date = wt.date || today()
              changed = true;
            }
          }
        })

        // 2. Remove tasks deleted on web
        const webTaskIds = new Set(data.tasks.map(wt => String(wt.id)));
        const oldLen = ctx.tasks.length;
        ctx.tasks = ctx.tasks.filter(lt => {
          if (lt.date !== today() || webTaskIds.has(String(lt.id))) {
            return true;
          }
          if (ctx.deletedTaskIds && ctx.deletedTaskIds.includes(String(lt.id))) {
            return true;
          }
          return false;
        });
        if (ctx.tasks.length !== oldLen) {
          changed = true;
        }

        if (changed) {
          renderTasks();
        }
      }

      // Merge: web notes
      if (data.notes) {
        let changed = false;

        // 1. Add/update notes from web
        data.notes.forEach(wn => {
          const existing = ctx.notes.find(ln => String(ln.id) === String(wn.id))
          if (!existing) {
            ctx.notes.push({
              id: wn.id,
              title: wn.title || '',
              text: wn.content || '',
              visibility: wn.visibility || 'private',
              relatedEventId: wn.relatedEventId || null,
              createdAt: wn.createdAt ? new Date(wn.createdAt).getTime() : Date.now(),
              pinned: false,
              color: NOTE_COLORS[0].id
            })
            changed = true;
          } else {
            // Update fields if changed
            if (existing.text !== (wn.content || '') || 
                existing.title !== (wn.title || '') ||
                existing.visibility !== (wn.visibility || 'private') ||
                existing.relatedEventId !== (wn.relatedEventId || null)) {
              existing.text = wn.content || ''
              existing.title = wn.title || ''
              existing.visibility = wn.visibility || 'private'
              existing.relatedEventId = wn.relatedEventId || null
              changed = true;
            }
          }
        })

        // 2. Remove notes deleted on web
        const webNoteIds = new Set(data.notes.map(wn => String(wn.id)));
        const oldLen = ctx.notes.length;
        ctx.notes = ctx.notes.filter(ln => {
          if (webNoteIds.has(String(ln.id))) {
            return true;
          }
          if (ctx.deletedNoteIds && ctx.deletedNoteIds.includes(String(ln.id))) {
            return true;
          }
          return false;
        });
        if (ctx.notes.length !== oldLen) {
          changed = true;
        }

        if (changed) {
          renderNotes();
        }
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
        // Mark all shown notifications as read in DB so they never repeat
        if (newNotifs.length > 0) {
          try {
            window.__FB.fetch(`${FLOWBEE_API}/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: flowbeeUserId,
                notificationIds: newNotifs.map(n => n.id)
              })
            }).catch(() => {})
          } catch (e) { /* silent */ }
        }
      } else {
        flowbeeNotifCache = []
      }

      save()
    } catch (e) { /* offline or server down — silent fail */ }
  }

  // Auto-sync every 30 seconds (detect & sync deferred until after DOM ready)
  loadKPIs()

  // ═══════════════════════════════════════════════════════════════
  // DOM ROOT
  // ═══════════════════════════════════════════════════════════════
  const root = document.createElement('div')
  root.id = 'fb-root'
  root.style.cssText = [
    'all:initial!important', 'position:fixed!important',
    'z-index:2147483647!important', 'pointer-events:none!important',
    'font-family:Outfit,system-ui,sans-serif!important',
    'width:0!important', 'height:0!important',
  ].join(';')
  
  // Theme sync function — supports manual override via fbTheme
  let _manualTheme = null; // null = auto, 'light', 'dark'
  function syncTheme() {
    let isDark;
    if (_manualTheme === 'dark') { isDark = true; }
    else if (_manualTheme === 'light') { isDark = false; }
    else {
      isDark = document.documentElement.classList.contains('dark');
      if (!isDark && typeof window !== 'undefined') {
        try { isDark = localStorage.getItem('hp-theme') === 'dark'; } catch (e) {}
      }
      if (!isDark && typeof window !== 'undefined' && window.matchMedia) {
        try { isDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) {}
      }
    }
    root.classList.toggle('dark', isDark);
    updateThemeToggleIcon();
  }
  function updateThemeToggleIcon() {
    const btn = root.querySelector('#fb-theme-toggle');
    if (!btn) return;
    const isDark = root.classList.contains('dark');
    btn.innerHTML = isDark
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.title = isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap';
  }
  // Load saved theme preference
  try {
    chrome.storage.local.get('fbTheme', r => {
      if (r && r.fbTheme) { _manualTheme = r.fbTheme; }
      syncTheme();
    });
  } catch (e) { syncTheme(); }
  
  // Listen to mutation changes on <html>
  const themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  
  // Listen to custom custom event
  window.addEventListener('hp_theme_change', (e) => {
    if (e.detail && e.detail.theme) {
      root.classList.toggle('dark', e.detail.theme === 'dark');
    }
  });

  document.documentElement.appendChild(root)

  if (!document.querySelector('#fb-font')) {
    const l = document.createElement('link')
    l.id = 'fb-font'; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'
    document.head && document.head.appendChild(l)
  }

  // ═══════════════════════════════════════════════════════════════
  // HTML + CSS
  // ═══════════════════════════════════════════════════════════════
  root.innerHTML = `
<style>
#fb-root {
  --fb-yellow: #FDB913 !important;
  --fb-yellow-dark: #E5A800 !important;
  --fb-yellow-soft: #FFFDF0 !important;
  --fb-blue: #1a56db !important;
  --fb-blue-soft: #EBF4FF !important;
  --fb-gold: #dfb875 !important;
  --fb-paper: #ffffff !important;
  --fb-card: #f9fafb !important;
  --fb-card-fade: rgba(249, 250, 251, 0) !important;
  --fb-ink: #0b0f19 !important;
  --fb-ink-mute: #5c6470 !important;
  --fb-line: rgba(11, 15, 25, 0.08) !important;
  --fb-line-soft: rgba(11, 15, 25, 0.04) !important;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
}

#fb-root.dark {
  --fb-paper: #06080f !important;
  --fb-card: rgba(16, 22, 42, 0.85) !important;
  --fb-card-fade: rgba(16, 22, 42, 0) !important;
  --fb-ink: #f0f4f9 !important;
  --fb-ink-mute: #8ca0b8 !important;
  --fb-yellow: #ffd700 !important;
  --fb-yellow-dark: #dfb875 !important;
  --fb-yellow-soft: rgba(223, 184, 117, 0.06) !important;
  --fb-blue: #4fc3f7 !important;
  --fb-blue-soft: rgba(0, 176, 255, 0.1) !important;
  --fb-gold: #dfb875 !important;
  --fb-line: rgba(223, 184, 117, 0.25) !important;
  --fb-line-soft: rgba(223, 184, 117, 0.12) !important;
}

#fb-genangan {
  position:absolute !important; bottom:0; left:50%; transform:translateX(-50%);
  width:120px !important; height:18px !important;
  background:rgba(116,192,252,0.6) !important; border-radius:50% !important; filter:blur(4px);
  pointer-events:none !important; opacity:0 !important; transition:opacity .3s;
}
@keyframes genanganMeluas { 0%{transform:translateX(-50%) scale(0);opacity:0} 100%{transform:translateX(-50%) scale(1);opacity:1} }
:where(#fb-root div,#fb-root button,#fb-root input,#fb-root textarea,#fb-root span,#fb-root p,#fb-root label,#fb-root select,#fb-root details,#fb-root summary) {
  box-sizing: border-box !important; font-family: Outfit,system-ui,sans-serif !important;
  margin: 0 !important; padding: 0 !important; border: 0 !important; outline: 0 !important;
  text-decoration: none !important; list-style: none !important;
  -webkit-tap-highlight-color: transparent !important;
}
:where(#fb-root button) { display:block !important; cursor:pointer !important }
:where(#fb-root input, #fb-root textarea) { display:block !important }
:where(#fb-root select) {
  -webkit-appearance:none !important; appearance:none !important;
  display:block !important; box-sizing:border-box !important;
  font-family:Outfit,system-ui,sans-serif !important;
  background-color:var(--fb-card) !important;
}
:where(#fb-root details) { display:block !important }
:where(#fb-root summary) { display:flex !important; list-style:none !important; cursor:pointer !important }
:where(#fb-root summary)::-webkit-details-marker { display:none !important }

/* ══════════════════════════════════════════════
   BUDDY
══════════════════════════════════════════════ */
#fb-buddy {
  position:absolute !important; bottom:0; right:0;
  width:100px !important; height:130px !important;
  cursor:grab !important; pointer-events:all !important; user-select:none;
  perspective:500px;
  z-index: 2147483640 !important;
}
#fb-root.quiet-mode #fb-buddy {
  pointer-events: none !important;
}
#fb-root.quiet-mode #fb-buddy.dragging {
  pointer-events: all !important;
}
#fb-mini-buddy {
  position: absolute !important;
  bottom: 20px;
  right: -30px;
  width: 74px !important;
  height: 48px !important;
  display: none !important;
  align-items: center;
  justify-content: flex-start;
  pointer-events: all !important;
  cursor: pointer !important;
  z-index: 5 !important;
}
#fb-root.quiet-mode #fb-mini-buddy {
  display: flex !important;
}
.fb-mini-bg {
  width: 64px !important;
  height: 44px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  border-right: none !important;
  border-radius: 22px 0 0 22px !important;
  display: flex !important;
  align-items: center;
  justify-content: flex-start;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  transition: transform 0.2s, background-color 0.2s;
  padding-left: 8px;
}
#fb-mini-buddy:hover .fb-mini-bg {
  transform: translateX(-6px);
  background: var(--fb-line-soft) !important;
}
/* Snapped left-edge styles */
#fb-buddy.on-left #fb-mini-buddy {
  left: -30px;
  right: auto;
  justify-content: flex-end;
}
#fb-buddy.on-left .fb-mini-bg {
  border-radius: 0 22px 22px 0 !important;
  border-right: 1px solid var(--fb-line) !important;
  border-left: none !important;
  padding-left: 0;
  padding-right: 8px;
  justify-content: flex-end;
}
#fb-buddy.on-left #fb-mini-buddy:hover .fb-mini-bg {
  transform: translateX(6px);
}
#fb-buddy.dragging { cursor:grabbing !important }
#fb-drag-dot {
  position:absolute !important; top:8px; left:50%; transform:translateX(-50%);
  width:20px !important; height:4px !important; border-radius:0 !important;
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
  padding:7px 16px !important; border-radius:0 !important; white-space:nowrap !important; pointer-events:none !important;
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
  position:absolute !important; bottom:142px; right:0; width:480px !important; min-width:320px !important; max-width:calc(100vw - 48px) !important;
  background:var(--fb-paper) !important;
  backdrop-filter:blur(24px) !important; -webkit-backdrop-filter:blur(24px) !important;
  border:1.5px solid var(--fb-line) !important;
  border-radius:22px !important; overflow:hidden !important;
  box-shadow:0 20px 60px rgba(0,0,0,.16), 0 6px 20px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.03) !important;
  transform:scale(.88) translateY(16px); transform-origin:bottom right;
  opacity:0 !important; pointer-events:none !important;
  transition:transform .35s cubic-bezier(.34,1.56,.64,1), opacity .25s ease, background-color .3s, border-color .3s;
  z-index: 2147483647 !important;
}
#fb-panel.open { transform:scale(1) translateY(0); opacity:1 !important; pointer-events:all !important }

/* ── Body & Pane layout — proper spacing ── */
#fb-body {
  padding:20px 22px 24px !important;
  overflow-y:auto !important;
  overflow-x:hidden !important;
  max-height:460px !important;
  scrollbar-width:thin !important;
  scrollbar-color:var(--fb-line) transparent !important;
}
#fb-body::-webkit-scrollbar { width:5px !important; }
#fb-body::-webkit-scrollbar-track { background:transparent !important; }
#fb-body::-webkit-scrollbar-thumb { background:var(--fb-line) !important; border-radius:3px !important; }
.fb-pane { display:none !important; }
.fb-pane.show { display:block !important; }
#fb-resize-handle {
  position:absolute !important; left:0 !important; top:0 !important; bottom:0 !important;
  width:6px !important; cursor:ew-resize !important; z-index:99999 !important;
  background:transparent !important; transition:background 0.2s !important;
}
#fb-resize-handle:hover, #fb-panel.resizing #fb-resize-handle {
  background:var(--fb-blue) !important;
  opacity:0.6 !important;
}

#fb-hdr {
  display:flex !important; flex-direction:column !important;
  padding:18px 22px 0 !important; border-bottom:1px solid var(--fb-line) !important;
  background:linear-gradient(160deg, var(--fb-card) 0%, var(--fb-paper) 100%) !important;
  position:relative !important;
  transition: background-color .3s, border-color .3s;
}
#fb-hdr-accent {
  position:absolute !important; top:0; left:0; right:0; height:4px !important;
  background:linear-gradient(90deg, var(--fb-blue) 0%, var(--fb-gold) 100%) !important;
  border-radius:20px 20px 0 0 !important; z-index:1 !important;
}
#fb-hdr-top {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  width:100% !important; margin-bottom:4px !important;
}
#fb-hdr-l { display:flex !important; align-items:center !important; gap:12px !important; min-width:0 !important }
#fb-hdr-r { display:flex !important; align-items:center !important; gap:10px !important; flex-shrink:0 !important }
.fb-logo   { font-size:16px !important; font-weight:800 !important; letter-spacing:-.5px !important;
  background:linear-gradient(90deg, var(--fb-blue), var(--fb-gold)) !important; -webkit-background-clip:text !important; -webkit-text-fill-color:transparent !important; background-clip:text !important; }
.fb-date-s { font-size:12px !important; color:var(--fb-ink-mute) !important; font-weight:600 !important; flex-shrink:0 !important }
.fb-pill   { font-size:9px !important; font-weight:800 !important; letter-spacing:1px !important; padding:4px 10px !important; border-radius:12px !important; text-transform:uppercase !important; flex-shrink:0 !important }
#fb-x {
  width:32px !important; height:32px !important; border-radius:10px !important; flex-shrink:0 !important;
  background:var(--fb-line) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:12px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:background .2s,color .2s; border:none !important;
}
#fb-settings-btn {
  width:32px !important; height:32px !important; border-radius:10px !important; flex-shrink:0 !important;
  background:var(--fb-line) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:14px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:background .2s,color .2s, transform .2s; border:none !important;
}
#fb-settings-btn:hover { background:rgba(31,29,27,.10) !important; transform:rotate(45deg); }
#fb-theme-toggle {
  width:32px !important; height:32px !important; border-radius:10px !important; flex-shrink:0 !important;
  background:var(--fb-line) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:14px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:background .2s,color .2s; border:none !important;
}
#fb-theme-toggle:hover { background:rgba(31,29,27,.10) !important; }

/* Identity row */
#fb-identity-row {
  display:none !important; align-items:center !important; gap:12px !important;
  padding:12px 14px !important; margin:14px 0 0 !important;
  background:var(--fb-line-soft) !important; border-radius:12px !important;
  border:1px solid var(--fb-line) !important;
}
#fb-user-name {
  font-size:13px !important; font-weight:700 !important; color:var(--fb-ink) !important;
  white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:120px !important;
}
#fb-user-role {
  font-size:9.5px !important; font-weight:800 !important; letter-spacing:.5px !important;
  padding:3px 8px !important; border-radius:6px !important;
  text-transform:uppercase !important; flex-shrink:0 !important;
}
#fb-user-level {
  font-size:10.5px !important; font-weight:800 !important;
  color:var(--fb-ink) !important; background:var(--fb-line) !important;
  padding:4px 8px !important; border-radius:6px !important;
  flex-shrink:0 !important; margin-left:auto !important;
}
#fb-login-msg {
  display:none !important; font-size:10.5px !important; color:#BDB6AE !important;
  padding:6px 0 8px !important; font-weight:500 !important;
}
/* Settings panel */
#fb-settings-panel {
  display:none; position:absolute !important; top:0; left:0; right:0; bottom:0;
  background:var(--fb-paper) !important; z-index:999 !important;
  flex-direction:column !important;
}
#fb-settings-panel.open { display:flex !important; }
.fb-settings-hdr {
  display:flex !important; align-items:center !important; gap:10px !important;
  padding:16px 18px 14px !important; border-bottom:1.5px solid var(--fb-line) !important;
}
.fb-settings-back {
  width:32px !important; height:32px !important; border-radius:0 !important;
  background:var(--fb-line) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:14px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  border:none !important;
}
.fb-settings-title {
  font-size:15px !important; font-weight:700 !important; color:var(--fb-ink) !important;
}
.fb-settings-body { padding:18px !important; }
.fb-settings-item {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  padding:14px 0 !important; border-bottom:1px solid var(--fb-line) !important;
}
.fb-settings-item-label {
  font-size:13px !important; font-weight:600 !important; color:var(--fb-ink) !important;
}
.fb-settings-item-sub {
  font-size:10.5px !important; color:var(--fb-ink-mute) !important; margin-top:2px !important;
}
/* Toggle switch */
.fb-toggle {
  position:relative !important; width:42px !important; height:24px !important;
  -webkit-appearance:none !important; appearance:none !important;
  background:rgba(31,29,27,.15) !important; border-radius:0 !important;
  cursor:pointer !important; transition:background .2s !important;
  border:none !important; outline:none !important; flex-shrink:0 !important;
}
.fb-toggle:checked { background:#4A90E2 !important; }
.fb-toggle::before {
  content:'' !important; position:absolute !important; top:2px !important; left:2px !important;
  width:20px !important; height:20px !important; border-radius:0 !important;
  background:white !important; transition:transform .2s !important;
  box-shadow:0 1px 3px rgba(0,0,0,.2) !important;
}
.fb-toggle:checked::before { transform:translateX(18px) !important; }
.fb-settings-user {
  display:flex !important; align-items:center !important; gap:12px !important;
  padding:16px !important; background:rgba(74,144,226,.04) !important;
  border-radius:0 !important; margin-bottom:18px !important;
  border:1px solid rgba(74,144,226,.10) !important;
}
.fb-settings-avatar {
  width:40px !important; height:40px !important; border-radius:0 !important;
  background:linear-gradient(135deg,#4A90E2,#86C0A9) !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  font-size:18px !important; color:white !important; font-weight:700 !important;
  flex-shrink:0 !important;
}
.fb-settings-user-info { flex:1 !important; min-width:0 !important; }
.fb-settings-user-name {
  font-size:13px !important; font-weight:700 !important; color:var(--fb-ink) !important;
  white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important;
}
.fb-settings-user-meta {
  font-size:10.5px !important; color:var(--fb-ink-mute) !important; margin-top:2px !important;
}
#fb-x:hover { background:rgba(31,29,27,.10) !important; color:var(--fb-ink) !important }

#fb-tabs {
  display:flex !important; padding:6px !important;
  background:rgba(31,29,27,.04) !important; border-radius:14px !important;
  margin:6px 22px 0 !important; gap:4px !important;
}
.fb-tab {
  flex:1 !important; padding:10px 6px !important; border:none !important; background:transparent !important;
  color:#8A837C !important; font-size:9.5px !important; font-weight:700 !important;
  text-transform:uppercase !important; letter-spacing:.2px !important; cursor:pointer !important;
  display:flex !important; flex-direction:column !important; align-items:center !important; gap:5px !important;
  transition:all .2s cubic-bezier(.34,1.56,.64,1) !important; border-radius:10px !important;
}
.fb-tab .ti { font-size:17px !important; line-height:1 !important; transition:transform .2s !important; display:inline-block !important; }
.fb-tab:hover { color:var(--fb-ink) !important; }
.fb-tab:hover .ti { transform:scale(1.15) !important; }
.fb-tab.act {
  background:var(--fb-paper) !important; color:var(--fb-blue) !important;
  box-shadow:0 2px 8px rgba(0,0,0,.06) !important;
}
.fb-tab.act .ti { transform:scale(1.1) !important; }
.fb-in {
  width:100% !important; display:block !important;
  background:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  color:var(--fb-ink) !important; padding:12px 14px !important; border-radius:12px !important;
  font-size:13px !important; outline:none !important; transition:all .2s;
}
.fb-in::placeholder { color:var(--fb-ink-mute) !important }
.fb-in:focus { border-color:var(--fb-blue) !important; background:var(--fb-card) !important; box-shadow:0 0 0 3px rgba(0,229,255,0.15) !important; }
textarea.fb-in { resize:none; min-height:88px !important; line-height:1.6 !important }
input[type="date"].fb-in, input[type="time"].fb-in { color-scheme:light !important; cursor:pointer !important }
#fb-root.dark input[type="date"].fb-in, #fb-root.dark input[type="time"].fb-in { color-scheme:dark !important }

.fb-select {
  width:100% !important; box-sizing:border-box !important;
  background-color:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  color:var(--fb-ink) !important; padding:10px 32px 10px 14px !important; border-radius:12px !important;
  font-size:13px !important; outline:none !important; cursor:pointer !important;
  appearance:none !important; -webkit-appearance:none !important;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%235c6470' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 5 3 3 3-3'/%3E%3C/svg%3E") !important;
  background-repeat:no-repeat !important;
  background-position:right 14px center !important;
  background-size:12px !important;
  transition:all .2s !important;
  display:block !important;
}
#fb-root.dark .fb-select {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%238ca0b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 5 3 3 3-3'/%3E%3C/svg%3E") !important;
}
.fb-select:hover { border-color:var(--fb-blue) !important }
.fb-select:focus { border-color:var(--fb-blue) !important; box-shadow:0 0 0 3px rgba(0,229,255,0.15) !important }
 
.fb-row { display:flex !important; gap:12px !important; align-items:stretch !important; margin-bottom:16px !important }
.fb-btn {
  display:block !important; cursor:pointer !important; border:none !important; flex-shrink:0 !important;
  padding:12px 18px !important; border-radius:10px !important;
  background:var(--fb-blue) !important; color:#fff !important;
  font-size:13px !important; font-weight:800 !important; white-space:nowrap !important;
  transition:all .2s cubic-bezier(.34,1.56,.64,1) !important; box-shadow:0 2px 6px rgba(0,229,255,.2) !important;
}
.fb-btn:hover { transform:translateY(-1.5px) !important; filter:brightness(1.05) !important; box-shadow:0 4px 12px rgba(0,229,255,.3) !important; }
.fb-btn:active { transform:translateY(0) scale(.98) !important; box-shadow:none !important; }
.fb-btn.sec  { background:var(--fb-line-soft) !important; color:var(--fb-ink) !important; border:1.5px solid var(--fb-line) !important; box-shadow:none !important; }
.fb-btn.sec:hover { background:var(--fb-line) !important; box-shadow:none !important; }
.fb-btn.del  { background:rgba(232,139,125,.1) !important; color:#E88B7D !important; padding:8px 13px !important; font-size:12px !important; box-shadow:none !important; }
.fb-btn.del:hover { background:rgba(232,139,125,.2) !important; box-shadow:none !important; }
.fb-btn.full { width:100% !important; text-align:center !important }

.fb-empty { text-align:center !important; padding:28px 16px 20px !important; color:#8A837C !important; font-size:12.5px !important; font-weight:600 !important }
.fb-empty-ico { font-size:32px !important; margin-bottom:10px !important; opacity:.5 !important; display:block !important }
.fb-list { display:flex !important; flex-direction:column !important; gap:8px !important }

/* ── TASKS REDESIGN ── */

/* Section label: "0/0 SELESAI HARI INI" */
.fb-task-section-hdr {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 0 !important;
  background: var(--fb-card) !important;
  padding: 10px 14px 6px !important;
  border: 1px solid var(--fb-line) !important;
  border-bottom: none !important;
  border-radius: 12px 12px 0 0 !important;
}
.fb-task-section-lbl {
  font-size: 10.5px !important;
  font-weight: 700 !important;
  color: var(--fb-ink-mute) !important;
  letter-spacing: 0.8px !important;
  text-transform: uppercase !important;
}
.fb-task-section-stat {
  font-size: 12px !important;
  font-weight: 800 !important;
  color: var(--fb-blue) !important;
  letter-spacing: -.3px !important;
}

/* Progress bar */
.fb-prog-wrap {
  margin-bottom: 18px !important;
  margin-top: 0 !important;
  padding: 0 14px 10px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  border-top: none !important;
  border-radius: 0 0 12px 12px !important;
}
.fb-prog {
  height: 6px !important;
  background: var(--fb-line-soft) !important;
  border-radius: 3px !important;
  overflow: hidden !important;
  position: relative !important;
}
.fb-prog-fill {
  height: 100% !important;
  border-radius: 3px !important;
  background: linear-gradient(90deg, var(--fb-blue), var(--fb-gold)) !important;
  transition: width .7s cubic-bezier(.4,0,.2,1);
  position: relative !important;
}
@keyframes progShimmer { 0%{left:-60px} 100%{left:calc(100% + 60px)} }
.fb-prog-fill.running::before {
  content: '' !important;
  position: absolute !important;
  top: 0;
  left: -60px;
  width: 60px !important;
  height: 100% !important;
  background: linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent) !important;
  animation: progShimmer 1.4s infinite;
}

/* Hero message (hidden but kept for JS) */
.fb-task-hero { display: none !important }
.fb-task-hero-msg {}
.fb-prog-row  { display: none !important }
.fb-prog-stat {}
.fb-prog-pct  {}
.fb-prog-marks { display: none !important }
.fb-prog-mark {}

/* ── Input row ── */
.fb-task-add-row {
  display: flex !important;
  align-items: stretch !important;
  margin-bottom: 24px !important;
}
.fb-task-composer {
  flex: 1 !important;
  min-width: 0 !important;
  background: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 14px !important;
  overflow: visible !important;
  transition: border-color .2s, box-shadow .2s;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
}
.fb-task-composer:focus-within {
  border-color: var(--fb-blue) !important;
  box-shadow: 0 0 0 3px var(--fb-blue-soft) !important;
}
.fb-task-input-row {
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
}
/* ── Priority dropdown (single, no double) ── */
.fb-pri-dd {
  position: relative !important;
  flex-shrink: 0 !important;
  border-right: 1px solid var(--fb-line) !important;
}
.fb-pri-sel {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 0 12px !important;
  height: 100% !important;
  min-height: 40px !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  color: var(--fb-ink-mute) !important;
  border-radius: 0 !important;
}
.fb-pri-sel:hover { background: var(--fb-line-soft) !important; }
.fb-pri-dot-sm {
  width: 9px !important;
  height: 9px !important;
  border-radius: 0 !important;
  flex-shrink: 0 !important;
  transition: background .2s, box-shadow .2s;
}
.fb-pri-dd[data-p="high"] .fb-pri-dot-sm { background: #ff6b6b !important; box-shadow: none !important }
.fb-pri-dd[data-p="med"]  .fb-pri-dot-sm { background: #ffd43b !important; box-shadow: none !important }
.fb-pri-dd[data-p="low"]  .fb-pri-dot-sm { background: #69db7c !important; box-shadow: none !important }
.fb-pri-arrow { transition: transform .2s !important; }
.fb-pri-dd.open .fb-pri-arrow { transform: rotate(180deg) !important; }
.fb-pri-menu {
  display: none !important;
  position: absolute !important;
  top: calc(100% + 6px) !important;
  left: 0 !important;
  background: var(--fb-paper) !important;
  border: 1px solid var(--fb-line) !important;
  border-radius: 12px !important;
  padding: 5px !important;
  z-index: 9999 !important;
  min-width: 120px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,.08) !important;
}
.fb-pri-dd.open .fb-pri-menu { display: flex !important; flex-direction: column !important; gap: 2px !important; }
.fb-pri-opt {
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
  padding: 8px 12px !important;
  border: none !important;
  background: transparent !important;
  color: var(--fb-ink) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  text-align: left !important;
  font-family: inherit !important;
  white-space: nowrap !important;
}
.fb-pri-opt:hover { background: var(--fb-line-soft) !important; color: var(--fb-ink) !important; }
.fb-pri-opt.sel { background: var(--fb-blue-soft) !important; color: var(--fb-blue) !important; font-weight: 700 !important; }
.fb-pri-opt-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 0 !important;
  flex-shrink: 0 !important;
}
/* ── Premium Task Composer ── */
.fb-task-composer {
  background: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 14px !important;
  margin-bottom: 20px !important;
  overflow: visible !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
  transition: all 0.3s ease !important;
  display: flex !important;
  flex-direction: column !important;
}
.fb-task-composer:focus-within {
  border-color: var(--fb-blue) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,0.06), 0 0 0 3px var(--fb-blue-soft) !important;
}
.fb-task-main-row {
  display: flex !important;
  align-items: center !important;
  border-bottom: 1px solid var(--fb-line) !important;
}
.fb-task-in-field {
  flex: 1 !important;
  height: 44px !important;
  padding: 0 14px !important;
  border: none !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  outline: none !important;
  background: transparent !important;
  color: var(--fb-ink) !important;
  font-family: inherit !important;
}
.fb-task-in-field::placeholder {
  color: var(--fb-ink-mute) !important;
}
.fb-task-opt-toggle {
  background: transparent !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  padding: 0 12px !important;
  height: 44px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s ease !important;
}
.fb-task-opt-toggle:hover {
  color: var(--fb-ink) !important;
  background: var(--fb-line-soft) !important;
}
.fb-task-opt-toggle.active {
  color: var(--fb-blue) !important;
}
.fb-task-drawer {
  display: none;
  background: var(--fb-card) !important;
  border-top: 1px solid var(--fb-line) !important;
  padding: 14px !important;
  animation: fbSlideDown 0.2s ease-out !important;
}
.fb-task-drawer.open {
  display: block !important;
}
@keyframes fbSlideDown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.fb-task-desc-area {
  width: 100% !important;
  min-height: 60px !important;
  padding: 10px 12px !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 10px !important;
  font-size: 12.5px !important;
  font-family: inherit !important;
  resize: none !important;
  outline: none !important;
  box-sizing: border-box !important;
  color: var(--fb-ink) !important;
  background: var(--fb-line-soft) !important;
  line-height: 1.6 !important;
  margin-bottom: 12px !important;
  transition: background 0.2s, border-color 0.2s !important;
}
.fb-task-desc-area:focus {
  background: var(--fb-card) !important;
  border-color: var(--fb-blue) !important;
}
.fb-task-drawer-row {
  display: flex !important;
  gap: 12px !important;
  margin-bottom: 14px !important;
}
.fb-task-drawer-col {
  flex: 1 !important;
  min-width: 0 !important;
}
.fb-task-field-label {
  font-size: 9.5px !important;
  color: var(--fb-ink-mute) !important;
  margin-bottom: 6px !important;
  font-weight: 800 !important;
  letter-spacing: 0.8px !important;
  text-transform: uppercase !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}
.fb-task-actions-row {
  display: flex !important;
  gap: 10px !important;
}
.fb-task-btn {
  padding: 10px 16px !important;
  border-radius: 10px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  transition: all 0.2s ease !important;
  font-family: inherit !important;
}
.fb-task-btn.cancel {
  flex: 1 !important;
  border: 1.5px solid var(--fb-line) !important;
  background: transparent !important;
  color: var(--fb-ink-mute) !important;
}
.fb-task-btn.cancel:hover {
  background: var(--fb-line-soft) !important;
  color: var(--fb-ink) !important;
}
.fb-task-btn.submit {
  flex: 1.8 !important;
  border: none !important;
  background: var(--fb-blue) !important;
  color: #fff !important;
  box-shadow: 0 4px 12px var(--fb-blue-soft) !important;
}
.fb-task-btn.submit:hover {
  opacity: 0.9 !important;
  transform: translateY(-1px) !important;
}
.fb-task-btn.submit:active {
  transform: translateY(0) !important;
}
.fb-task-btn.submit:disabled {
  background: var(--fb-line) !important;
  color: var(--fb-ink-mute) !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
  box-shadow: none !important;
  opacity: 0.7 !important;
}
.fb-task-list2 {
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
}
@keyframes taskSlideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
.fb-task-card {
  display: flex !important;
  align-items: center !important;
  gap: 16px !important;
  padding: 14px 16px !important;
  border-radius: 12px !important;
  background: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-left: 4px solid var(--task-color, var(--fb-line)) !important;
  animation: taskSlideIn .25s ease-out;
  transition: all .3s cubic-bezier(.34,1.56,.64,1);
  position: relative !important;
  cursor: default !important;
  box-shadow: 0 4px 16px rgba(0,0,0,.03) !important;
  box-sizing: border-box !important;
}
.fb-task-card.done { border-left-color: var(--fb-line) !important; }
.fb-task-card:hover { transform: translateY(-3px) !important; box-shadow: 0 12px 28px rgba(0,0,0,.06) !important; border-color: var(--fb-line) !important; }
.fb-task-card.done { opacity: .60 !important }
.fb-task-card.done .fb-task-card-txt { text-decoration: line-through !important; color: var(--fb-ink-mute) !important }
.fb-task-card.removing { opacity: 0 !important; transform: translateX(12px) scale(.95) !important }

/* Checkbox */
.fb-task-chk2 {
  width: 20px !important;
  height: 20px !important;
  border-radius: 6px !important;
  flex-shrink: 0 !important;
  border: 2px solid var(--fb-line) !important;
  background: var(--fb-card) !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 12px !important;
  color: transparent !important;
  transition: all .25s cubic-bezier(.34,1.56,.64,1);
  box-sizing: border-box !important;
}
.fb-task-chk2:hover { border-color: var(--task-color, var(--fb-blue)) !important; background: var(--fb-line-soft) !important; transform: scale(1.15) !important; }
.fb-task-card.done .fb-task-chk2 {
  background: var(--task-color, var(--fb-blue)) !important;
  color: #fff !important;
  border-color: var(--task-color, var(--fb-blue)) !important;
}
.fb-task-card.done .fb-task-chk2 { animation: none }

.fb-task-card-body {
  flex: 1 !important;
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
}
.fb-task-card-txt {
  font-size: 13.5px !important;
  font-weight: 600 !important;
  color: var(--fb-ink) !important;
  line-height: 1.55 !important;
  word-break: break-word;
  transition: color .2s, text-decoration .2s;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
}
.fb-task-card-meta {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-top: 2px !important;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
}
.fb-task-pri-tag {
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: .6px !important;
  text-transform: uppercase !important;
  padding: 3px 8px 3px !important;
  border-radius: 8px !important;
  display: inline-block !important;
  box-sizing: border-box !important;
}
.fb-task-pri-tag.fb-pri-high {
  background: rgba(255, 107, 107, 0.1) !important;
  color: #FF5252 !important;
  border: 1px solid rgba(255, 107, 107, 0.2) !important;
}
.fb-task-pri-tag.fb-pri-med {
  background: rgba(253, 185, 19, 0.1) !important;
  color: #D4980A !important;
  border: 1px solid rgba(253, 185, 19, 0.2) !important;
}
.fb-task-pri-tag.fb-pri-low {
  background: rgba(64, 192, 87, 0.1) !important;
  color: #2F9E44 !important;
  border: 1px solid rgba(64, 192, 87, 0.2) !important;
}
.fb-task-time-tag {
  font-size: 10px !important;
  font-weight: 600 !important;
  color: var(--fb-ink-mute) !important;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
}
.fb-task-kpi-tag {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  background: var(--fb-line-soft) !important;
  padding: 3px 8px !important;
  border-radius: 8px !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  color: var(--fb-ink-mute) !important;
  letter-spacing: 0.5px !important;
  border: 1px solid var(--fb-line) !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}

.fb-task-del2 {
  flex-shrink: 0 !important;
  opacity: 0 !important;
  background: none !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  cursor: pointer !important;
  font-size: 14px !important;
  padding: 6px 8px !important;
  border-radius: 8px !important;
  transition: all .2s ease;
}
.fb-task-card:hover .fb-task-del2 { opacity: 1 !important }
.fb-task-del2:hover { color: #E88B7D !important; background: rgba(232,139,125,.1) !important; transform: scale(1.1) !important; }

/* All-done celebration banner */
.fb-task-celebrate {
  text-align: center !important;
  padding: 28px 20px 22px !important;
  border-radius: 16px !important;
  background: var(--fb-yellow-soft) !important;
  border: 1px solid var(--fb-yellow-dark) !important;
  animation: taskSlideIn .3s ease;
}
.fb-task-celebrate-ico  { font-size: 40px !important; display: block !important; margin-bottom: 10px !important }
.fb-task-celebrate-msg  { font-size: 14px !important; font-weight: 700 !important; color: var(--fb-yellow-dark) !important }
.fb-task-celebrate-sub  { font-size: 11.5px !important; color: var(--fb-ink-mute) !important; margin-top: 6px !important }

.fb-empty-ico { font-size: 38px !important; margin-bottom: 12px !important; opacity: .5 !important; display: block !important }
.fb-list { display: flex !important; flex-direction: column !important; gap: 8px !important }

@keyframes fb-in { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
.fb-task {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 13px 14px !important;
  border-radius: 12px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  animation: fb-in .2s ease;
  transition: all .25s cubic-bezier(.34,1.56,.64,1);
  box-shadow: 0 2px 6px rgba(0,0,0,.03) !important;
}
.fb-task:hover { transform: translateY(-1.5px) !important; box-shadow: 0 6px 12px rgba(0,0,0,.06) !important; border-color: var(--fb-line) !important }
.fb-task.done { opacity: .45 !important }
.fb-chk {
  width: 22px !important;
  height: 22px !important;
  border-radius: 6px !important;
  flex-shrink: 0 !important;
  border: 2px solid var(--fb-blue) !important;
  background: none !important;
  color: transparent !important;
  cursor: pointer !important;
  font-size: 11px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
}
.fb-chk:hover { transform: scale(1.1) !important; background: var(--fb-blue-soft) !important; }
.fb-task.done .fb-chk { background: var(--fb-blue) !important; color: #fff !important; border-color: var(--fb-blue) !important }
.fb-task-txt { flex: 1 !important; font-size: 13.5px !important; color: var(--fb-ink) !important; line-height: 1.35 !important }
.fb-task.done .fb-task-txt { text-decoration: line-through !important; color: var(--fb-ink-mute) !important }
.fb-del {
  opacity: 0 !important;
  flex-shrink: 0 !important;
  background: none !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  cursor: pointer !important;
  font-size: 13px !important;
  padding: 4px 6px !important;
  border-radius: 0 !important;
  transition: opacity .15s, color .15s, background .15s;
}
.fb-task:hover .fb-del { opacity: 1 !important }
.fb-del:hover { color: #E88B7D !important; background: rgba(232,139,125,.12) !important }

/* ── NOTES ── */
.fb-note-composer {
  position: relative !important;
  margin-bottom: 20px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  border-left: 4px solid var(--nc,var(--fb-line)) !important;
  border-radius: 14px !important;
  transition: border-color .25s, box-shadow .25s, border-left-color .25s;
  overflow: hidden !important;
  box-shadow: 0 2px 8px rgba(0,0,0,.04) !important;
}
.fb-note-composer:focus-within {
  border-color: var(--nc,var(--fb-blue)) !important;
  border-left-color: var(--nc,var(--fb-blue)) !important;
  background: var(--fb-card) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,.08) !important;
}
.fb-note-composer textarea {
  width: 100% !important;
  display: block !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: var(--fb-ink) !important;
  padding: 14px 16px 10px !important;
  resize: none;
  font-size: 13px !important;
  line-height: 1.6 !important;
  min-height: 80px !important;
  max-height: 180px !important;
  font-family: inherit !important;
}
.fb-note-composer textarea::placeholder { color: var(--fb-ink-mute) !important }
.fb-note-composer-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 8px 12px 10px !important;
  gap: 8px !important;
  flex-wrap: wrap !important;
  border-top: 1px solid var(--fb-line) !important;
}

/* Color swatches */
.fb-note-clr-picks { display: flex !important; gap: 6px !important; align-items: center !important }
.fb-clr-dot {
  width: 20px !important;
  height: 20px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  position: relative !important;
  border: 2px solid transparent !important;
  transition: all .15s ease-in-out;
  flex-shrink: 0 !important;
}
.fb-clr-dot::after {
  content: '' !important;
  position: absolute !important;
  inset: 0;
  border-radius: 4px !important;
  background: rgba(0,0,0,.1) !important;
  opacity: 0 !important;
  transition: opacity .15s;
}
.fb-clr-dot:hover { transform: scale(1.15) }
.fb-clr-dot.sel {
  border: 2px solid var(--fb-ink) !important;
  transform: scale(1.05) !important;
  box-shadow: none !important;
}
.fb-clr-dot.sel::before {
  content: '✓';
  position: absolute !important;
  inset: 0;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  color: #fff !important;
  text-shadow: 0 0 2px rgba(0,0,0,0.3);
  z-index: 1;
  line-height: 1 !important;
}

.fb-note-bar-r { display: flex !important; align-items: center !important; gap: 8px !important }
.fb-note-cc2 { font-size: 11.5px !important; color: var(--fb-ink-mute) !important }
.fb-note-save-btn {
  padding: 9px 20px !important;
  border-radius: 10px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  background: var(--nc,var(--fb-blue)) !important;
  color: #fff !important;
  border: none !important;
  cursor: pointer !important;
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
  letter-spacing: .2px !important;
  box-shadow: 0 2px 6px rgba(0,0,0,.1) !important;
}
.fb-note-save-btn:hover { transform: translateY(-1.5px) !important; box-shadow: 0 4px 12px rgba(0,0,0,.15) !important; filter: brightness(1.05) !important; }
.fb-note-save-btn:active { transform: scale(.96) }

.fb-note-search-wrap { position: relative !important; margin-bottom: 16px !important }
.fb-note-search-wrap input {
  width: 100% !important;
  display: block !important;
  padding: 10px 14px 10px 34px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  border-radius: 12px !important;
  color: var(--fb-ink) !important;
  font-size: 13px !important;
  outline: none !important;
  transition: border-color .2s;
  box-shadow: none !important;
}
.fb-note-search-wrap input:focus { border-color: var(--fb-blue) !important; background: var(--fb-card) !important }
.fb-note-search-ico {
  position: absolute !important;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px !important;
  pointer-events: none !important;
  opacity: .45 !important;
}

.fb-note-section-lbl {
  font-size: 9.5px !important;
  font-weight: 800 !important;
  letter-spacing: 1.2px !important;
  text-transform: uppercase !important;
  color: var(--fb-ink-mute) !important;
  margin: 20px 0 10px !important;
  padding: 0 4px !important;
}
.fb-note-section-lbl:first-child { margin-top: 4px !important; }

.fb-note-list-wrap { display: flex !important; flex-direction: column !important; gap: 16px !important; }
.fb-note {
  position: relative !important;
  padding: 18px 20px !important;
  background: var(--note-bg, var(--fb-card)) !important;
  border: 1px solid var(--note-border, var(--fb-line)) !important;
  border-radius: 14px !important;
  animation: fb-in .2s ease;
  transition: all .25s cubic-bezier(.34,1.56,.64,1);
  cursor: default !important;
  box-shadow: 0 2px 8px rgba(0,0,0,.03) !important;
}
.fb-note:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 20px rgba(0,0,0,.08) !important;
  border-color: var(--note-border-hover, var(--fb-line)) !important;
}
.fb-note.pinned {
  border-width: 1.5px !important;
}
.fb-note-top { display: flex !important; align-items: flex-start !important; gap: 6px !important; margin-bottom: 2px !important }
.fb-note-pin-ico { font-size: 10px !important; opacity: .6 !important; flex-shrink: 0 !important; margin-top: 1px !important }
.fb-note-txt {
  font-size: 13px !important;
  color: var(--fb-ink) !important;
  line-height: 1.55 !important;
  white-space: pre-wrap !important;
  word-break: break-word;
  flex: 1 !important;
}
.fb-note-txt.clamped { display: -webkit-box !important; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden !important }
.fb-note-expand {
  font-size: 10.5px !important;
  color: var(--fb-blue) !important;
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  padding: 0 !important;
  margin-top: 4px !important;
  display: block !important;
  transition: opacity .15s;
}
.fb-note-expand:hover { opacity: .75 !important }
.fb-note-meta { display: flex !important; align-items: center !important; justify-content: space-between !important; margin-top: 14px !important }
.fb-note-ts { font-size: 11px !important; color: var(--fb-ink-mute) !important }
.fb-note-actions { display: flex !important; gap: 4px !important; opacity: 0 !important; transition: opacity .15s }
.fb-note:hover .fb-note-actions { opacity: 1 !important }
.fb-note-act {
  padding: 3px 7px !important;
  border-radius: 4px !important;
  font-size: 11px !important;
  background: transparent !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  cursor: pointer !important;
  transition: background .15s, color .15s;
}
.fb-note-act:hover { background: var(--fb-line-soft) !important; color: var(--fb-ink) !important }
.fb-note-act.del:hover { background: rgba(232,139,125,.10) !important; color: #E88B7D !important }
.fb-note-act.edit:hover { background: rgba(253,185,19,.08) !important; color: #D4980A !important }
.fb-note-act.pin.active { color: #D4980A !important }

.fb-task-filters {
  display: flex !important;
  gap: 8px !important;
  margin-bottom: 20px !important;
  border-bottom: 1px solid var(--fb-line) !important;
  padding-bottom: 10px !important;
}
.fb-task-filter-btn {
  background: transparent !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  padding: 6px 12px !important;
  cursor: pointer !important;
  transition: all .2s ease !important;
  position: relative !important;
  border-radius: 8px !important;
}
.fb-task-filter-btn:hover {
  color: var(--fb-ink) !important;
}
.fb-task-filter-btn.act {
  color: var(--fb-blue) !important;
  font-weight: 700 !important;
}
.fb-task-filter-btn.act::after {
  content: '' !important;
  position: absolute !important;
  bottom: -9px !important;
  left: 0 !important;
  right: 0 !important;
  height: 2px !important;
  background: var(--fb-blue) !important;
}
.fb-task-count-badge {
  font-size: 10px !important;
  font-weight: 600 !important;
  background: var(--fb-line) !important;
  color: var(--fb-ink-mute) !important;
  padding: 1px 5px !important;
  margin-left: 4px !important;
  border-radius: 4px !important;
}
.fb-task-filter-btn.act .fb-task-count-badge {
  background: var(--fb-blue-soft) !important;
  color: var(--fb-blue) !important;
}

/* ── TIMER DRUM PICKER ── */
#fb-timer-set-view { padding-bottom:8px !important }
#fb-timer-run-view { text-align:center !important; padding:8px 0 !important }

/* Drum wrap */
.fb-drum-wrap {
  position:relative !important; display:flex !important; align-items:stretch !important;
  justify-content:center !important; gap:0 !important; height:160px !important;
  margin:0 0 24px !important; overflow:hidden !important; border-radius:16px !important;
  background:var(--fb-card) !important;
  border:1.5px solid var(--fb-line) !important;
  user-select:none; -webkit-user-select:none;
}

/* Top & bottom gradient fade */
.fb-drum-overlay {
  position:absolute !important; left:0; right:0; z-index:3; pointer-events:none !important;
  height:52px !important;
}
.fb-drum-overlay.top {
  top:0;
  background:linear-gradient(to bottom, var(--fb-card) 0%, var(--fb-card-fade) 100%) !important;
}
.fb-drum-overlay.bottom {
  bottom:0;
  background:linear-gradient(to top, var(--fb-card) 0%, var(--fb-card-fade) 100%) !important;
}

/* Center highlight bar */
.fb-drum-highlight {
  position:absolute !important; left:12px; right:12px; top:50%; z-index:2; pointer-events:none !important;
  height:36px !important; transform:translateY(-50%);
  background:var(--fb-blue-soft) !important; border-radius:8px !important;
  border-top:1px solid var(--fb-line) !important; border-bottom:1px solid var(--fb-line) !important;
}

/* Column */
.fb-drum-col {
  flex:1 !important; display:flex !important; flex-direction:column !important; align-items:center !important;
  position:relative !important; cursor:ns-resize !important;
}

.fb-drum-label {
  position:absolute !important; bottom:4px;
  font-size:9px !important; font-weight:700 !important;
  color:var(--fb-ink-mute) !important; letter-spacing:.8px !important; text-transform:uppercase !important;
  pointer-events:none !important; z-index:4; background:transparent !important;
}

/* Scroll track */
.fb-drum-scroll {
  width:100% !important; overflow-y:auto !important; overflow-x:hidden !important; height:152px !important;
  -webkit-overflow-scrolling:touch;
  scroll-snap-type:y mandatory;
  display:flex !important; flex-direction:column !important; align-items:center !important;
  scrollbar-width:none;
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box !important;
}
.fb-drum-scroll::-webkit-scrollbar { display:none !important }

/* Each drum item */
.fb-drum-item {
  flex-shrink:0 !important; height:36px !important; display:flex !important;
  align-items:center !important; justify-content:center !important;
  font-size:20px !important; font-weight:400 !important;
  color:var(--fb-ink-mute) !important;
  width:100% !important; scroll-snap-align:center;
  transition:color .18s, font-weight .18s, font-size .18s;
  text-align:center !important;
}
.fb-drum-item.selected {
  color:var(--fb-ink) !important; font-size:27px !important; font-weight:200 !important;
  text-shadow:none !important; opacity:1 !important;
}
.fb-drum-item.near {
  color:var(--fb-ink) !important; font-size:22px !important; opacity:0.5 !important;
}

/* Buttons row */
.fb-drum-btns {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  margin:18px 4px 14px !important;
}
.fb-drum-btn {
  width:62px !important; height:62px !important; border-radius:16px !important; border:none !important;
  font-size:14px !important; font-weight:600 !important; cursor:pointer !important;
  transition:transform .12s, opacity .15s;
  display:flex !important; align-items:center !important; justify-content:center !important;
}
.fb-drum-btn:active { transform:scale(.92) }
.fb-drum-btn.cancel {
  background:var(--fb-card) !important;
  color:var(--fb-ink) !important;
  border:1.5px solid var(--fb-line) !important;
}
.fb-drum-btn.cancel:hover { background:var(--fb-line) !important; }
.fb-drum-btn.start {
  background:var(--fb-blue) !important; color:#fff !important;
  width:90px !important; font-size:15px !important;
  box-shadow:0 6px 24px rgba(0,229,255,.2);
}
.fb-drum-btn.start:hover { opacity:.88 !important }
.fb-drum-btn.start.zero { opacity:.38 !important; pointer-events:none !important }

/* Meta row (Label) */
.fb-drum-meta {
  border-radius:14px !important; overflow:hidden !important;
  background:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  margin-bottom:20px !important;
}
.fb-drum-meta-row {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  padding:13px 18px !important; border-bottom:1px solid var(--fb-line) !important;
}
.fb-drum-meta-row:last-child { border-bottom:none !important }
.fb-drum-meta-lbl { font-size:13.5px !important; color:var(--fb-ink) !important; font-weight:500 !important }
.fb-drum-meta-val { font-size:13.5px !important; color:var(--fb-ink-mute) !important }

/* Recents */
.fb-drum-recents { margin-top:16px !important; padding-top:14px !important; border-top:1px solid var(--fb-line) !important; }
.fb-drum-recents-title {
  font-size:13px !important; font-weight:700 !important; color:var(--fb-ink-mute) !important;
  margin-bottom:6px !important; letter-spacing:.5px !important; text-transform:uppercase !important;
}
.fb-drum-recent-item {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  padding:12px 0 !important; border-bottom:1px solid var(--fb-line) !important;
  cursor:pointer !important;
}
.fb-drum-recent-item:last-child { border-bottom:none !important }
.fb-drum-recent-time { font-size:28px !important; font-weight:300 !important; color:var(--fb-ink) !important; letter-spacing:-1px !important }
.fb-drum-recent-sub { font-size:11px !important; color:var(--fb-ink-mute) !important; margin-top:2px !important }
.fb-drum-recent-play {
  width:38px !important; height:38px !important; border-radius:10px !important; border:none !important;
  background:var(--fb-blue) !important; color:#fff !important;
  font-size:14px !important; cursor:pointer !important; display:flex !important;
  align-items:center !important; justify-content:center !important;
  transition:opacity .15s;
}
.fb-drum-recent-play:hover { opacity:.82 !important }

/* Running ring view */
.fb-timer-ring {
  width:170px !important; height:170px !important; margin:14px auto 18px !important;
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
  font-size:34px !important; font-weight:300 !important; color:var(--fb-ink) !important;
  letter-spacing:-1px !important; font-variant-numeric:tabular-nums;
}
.fb-t-lbl {
  font-size:11px !important; font-weight:700 !important; letter-spacing:2px !important;
  text-transform:uppercase !important; margin-top:4px !important; transition:color .5s;
  color:var(--fb-ink-mute) !important;
}
.fb-timer-ring-bg {
  position:absolute !important; inset:-20px; border-radius:0 !important;
  background:radial-gradient(circle, var(--tc,#4A90E2) 0%, transparent 70%) !important;
  opacity:0 !important; transition:opacity .6s ease; pointer-events:none !important; filter:blur(20px); z-index:0;
}
.fb-timer-ring.running .fb-timer-ring-bg { opacity:0.08 !important }

/* Running view buttons */
.fb-timer-run-btns {
  display:flex !important; gap:18px !important; justify-content:center !important; margin-bottom:22px !important;
}
.fb-run-btn {
  height:52px !important; min-width:52px !important; padding:0 20px !important; border-radius:14px !important; border:none !important;
  font-size:15px !important; cursor:pointer !important; transition:transform .12s, background .15s;
  display:flex !important; align-items:center !important; justify-content:center !important; font-weight:700 !important;
}
.fb-run-btn:active { transform:scale(.92) }
.fb-run-btn.pause {
  background:var(--fb-line) !important; color:var(--fb-ink) !important;
}
.fb-run-btn.stop {
  background:rgba(232,139,125,.12) !important; color:#E88B7D !important;
}
.fb-run-btn.pause.running { background:var(--fb-blue) !important; color:#fff !important }

/* Stats bar */
.fb-timer-stats {
  display:flex !important; justify-content:space-between !important; align-items:center !important;
  padding:16px 20px !important; border-radius:14px !important;
  background:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  margin-top:8px !important;
}
.fb-tstat { text-align:center !important; flex:1 !important }
.fb-tstat-val { font-size:19px !important; font-weight:700 !important; color:var(--fb-ink) !important }
.fb-tstat-lbl { font-size:11px !important; color:var(--fb-ink-mute) !important; margin-top:3px !important; letter-spacing:.5px !important; text-transform:uppercase !important }
.fb-tstat-div { width:1px !important; height:34px !important; background:var(--fb-line) !important; flex-shrink:0 !important }

@keyframes timerComplete {
  0%{transform:scale(1)} 18%{transform:scale(1.09)} 36%{transform:scale(.97)} 54%{transform:scale(1.04)} 100%{transform:scale(1)}
}
.fb-timer-ring.complete { animation:timerComplete .65s ease-out }


/* ── ALARM — clean redesign ── */

/* Creator */
.fb-alarm-creator {
  margin-bottom:20px !important;
}
.fb-alarm-input-wrap {
  position:relative !important; margin-bottom:10px !important;
}
.fb-alarm-lbl-in {
  width:100% !important; background:var(--fb-card) !important;
  border:1.5px solid var(--fb-line) !important;
  border-radius:12px !important; color:var(--fb-ink) !important;
  font-size:14px !important; font-weight:400 !important;
  padding:13px 16px !important; outline:none !important;
  transition:border-color .2s, box-shadow .2s;
}
.fb-alarm-lbl-in:focus {
  border-color:var(--fb-blue) !important;
  box-shadow:0 0 0 3px var(--fb-blue-soft) !important;
}
.fb-alarm-lbl-in::placeholder { color: var(--fb-ink-mute) !important }

/* Quick time chips */
.fb-al-quick-row {
  display:flex !important; gap:8px !important; margin-bottom:14px !important; flex-wrap:nowrap !important;
  overflow-x:auto !important; scrollbar-width:none !important;
}
.fb-al-quickbtn {
  padding:7px 13px !important; border-radius:8px !important;
  font-size:11.5px !important; font-weight:600 !important; letter-spacing:.1px !important;
  border:1.5px solid var(--fb-line) !important;
  background:var(--fb-card) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; transition:all .18s; white-space:nowrap !important;
}
.fb-al-quickbtn:hover { background:var(--fb-line-soft) !important; color:var(--fb-ink) !important; border-color:var(--fb-line) !important }
.fb-al-quickbtn.active {
  background:var(--fb-blue-soft) !important;
  border-color:var(--fb-blue) !important; color:var(--fb-blue) !important;
  box-shadow:none !important;
}

/* Date+time row */
.fb-alarm-timepick {
  display:grid !important; grid-template-columns:1fr 1fr; gap:12px !important; margin-bottom:14px !important;
}

/* Set button */
.fb-al-set-btn {
  width:100% !important; padding:14px !important; border-radius:12px !important;
  font-size:14.5px !important; font-weight:700 !important; letter-spacing:.3px !important;
  background:var(--fb-blue) !important; color:#fff !important;
  border:none !important; cursor:pointer !important;
  transition:opacity .15s, transform .1s, box-shadow .25s;
  box-shadow:0 6px 22px rgba(0,229,255,.2);
}
.fb-al-set-btn:hover { opacity:.88 !important; box-shadow:0 8px 28px rgba(0,229,255,.3) }
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
  text-transform:uppercase !important; color:var(--fb-ink-mute) !important;
}
.fb-al-section-count {
  font-size:11px !important; font-weight:600 !important;
  color:var(--fb-ink-mute) !important;
}

/* Alarm cards */
.fb-alarm-card {
  display:flex !important; align-items:center !important; gap:10px !important;
  padding:12px 14px !important; border-radius:12px !important;
  background:var(--fb-card) !important;
  border:1.5px solid var(--fb-line) !important;
  box-shadow:0 2px 8px rgba(0,0,0,.04) !important;
  animation:fb-in .22s ease;
  transition:all .2s;
  margin-bottom:6px !important;
}
.fb-alarm-card:last-child { margin-bottom:0 !important }
.fb-alarm-card:hover { 
  background:var(--fb-line-soft) !important;
  transform:translateY(-1px) !important;
  box-shadow:0 4px 16px rgba(0,0,0,.07) !important;
}
.fb-alarm-card.urgent .fb-alcard-time-big { color:#E88B7D !important }

/* Left: big time + label */
.fb-alcard-left { flex:1 !important; min-width:0 !important }
.fb-alcard-time-big {
  font-size:18px !important; font-weight:600 !important; letter-spacing:-.3px !important;
  color:var(--fb-ink) !important; font-variant-numeric:tabular-nums; line-height:1 !important;
}
.fb-alarm-card.urgent .fb-alcard-time-big { color:#E88B7D !important }
.fb-alcard-label {
  font-size:11px !important; font-weight:500 !important;
  color:var(--fb-ink-mute) !important; margin-top:3px !important;
  white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis;
  max-width:180px !important;
}

/* Right: countdown + delete */
.fb-alcard-right {
  display:flex !important; align-items:center !important; gap:8px !important; flex-shrink:0 !important;
}
.fb-alcard-cd {
  font-size:11px !important; font-weight:600 !important;
  color:var(--fb-blue) !important; font-variant-numeric:tabular-nums;
  text-align:right !important; white-space:nowrap !important;
}
.fb-alarm-card.urgent .fb-alcard-cd { color:#E88B7D !important }
.fb-alcard-del {
  width:24px !important; height:24px !important; border-radius:6px !important; flex-shrink:0 !important;
  background:none !important; border:none !important;
  color:var(--fb-ink-mute) !important; font-size:11px !important;
  cursor:pointer !important; display:flex !important; align-items:center !important; justify-content:center !important;
  transition:all .15s;
}
.fb-alcard-del:hover { background:rgba(232,139,125,.12) !important; color:#E88B7D !important }

/* Empty state */
.fb-al-empty {
  text-align:center !important; padding:36px 16px 12px !important;
  font-size:12.5px !important; color:var(--fb-ink-mute) !important; line-height:1.7 !important;
}
.fb-al-empty-ico { font-size:32px !important; display:block !important; margin-bottom:10px !important; opacity:.45 !important }

.fb-alarm-fields { display:flex !important; flex-direction:column !important; gap:10px !important; margin-bottom:10px !important }
.fb-fb { font-size:12.5px !important; min-height:20px !important; margin:2px 0 12px !important; padding:0 2px !important }

#fb-toast {
  position:absolute !important; bottom:112px; right:0; width:320px !important;
  background:var(--fb-paper) !important; border:1.5px solid var(--fb-yellow-dark) !important;
  border-radius:12px !important; padding:16px 48px 16px 18px !important; box-shadow:0 12px 40px rgba(0,0,0,.12);
  transform:translateY(12px) scale(.94); opacity:0 !important; pointer-events:none !important;
  transition:all .3s cubic-bezier(.34,1.56,.64,1);
}
#fb-toast.show { transform:translateY(0) scale(1); opacity:1 !important; pointer-events:all !important }
#fb-toast-ttl { font-size:13.5px !important; font-weight:700 !important; color:var(--fb-yellow-dark) !important; margin-bottom:5px !important }
#fb-toast-msg { font-size:13px !important; color:var(--fb-ink) !important; line-height:1.45 !important }
#fb-toast-action {
  margin-top:10px !important; padding:7px 18px !important; border-radius:8px !important;
  background:#E88B7D !important; color:#fff !important; font-size:12px !important; font-weight:700 !important;
  border:none !important; cursor:pointer !important; display:none !important; transition:opacity .15s;
}
#fb-toast-action:hover { opacity:.85 !important }
#fb-toast-x { position:absolute !important; top:13px; right:15px; background:none !important; border:none !important; color:var(--fb-ink-mute) !important; cursor:pointer !important; font-size:15px !important; transition:color .15s }
#fb-toast-x:hover { color:var(--fb-ink) !important }

.fb-pt { position:absolute !important; border-radius:0 !important; pointer-events:none !important; animation:fb-burst .7s ease-out forwards }
@keyframes fb-burst { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(.1)} }

/* fb-task-pri-lbl2 removed — replaced by fb-pri-dd dropdown */

/* ── Note title input ── */
.fb-note-title-in {
  width:100% !important; background:transparent !important;
  color:var(--fb-ink) !important; font-size:13px !important; font-weight:600 !important;
  border:none !important; border-bottom:1px solid var(--fb-line) !important;
  padding:6px 2px !important; margin-bottom:6px !important;
}
.fb-note-title-in::placeholder { color:var(--fb-ink-mute) !important; font-weight:400 !important }
.fb-note-title-lbl {
  font-size:13px !important; font-weight:700 !important; color:var(--fb-ink) !important;
  margin-bottom:4px !important;
}

/* Timer label inline input */
.fb-drum-label-input {
  background:transparent !important; color:var(--fb-ink-mute) !important;
  font-size:13px !important; font-weight:500 !important;
  border:none !important; border-bottom:1px solid var(--fb-line) !important;
  text-align:right !important; width:120px !important; padding:2px 4px !important;
}
.fb-drum-label-input:focus { border-bottom-color:var(--fb-blue) !important; color:var(--fb-ink) !important }

/* ── Alarm & Timer history items ── */
.fb-alarm-history-item {
  display:flex !important; align-items:center !important; gap:10px !important;
  padding:8px 0 !important; border-bottom:1px solid rgba(31,29,27,.05) !important;
}
.fb-alarm-history-item:last-child { border-bottom:none !important }
.fb-al-history { margin-top:12px !important; padding-top:10px !important; border-top:1px solid rgba(31,29,27,.08) !important }
/* timer history removed */

/* ── Alarm ringing banner ── */
.fb-al-ringing {
  align-items:center !important; gap:12px !important;
  background:rgba(255,60,60,.18) !important; border:1.5px solid rgba(255,80,80,.40) !important;
  border-radius:0 !important; padding:14px 16px !important; margin-bottom:14px !important;
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
  padding:8px 18px !important; border-radius:0 !important;
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
  background:var(--fb-card) !important; color:var(--fb-ink) !important;
  border:1.5px solid var(--fb-line) !important; border-radius:10px !important;
  padding:10px 12px !important; font-size:17px !important; font-weight:600 !important;
  width:110px !important; flex-shrink:0 !important; cursor:pointer !important;
  letter-spacing:.5px !important; text-align:center !important;
}
.fb-al-date-in {
  width:100% !important; background:var(--fb-card) !important; color:var(--fb-ink) !important;
  border:1.5px solid var(--fb-line) !important; border-radius:10px !important;
  padding:8px 12px !important; font-size:12.5px !important; margin-bottom:10px !important;
  cursor:pointer !important;
}
.fb-alarm-lbl-in { flex:1 !important }

/* ── Repeat days row ── */
.fb-al-repeat-row {
  display:none !important;
}
.fb-al-repeat-lbl { font-size:11px !important; color:#8A837C !important; white-space:nowrap !important; font-weight:600 !important }
.fb-al-repeat-btns { display:flex !important; gap:4px !important; flex-wrap:wrap !important }
.fb-al-day {
  width:32px !important; height:28px !important; border-radius:0 !important;
  background:rgba(31,29,27,.04) !important; color:#8A837C !important;
  border:1.5px solid rgba(31,29,27,.08) !important; font-size:10px !important; font-weight:600 !important;
  cursor:pointer !important; transition:all .15s;
}
.fb-al-day.active { background:#4A90E2 !important; color:#fff !important; border-color:transparent !important }
.fb-al-repeat-presets { display:none !important }
.fb-al-preset {
  padding:4px 10px !important; border-radius:8px !important; font-size:11px !important; font-weight:600 !important;
  background:var(--fb-line-soft) !important; color:var(--fb-ink-mute) !important;
  border:1.5px solid var(--fb-line) !important; cursor:pointer !important; transition:all .15s;
}
.fb-al-preset.active { background:var(--fb-blue) !important; color:#fff !important; border-color:transparent !important }
.fb-al-chip {
  padding:6px 12px !important; border-radius:8px !important;
  font-size:11.5px !important; font-weight:600 !important;
  background:var(--fb-card) !important; color:var(--fb-ink-mute) !important;
  border:1.5px solid var(--fb-line) !important; cursor:pointer !important;
  transition:all .18s; white-space:nowrap !important; flex-shrink:0 !important;
}
.fb-al-chip:hover { color:var(--fb-ink) !important; border-color:var(--fb-line) !important }
.fb-al-chip.act {
  background:var(--fb-blue-soft) !important;
  border-color:var(--fb-blue) !important; color:var(--fb-blue) !important;
}

/* ─────────────────────────────────────────────
   MINI CALENDAR WIDGET
   ───────────────────────────────────────────── */
.fb-mini-cal {
  background:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  border-radius:16px !important; padding:16px 18px 18px !important;
  margin-bottom:18px !important; box-shadow:0 4px 20px rgba(0,0,0,.06) !important;
}
.fb-cal-nav-hdr {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  margin-bottom:12px !important;
}
.fb-cal-nav-btn2 {
  width:30px !important; height:30px !important; border-radius:8px !important; border:none !important;
  background:var(--fb-line-soft) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:17px !important; font-weight:300 !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:background .15s, transform .1s; line-height:1 !important;
}
.fb-cal-nav-btn2:hover { background:var(--fb-blue-soft) !important; color:var(--fb-blue) !important; transform:scale(1.05) }
.fb-cal-nav-btn2:active { transform:scale(.92) }
.fb-cal-m-label {
  font-size:14px !important; font-weight:800 !important; color:var(--fb-ink) !important; letter-spacing:-.3px !important;
}
.fb-cal-dow-row2 {
  display:grid !important; grid-template-columns:repeat(7,1fr) !important; margin-bottom:4px !important;
}
.fb-cal-dow2 {
  text-align:center !important; font-size:9px !important; font-weight:700 !important;
  color:var(--fb-ink-mute) !important; letter-spacing:.3px !important; text-transform:uppercase !important;
  padding:3px 0 !important;
}
.fb-cal-grid2 {
  display:grid !important; grid-template-columns:repeat(7,1fr) !important; gap:2px !important;
}
.fb-cal-day2 {
  aspect-ratio:1 !important; display:flex !important; flex-direction:column !important;
  align-items:center !important; justify-content:center !important;
  font-size:11.5px !important; font-weight:500 !important; color:var(--fb-ink) !important;
  border-radius:8px !important; cursor:pointer !important;
  transition:background .12s, color .12s; position:relative !important;
  gap:2px !important; -webkit-user-select:none; user-select:none;
}
.fb-cal-day2:hover:not(.fb-cd-sel) { background:var(--fb-line-soft) !important; }
.fb-cal-day2.fb-cd-other { color:var(--fb-ink-mute) !important; opacity:0.4 !important; }
.fb-cal-day2.fb-cd-today:not(.fb-cd-sel) {
  background:var(--fb-blue-soft) !important; color:var(--fb-blue) !important; font-weight:800 !important;
}
.fb-cal-day2.fb-cd-today:not(.fb-cd-sel)::after {
  content:''; position:absolute !important; inset:0; border-radius:8px !important;
  border:1.5px solid var(--fb-blue) !important; opacity:0.3 !important;
}
.fb-cal-day2.fb-cd-sel {
  background:linear-gradient(135deg,var(--fb-blue),var(--fb-gold)) !important;
  color:#fff !important; font-weight:700 !important;
  box-shadow:0 3px 12px var(--fb-blue-soft) !important;
}
.fb-cd-dots { height:5px !important; display:flex !important; align-items:center !important; justify-content:center !important; gap:2px !important; min-height:5px !important; }
.fb-cd-dot { width:4px !important; height:4px !important; border-radius:50% !important; flex-shrink:0 !important; background:#86C0A9 !important; }
.fb-cd-dot.urg { background:#E88B7D !important; }
.fb-cal-day2.fb-cd-sel .fb-cd-dot, .fb-cal-day2.fb-cd-sel .fb-cd-dot.urg { background:rgba(255,255,255,.65) !important; }
.fb-cal-filter-bar {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  margin-bottom:12px !important; padding:8px 12px !important;
  background:var(--fb-blue-soft) !important; border-radius:8px !important;
  border:1px solid var(--fb-line) !important; animation:taskSlideIn .2s ease;
}
.fb-cal-filter-lbl { font-size:12px !important; font-weight:600 !important; color:var(--fb-blue) !important; }
.fb-cal-filter-clr {
  font-size:11px !important; color:var(--fb-ink-mute) !important; background:none !important;
  border:none !important; cursor:pointer !important; padding:2px 7px !important;
  border-radius:4px !important; transition:background .15s, color .15s;
}
.fb-cal-filter-clr:hover { background:var(--fb-line-soft) !important; color:var(--fb-ink) !important; }

/* Improved alarm cards */
.fb-alarm-card {
  display:flex !important; align-items:center !important; gap:12px !important;
  padding:13px 14px !important; border-radius:12px !important;
  background:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  border-left:4.5px solid #86C0A9 !important;
  margin-bottom:8px !important; transition:all .2s;
  box-shadow:0 1px 4px rgba(0,0,0,.03) !important;
}
.fb-alarm-card.urgent { border-left-color:#E88B7D !important; }

/* ── Overrides for inline/legacy hardcoded colors in HTML ── */
#fb-task-in {
  color: var(--fb-ink) !important;
}
#fb-task-desc {
  color: var(--fb-ink) !important;
  background: var(--fb-line-soft) !important;
  border-top: 1px solid var(--fb-line) !important;
  border-radius: 0 0 12px 12px !important;
}
#fb-task-desc:focus {
  background: var(--fb-card) !important;
}
#fb-task-date, #fb-task-kpi {
  color: var(--fb-ink) !important;
  background-color: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 10px !important;
}
#fb-task-date:focus, #fb-task-kpi:focus {
  border-color: var(--fb-blue) !important;
  box-shadow: 0 0 0 3px var(--fb-blue-soft) !important;
}
.fb-note-composer {
  border-radius: 12px !important;
  border: 1.5px solid var(--fb-line) !important;
  background: var(--fb-card) !important;
}
#fb-note-vis, #fb-note-title, #fb-note-in {
  color: var(--fb-ink) !important;
  background-color: var(--fb-line-soft) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 8px !important;
}
#fb-note-vis:focus, #fb-note-title:focus, #fb-note-in:focus {
  border-color: var(--fb-blue) !important;
  background-color: var(--fb-card) !important;
}
#fb-chat-active-name {
  color: var(--fb-ink) !important;
}
#fb-chat-input {
  color: var(--fb-ink) !important;
  background: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 12px !important;
}
#fb-chat-input:focus {
  border-color: var(--fb-blue) !important;
}
#fb-chat-send-btn {
  border-radius: 12px !important;
  background: var(--fb-blue) !important;
}
#fb-chat-back-btn {
  color: var(--fb-ink) !important;
  border-radius: 6px !important;
}
.fb-settings-user-name {
  color: var(--fb-ink) !important;
}
.fb-settings-user-meta {
  color: var(--fb-ink-mute) !important;
}
#fb-x:hover {
  background: var(--fb-line-soft) !important;
  color: var(--fb-ink) !important;
}

/* Quiet Mode — Stops all mascot animations and hides the big character */
#fb-root.quiet-mode #fb-svg-wrap,
#fb-root.quiet-mode #fb-bayangan {
  display: none !important;
}
#fb-root.quiet-mode #fb-badge,
#fb-root.quiet-mode #fb-drag-dot,
#fb-root.quiet-mode #fb-snap-ring {
  display: none !important;
}
#fb-root.quiet-mode .mata-bisa-kedip,
#fb-root.quiet-mode .gelembung-zzz,
#fb-root.quiet-mode .gelembung-ingus,
#fb-root.quiet-mode .tetesan-mata,
#fb-root.quiet-mode .tetes-hujan,
#fb-root.quiet-mode .balon-tiup,
#fb-root.quiet-mode .ledakan-permen,
#fb-root.quiet-mode .jarum-jam,
#fb-root.quiet-mode .pupil-mata,
#fb-root.quiet-mode .barbel,
#fb-root.quiet-mode .keringat,
#fb-root.quiet-mode .aura-api,
#fb-root.quiet-mode .bohlam,
#fb-root.quiet-mode .rumus,
#fb-root.quiet-mode .garis-laser,
#fb-root.quiet-mode .ring-1,
#fb-root.quiet-mode .ring-2,
#fb-root.quiet-mode .mata-laser,
#fb-root.quiet-mode .hati-banyak,
#fb-root.quiet-mode .sparkles-senang,
#fb-root.quiet-mode .kembang-api,
#fb-root.quiet-mode .api-roket,
#fb-root.quiet-mode .biskuit-utuh,
#fb-root.quiet-mode .biskuit-digigit,
#fb-root.quiet-mode .remah-mulut,
#fb-root.quiet-mode .remah-terbang,
#fb-root.quiet-mode .urat-marah,
#fb-root.quiet-mode .asap-kepala {
  animation: none !important;
  transform: none !important;
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
  <div id="fb-resize-handle"></div>
  <div id="fb-hdr">
    <div id="fb-hdr-accent"></div>
    <div id="fb-hdr-top">
      <div id="fb-hdr-l">
        <span class="fb-logo">FocusBuddy</span>
        <span class="fb-date-s" id="fb-date"></span>
        <span class="fb-pill" id="fb-spill">IDLE</span>
      </div>
      <div id="fb-hdr-r">
        <button id="fb-theme-toggle" title="Ubah Tema"></button>
        <button id="fb-settings-btn" title="Pengaturan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
        <button id="fb-x"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>
    <div id="fb-identity-row" style="display:none !important;">
      <div style="width:32px !important; height:32px !important; border-radius:8px !important; background:linear-gradient(135deg,#4A90E2,#86C0A9) !important; color:white !important; display:flex !important; align-items:center !important; justify-content:center !important; font-weight:800 !important; font-size:14px !important; flex-shrink:0 !important;">:)</div>
      <div style="display:flex !important; flex-direction:column !important; flex:1 !important; min-width:0 !important; gap:2px !important;">
        <span id="fb-user-name"></span>
        <span id="fb-user-role"></span>
      </div>
      <span id="fb-user-level"></span>
    </div>
    <div id="fb-login-msg">Login di website untuk sinkronisasi data</div>
  </div>
  <div id="fb-tabs">
    <button class="fb-tab act" data-tab="tasks"><span class="ti">✅</span>Tugas</button>
    <button class="fb-tab"     data-tab="notes"><span class="ti">📝</span>Catatan</button>
    <button class="fb-tab"     data-tab="timer"><span class="ti">⏱</span>Timer</button>
    <button class="fb-tab"     data-tab="alarm"><span class="ti">🗓️</span>Kalender</button>
    <button class="fb-tab"     data-tab="chat"><span class="ti">💬</span>Chat</button>
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

      <!-- Task Add Form — premium unified layout -->
      <div class="fb-task-composer">
        <!-- Main row -->
        <div class="fb-task-main-row">
          <!-- Priority Selector -->
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
          
          <!-- Text Input -->
          <input class="fb-task-in-field" id="fb-task-in" placeholder="Apa fokus utamamu hari ini?" />
          
          <!-- Character Count -->
          <span id="fb-task-char-count" style="font-size:10.5px; color:var(--fb-ink-mute); font-weight:700; padding:0 8px; font-variant-numeric:tabular-nums;">0</span>

          <!-- Options Drawer Toggle -->
          <button class="fb-task-opt-toggle" id="fb-task-opt-toggle" title="Opsi lanjutan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>

        <!-- Options Drawer -->
        <div class="fb-task-drawer" id="fb-task-form-drawer">
          <!-- Textarea context/description -->
          <textarea class="fb-task-desc-area" id="fb-task-desc" placeholder="Tambahkan deskripsi atau konteks (opsional)…"></textarea>

          <!-- Extra Fields Row (Date + KPI) -->
          <div class="fb-task-drawer-row">
            <div class="fb-task-drawer-col">
              <div class="fb-task-field-label">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Tanggal
              </div>
              <input type="date" id="fb-task-date" class="fb-in" style="width:100% !important; box-sizing:border-box !important; padding:8px 10px !important; font-size:12px !important; display:block !important;" />
            </div>
            <div class="fb-task-drawer-col">
              <div class="fb-task-field-label">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> KPI Terkait
              </div>
              <select id="fb-task-kpi" class="fb-select" style="width:100% !important; box-sizing:border-box !important; padding:8px 24px 8px 10px !important; font-size:12px !important; display:block !important;">
                <option value="">Umum (Tidak ada KPI)</option>
              </select>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="fb-task-actions-row">
            <button id="fb-task-cancel-btn" class="fb-task-btn cancel" type="button">Batal</button>
            <button id="fb-task-add-btn" class="fb-task-btn submit" type="button" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Tambah Tugas</span>
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

    <!-- TIMER -->
    <div class="fb-pane" id="pane-timer">

      <!-- SET VIEW: Drum Picker -->
      <div id="fb-timer-set-view">

        <!-- Drum columns -->
        <div class="fb-drum-wrap">
          <div class="fb-drum-highlight"></div>

          <!-- Hours -->
          <div class="fb-drum-col">
            <div class="fb-drum-scroll" id="fb-drum-h-scroll"></div>
            <div class="fb-drum-label">JAM</div>
          </div>

          <!-- separator -->
          <div style="display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:200;color:var(--fb-ink-mute);padding:0 2px;z-index:5;margin-bottom:12px !important;">:</div>

          <!-- Minutes -->
          <div class="fb-drum-col">
            <div class="fb-drum-scroll" id="fb-drum-m-scroll"></div>
            <div class="fb-drum-label">MNT</div>
          </div>

          <!-- separator -->
          <div style="display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:200;color:var(--fb-ink-mute);padding:0 2px;z-index:5;margin-bottom:12px !important;">:</div>

          <!-- Seconds -->
          <div class="fb-drum-col">
            <div class="fb-drum-scroll" id="fb-drum-s-scroll"></div>
            <div class="fb-drum-label">DTK</div>
          </div>

          <div class="fb-drum-overlay top"></div>
          <div class="fb-drum-overlay bottom"></div>
        </div>

        <!-- Label input -->
        <div class="fb-drum-meta">
          <div class="fb-drum-meta-row">
            <span class="fb-drum-meta-lbl">Label</span>
            <input class="fb-drum-label-input" id="fb-t-label-val" value="Timer" maxlength="30" placeholder="Timer" />
          </div>
        </div>

        <!-- Buttons row -->
        <div class="fb-drum-btns">
          <button class="fb-drum-btn cancel" id="fb-t-cancel">Batal</button>
          <button class="fb-drum-btn start zero" id="fb-t-start-drum">▶ Mulai</button>
        </div>

        <!-- Recent timers -->
        <div class="fb-drum-recents" id="fb-drum-recents" style="display:none">
          <div class="fb-drum-recents-title">Terakhir Dipakai</div>
          <div id="fb-drum-recents-list"></div>
        </div>

      </div><!-- /#fb-timer-set-view -->

      <!-- RUN VIEW: countdown ring (hidden initially) -->
      <div id="fb-timer-run-view" style="display:none">

        <!-- Ring -->
        <div class="fb-timer-ring" id="fb-timer-ring-wrap">
          <div class="fb-timer-ring-bg"></div>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="74" fill="none" stroke="rgba(31,29,27,.07)" stroke-width="7"/>
            <circle id="fb-tring" cx="80" cy="80" r="74" fill="none"
              stroke="#4A90E2" stroke-width="7"
              stroke-dasharray="465" stroke-dashoffset="0"
              stroke-linecap="round"/>
          </svg>
          <div class="fb-tc">
            <div class="fb-t-digits" id="fb-tdisp">00:00</div>
            <div class="fb-t-lbl" id="fb-tlbl">TIMER</div>
          </div>
        </div>

        <!-- Pause / Stop buttons -->
        <div class="fb-timer-run-btns">
          <button class="fb-run-btn pause" id="fb-t-pause">▶</button>
          <button class="fb-run-btn stop"  id="fb-t-stop">■ Stop</button>
        </div>

        <!-- Stats -->
        <div class="fb-timer-stats">
          <div class="fb-tstat">
            <div class="fb-tstat-val" id="fb-tstat-sess">0</div>
            <div class="fb-tstat-lbl">Sesi Fokus</div>
          </div>
          <div class="fb-tstat-div"></div>
          <div class="fb-tstat">
            <div class="fb-tstat-val" id="fb-tstat-min">0m</div>
            <div class="fb-tstat-lbl">Total Menit</div>
          </div>
        </div>

      </div><!-- /#fb-timer-run-view -->

    </div><!-- /#pane-timer -->

    <!-- NOTES -->
    <div class="fb-pane" id="pane-notes">
      <!-- Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <div style="font-size:15px; font-weight:800; color:var(--fb-ink); letter-spacing:-.3px;">Catatan</div>
          <div style="font-size:11px; color:var(--fb-ink-mute); margin-top:1px;">Meeting, ide, dan informasi.</div>
        </div>
        <button id="fb-note-add-toggle" style="display:flex; align-items:center; gap:5px; padding:7px 13px; background:var(--fb-blue); color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; box-shadow:none; transition:all .2s; white-space:nowrap;" onmouseover="this.style.filter='brightness(1.05)'" onmouseout="this.style.filter='none'">
          <span style="font-size:14px; line-height:1;">+</span> Tambah
        </button>
      </div>

      <!-- Search bar -->
      <div class="fb-note-search-wrap" id="fb-note-search-wrap" style="display:none; margin-bottom:12px;">
        <span class="fb-note-search-ico">🔍</span>
        <input type="text" id="fb-note-search" placeholder="Cari judul atau isi catatan…" maxlength="80"/>
      </div>

      <!-- Composer (collapsible) -->
      <div id="fb-note-composer-wrap" style="display:none; margin-bottom:22px;">
        <div class="fb-note-composer" style="border-radius:12px; background:var(--fb-card); border:1px solid var(--fb-line); overflow:hidden;">
          <!-- Side-by-side row: Access & Title -->
          <div style="display:flex; gap:12px; padding:14px 16px; border-bottom:1px solid var(--fb-line); background:var(--fb-card);">
            <div style="flex:1; min-width:0;">
              <div style="font-size:9.5px; font-weight:800; color:var(--fb-ink-mute); letter-spacing:.8px; text-transform:uppercase; margin-bottom:6px;">Akses</div>
              <select id="fb-note-vis" class="fb-select"
                style="width:100% !important; box-sizing:border-box !important; padding:9px 10px !important; display:block !important;">
                <option value="private">🔒 Pribadi</option>
                <option value="division">👥 Divisi</option>
                <option value="company">🏢 Semua</option>
              </select>
            </div>
            <div style="flex:1.8; min-width:0;">
              <div style="font-size:9.5px; font-weight:800; color:var(--fb-ink-mute); letter-spacing:.8px; text-transform:uppercase; margin-bottom:6px;">Judul Catatan</div>
              <input class="fb-note-title-in fb-in" id="fb-note-title" placeholder="Rapat Mingguan, Ide Kreatif, dll." maxlength="80" style="width:100% !important; box-sizing:border-box !important; padding:9px 12px !important; display:block !important;" />
            </div>
          </div>
          <!-- Content field -->
          <div style="padding:12px 16px 0;">
            <div style="font-size:9.5px; font-weight:800; color:var(--fb-ink-mute); letter-spacing:.8px; text-transform:uppercase; margin-bottom:5px;">Isi Catatan</div>
            <textarea id="fb-note-in" class="fb-in" placeholder="Tuliskan semua idemu di sini…" maxlength="800" style="width:100% !important; min-height:90px !important; padding:12px !important; line-height:1.6 !important; resize:none !important; box-sizing:border-box !important;"></textarea>
          </div>
          <!-- Footer bar -->
          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px 14px; border-top:1px solid var(--fb-line); background:var(--fb-card);">
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="fb-note-cc2" id="fb-note-cc" style="color:var(--fb-ink-mute); font-size:10.5px; font-weight:600; min-width:42px;">0/800</span>
              <div class="fb-note-clr-picks" id="fb-note-clrs" style="display:flex; gap:6px;"></div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <button id="fb-note-cancel" style="padding:8px 14px !important; border-radius:8px !important; border:1px solid var(--fb-line) !important; background:transparent !important; color:var(--fb-ink-mute) !important; font-size:12px !important; font-weight:700 !important; cursor:pointer !important; font-family:inherit !important; transition:all .2s !important;">Batal</button>
              <button id="fb-note-save" style="padding:8px 16px !important; border-radius:8px !important; border:none !important; background:var(--fb-blue) !important; color:#fff !important; font-size:12px !important; font-weight:800 !important; cursor:pointer !important; font-family:inherit !important; transition:all .2s !important; box-shadow:none !important;">Simpan Catatan</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lists -->
      <div id="fb-note-list"></div>
    </div>

    <!-- CHAT -->
    <div class="fb-pane" id="pane-chat">
      <!-- Channel List View -->
      <div id="fb-chat-channels-view">
        <div class="fb-note-section-lbl" style="margin-top:0">Pesan Masuk</div>
        <div id="fb-chat-channel-list"></div>
      </div>

      <!-- Messages View (Hidden initially) -->
      <div id="fb-chat-messages-view" style="display:none; flex-direction:column; height:370px; padding:0 4px;">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1.5px solid var(--fb-line);margin-bottom:14px;">
          <button id="fb-chat-back-btn" style="background:none;border:none;color:var(--fb-ink);cursor:pointer;font-size:18px;padding:4px;border-radius:8px;transition:background 0.2s;">←</button>
          <div style="flex:1;">
            <div id="fb-chat-active-name" style="color:var(--fb-ink);font-weight:800;font-size:15px;letter-spacing:-0.2px;">Nama</div>
            <div style="color:var(--fb-ink-mute);font-size:11.5px;font-weight:500;">Aktif</div>
          </div>
        </div>

        <!-- Messages Area -->
        <div id="fb-chat-msgs" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding-right:6px;scrollbar-width:none;"></div>

        <!-- Composer -->
        <div style="display:flex;gap:10px;margin-top:14px;align-items:flex-end;">
          <textarea id="fb-chat-input" placeholder="Tulis pesan..." style="flex:1 !important;background:var(--fb-card) !important;border:1.5px solid var(--fb-line) !important;border-radius:10px !important;color:var(--fb-ink) !important;padding:12px 14px !important;font-size:13.5px !important;resize:none !important;min-height:44px !important;max-height:80px !important;font-family:inherit !important;outline:none !important;transition:border 0.2s !important;box-shadow:0 2px 10px rgba(0,0,0,0.03) !important;box-sizing:border-box !important;margin:0 !important;"></textarea>
          <button id="fb-chat-send-btn" style="background:linear-gradient(135deg,var(--fb-blue),#5ea8e8) !important;color:white !important;border:none !important;border-radius:10px !important;width:44px !important;height:44px !important;display:flex !important;align-items:center !important;justify-content:center !important;cursor:pointer !important;flex-shrink:0 !important;transition:all 0.2s !important;box-shadow:0 3px 10px rgba(74,144,226,.25) !important;padding:0 !important;margin:0 !important;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:translateX(-1px) translateY(1px)"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- TEAM PANE (Manager only) -->
    <div class="fb-pane" id="pane-team">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <div style="font-size:15px; font-weight:800; color:var(--fb-ink); letter-spacing:-.3px;">Tim Saya</div>
          <div style="font-size:11px; color:var(--fb-ink-mute); margin-top:2px;">Pantau progres dan verifikasi tugas.</div>
        </div>
      </div>
      <div id="fb-team-list" class="fb-list"></div>
      <div class="fb-empty" id="fb-team-empty" style="display:flex">
        <span class="fb-empty-ico">👥</span>
        Belum terhubung dengan anggota tim
      </div>
    </div>

    <!-- PEOPLE PANE (HR only) -->
    <div class="fb-pane" id="pane-people">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <div style="font-size:15px; font-weight:800; color:var(--fb-ink); letter-spacing:-.3px;">Nadi Perusahaan</div>
          <div style="font-size:11px; color:var(--fb-ink-mute); margin-top:2px;">Metrik karyawan, risiko, dan departemen.</div>
        </div>
      </div>
      <div id="fb-people-list" class="fb-list"></div>
      <div class="fb-empty" id="fb-people-empty" style="display:flex">
        <span class="fb-empty-ico">🏢</span>
        Data karyawan belum tersedia
      </div>
    </div>



    <!-- KALENDER -->
    <div class="fb-pane" id="pane-alarm">

      <!-- RINGING BANNER -->
      <div class="fb-al-ringing" id="fb-al-ringing" style="display:none">
        <span class="fb-al-ring-ico">🔔</span>
        <div class="fb-al-ring-lbl" id="fb-al-ring-lbl">Alarm!</div>
        <button class="fb-al-stop-btn" id="fb-al-stop">Matikan</button>
      </div>

      <!-- ── MINI CALENDAR WIDGET ── -->
      <div class="fb-mini-cal">
        <div class="fb-cal-nav-hdr">
          <button class="fb-cal-nav-btn2" id="fb-cal-prev-btn">&#8249;</button>
          <span class="fb-cal-m-label" id="fb-cal-month-lbl">Mei 2026</span>
          <button class="fb-cal-nav-btn2" id="fb-cal-next-btn">&#8250;</button>
        </div>
        <div class="fb-cal-dow-row2">
          <div class="fb-cal-dow2">Min</div>
          <div class="fb-cal-dow2">Sen</div>
          <div class="fb-cal-dow2">Sel</div>
          <div class="fb-cal-dow2">Rab</div>
          <div class="fb-cal-dow2">Kam</div>
          <div class="fb-cal-dow2">Jum</div>
          <div class="fb-cal-dow2">Sab</div>
        </div>
        <div class="fb-cal-grid2" id="fb-mini-cal-grid"></div>
      </div>

      <!-- Filter strip (shown when a date is selected) -->
      <div class="fb-cal-filter-bar" id="fb-cal-filter-bar" style="display:none">
        <span class="fb-cal-filter-lbl" id="fb-cal-filter-lbl">📅 Semua acara</span>
        <button class="fb-cal-filter-clr" id="fb-cal-filter-clr">Semua ×</button>
      </div>


      <!-- Event List -->
      <div style="font-size:9.5px; font-weight:800; color:var(--fb-ink-mute); letter-spacing:1px; text-transform:uppercase;
        margin-bottom:10px; padding-left:2px; display:flex; align-items:center; gap:8px;">
        AGENDA<span id="fb-al-cnt-lbl" style="font-size:10px; color:var(--fb-blue); font-weight:700;"></span>
      </div>
      <div class="fb-alarm-list" id="fb-alarm-list"></div>

      <!-- Create Event Form (collapsible) — placed below agenda -->
      <div id="fb-cal-form-details" style="margin-top:16px; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.04);">
        <button id="fb-cal-form-toggle" style="width:100%; box-sizing:border-box; display:flex; align-items:center; justify-content:space-between;
          font-size:11px; font-weight:800; color:var(--fb-ink); letter-spacing:0.5px; text-transform:uppercase;
          padding:12px 14px; background:var(--fb-card); border:1.5px solid var(--fb-line); border-radius:12px;
          cursor:pointer; transition:border-color .2s; user-select:none;">
          <span style="display:flex;align-items:center;gap:7px;pointer-events:none;">
            <span style="width:18px;height:18px;background:linear-gradient(135deg,#86C0A9,var(--fb-blue));border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;">📅</span>
            + Buat Acara Baru
          </span>
          <span id="fb-cal-form-arrow" style="font-size:16px; color:var(--fb-ink-mute); transition:transform .2s; line-height:1; flex-shrink:0; pointer-events:none;">›</span>
        </button>
        <div id="fb-cal-form-body" style="display:none; background:var(--fb-card); border:1.5px solid var(--fb-line); border-top:none; border-radius:0 0 12px 12px; overflow:hidden;">
          <!-- Event name -->
          <div style="padding:12px 14px 10px;">
            <div style="font-size:9px; color:var(--fb-ink-mute); margin-bottom:5px; font-weight:700; letter-spacing:.6px; text-transform:uppercase;">Nama acara</div>
            <input id="fb-cal-title" class="fb-in" placeholder="Nama acara…" maxlength="50"
              style="width:100% !important; box-sizing:border-box !important; padding:8px 10px !important; display:block !important; font-size:14px !important; font-weight:600 !important;" />
          </div>
          <!-- Date + Visibility -->
          <div style="display:flex; gap:10px; padding:12px 14px; border-top:1px solid var(--fb-line); background:var(--fb-card);">
            <div style="flex:1; min-width:0; overflow:hidden;">
              <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:6px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Tanggal</div>
              <input type="date" id="fb-cal-date" class="fb-in"
                style="width:100% !important; box-sizing:border-box !important; padding:8px 10px !important; display:block !important;" />
            </div>
            <div style="flex:1; min-width:0; overflow:hidden;">
              <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:6px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Visibilitas</div>
              <select id="fb-cal-vis" class="fb-select"
                style="width:100% !important; box-sizing:border-box !important; padding:8px 10px !important; display:block !important;">
                <option value="private">🔒 Pribadi</option>
                <option value="company">🏢 Publik</option>
              </select>
            </div>
          </div>
          <div style="display:flex; gap:10px; padding:0 14px 12px; background:var(--fb-card);">
            <div style="flex:1; min-width:0; overflow:hidden;">
              <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:6px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Mulai</div>
              <input type="time" id="fb-cal-start" class="fb-in"
                style="width:100% !important; box-sizing:border-box !important; padding:8px 10px !important; display:block !important;" />
            </div>
            <div style="flex:1; min-width:0; overflow:hidden;">
              <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:6px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Selesai</div>
              <input type="time" id="fb-cal-end" class="fb-in"
                style="width:100% !important; box-sizing:border-box !important; padding:8px 10px !important; display:block !important;" />
            </div>
          </div>
          <!-- Add button -->
          <button id="fb-cal-add-btn"
            style="width:100% !important; box-sizing:border-box !important; padding:14px !important; border:none !important; border-top:1px solid rgba(31,29,27,.07) !important; cursor:pointer !important;
            background:linear-gradient(135deg,#86C0A9,#4A90E2) !important; color:#fff !important; font-size:13.5px !important; font-weight:800 !important; letter-spacing:.3px !important;
            transition:all .2s cubic-bezier(.34,1.56,.64,1) !important; display:flex !important; align-items:center !important; justify-content:center !important; gap:7px !important; border-radius:0 0 13px 13px !important;"
            onmouseover="this.style.setProperty('transform','translateY(-1px)','important');this.style.setProperty('filter','brightness(1.05)','important')" onmouseout="this.style.setProperty('transform','translateY(0)','important');this.style.setProperty('filter','none','important')">
            <span style="font-size:15px;line-height:1;">+</span> Tambah Acara
          </button>
        </div>
      </div>

    </div>

    <!-- Settings Panel -->
    <div id="fb-settings-panel">
      <div class="fb-settings-hdr">
        <button class="fb-settings-back" id="fb-settings-back">←</button>
        <span class="fb-settings-title">Pengaturan</span>
      </div>
      <div class="fb-settings-body">
        <div class="fb-settings-user" id="fb-settings-user-card" style="display:none;">
          <div class="fb-settings-avatar" id="fb-settings-avatar">👤</div>
          <div class="fb-settings-user-info">
            <div class="fb-settings-user-name" id="fb-settings-user-name">Not logged in</div>
            <div class="fb-settings-user-meta" id="fb-settings-user-meta">Role: None</div>
          </div>
        </div>
        
        <div class="fb-settings-item">
          <div>
            <div class="fb-settings-item-label">Aktifkan FocusBuddy</div>
            <div class="fb-settings-item-sub">Nonaktifkan untuk menyembunyikan FocusBuddy sementara. Klik ikon ekstensi di pojok kanan atas browser untuk memunculkan kembali.</div>
          </div>
          <input type="checkbox" class="fb-toggle" id="fb-settings-toggle" checked />
        </div>
        
        <div class="fb-settings-item">
          <div>
            <div class="fb-settings-item-label">Mode Animasi Karakter</div>
            <div class="fb-settings-item-sub">Matikan untuk membuat mascot diam (Mode Diam)</div>
          </div>
          <input type="checkbox" class="fb-toggle" id="fb-settings-mascot-anim-toggle" checked />
        </div>
      </div>
    </div>

  </div>
</div>

<!-- Buddy (SVG character) -->
<div id="fb-buddy">
  <div id="fb-snap-ring"></div>
  <div id="fb-drag-dot"></div>

  <!-- Mini Buddy (Quiet Mode Edge Button) -->
  <div id="fb-mini-buddy">
    <div class="fb-mini-bg">
      <img src="${chrome.runtime.getURL('icons/icon.png')}" width="32" height="32" style="object-fit: contain !important; pointer-events: none !important;" />
    </div>
  </div>

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
  const panel = $('fb-panel')
  const buddy = $('fb-buddy')
  const badge = $('fb-badge')
  const toast = $('fb-toast')
  const svgWrap = $('fb-svg-wrap')

  // ── Ensure buddy is visible immediately after DOM creation ──
  if (buddy) {
    buddy.style.display = '';
    buddy.style.visibility = 'visible';
    buddy.style.opacity = '1';
  }

  // ── Start user detection & sync AFTER DOM is ready ──
  detectFlowbeeUser()
  setInterval(() => {
    detectFlowbeeUser()
    if (!availableKPIs || !availableKPIs.length) loadKPIs()
    flowbeeSyncAll()
  }, 30000)

  $('fb-date').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })

  const da = new Date(Date.now() + 3600000); da.setSeconds(0, 0)
  const p2 = n => String(n).padStart(2, '0')
  // Pre-fill hidden manual fields with +1hr as a sensible default
  if ($('fb-al-date')) $('fb-al-date').value = `${da.getFullYear()}-${p2(da.getMonth() + 1)}-${p2(da.getDate())}`
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
      const fillStates = ['senang', 'semangat', 'makan']
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
    pill.style.cssText = `font-size:9px!important;font-weight:800!important;letter-spacing:.9px!important;padding:3px 9px;border-radius:0;text-transform:uppercase;background:${cfg.color}22;color:${cfg.color}`
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
    
    if (root.classList.contains('quiet-mode')) {
      // Snap to edge in quiet-mode (0px margin)
      if (ax < W / 2) {
        ax = 100 // Left edge (so rect.left = 0)
      } else {
        ax = W   // Right edge (so rect.right = W)
      }
      ay = Math.max(70, Math.min(H + 10, ay))
    } else {
      // Clamp buddy (100x130) with 8px margin from all edges
      ax = Math.max(100 + 8, Math.min(W - 8, ax))
      ay = Math.max(130 + 8, Math.min(H - 8, ay))
    }
    
    root.style.setProperty('left', ax + 'px', 'important')
    root.style.setProperty('top', ay + 'px', 'important')
    root.style.setProperty('right', 'auto', 'important')
    root.style.setProperty('bottom', 'auto', 'important')
    
    // Toggle on-left class dynamically based on screen side
    const buddyEl = root.querySelector('#fb-buddy')
    if (buddyEl) {
      buddyEl.classList.toggle('on-left', ax < W / 2)
    }
    
    positionPanel(ax, ay)
  }

  function positionPanel(ax, ay) {
    const W = window.innerWidth, H = window.innerHeight
    const GAP = 16
    const BUDDY_W = 100, BUDDY_H = 130
    const PW = 480 // fixed width based on CSS update

    // Buddy center coordinates
    const bCenterX = ax - (BUDDY_W / 2)
    const bCenterY = ay - (BUDDY_H / 2)

    // Measured panel height AFTER setting width (reflow)
    const PH = Math.min(panel.scrollHeight || 480, H - 32)

    // ── Candidate positions: Left of Buddy OR Right of Buddy ──
    // Center the panel vertically with the buddy center, clamp within viewport
    const centeredY = Math.max(16, Math.min(bCenterY - (PH / 2), H - PH - 16))

    // Position panel left of buddy
    const leftX = ax - BUDDY_W - GAP - PW
    // Position panel right of buddy
    const rightX = ax + GAP

    const candidates = [
      { pl: leftX, pt: centeredY, ox: 'right', oy: 'center' },   // Left of buddy
      { pl: rightX, pt: centeredY, ox: 'left', oy: 'center' },   // Right of buddy
    ]

    // Score = visible area inside viewport
    function score(c) {
      const pr = c.pl + PW, pb = c.pt + PH
      const visW = Math.max(0, Math.min(pr, W) - Math.max(c.pl, 0))
      const visH = Math.max(0, Math.min(pb, H) - Math.max(c.pt, 0))
      return (visW / PW) * (visH / PH)
    }

    let best = candidates[0]
    // If left position goes out of viewport bounds, prefer right side (which is usually on screen)
    if (score(candidates[1]) > score(best)) {
      best = candidates[1]
    }

    // Hard-clamp so panel is always fully within viewport
    const finalL = Math.max(16, Math.min(W - PW - 16, best.pl))
    const finalT = Math.max(16, Math.min(H - PH - 16, best.pt))

    // Set position relative to root anchor (ax, ay)
    panel.style.left = (finalL - ax) + 'px'
    panel.style.top = (finalT - ay) + 'px'
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    panel.style.transformOrigin = best.ox + ' ' + best.oy
  }

  function savePos(ax, ay) {
    chrome.storage.local.get('fb3', r => {
      const d = r.fb3 || {}
      chrome.storage.local.set({ fb3: { ...d, pos: { ax, ay } } })
    })
  }

  // Transparent full-page overlay: captures all pointer events during drag
  // so buddy stays responsive even over iframes, videos, or elements
  // that would normally intercept mouse/touch events
  function createDragOverlay() {
    const ov = document.createElement('div')
    ov.style.position = 'fixed'
    ov.style.top = '0'
    ov.style.left = '0'
    ov.style.width = '100vw'
    ov.style.height = '100vh'
    ov.style.zIndex = '2147483646'
    ov.style.cursor = 'grabbing'
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
  }, { passive: false })

  window.addEventListener('touchmove', e => {
    if (!isDragging) return; dragDidMove = true
    const t = e.touches[0]
    applyPos(t.clientX - dragOffX + 100, t.clientY - dragOffY + 130)
    e.preventDefault()
  }, { capture: true, passive: false })

  window.addEventListener('touchend', endDrag, true)
  window.addEventListener('touchcancel', endDrag, true)

  // Reposition on resize so buddy + panel stay on-screen
  window.addEventListener('resize', () => {
    const ax = parseInt(root.style.left) || window.innerWidth - 28
    const ay = parseInt(root.style.top) || window.innerHeight - 28
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
  document.addEventListener('mousemove', () => { ctx.lastActivity = Date.now() }, { passive: true })
  document.addEventListener('keydown', () => { ctx.lastActivity = Date.now() }, { passive: true })

  $('fb-x').addEventListener('click', () => {
    panelOpen = false;
    panel.classList.remove('open');
    const settingsPanel = root.querySelector('#fb-settings-panel');
    if (settingsPanel) settingsPanel.classList.remove('open');
  })
  $('fb-toast-x').addEventListener('click', () => { toast.classList.remove('show'); const actBtn = $('fb-toast-action'); if (actBtn) actBtn.style.display = 'none' })

  // Settings Panel wiring
  const settingsPanel = root.querySelector('#fb-settings-panel');
  const settingsBtn = $('fb-settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (settingsPanel) settingsPanel.classList.add('open');
    });
  }
  const settingsBack = $('fb-settings-back');
  if (settingsBack) {
    settingsBack.addEventListener('click', () => {
      if (settingsPanel) settingsPanel.classList.remove('open');
    });
  }
  const settingsToggle = $('fb-settings-toggle');
  if (settingsToggle) {
    settingsToggle.addEventListener('change', () => {
      extensionEnabled = settingsToggle.checked;
      chrome.storage.local.set({ fb_ext_enabled: extensionEnabled });
      applyExtensionEnabled();
    });
  }
  const mascotAnimToggle = $('fb-settings-mascot-anim-toggle');
  if (mascotAnimToggle) {
    mascotAnimToggle.addEventListener('change', () => {
      mascotAnimated = mascotAnimToggle.checked;
      chrome.storage.local.set({ hp_mascot_animated: mascotAnimated });
      applyMascotAnimated();
      // If we are on Happily portal tab, let's also set it in portal's localStorage so it stays perfectly in sync!
      try {
        localStorage.setItem('hp_mascot_animated', mascotAnimated ? '1' : '0');
        // Dispatch event to update mascot on web page instantly if running on Portal
        window.dispatchEvent(new CustomEvent('hp_mascot_anim_change', { detail: mascotAnimated }));
      } catch (e) {}
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // THEME TOGGLE
  // ═══════════════════════════════════════════════════════════════
  const themeToggleBtn = $('fb-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      // Cycle: auto -> dark -> light -> auto
      if (_manualTheme === null) { _manualTheme = 'dark'; }
      else if (_manualTheme === 'dark') { _manualTheme = 'light'; }
      else { _manualTheme = null; }
      try { chrome.storage.local.set({ fbTheme: _manualTheme || '' }); } catch (e) {}
      syncTheme();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // RESIZE HANDLE
  // ═══════════════════════════════════════════════════════════════
  const resizeHandle = $('fb-resize-handle');
  if (resizeHandle) {
    let isResizing = false;
    let resizeStartX = 0;
    let resizeStartW = 0;

    resizeHandle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      resizeStartX = e.clientX;
      resizeStartW = panel.offsetWidth;
      panel.classList.add('resizing');
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', e => {
      if (!isResizing) return;
      const dx = resizeStartX - e.clientX;
      const newW = Math.max(340, Math.min(800, resizeStartW + dx));
      panel.style.width = newW + 'px';
    }, true);

    window.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      panel.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const finalW = panel.offsetWidth;
      try { chrome.storage.local.set({ fbPanelWidth: finalW }); } catch (e) {}
    }, true);

    // Load saved width
    try {
      chrome.storage.local.get('fbPanelWidth', r => {
        if (r && r.fbPanelWidth && r.fbPanelWidth >= 340 && r.fbPanelWidth <= 800) {
          panel.style.width = r.fbPanelWidth + 'px';
        }
      });
    } catch (e) {}
  }

  function buildTabs() {
    const tabsEl = root.querySelector('#fb-tabs');
    if (!tabsEl) return;
    
    const config = window.__FB ? window.__FB.getRoleConfig() : {
      tabs: [
        { key: 'tasks', icon: '✅', label: 'Tugas' },
        { key: 'notes', icon: '📝', label: 'Catatan' },
        { key: 'timer', icon: '⏱',  label: 'Timer' },
        { key: 'alarm', icon: '🗓️', label: 'Kalender' },
        { key: 'chat',  icon: '💬', label: 'Chat' },
      ],
      accent: '#4A90E2',
    };
    
    const availableTabKeys = config.tabs.map(t => t.key);
    if (!availableTabKeys.includes(activeTab)) {
      activeTab = availableTabKeys[0] || 'tasks';
    }
    
    tabsEl.innerHTML = config.tabs.map(t =>
      `<button class="fb-tab${t.key === activeTab ? ' act' : ''}" data-tab="${t.key}">` +
        `<span class="ti">${t.icon}</span>${t.label}` +
      `</button>`
    ).join('');
    
    tabsEl.querySelectorAll('.fb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.fb-tab').forEach(b => b.classList.remove('act'));
        root.querySelectorAll('.fb-pane').forEach(p => p.classList.remove('show'));
        btn.classList.add('act');
        activeTab = btn.dataset.tab;
        const targetPane = root.querySelector('#pane-' + activeTab);
        if (targetPane) targetPane.classList.add('show');
        applyRoleTheme();
        renderTab(activeTab);
        if (activeTab === 'team' || activeTab === 'people') {
          flowbeeSyncAll();
        }
      });
    });
    
    root.querySelectorAll('.fb-pane').forEach(p => p.classList.remove('show'));
    const activePane = root.querySelector('#pane-' + activeTab);
    if (activePane) activePane.classList.add('show');
  }

  function applyRoleTheme() {
    if (!window.__FB) return;
    const activeRole = window.__FB.getActiveRole();
    const config = window.__FB.getRoleConfig();
    
    const accent = root.querySelector('#fb-hdr-accent');
    if (accent) {
      const gradients = {
        employee: 'linear-gradient(90deg, #4A90E2 0%, #86C0A9 55%, #ffd43b 100%)',
        manager:  'linear-gradient(90deg, #3B6FA0 0%, #5ea8e8 50%, #86C0A9 100%)',
        hr:       'linear-gradient(90deg, #7B6BB5 0%, #9B8FCC 50%, #C3B1E1 100%)',
      };
      accent.style.background = gradients[activeRole] || gradients.employee;
    }
    
    root.querySelectorAll('.fb-tab.act').forEach(tab => {
      tab.style.setProperty('color', config.accent, 'important');
    });
  }

  // Initial build of tabs
  buildTabs();
  applyRoleTheme();

  // Expose buildTabs and applyRoleTheme to the global namespace so they can be triggered from modules or sync updates
  if (window.__FB) {
    window.__FB.buildTabs = buildTabs;
    window.__FB.applyRoleTheme = applyRoleTheme;
  }

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'FB_ALARM' || msg.type === 'FB_ALARM_FIRED') {
      burst()
      forceState('EXCITED', 6000)
      currentState = 'EXCITED'; updateBuddySVG('EXCITED'); applyMood('EXCITED')
      startAlarmRing(msg.label || 'Alarm!')
      // Switch to alarm pane so user can stop it, but also show toast with stop
      if (!panelOpen) { panelOpen = true; panel.classList.add('open'); positionPanel(parseInt(root.style.left) || window.innerWidth - 28, parseInt(root.style.top) || window.innerHeight - 28) }
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
      if (!extensionEnabled) {
        extensionEnabled = true;
        try {
          chrome.storage.local.set({ fb_ext_enabled: true });
        } catch (e) {}
        applyExtensionEnabled();
        panelOpen = true;
        panel.classList.add('open');
      } else {
        panelOpen = !panelOpen;
        panel.classList.toggle('open', panelOpen);
      }
      if (panelOpen) {
        renderAll();
        flowbeeSyncAll();
      }
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
      const ang = (i / 10) * 360, d = 30 + Math.random() * 22, sz = 4 + Math.random() * 5
      p.style.cssText = `width:${sz}px;height:${sz}px;background:${color};bottom:${38 + Math.random() * 10}px;right:${38 + Math.random() * 10}px;--tx:${Math.cos(ang * Math.PI / 180) * d}px;--ty:${Math.sin(ang * Math.PI / 180) * d}px`
      root.appendChild(p); setTimeout(() => p.remove(), 750)
    }
  }

  let _chimeAC = null, _chimeNodes = [], _chimeLoopIv = null
  function stopChime() {
    clearInterval(_chimeLoopIv); _chimeLoopIv = null
    _chimeNodes.forEach(n => { try { n.stop() } catch (_) { } }); _chimeNodes = []
    if (_chimeAC) { try { _chimeAC.close() } catch (_) { }; _chimeAC = null }
  }
  function playChimeCycle(ac) {
    const freqs = [880, 1100, 1320, 880]
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain()
      o.connect(g); g.connect(ac.destination)
      o.type = 'sine'; o.frequency.setValueAtTime(f, ac.currentTime + i * .22)
      g.gain.setValueAtTime(0, ac.currentTime + i * .22)
      g.gain.linearRampToValueAtTime(.28, ac.currentTime + i * .22 + .04)
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + i * .22 + .44)
      o.start(ac.currentTime + i * .22); o.stop(ac.currentTime + i * .22 + .5)
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
    } catch (_) { }
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

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
    { min: 51, max: 75, msg: 'Hampir sampai! ✨' },
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
            ${task.kpiTitle ? `<span class="fb-task-kpi-tag">🎯 ${esc(task.kpiTitle)}</span>` : ''}
            <span class="fb-task-pri-tag fb-pri-${task.priority}">${pcfg.label.replace(/🔴|🟡|🟢/, '').trim()}</span>
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
    t.done = !t.done; save(); renderTasks();
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


  // ═══════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════
  // ── Notes ──────────────────────────────────────────────────────
  const NOTE_COLORS = [
    { id: 'blue', hex: '#4d9fff', bg: 'rgba(77,159,255,.14)' },
    { id: 'purple', hex: '#b197fc', bg: 'rgba(177,151,252,.14)' },
    { id: 'green', hex: '#69db7c', bg: 'rgba(105,219,124,.14)' },
    { id: 'yellow', hex: '#ffd43b', bg: 'rgba(255,212,59,.14)' },
    { id: 'orange', hex: '#ff922b', bg: 'rgba(255,146,43,.14)' },
    { id: 'pink', hex: '#f783ac', bg: 'rgba(247,131,172,.14)' },
  ]
  let noteColor = NOTE_COLORS[0].id
  let editingNoteId = null

  // Color picker removed from UI — keep logic for data compat
  const clrWrap = $('fb-note-clrs') // null (element removed)
  const noteComposer = $('fb-note-in') ? $('fb-note-in').closest('.fb-note-composer') : null
  const noteSaveBtn = $('fb-note-save')

  function applyNoteColor(colorId) {
    const c = NOTE_COLORS.find(x => x.id === colorId) || NOTE_COLORS[0]
    noteColor = c.id
    if (noteComposer) noteComposer.style.setProperty('--nc', c.hex)
    if (noteSaveBtn) noteSaveBtn.style.setProperty('--nc', c.hex)
    if (clrWrap) {
      clrWrap.querySelectorAll('.fb-clr-dot').forEach(d => d.classList.remove('sel'))
      const selDot = clrWrap.querySelector(`[data-cid="${c.id}"]`)
      if (selDot) selDot.classList.add('sel')
    }
  }

  if (clrWrap) {
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
  }

  // Init with default color
  applyNoteColor(NOTE_COLORS[0].id)

  function relTime(ts) {
    const d = Date.now() - ts, m = Math.floor(d / 60000), h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000)
    if (d < 45000) return 'Baru saja'
    if (m < 60) return `${m} mnt lalu`
    if (h < 24) return `${h} jam lalu`
    if (dy < 7) return `${dy} hari lalu`
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  function renderNotes(filter) {
    const list = $('fb-note-list')
    const q = (filter || $('fb-note-search')?.value || '').toLowerCase().trim()
    let notes = [...(ctx.notes || [])]
    if (q) notes = notes.filter(n => n.text.toLowerCase().includes(q) || (n.title || '').toLowerCase().includes(q))

    // Show/hide search bar
    const sw = $('fb-note-search-wrap')
    if (sw) sw.style.display = (ctx.notes || []).length > 2 ? 'block' : 'none'

    if (!notes.length) {
      list.innerHTML = q
        ? `<div class="fb-empty"><span class="fb-empty-ico">🔍</span>Tidak ditemukan</div>`
        : `<div class="fb-empty"><span class="fb-empty-ico">📝</span>Belum ada catatan</div>`
      return
    }

    list.innerHTML = ''
    const pinned = notes.filter(n => n.pinned).reverse()
    const regular = notes.filter(n => !n.pinned).reverse()

    const VIS_BADGE = {
      company:  { label: 'COMPANY',  bg: '#d3f9d8', color: '#2f9e44' },
      division: { label: 'DIVISI',   bg: '#dbe4ff', color: '#3b5bdb' },
      private:  { label: 'PRIBADI',  bg: '#f1f3f5', color: '#868e96' },
    }

    function mkCard(note) {
      const c = NOTE_COLORS.find(x => x.id === note.color) || NOTE_COLORS[0]
      const vis = VIS_BADGE[note.visibility || 'private'] || VIS_BADGE.private
      const timeStr = note.createdAt ? new Date(note.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',hour12:false}).replace(':','.') : ''
      const el = document.createElement('div')
      el.className = 'fb-note' + (note.pinned ? ' pinned' : '')
      el.style.cssText = `--nc:${c.hex}; --note-bg:${c.bg} !important; --note-border:${c.hex}30 !important; --note-border-hover:${c.hex}60 !important; border-left:3.5px solid ${c.hex} !important;`
      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
          <span style="font-size:11px;color:#9E9892;font-weight:600;font-variant-numeric:tabular-nums;">${timeStr}</span>
          <div style="display:flex;align-items:center;gap:5px;">
            ${note.pinned ? `<span style="font-size:10px;">📌</span>` : ''}
            <span style="font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:0;background:${vis.bg};color:${vis.color};letter-spacing:.4px;">${vis.label}</span>
          </div>
        </div>
        ${note.title ? `<div style="font-size:13.5px;font-weight:800;color:#1F1D1B;margin-bottom:4px;line-height:1.3;">${esc(note.title)}</div>` : ''}
        <div class="fb-note-txt clamped" style="font-size:12.5px;color:#524E49;line-height:1.55;">${esc(note.text)}</div>
        <button class="fb-note-expand" style="display:none;font-size:10px;color:#4A90E2;background:none;border:none;cursor:pointer;padding:2px 0;margin-top:2px;">Lihat semua ▾</button>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid rgba(31,29,27,.05);">
          <div style="display:flex;align-items:center;gap:5px;color:#BDB6AE;font-size:10.5px;font-weight:600;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            DITULIS OLEH ${esc((ctx.flowbeeUserName || 'SAYA').toUpperCase())}
          </div>
          <div class="fb-note-actions">
            <button class="fb-note-act pin${note.pinned ? ' active' : ''}" title="${note.pinned ? 'Unpin' : 'Pin'}">📌</button>
            <button class="fb-note-act edit" title="Edit">✏️</button>
            <button class="fb-note-act copy" title="Salin">📋</button>
            <button class="fb-note-act del" title="Hapus">🗑</button>
          </div>
        </div>`

      const txtEl = el.querySelector('.fb-note-txt')
      const expandBtn = el.querySelector('.fb-note-expand')
      requestAnimationFrame(() => { if (txtEl.scrollHeight > txtEl.clientHeight + 4) expandBtn.style.display = 'block' })
      let expanded = false
      expandBtn.onclick = e => {
        e.stopPropagation(); expanded = !expanded
        txtEl.classList.toggle('clamped', !expanded)
        expandBtn.textContent = expanded ? 'Sembunyikan ▴' : 'Lihat semua ▾'
      }
      el.querySelector('.fb-note-act.pin').onclick = () => { note.pinned = !note.pinned; save(); renderNotes() }
      el.querySelector('.fb-note-act.edit').onclick = () => {
        const inp = $('fb-note-in'), titleInp = $('fb-note-title')
        if (inp) { inp.value = note.text; $('fb-note-cc').textContent = note.text.length + '/800' }
        if (titleInp) titleInp.value = note.title || ''
        noteColor = note.color || NOTE_COLORS[0].id
        applyNoteColor(noteColor)
        editingNoteId = note.id
        const saveBtn = $('fb-note-save')
        if (saveBtn) { saveBtn.textContent = 'Update'; saveBtn.style.background = '#f0a500' }
        // Open composer
        const wrap = $('fb-note-composer-wrap'); if (wrap) wrap.style.display = 'block'
        inp.focus(); inp.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      el.querySelector('.fb-note-act.copy').onclick = () => {
        const fullText = (note.title ? note.title + '\n' : '') + note.text
        navigator.clipboard?.writeText(fullText).catch(() => {})
        const btn = el.querySelector('.fb-note-act.copy')
        btn.textContent = '✅'; setTimeout(() => { btn.textContent = '📋' }, 1200)
      }
      el.querySelector('.fb-note-act.del').onclick = () => {
        if (editingNoteId === note.id) cancelNoteEdit()
        if (!ctx.deletedNoteIds) ctx.deletedNoteIds = []
        ctx.deletedNoteIds.push(String(note.id))
        el.style.transition = 'opacity .2s,transform .2s'
        el.style.opacity = '0'; el.style.transform = 'translateX(12px)'
        setTimeout(() => { 
          ctx.notes = ctx.notes.filter(n => String(n.id) !== String(note.id)); 
          save(); 
          renderNotes(); 
          flowbeeSyncAll(); 
        }, 200)
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
    function dateLabel(ts) {
      const d = new Date(ts)
      const today = new Date(); const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
      if (d.toDateString() === today.toDateString()) return '📅 HARI INI'
      if (d.toDateString() === yesterday.toDateString()) return '📅 KEMARIN'
      return d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase()
    }

    if (pinned.length) {
      list.appendChild(mkSectionLbl('📌 DISEMATKAN'))
      list.appendChild(mkGroup(pinned))
    }
    if (regular.length) {
      const groups = []; const seen = new Map()
      regular.forEach(n => {
        const lbl = dateLabel(n.createdAt || n.id)
        if (!seen.has(lbl)) { seen.set(lbl, []); groups.push(lbl) }
        seen.get(lbl).push(n)
      })
      groups.forEach(lbl => { list.appendChild(mkSectionLbl(lbl)); list.appendChild(mkGroup(seen.get(lbl))) })
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
        ctx.notes[idx] = { ...ctx.notes[idx], text: txt, title, color: noteColor }
      }
      cancelNoteEdit()
    } else {
      const vis = $('fb-note-vis') ? $('fb-note-vis').value : 'private'
      ctx.notes.push({ id: Date.now(), text: txt, title, color: noteColor, pinned: false, createdAt: Date.now(), visibility: vis })
      inp.value = ''; if (titleInp) titleInp.value = ''
      $('fb-note-cc').textContent = '0/800'
    }
    save(); renderNotes(); burst()
    flowbeeSyncAll(); // Sync immediately on note save
    // Pulse with selected color
    const comp = inp.closest('.fb-note-composer')
    comp.style.transition = 'box-shadow .15s'
    comp.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${c.hex} 40%, transparent)`
    setTimeout(() => { comp.style.boxShadow = '' }, 500)
  }

  function cancelNoteEdit() {
    editingNoteId = null
    const inp = $('fb-note-in'), titleInp = $('fb-note-title')
    if (inp) { inp.value = ''; $('fb-note-cc').textContent = '0/800' }
    if (titleInp) titleInp.value = ''
    const saveBtn = $('fb-note-save')
    if (saveBtn) { saveBtn.textContent = 'Simpan Catatan'; saveBtn.style.background = '' }
  }

  $('fb-note-save').onclick = saveNote
  $('fb-note-in').oninput = () => { $('fb-note-cc').textContent = $('fb-note-in').value.length + '/800' }
  $('fb-note-in').onkeydown = e => { if (e.key === 'Enter' && e.ctrlKey) saveNote() }

  // Toggle composer visibility
  const noteAddToggle = $('fb-note-add-toggle')
  const noteComposerWrap = $('fb-note-composer-wrap')
  if (noteAddToggle && noteComposerWrap) {
    noteAddToggle.onclick = () => {
      const open = noteComposerWrap.style.display !== 'none'
      noteComposerWrap.style.display = open ? 'none' : 'block'
      noteAddToggle.textContent = open ? '+ Tambah' : '✕ Tutup'
      noteAddToggle.style.background = open ? '#4A90E2' : 'rgba(31,29,27,.08)'
      noteAddToggle.style.color = open ? '#fff' : '#524E49'
      noteAddToggle.style.boxShadow = 'none'
      if (!open) setTimeout(() => $('fb-note-in')?.focus(), 50)
    }
  }
  const noteCancelBtn = $('fb-note-cancel')
  if (noteCancelBtn) {
    noteCancelBtn.onclick = () => {
      cancelNoteEdit()
      if (noteComposerWrap) noteComposerWrap.style.display = 'none'
      if (noteAddToggle) { noteAddToggle.textContent = '+ Tambah'; noteAddToggle.style.background = '#4A90E2'; noteAddToggle.style.color = '#fff'; noteAddToggle.style.boxShadow = 'none' }
    }
  }

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
      d.textContent = padded ? String(v).padStart(2, '0') : v
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
      d.classList.remove('selected', 'near')
      if (dist < 0.6) d.classList.add('selected')
      else if (dist < 1.5) d.classList.add('near')
    })
  }

  // ── Format drum values for display in recents ──
  function fmtDrumTime(h, m, s) {
    if (h > 0) return `${h}.${String(m).padStart(2, '0')}`
    return `${m}.${String(s).padStart(2, '0')}`
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
    timerRecents.slice(0, 5).forEach(r => {
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
      drumScrollTo('fb-drum-h-scroll', 0, false)
      drumScrollTo('fb-drum-m-scroll', 0, false)
      drumScrollTo('fb-drum-s-scroll', 0, false)
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
    const minEl = $('fb-tstat-min')
    if (sessEl) sessEl.textContent = pomodoroSessions
    if (minEl) minEl.textContent = focusMinutesTotal + 'm'
  }

  function updateTimer() {
    const color = STATES[currentState].color
    const totalM = Math.floor(timerSec / 60)
    const h = Math.floor(totalM / 60)
    const m = totalM % 60
    const s = timerSec % 60
    const disp = $('fb-tdisp')
    const timeStr = h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
          if (flowbeeUserId) {
            window.__FB.fetch(`${FLOWBEE_API}/timer-complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: flowbeeUserId, durationMinutes: Math.round(timerMax / 60), label: timerLabel })
            }).then(r => r.json())
              .then(data => {
                if (data.success && flowbeeUser) {
                  flowbeeUser.points = (flowbeeUser.points || 0) + 20;
                  try { chrome.storage.local.set({ flowbee_user: flowbeeUser }); } catch(e) {}
                  updateIdentityUI();
                }
              })
              .catch(() => { })
          }
        }
        const rw = $('fb-timer-ring-wrap')
        if (rw) { rw.classList.add('complete'); setTimeout(() => rw.classList.remove('complete'), 700) }
        playChime(true); burst(); forceState('EXCITED', 5000)
        currentState = 'EXCITED'; updateBuddySVG('EXCITED'); applyMood('EXCITED')
        showToast('⏱ Timer Selesai!', `${timerLabel} berakhir • +20 XP 🎉`)
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
      timerRecents = timerRecents.filter(r => !(r.h === drumH && r.m === drumM && r.s === drumS))
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
      drumScrollTo('fb-drum-h-scroll', 0, true)
      drumScrollTo('fb-drum-m-scroll', 0, true)
      drumScrollTo('fb-drum-s-scroll', 0, true)
      drumH = 0; drumM = 0; drumS = 0
      checkDrumStartBtn()
      applyMood(currentState)
    }
  }

  // ── Wire up running view pause/stop ──
  const pauseBtn = $('fb-t-pause')
  const stopBtn = $('fb-t-stop')
  if (pauseBtn) pauseBtn.onclick = pauseResumeTimer
  if (stopBtn) stopBtn.onclick = () => {
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
      pomodoroSessions = r.fb3_timerStats.sessions || 0
      focusMinutesTotal = r.fb3_timerStats.minutes || 0
    }
    renderDrumRecents()
  })
  chrome.storage.local.get('fb3_alarmHistory', r => {
    if (r.fb3_alarmHistory) ctx.alarmHistory = r.fb3_alarmHistory
    renderAlarmHistory()
  })


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
        <span style="opacity:.4;font-size:15px">⏰</span>
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
      list.innerHTML = `<div class="fb-al-empty"><span class="fb-al-empty-ico">🗓️</span>Belum ada agenda terdaftar</div>`
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
          <button class="fb-alcard-toggle ${enabled ? 'on' : 'off'}" title="${enabled ? 'Matikan' : 'Aktifkan'}">${enabled ? 'ON' : 'OFF'}</button>
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


  // ═══════════════════════════════════════════════════════════════
  // CHAT
  // ═══════════════════════════════════════════════════════════════
  let chatActiveChannelId = null;
  let chatPollIv = null;

  async function renderChat() {
    const list = $('fb-chat-channel-list');
    const msgView = $('fb-chat-messages-view');
    const chView = $('fb-chat-channels-view');

    if (!list) return;

    if (chatActiveChannelId) {
      chView.style.display = 'none';
      msgView.style.display = 'flex';
      renderChatMessages(chatActiveChannelId);
      if (!chatPollIv) chatPollIv = setInterval(() => renderChatMessages(chatActiveChannelId, true), 3000);
      return;
    }

    clearInterval(chatPollIv); chatPollIv = null;
    chView.style.display = 'block';
    msgView.style.display = 'none';

    if (!flowbeeUserId) {
      list.innerHTML = `<div class="fb-empty">Silakan login Flowbee di web.</div>`;
      return;
    }

    list.innerHTML = `<div class="fb-empty">Memuat chat...</div>`;
    try {
      const res = await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/chat')}?userId=${flowbeeUserId}`);
      const data = await res.json();
      const channels = data.channels || [];
      if (!channels.length) {
        list.innerHTML = `<div class="fb-empty">Belum ada percakapan.</div>`;
        return;
      }
      list.innerHTML = '';
      channels.forEach(ch => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:12px 10px;border-bottom:1px solid rgba(31,29,27,0.06);cursor:pointer;display:flex;gap:12px;align-items:center;transition:background 0.2s;border-radius:0;';
        div.onmouseover = () => div.style.background = 'rgba(31,29,27,0.03)';
        div.onmouseout = () => div.style.background = 'transparent';
        div.innerHTML = `
          <div style="font-size:24px;line-height:1;">${ch.emoji || '💬'}</div>
          <div style="flex:1;overflow:hidden;">
            <div style="color:#1F1D1B;font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">${esc(ch.name)}</div>
            <div style="color:#8A837C;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(ch.lastMessage || 'Mulai percakapan')}</div>
          </div>
          ${ch.unreadCount ? `<div style="background:#ff6b6b;color:white;font-size:10px;font-weight:bold;padding:2px 8px;border-radius:0;">${ch.unreadCount}</div>` : ''}
        `;
        div.onclick = () => {
          chatActiveChannelId = ch.id;
          $('fb-chat-active-name').textContent = ch.name;
          renderChat();
        };
        list.appendChild(div);
      });
    } catch (e) {
      list.innerHTML = `<div class="fb-empty" style="color:#ff6b6b">Gagal memuat chat<br><small style="color:#8A837C;font-size:10px;display:block;margin-top:4px;">${e.message || String(e)}</small></div>`;
    }
  }

  async function renderChatMessages(channelId, isPolling = false) {
    const msgWrap = $('fb-chat-msgs');
    if (!msgWrap) return;
    if (!isPolling) msgWrap.innerHTML = `<div style="color:#8A837C;text-align:center;padding:20px;font-size:12px;font-weight:500;">Memuat...</div>`;
    try {
      const res = await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/chat')}?channelId=${channelId}&userId=${flowbeeUserId}`);
      const data = await res.json();
      const msgs = data.messages || [];

      const isAtBottom = msgWrap.scrollHeight - msgWrap.scrollTop <= msgWrap.clientHeight + 20;

      msgWrap.innerHTML = '';
      if (!msgs.length) {
        msgWrap.innerHTML = `<div style="color:#8A837C;text-align:center;padding:20px;font-size:12px;font-weight:500;">Belum ada pesan.</div>`;
      } else {
        msgs.forEach(m => {
          const isMe = m.sender_id === flowbeeUserId;
          const d = document.createElement('div');
          d.style.cssText = `max-width:85% !important; padding:10px 14px !important; border-radius:0 !important; margin-bottom:6px !important; font-size:13px !important; line-height:1.45 !important; word-break:break-word !important; overflow-wrap:break-word !important; box-sizing:border-box !important;`;
          if (isMe) {
            d.style.setProperty('align-self', 'flex-end', 'important');
            d.style.setProperty('background', 'linear-gradient(135deg, #4A90E2, #5ea8e8)', 'important');
            d.style.setProperty('color', 'white', 'important');
            d.style.setProperty('border-bottom-right-radius', '0', 'important');
            d.style.setProperty('box-shadow', '0 3px 10px rgba(74,144,226,.2)', 'important');
          } else {
            d.style.setProperty('align-self', 'flex-start', 'important');
            d.style.setProperty('background', '#F0F2F5', 'important');
            d.style.setProperty('color', '#1F1D1B', 'important');
            d.style.setProperty('border-bottom-left-radius', '0', 'important');
            d.style.setProperty('border', '1px solid rgba(31,29,27,0.06)', 'important');
          }
          d.innerHTML = `
            ${!isMe ? `<div style="font-size:10.5px;color:#8A837C;margin-bottom:4px;font-weight:600;">${esc(m.sender_name)}</div>` : ''}
            <div>${esc(m.content)}</div>
            <div style="font-size:10px;opacity:${isMe ? '0.85' : '0.6'};text-align:right;margin-top:6px;">${new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
          `;
          msgWrap.appendChild(d);
        });
      }
      if (!isPolling || isAtBottom) {
        msgWrap.scrollTop = msgWrap.scrollHeight;
      }
    } catch (e) { }
  }

  const fbChatBackBtn = $('fb-chat-back-btn');
  if (fbChatBackBtn) {
    fbChatBackBtn.onclick = () => {
      chatActiveChannelId = null;
      renderChat();
    };
  }

  const fbChatSendBtn = $('fb-chat-send-btn');
  if (fbChatSendBtn) {
    fbChatSendBtn.onclick = async () => {
      const inp = $('fb-chat-input');
      const txt = inp.value.trim();
      if (!txt || !chatActiveChannelId || !flowbeeUserId) return;
      inp.value = '';

      const msgWrap = $('fb-chat-msgs');
      const d = document.createElement('div');
      d.style.cssText = `max-width:85%;padding:8px 12px;border-radius:0;margin-bottom:4px;font-size:12.5px;line-height:1.4;word-wrap:break-word;align-self:flex-end;background:#4d9fff;color:white;border-bottom-right-radius:0;opacity:0.7;`;
      d.innerHTML = `<div>${esc(txt)}</div><div style="font-size:9px;opacity:0.5;text-align:right;margin-top:4px;">Mengirim...</div>`;
      msgWrap.appendChild(d);
      msgWrap.scrollTop = msgWrap.scrollHeight;

      try {
        await window.__FB.fetch(FLOWBEE_API.replace('/ext', '/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: chatActiveChannelId, senderId: flowbeeUserId, content: txt })
        });
        renderChatMessages(chatActiveChannelId);
      } catch (e) { }
    };
  }

  const fbChatInput = $('fb-chat-input');
  if (fbChatInput) {
    fbChatInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('fb-chat-send-btn').click(); }
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════
  function renderAll() { 
    renderTasks(); 
    renderNotes(); 
    renderAlarms(); 
    if (activeTab === 'chat') renderChat(); 
    if (activeTab === 'timer') {
      setTimeout(() => {
        drumScrollTo('fb-drum-h-scroll', drumH, false);
        drumScrollTo('fb-drum-m-scroll', drumM, false);
        drumScrollTo('fb-drum-s-scroll', drumS, false);
        syncDrumHighlight('fb-drum-h-scroll');
        syncDrumHighlight('fb-drum-m-scroll');
        syncDrumHighlight('fb-drum-s-scroll');
      }, 0);
    }
    if (activeTab === 'team' && typeof window.__FB?.renderTeamPane === 'function') window.__FB.renderTeamPane();
    if (activeTab === 'people' && typeof window.__FB?.renderPeoplePane === 'function') window.__FB.renderPeoplePane();
  }
  
  function renderTab(t) {
    if (t === 'tasks') renderTasks()
    if (t === 'notes') renderNotes()
    if (t === 'timer') {
      setTimeout(() => {
        drumScrollTo('fb-drum-h-scroll', drumH, false);
        drumScrollTo('fb-drum-m-scroll', drumM, false);
        drumScrollTo('fb-drum-s-scroll', drumS, false);
        syncDrumHighlight('fb-drum-h-scroll');
        syncDrumHighlight('fb-drum-m-scroll');
        syncDrumHighlight('fb-drum-s-scroll');
      }, 0);
    }
    if (t === 'alarm') { renderAlarms(); renderMiniCalendar() }
    if (t === 'chat') renderChat()
    if (t === 'team' && typeof window.__FB?.renderTeamPane === 'function') window.__FB.renderTeamPane()
    if (t === 'people' && typeof window.__FB?.renderPeoplePane === 'function') window.__FB.renderPeoplePane()
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  load(() => {
    updateBuddySVG(currentState)
    applyMood(currentState)

    // Set initial date in datepicker to today
    const dateInp = $('fb-task-date');
    if (dateInp) dateInp.value = today();

    // Restore saved position or default bottom-right
    chrome.storage.local.get(['fb3', 'fb_ext_enabled'], r => {
      if (r.fb3?.pos) applyPos(r.fb3.pos.ax, r.fb3.pos.ay)
      else applyPos(window.innerWidth - 28, window.innerHeight - 28)

      // Ensure extension is enabled by default if never set
      if (typeof r.fb_ext_enabled === 'boolean') {
        extensionEnabled = r.fb_ext_enabled;
      } else {
        extensionEnabled = true;
      }
      applyExtensionEnabled()

      // Final safety: ensure buddy is visible if enabled
      if (extensionEnabled && buddy) {
        buddy.style.display = '';
        buddy.style.visibility = 'visible';
        buddy.style.opacity = '1';
      }
    })

    // State eval loop — 4s interval for responsive state transitions
    evalIv = setInterval(() => {
      if (!isContextValid()) {
        clearInterval(evalIv);
        return;
      }
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
        const lblInput = $('fb-t-label-val') || $('fb-tm-lbl');
        if (lblInput) lblInput.value = goal;
        forceState('FOCUS', 5000);
      }
      if (event.data?.type === 'FLOWBEE_WEBSITE_USER') {
        const { userId, user } = event.data;
        if (userId) {
          if (flowbeeUserId && flowbeeUserId !== userId) {
            ctx.tasks = []; ctx.notes = []; ctx.alarms = [];
            ctx.deletedTaskIds = []; ctx.deletedNoteIds = [];
            save();
          }
          flowbeeUserId = userId;
          flowbeeUser = user;
          const origin = window.location.origin;
          FLOWBEE_API = origin.replace(/\/$/, '') + '/api/ext';
          try {
            chrome.storage.local.set({
              flowbee_user_id: userId,
              flowbee_base_url: origin,
              flowbee_user: user
            });
          } catch (e) {}
          updateIdentityUI();
          flowbeeSyncAll();
        } else {
          flowbeeUserId = null;
          flowbeeUser = null;
          try {
            chrome.storage.local.remove(['flowbee_user_id', 'flowbee_user']);
          } catch (e) {}
          updateIdentityUI();
        }
      }
    });

    // Ask the website for current user details
    window.postMessage({ type: 'FLOWBEE_REQ_USER' }, '*');
  })

})()
