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
    
    if (!flowbeeUserId) {
      tabsEl.style.setProperty('display', 'none', 'important');
      return;
    }
    tabsEl.style.setProperty('display', 'flex', 'important');
    
    const config = window.__FB ? window.__FB.getRoleConfig() : {
      tabs: [
        { key: 'tasks', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>', label: 'Tugas' },
        { key: 'notes', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', label: 'Catatan' },
        { key: 'timer', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',  label: 'Timer' },
        { key: 'alarm', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label: 'Kalender' },
        { key: 'chat',  icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>', label: 'Chat' },
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
        // ── Stop chat polling when leaving the chat tab ──
        if (activeTab === 'chat' && btn.dataset.tab !== 'chat') {
          clearInterval(chatPollIv); chatPollIv = null;
          clearInterval(chatChannelPollIv); chatChannelPollIv = null;
        }
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

