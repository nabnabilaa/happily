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

    // Real-time task timer stopwatch ticking interval
    const taskTimerIv = setInterval(() => {
      if (!isContextValid()) {
        clearInterval(taskTimerIv);
        return;
      }
      if (panelOpen && activeTab === 'tasks') {
        const hasRunningTimer = ctx.tasks.some(t => t.date === today() && t.timerStartedAt);
        if (hasRunningTimer) {
          renderTasks();
        }
      }
    }, 1000);

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
      if (event.data?.type === 'FLOWBEE_WEBSITE_UPDATE') {
        flowbeeSyncAll(true);
      }
      if (event.data?.type === 'FLOWBEE_NUDGE') {
        try {
          chrome.storage.local.set({ fb_nudge: { title: event.data.title, message: event.data.message, ts: Date.now() } });
        } catch (e) { /* silent */ }
      }
      // ── Bridge website chat → ALL extension tabs via chrome.storage ──
      // Website fires FLOWBEE_CHAT_UPDATE after sending a message.
      // content.js on the website tab catches it here and writes to chrome.storage,
      // which immediately fires storage.onChanged in every other tab (Gemini, etc.)
      if (event.data?.type === 'FLOWBEE_CHAT_UPDATE') {
        const { channelId, ts } = event.data;
        try {
          chrome.storage.local.set({ fb_chat_update: { ts: ts || Date.now(), channelId } });
        } catch (e) { /* silent */ }
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
          todayAttendance = null;
          try {
            chrome.storage.local.remove(['flowbee_user_id', 'flowbee_user', 'flowbee_today_attendance']);
          } catch (e) {}
          updateIdentityUI();
        }
      }
    });

    // Listen to changes in chrome.storage.local from other tabs
    try {
      if (window.chrome && window.chrome.storage && window.chrome.storage.onChanged) {
        window.chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== 'local') return;
          
          let needsRenderTasks = false;
          let needsRenderNotes = false;
          let needsRenderAlarms = false;
          
          if (changes.fb3) {
            const newVal = changes.fb3.newValue || {};
            ctx.tasks = newVal.tasks || [];
            ctx.notes = newVal.notes || [];
            ctx.alarms = (newVal.alarms || []).filter(a => a.timestamp > Date.now());
            ctx.deletedTaskIds = newVal.deletedTaskIds || [];
            ctx.deletedNoteIds = newVal.deletedNoteIds || [];
            flowbeeNotifCache = newVal.flowbeeNotifCache || [];
            
            needsRenderTasks = true;
            needsRenderNotes = true;
            needsRenderAlarms = true;
          }
          
          if (changes.flowbee_user_id) {
            flowbeeUserId = changes.flowbee_user_id.newValue || null;
          }
          
          if (changes.flowbee_base_url) {
            FLOWBEE_API = (changes.flowbee_base_url.newValue || '').replace(/\/$/, '') + '/api/ext';
          }
          
          if (changes.flowbee_user) {
            flowbeeUser = changes.flowbee_user.newValue || null;
            updateIdentityUI();
          }
          
          if (changes.fb_ext_enabled) {
            extensionEnabled = !!changes.fb_ext_enabled.newValue;
            applyExtensionEnabled();
          }
          
          if (changes.hp_mascot_animated) {
            mascotAnimated = !!changes.hp_mascot_animated.newValue;
            applyMascotAnimated();
          }
          
          if (changes.fbTheme) {
            _manualTheme = changes.fbTheme.newValue || null;
            syncTheme();
          }

          // ── REAL-TIME CHAT SYNC: triggered by any tab that sends a message ──
          if (changes.fb_chat_update && changes.fb_chat_update.newValue) {
            const update = changes.fb_chat_update.newValue;

            // 1. Update the extension panel if chat tab is open
            if (activeTab === 'chat') {
              if (chatActiveChannelId && chatActiveChannelId === update.channelId) {
                // We are in the exact channel that was updated — refresh messages immediately
                if (typeof renderChatMessages === 'function') {
                  renderChatMessages(chatActiveChannelId, true);
                }
              } else if (!chatActiveChannelId) {
                // We are on channel list view — refresh to update unread badges
                if (typeof renderChat === 'function') {
                  renderChat();
                }
              }
            }

            // 2. Also notify the website React app on this tab so it refreshes too
            // ChatScreen.tsx listens for FLOWBEE_CHAT_INCOMING via window.addEventListener
            try {
              window.postMessage({
                type: 'FLOWBEE_CHAT_INCOMING',
                channelId: update.channelId,
                ts: update.ts,
              }, '*');
            } catch (e) { /* silent */ }
          }

          // ── NUDGE ANIMATION ACROSS TABS ──
          if (changes.fb_nudge && changes.fb_nudge.newValue) {
            const nudge = changes.fb_nudge.newValue;
            const badge = root.querySelector('#fb-badge');
            const wrap = root.querySelector('#fb-svg-wrap');
            if (badge && wrap) {
              badge.textContent = nudge.message || nudge.title || 'Seseorang menyenggolmu! 👀';
              badge.style.opacity = '1';
              badge.style.transform = 'translateY(0) scale(1.1)';
              badge.style.backgroundColor = 'rgba(74, 144, 226, 0.97)';
              badge.style.color = '#fff';
              badge.style.zIndex = '999999';
              
              const origAnim = wrap.style.animation;
              wrap.style.animation = 'lompatRoket 0.4s ease-in-out 5 alternate';
              
              setTimeout(() => {
                badge.style.opacity = '';
                badge.style.transform = '';
                badge.style.backgroundColor = '';
                badge.style.color = '';
                badge.style.zIndex = '';
                wrap.style.animation = origAnim;
                const cfg = STATES[currentState] || STATES.IDLE;
                badge.textContent = cfg.badge;
              }, 5000);
            }
          }
          
          if (needsRenderTasks && typeof renderTasks === 'function') renderTasks();
          if (needsRenderNotes && typeof renderNotes === 'function') renderNotes();
          if (needsRenderAlarms && typeof renderAlarms === 'function') renderAlarms();
          
        });
      }
    } catch (e) {
      console.warn("Could not register chrome.storage.onChanged listener:", e);
    }

    // Ask the website for current user details
    window.postMessage({ type: 'FLOWBEE_REQ_USER' }, '*');
  })
