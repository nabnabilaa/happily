  // ═══════════════════════════════════════════════════════════════
  // FLOWBEE SYNC MODULE — 2-way task + notes + calendar + notification sync
  // ═══════════════════════════════════════════════════════════════
  let FLOWBEE_API = 'http://localhost:3000/api/ext'
  let flowbeeUserId = null
  let flowbeeUser = null // {id, name, role, points, coins, level, rank, streak, avatarImage}
  let todayAttendance = null
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
          todayAttendance = null;
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
          todayAttendance = null;
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
      chrome.storage.local.get(['flowbee_user_id', 'flowbee_base_url', 'flowbee_user', 'flowbee_today_attendance', 'fb_ext_enabled', 'fb3', 'hp_mascot_animated'], r => {
        if (r) {
          if (r.flowbee_user_id) {
            flowbeeUserId = r.flowbee_user_id;
          }
          if (r.flowbee_base_url) {
            FLOWBEE_API = r.flowbee_base_url.replace(/\/$/, '') + '/api/ext';
          }
          if (r.flowbee_today_attendance) {
            todayAttendance = r.flowbee_today_attendance;
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

  function isHappilyWebsite() {
    try {
      return !!localStorage.getItem('hp_user_id');
    } catch (e) {
      return false;
    }
  }

  function updateAttendanceUI() {
    const masukBtn = $('fb-absen-masuk-btn');
    const tutupBtn = $('fb-tutup-hari-btn');
    const selesaiTxt = $('fb-hari-selesai-text');
    
    if (!masukBtn || !tutupBtn || !selesaiTxt) return;

    // Default: hide all
    masukBtn.style.display = 'none';
    tutupBtn.style.display = 'none';
    selesaiTxt.style.display = 'none';

    if (!flowbeeUser) return;

    const status = (todayAttendance && todayAttendance.status) || 'not_checked_in';

    if (status === 'not_checked_in') {
      masukBtn.style.display = 'block';
    } else if (status === 'checked_in') {
      tutupBtn.style.display = 'block';
    } else if (status === 'checked_out') {
      selesaiTxt.style.display = 'block';
    }
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
      if (levelEl) levelEl.textContent = 'Lv.' + (flowbeeUser.level || 1) + ' \u2022 ' + (flowbeeUser.points || 0) + ' XP';
      if (idRow) idRow.style.setProperty('display', 'flex', 'important');
      if (loginMsg) loginMsg.style.display = 'none';

      if (settingsUserCard) settingsUserCard.style.display = 'flex';
      if (settingsName) settingsName.textContent = flowbeeUser.name || 'User';
      if (settingsMeta) {
        const role = (flowbeeUser.role || 'employee').toLowerCase();
        const roleLabels = { employee: 'Employee', manager: 'Manager', hr: 'HR' };
        const displayRole = roleLabels[role] || 'Employee';
        settingsMeta.textContent = displayRole + ' \u2022 Lv.' + (flowbeeUser.level || 1) + ' (' + (flowbeeUser.points || 0) + ' XP)';
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
    updateAttendanceUI();
    if (typeof renderAll === 'function') renderAll();
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

  function setMascotAnimated(val) {
    mascotAnimated = val;
    chrome.storage.local.set({ hp_mascot_animated: mascotAnimated });
    try {
      localStorage.setItem('hp_mascot_animated', mascotAnimated ? '1' : '0');
      window.dispatchEvent(new CustomEvent('hp_mascot_anim_change', { detail: mascotAnimated }));
    } catch (e) {}
    applyMascotAnimated();
  }

  async function flowbeeSyncAll(pullOnly = false) {
    if (document.hidden) return
    if (!flowbeeUserId || !extensionEnabled) return
    try {
      let localTasks = []
      let localNotes = []
      let localHabits = []
      let localDeletedTaskIds = []
      let localDeletedNoteIds = []

      if (!pullOnly) {
        // Push local tasks that are for today — with enhanced fields
        localTasks = ctx.tasks.filter(t => t.date === today()).map(t => ({
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
          timeTracked: t.timeTracked || 0,
          timerStartedAt: t.timerStartedAt || null,
        }))

        // Push local notes
        localNotes = ctx.notes.map(n => ({
          id: String(n.id), title: n.title || '', content: n.text || n.content || '',
          visibility: n.visibility || 'private',
          sharedWithUsers: n.sharedWithUsers || [],
          sharedPermission: n.sharedPermission || 'view',
          relatedEventId: n.relatedEventId || null,
        }))

        // Push local habits
        localHabits = (ctx.habits || []).map(h => ({
          name: h.name,
          streak: h.streak || 0,
          target: h.target || 30,
          done: !!h.done,
          glyph: h.glyph || 'check',
          completedDates: h.completedDates || []
        }))
        
        localDeletedTaskIds = ctx.deletedTaskIds || []
        localDeletedNoteIds = ctx.deletedNoteIds || []
      }

      const res = await window.__FB.fetch(`${FLOWBEE_API}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: flowbeeUserId,
          tasks: localTasks,
          notes: localNotes,
          habits: localHabits,
          calendarRequest: true, // Request upcoming calendar events
          deletedTaskIds: localDeletedTaskIds,
          deletedNoteIds: localDeletedNoteIds,
          focusTaskId: ctx.focusTaskId,
          focusProgress: ctx.focusProgress,
          focusIntention: ctx.focusIntention,
        })
      })
      const data = await res.json()

      if (data.success) {
        if (!pullOnly) {
          ctx.deletedTaskIds = []
          ctx.deletedNoteIds = []
        }
        if (data.todayAttendance) {
          todayAttendance = data.todayAttendance;
          try { chrome.storage.local.set({ flowbee_today_attendance: todayAttendance }); } catch(e) {}
        } else {
          todayAttendance = null;
          try { chrome.storage.local.remove('flowbee_today_attendance'); } catch(e) {}
        }
        if (window.__FB) {
          window.__FB.roleData = data;
        }
        if (isHappilyWebsite() && !pullOnly) {
          window.postMessage({ type: 'FLOWBEE_DB_UPDATE' }, '*');
        }
        if (data.allUsers) {
          noteAllUsers = data.allUsers;
        }
      }

      let focusChanged = false;
      // Update user identity from server
      if (data.user) {
        flowbeeUser = data.user;
        const nextFocusId = data.user.focusTaskId ? String(data.user.focusTaskId) : null;
        const nextFocusProgress = Number(data.user.focusProgress) || 0;
        const nextFocusIntention = data.user.focusIntention || "";
        
        if (String(ctx.focusTaskId) !== String(nextFocusId) || 
            ctx.focusProgress !== nextFocusProgress || 
            ctx.focusIntention !== nextFocusIntention) {
          ctx.focusTaskId = nextFocusId;
          ctx.focusProgress = nextFocusProgress;
          ctx.focusIntention = nextFocusIntention;
          focusChanged = true;
        }
        try { chrome.storage.local.set({ flowbee_user: data.user }); } catch(e) {}
        updateIdentityUI();
      }

      if (focusChanged) {
        save();
        renderTasks();
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
              timeTracked: Number(wt.timeTracked) || 0,
              timerStartedAt: wt.timerStartedAt || null,
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
                existing.timeTracked !== (Number(wt.timeTracked) || 0) ||
                existing.timerStartedAt !== (wt.timerStartedAt || null) ||
                existing.date !== (wt.date || today())) {
              existing.done = wt.done
              existing.text = wt.title
              existing.proofLink = wt.proofLink || ''
              existing.progress = wt.progress || 0
              existing.description = wt.description || ''
              existing.targetDate = wt.targetDate || ''
              existing.timeTracked = Number(wt.timeTracked) || 0
              existing.timerStartedAt = wt.timerStartedAt || null
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

        if (changed || focusChanged) {
          renderTasks();
          renderCoachInsights();
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
              sharedWithUsers: wn.sharedWithUsers || [],
              sharedPermission: wn.sharedPermission || 'view',
              relatedEventId: wn.relatedEventId || null,
              createdAt: wn.createdAt ? new Date(wn.createdAt).getTime() : Date.now(),
              pinned: false,
              color: NOTE_COLORS[0].id,
              userId: wn.userId,
              authorName: wn.authorName || 'SAYA',
              authorDepartment: wn.authorDepartment || ''
            })
            changed = true;
          } else {
            // Update fields if changed
            if (existing.text !== (wn.content || '') || 
              existing.title !== (wn.title || '') ||
              existing.visibility !== (wn.visibility || 'private') ||
              JSON.stringify(existing.sharedWithUsers || []) !== JSON.stringify(wn.sharedWithUsers || []) ||
              existing.sharedPermission !== (wn.sharedPermission || 'view') ||
              existing.relatedEventId !== (wn.relatedEventId || null) ||
              existing.userId !== wn.userId ||
              existing.authorName !== (wn.authorName || 'SAYA') ||
              existing.authorDepartment !== (wn.authorDepartment || '')) {
              existing.text = wn.content || ''
              existing.title = wn.title || ''
              existing.visibility = wn.visibility || 'private'
              existing.sharedWithUsers = wn.sharedWithUsers || []
              existing.sharedPermission = wn.sharedPermission || 'view'
              existing.relatedEventId = wn.relatedEventId || null
              existing.userId = wn.userId
              existing.authorName = wn.authorName || 'SAYA'
              existing.authorDepartment = wn.authorDepartment || ''
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

      // Merge: web habits
      if (data.habits) {
        let changed = false;
        const isDifferent = JSON.stringify(ctx.habits) !== JSON.stringify(data.habits);
        if (isDifferent) {
          ctx.habits = data.habits;
          changed = true;
        }
        if (changed) {
          renderHabits();
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
        const cachedIds = new Set(flowbeeNotifCache.map(n => typeof n === 'object' && n !== null ? n.id : n))
        const newNotifs = data.notifications.filter(n => !cachedIds.has(n.id))
        for (const n of newNotifs) {
          try {
            chrome.runtime.sendMessage({
              type: 'SHOW_NOTIFICATION',
              id: n.id,
              title: n.title,
              message: n.message || ''
            })
          } catch (e) { /* background might not handle this yet */ }
          // Add to cache to prevent duplicate notifications
          flowbeeNotifCache.push(n.id)
        }
        // Limit cache size to 100 entries to prevent memory growth
        if (flowbeeNotifCache.length > 100) {
          flowbeeNotifCache = flowbeeNotifCache.slice(flowbeeNotifCache.length - 100)
        }
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
      }

      save()
    } catch (e) { /* offline or server down — silent fail */ }
  }

  // Auto-sync every 30 seconds (detect & sync deferred until after DOM ready)
  loadKPIs()

