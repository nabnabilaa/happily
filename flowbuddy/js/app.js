/* ==========================================================================
   FlowBuddy — Main Application
   State management, view routing, event orchestration
   ========================================================================== */

const FlowBuddyApp = {
  currentView: null,
  userName: 'Budi', // Will be loaded from database/storage

  init() {
    // 1. Init RBAC
    FlowBuddyRBAC.init();

    // 2. Init theme
    FlowBuddyTheme.init();

    // 3. Init views
    TasksView.init();
    if (typeof ChatView !== 'undefined' && ChatView.init) ChatView.init();
    if (typeof ApprovalView !== 'undefined' && ApprovalView.init) ApprovalView.init();
    if (typeof TeamView !== 'undefined' && TeamView.init) TeamView.init();
    if (typeof ContactsView !== 'undefined' && ContactsView.init) ContactsView.init();
    if (typeof BroadcastView !== 'undefined' && BroadcastView.init) BroadcastView.init();
    if (typeof CalendarView !== 'undefined' && CalendarView.init) CalendarView.init();

    // 4. Load user data
    this.loadUserData();

    // 5. Setup header
    this.updateHeader();

    // 6. Render tabs for current role
    this.renderTabs();

    // 7. Show default view
    this.showView(FlowBuddyRBAC.getConfig().defaultView);

    // 8. Bind global events
    this.bindEvents();

    // 9. Force sync to get latest data from website when popup opens
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'FORCE_SYNC' }).catch(() => {});
        }
      });
    }
  },

  loadUserData() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('flowbuddy-user', (res) => {
        if (res['flowbuddy-user']) {
          document.getElementById('login-overlay').style.display = 'none';
          const user = res['flowbuddy-user'];
          this.userName = user.name || 'Budi';
          this.userLevel = user.level || 1;
          this.attendanceStreak = user.streak || 0;
          FlowBuddyRBAC.setRole(user.role || 'employee');
          this.updateHeader();
          this.renderTabs();
          this.showView(FlowBuddyRBAC.getConfig().defaultView);
          // Initialize mascot with current state
          if (typeof window.updateBuddySVG === 'function') {
            window.updateBuddySVG(window.getFbState ? window.getFbState() : 'IDLE');
          }
        } else {
          document.getElementById('login-overlay').style.display = 'flex';
        }
      });
      
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['flowbuddy-user']) {
          const user = changes['flowbuddy-user'].newValue;
          if (user) {
            document.getElementById('login-overlay').style.display = 'none';
            this.userName = user.name || 'Budi';
            this.userLevel = user.level || 1;
            this.attendanceStreak = user.streak || 0;
            
            const oldRole = FlowBuddyRBAC.currentRole;
            const newRole = user.role || 'employee';
            
            FlowBuddyRBAC.setRole(newRole);
            this.updateHeader();
            
            if (oldRole !== newRole) {
              this.renderTabs();
              if (this.currentView === 'chat-detail' && typeof ChatView !== 'undefined') {
                 ChatView.closeChat();
              }
              this.showView(FlowBuddyRBAC.getConfig().defaultView);
            }
          } else {
            document.getElementById('login-overlay').style.display = 'flex';
          }
        }
      });
    }

    // Fallback default
    // Fallback default removed to prevent bypassing login screen
    try {
      const saved = localStorage.getItem('flowbuddy-user');
      if (saved) {
        document.getElementById('login-overlay').style.display = 'none';
        const user = JSON.parse(saved);
        this.userName = user.name || 'Budi';
      }
    } catch(e) {}
  },

  updateHeader() {
    const greetingEl = document.getElementById('header-greeting');
    const badgeEl = document.getElementById('header-role-badge');
    const streakEl = document.getElementById('streak-badge');

    if (greetingEl) {
      greetingEl.textContent = FlowBuddyGreeting.get(this.userName);
    }
    
    const roleConfig = FlowBuddyRBAC.getConfig();
    if (badgeEl) {
      badgeEl.textContent = roleConfig.label;
      if (this.userLevel) {
        badgeEl.textContent = `${roleConfig.label} • Lv ${this.userLevel}`;
      }
    }
    
    if (streakEl) {
      if (this.attendanceStreak) {
        streakEl.textContent = `🔥 ${this.attendanceStreak}`;
        streakEl.style.display = 'inline-flex';
      } else {
        streakEl.style.display = 'none';
      }
    }
  },

  renderTabs() {
    const container = document.getElementById('tabs-container');
    if (!container) return;

    FlowBuddyRBAC.renderTabs(container);

    // Bind tab click events
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.getAttribute('data-tab');
        this.onTabClick(tabKey, btn);
      });
    });
  },

  onTabClick(tabKey, btn) {
    // If we're in chat detail, close it first
    if (this.currentView === 'chat-detail') {
      ChatView.closeChat();
      return;
    }

    // Update active tab
    const container = document.getElementById('tabs-container');
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Switch view
    this.showView(tabKey);
  },

  showView(viewKey, direction) {
    const container = document.getElementById('views-container');
    const panels = container.querySelectorAll('.view-panel');

    // Determine target panel
    let targetId = 'view-' + viewKey;
    const targetPanel = document.getElementById(targetId);
    if (!targetPanel) return;

    // Animate out current
    panels.forEach(p => {
      if (p.classList.contains('active') && p.id !== targetId) {
        p.classList.remove('active');
        if (direction === 'right') {
          p.classList.add('slide-out-left');
        } else if (direction === 'left') {
          p.className = 'view-panel'; // Reset
        } else {
          p.className = 'view-panel'; // Soft transition
        }
        setTimeout(() => p.className = 'view-panel', 300);
      }
    });

    // Animate in target
    targetPanel.className = 'view-panel';
    if (direction === 'right') {
      targetPanel.classList.add('slide-in-right');
    } else if (direction === 'left') {
      targetPanel.classList.add('slide-in-left');
    }
    targetPanel.classList.add('active');

    this.currentView = viewKey;

    // Render view content
    this.renderCurrentView(targetPanel, viewKey);
  },

  renderCurrentView(panel, viewKey) {
    switch(viewKey) {
      case 'tasks':
        TasksView.render(panel);
        break;
      case 'notes':
        NotesView.render(panel);
        break;
      case 'chat':
        ChatView.renderInbox(panel);
        // Fetch full message bodies on-demand (not on every background poll)
        try { chrome.runtime.sendMessage({ type: 'FORCE_SYNC', chatRequest: true }).catch(() => {}); } catch(e) {}
        break;
      case 'chat-detail':
        // Rendered by ChatView.openChat()
        break;
      case 'approval':
        ApprovalView.render(panel);
        break;
      case 'team-chat':
        TeamView.render(panel);
        break;
      case 'contacts':
        ContactsView.render(panel);
        break;
      case 'broadcast-chat':
        BroadcastView.render(panel);
        break;
      case 'calendar':
        CalendarView.render(panel);
        break;
    }
  },

  showChatHeader(contact) {
    document.getElementById('header-default').classList.add('hidden');
    document.getElementById('header-chat').classList.remove('hidden');
    document.getElementById('chat-header-name').textContent = contact.name;
    document.getElementById('chat-header-avatar-text').textContent = contact.initials;
    document.getElementById('chat-header-status').textContent = contact.status === 'online' ? 'Online' : contact.status === 'busy' ? 'Sibuk' : 'Offline';

    // Update avatar color
    const avatar = document.getElementById('chat-header-avatar');
    avatar.className = 'avatar avatar-' + contact.avatar;
  },

  hideChatHeader() {
    document.getElementById('header-default').classList.remove('hidden');
    document.getElementById('header-chat').classList.add('hidden');
  },

  showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  },

  bindEvents() {
    // Back button (chat)
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
      btnBack.addEventListener('click', () => ChatView.closeChat());
    }

    // Close button (popup)
    const btnClose = document.getElementById('fb-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (window.self !== window.top) {
          window.parent.postMessage({ type: 'FB_CLOSE_PANEL' }, '*');
        } else {
          window.close();
        }
      });
    }

    // Send message
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input-field');
    if (sendBtn && chatInput) {
      const doSend = () => {
        ChatView.sendMessage(chatInput.value);
        chatInput.value = '';
      };
      sendBtn.addEventListener('click', doSend);
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSend();
      });
    }

    // Settings dropdown
    const btnSettings = document.getElementById('btn-settings');
    const dropdown = document.getElementById('settings-dropdown');
    if (btnSettings && dropdown) {
      btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });
      document.addEventListener('click', () => {
        dropdown.classList.remove('open');
      });
      dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // Role switch (demo)
    const btnSwitchRole = document.getElementById('btn-switch-role');
    if (btnSwitchRole) {
      btnSwitchRole.addEventListener('click', () => {
        const newRole = FlowBuddyRBAC.cycleRole();
        this.updateHeader();
        this.renderTabs();

        // Close chat if open
        if (this.currentView === 'chat-detail') {
          ChatView.closeChat();
        }

        // Reset to first tab
        const config = FlowBuddyRBAC.getConfig();
        this.showView(config.defaultView);

        // Update first tab as active
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(t => t.classList.remove('active'));
        if (tabs[0]) tabs[0].classList.add('active');

        // Show footer if hidden
        document.getElementById('footer-tabs').classList.remove('hidden');
        document.getElementById('footer-chat-input').classList.remove('active');

        // Close dropdown
        document.getElementById('settings-dropdown').classList.remove('open');

        this.showToast(`🔄 Beralih ke ${config.label}`);
      });
    }
  }
};

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  FlowBuddyApp.init();
});
