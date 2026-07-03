/* ==========================================================================
   FlowBuddy — RBAC (Role-Based Access Control)
   Ultra-lightweight: 3 tabs per role only
   ========================================================================== */

const FlowBuddyRBAC = {
  roles: {
    employee: {
      tabs: [
        { key: 'tasks', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>', label: 'Tugas' },
        { key: 'chat',  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', label: 'Chat' },
        { key: 'calendar', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>', label: 'Kalender' },
      ],
      accent: '#3B82F6',
      accentSoft: '#DBEAFE',
      label: 'EMPLOYEE',
      defaultView: 'tasks'
    },
    manager: {
      tabs: [
        { key: 'tasks',     icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>', label: 'Tugas' },
        { key: 'chat',  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', label: 'Chat' },
        { key: 'approval',  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>', label: 'Approval' },
        { key: 'calendar', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>', label: 'Kalender' },
      ],
      accent: '#4F46E5',
      accentSoft: '#E0E7FF',
      label: 'MANAGER',
      defaultView: 'tasks'
    },
    hr: {
      tabs: [
        { key: 'tasks',          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>', label: 'Tugas' },
        { key: 'chat',  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', label: 'Chat' },
        { key: 'contacts',       icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', label: 'Kontak' },
        { key: 'broadcast-chat', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>', label: 'Broadcast' },
        { key: 'calendar', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>', label: 'Kalender' },
      ],
      accent: '#8B5CF6',
      accentSoft: '#EDE9FE',
      label: 'HR',
      defaultView: 'tasks'
    }
  },

  currentRole: 'employee',

  init() {
    const saved = localStorage.getItem('flowbuddy-role');
    if (saved && this.roles[saved]) {
      this.currentRole = saved;
    }
    document.documentElement.setAttribute('data-role', this.currentRole);
  },

  getConfig() {
    return this.roles[this.currentRole];
  },

  setRole(role) {
    if (!this.roles[role]) return;
    this.currentRole = role;
    localStorage.setItem('flowbuddy-role', role);
    document.documentElement.setAttribute('data-role', role);
  },

  cycleRole() {
    const roleKeys = Object.keys(this.roles);
    const idx = roleKeys.indexOf(this.currentRole);
    const next = roleKeys[(idx + 1) % roleKeys.length];
    this.setRole(next);
    return next;
  },

  renderTabs(container) {
    const config = this.getConfig();
    container.innerHTML = '';
    config.tabs.forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (i === 0 ? ' active' : '');
      btn.setAttribute('data-tab', tab.key);
      btn.setAttribute('aria-label', tab.label);
      btn.innerHTML = `${tab.icon}<span class="tab-label">${tab.label}</span>`;
      container.appendChild(btn);
    });
  }
};
