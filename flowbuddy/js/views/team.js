/* ==========================================================================
   FlowBuddy — Team View (Manager Only)
   Mini status: online/busy/offline + quick chat link
   ========================================================================== */

const TeamView = {
  members: [],
  currentPageTeam: 1,
  currentPageChat: 1,
  itemsPerPage: 5,

  init() {
    this.load();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['fb3']) {
          const fb3 = changes['fb3'].newValue;
          if (fb3 && fb3.members) {
            window.fbCtx = window.fbCtx || {};
            window.fbCtx.members = fb3.members;
            this.members = this.formatMembers(fb3.members);
            if (FlowBuddyApp.currentView === 'team-chat') {
               const container = document.getElementById('view-team-chat');
               if (container) this.render(container);
            }
          }
        }
      });
    }
  },

  load() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        if (res.fb3 && res.fb3.members) {
          window.fbCtx = window.fbCtx || {};
          window.fbCtx.members = res.fb3.members;
          this.members = this.formatMembers(res.fb3.members);
          const container = document.getElementById('view-team-chat');
          if (container && FlowBuddyApp.currentView === 'team-chat') this.render(container);
        }
      });
    }
  },

  formatMembers(rawMembers) {
    const avatars = ['rose', 'emerald', 'purple', 'amber', 'indigo', 'cyan', 'blue'];
    return rawMembers.map((m, i) => {
      const parts = m.name ? m.name.split(' ') : ['?'];
      const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0] + (parts[0][1] || '');
      const status = (m.mood === 'stress' || m.mood === 'tired') ? 'busy' : 'online';
      return {
        id: m.id,
        name: m.name,
        role: m.role || m.dept || 'Team Member',
        status: status,
        initials: initials.toUpperCase(),
        avatar: avatars[i % avatars.length],
        tasksDone: m.tasks ? m.tasks.done : 0,
        tasksTotal: m.tasks ? m.tasks.total : 0
      };
    });
  },

  render(container) {
    const onlineCount = this.members.filter(m => m.status === 'online').length;
    const busyCount = this.members.filter(m => m.status === 'busy').length;

    let html = `
      <div class="section-title">👥 Tim Saya</div>

      <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-lg); flex-wrap: wrap;">
        <span style="font-size: var(--font-size-sm); font-weight: 700; color: var(--color-success); background: var(--color-success-soft); padding: 4px 10px; border-radius: var(--radius-full);">● ${onlineCount} Online</span>
        <span style="font-size: var(--font-size-sm); font-weight: 700; color: var(--color-urgent); background: rgba(245, 158, 11, 0.1); padding: 4px 10px; border-radius: var(--radius-full);">● ${busyCount} Sibuk</span>
      </div>

      <div class="stagger-in">
    `;

    const startTeam = (this.currentPageTeam - 1) * this.itemsPerPage;
    const paginatedTeam = this.members.slice(startTeam, startTeam + this.itemsPerPage);
    const totalTeamPages = Math.ceil(this.members.length / this.itemsPerPage);

    paginatedTeam.forEach(m => {
      const statusLabel = m.status === 'online' ? 'Online' : m.status === 'busy' ? 'Sibuk' : 'Offline';
      const pct = m.tasksTotal > 0 ? Math.round((m.tasksDone / m.tasksTotal) * 100) : 0;
      const pctClass = pct === 100 ? 'complete' : '';

      html += `
        <div class="team-member-card" data-member-id="${m.id}">
          <div class="avatar avatar-${m.avatar}">${m.initials}</div>
          <div class="team-member-info">
            <div class="team-member-name">${this.esc(m.name)}</div>
            <div class="team-member-role">${this.esc(m.role)} · <span style="color: ${m.status === 'online' ? 'var(--color-success)' : m.status === 'busy' ? 'var(--color-urgent)' : 'var(--text-muted)'}; font-weight: 700;">${statusLabel}</span></div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: var(--font-size-xs); font-weight: 800; color: var(--color-role);">${m.tasksDone}/${m.tasksTotal}</div>
            <div style="width: 40px; height: 4px; background: var(--border-light); border-radius: var(--radius-full); margin-top: 4px;">
              <div style="width: ${pct}%; height: 100%; background: ${pct === 100 ? 'var(--color-success)' : 'var(--color-role)'}; border-radius: var(--radius-full); transition: width 0.3s;"></div>
            </div>
          </div>
          <div class="status-dot ${m.status}"></div>
        </div>
      `;
    });

    html += '</div>';

    if (totalTeamPages > 1) {
      html += `
        <div class="pagination" style="display: flex; justify-content: center; gap: 8px; margin-top: 12px;">
          <button class="btn-ghost pagination-btn team-prev" ${this.currentPageTeam === 1 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; cursor: pointer; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-light);">&laquo; Prev</button>
          <span style="font-size: 12px; align-self: center; font-weight: 600; color: var(--text-muted);">${this.currentPageTeam} of ${totalTeamPages}</span>
          <button class="btn-ghost pagination-btn team-next" ${this.currentPageTeam === totalTeamPages ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; cursor: pointer; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-light);">Next &raquo;</button>
        </div>
      `;
    }

    // Chat section
    html += `
      <div class="section-title" style="margin-top: var(--space-xl);">💬 Chat Tim</div>
    `;

    if (this.members.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-title">Belum ada tim</div>
          <div class="empty-state-text">Saat ini tidak ada anggota tim yang terdaftar di departemen Anda.</div>
        </div>
      `;
    } else {
      // Reuse ChatView inbox for team chat
      const teamContacts = this.members.filter(m => m.status !== 'offline').map(m => ({
        id: m.id,
        name: m.name,
        initials: m.initials,
        avatar: m.avatar,
        lastMsg: m.status === 'online' ? 'Sedang aktif' : 'Sedang sibuk',
        time: '',
        unread: 0,
        status: m.status
      }));

      const totalChatPages = Math.ceil(teamContacts.length / this.itemsPerPage);
      const startChat = (this.currentPageChat - 1) * this.itemsPerPage;
      const paginatedChat = teamContacts.slice(startChat, startChat + this.itemsPerPage);

      if (teamContacts.length > 0) {
        html += '<div class="chat-list">';
        paginatedChat.forEach(c => {
          html += `
            <div class="chat-item" data-chat-team="${c.id}" style="padding: var(--space-sm) var(--space-md);">
              <div class="avatar avatar-sm avatar-${c.avatar}">${c.initials}</div>
              <div class="chat-info">
                <div class="chat-name" style="font-size: var(--font-size-sm);">${this.esc(c.name)}</div>
                <div class="chat-preview" style="font-size: var(--font-size-xs); color: ${c.status === 'online' ? 'var(--color-success)' : 'var(--color-urgent)'};">${c.lastMsg}</div>
              </div>
              <button class="icon-btn" style="padding: 4px;" aria-label="Chat dengan ${this.esc(c.name)}" title="Chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>
          `;
        });
        html += '</div>';
        
        if (totalChatPages > 1) {
          html += `
            <div class="pagination" style="display: flex; justify-content: center; gap: 8px; margin-top: 12px;">
              <button class="btn-ghost pagination-btn chat-prev" ${this.currentPageChat === 1 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; cursor: pointer; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-light);">&laquo; Prev</button>
              <span style="font-size: 12px; align-self: center; font-weight: 600; color: var(--text-muted);">${this.currentPageChat} of ${totalChatPages}</span>
              <button class="btn-ghost pagination-btn chat-next" ${this.currentPageChat === totalChatPages ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; cursor: pointer; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-light);">Next &raquo;</button>
            </div>
          `;
        }
      } else {
         html += `
          <div class="empty-state" style="padding: var(--space-md) 0;">
            <div class="empty-state-text">Tidak ada anggota tim yang sedang online/sibuk saat ini.</div>
          </div>
        `;
      }
    }

    container.innerHTML = html;

    const teamPrev = container.querySelector('.team-prev');
    const teamNext = container.querySelector('.team-next');
    if (teamPrev) teamPrev.addEventListener('click', () => { if(this.currentPageTeam > 1) { this.currentPageTeam--; this.render(container); }});
    if (teamNext) teamNext.addEventListener('click', () => { this.currentPageTeam++; this.render(container); });

    const chatPrev = container.querySelector('.chat-prev');
    const chatNext = container.querySelector('.chat-next');
    if (chatPrev) chatPrev.addEventListener('click', () => { if(this.currentPageChat > 1) { this.currentPageChat--; this.render(container); }});
    if (chatNext) chatNext.addEventListener('click', () => { this.currentPageChat++; this.render(container); });

    // Bind chat clicks
    const chatItems = container.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
      item.addEventListener('click', () => {
         const targetId = item.getAttribute('data-chat-team');
         // We might need to find the chat channel ID for this user or fallback to 'u_' + targetId
         let channelId = 'u_' + targetId;
         if (window.fbCtx && window.fbCtx.chats) {
            const existingChat = window.fbCtx.chats.find(ch => ch.type === 'dm' && ch.name === item.querySelector('.chat-name').textContent);
            if (existingChat) channelId = existingChat.id;
         }

         // Switch bottom nav to Chat using FlowBuddyApp
         const chatTabBtn = document.querySelector('.tab-btn[data-tab="chat"]');
         if (chatTabBtn && typeof FlowBuddyApp !== 'undefined') {
            FlowBuddyApp.onTabClick('chat', chatTabBtn);
         } else {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            if (chatTabBtn) chatTabBtn.classList.add('active');
         }
         
         // Trigger ChatView
         if (typeof ChatView !== 'undefined') {
            setTimeout(() => ChatView.openChat(channelId), 10);
         }
      });
    });
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
