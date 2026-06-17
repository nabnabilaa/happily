/* ==========================================================================
   FlowBuddy — Contacts View (HR Only)
   Mini people directory with search
   ========================================================================== */

const ContactsView = {
  people: [],

  init() {
    this.load();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['fb3']) {
          const fb3 = changes['fb3'].newValue;
          if (fb3 && fb3.allUsers) {
            window.fbCtx = window.fbCtx || {};
            window.fbCtx.allUsers = fb3.allUsers;
            this.people = this.formatUsers(fb3.allUsers);
            if (FlowBuddyApp.currentView === 'contacts') {
               const container = document.getElementById('view-contacts');
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
        if (res.fb3 && (res.fb3.allUsers || res.fb3.members)) {
          window.fbCtx = window.fbCtx || {};
          if (res.fb3.allUsers) window.fbCtx.allUsers = res.fb3.allUsers;
          this.people = this.formatUsers(res.fb3.allUsers || res.fb3.members);
          const container = document.getElementById('view-contacts');
          if (container && FlowBuddyApp.currentView === 'contacts') this.render(container);
        }
      });
    }
  },

  formatUsers(rawUsers) {
    const avatars = ['rose', 'emerald', 'purple', 'amber', 'indigo', 'cyan', 'blue'];
    return rawUsers.map((u, i) => {
      const parts = u.name ? u.name.split(' ') : ['?'];
      const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0] + (parts[0][1] || '');
      return {
        id: u.id,
        name: u.name,
        dept: u.team_name || u.dept || 'Umum',
        role: u.job_title || u.role || 'Karyawan',
        email: u.email || '',
        initials: initials.toUpperCase(),
        avatar: avatars[i % avatars.length]
      };
    });
  },

  currentFilter: '',

  render(container) {
    const filtered = this.currentFilter
      ? this.people.filter(p =>
          p.name.toLowerCase().includes(this.currentFilter.toLowerCase()) ||
          p.dept.toLowerCase().includes(this.currentFilter.toLowerCase()) ||
          p.role.toLowerCase().includes(this.currentFilter.toLowerCase())
        )
      : this.people;

    let html = `
      <div class="section-title">👤 Direktori Karyawan</div>

      <div class="search-input-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="search-input" id="contact-search" placeholder="Cari nama, departemen, atau jabatan..." value="${this.esc(this.currentFilter)}" aria-label="Cari kontak" />
      </div>

      <div style="font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 600; margin-bottom: var(--space-md);">
        ${filtered.length} karyawan${this.currentFilter ? ` cocok untuk "${this.esc(this.currentFilter)}"` : ''}
      </div>
    `;

    if (filtered.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">Tidak ditemukan</div>
          <div class="empty-state-text">Coba kata kunci lain atau periksa ejaannya.</div>
        </div>
      `;
    } else {
      html += '<div class="stagger-in">';
      filtered.forEach(p => {
        html += `
          <div class="team-member-card" data-person-id="${p.id}">
            <div class="avatar avatar-${p.avatar}">${p.initials}</div>
            <div class="team-member-info">
              <div class="team-member-name">${this.esc(p.name)}</div>
              <div class="team-member-role">${this.esc(p.role)} · ${this.esc(p.dept)}</div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="icon-btn contact-chat-btn" style="padding: 4px;" aria-label="Chat dengan ${this.esc(p.name)}" title="Chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </button>
              <button class="icon-btn contact-email-btn" data-email="${this.esc(p.email)}" style="padding: 4px;" aria-label="Email ${this.esc(p.name)}" title="${this.esc(p.email) || 'Tidak ada email'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    container.innerHTML = html;
    this.bindEvents(container);
  },

  bindEvents(container) {
    const searchInput = container.querySelector('#contact-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.currentFilter = searchInput.value;
        this.render(container);
        // Re-focus and restore cursor position
        const newInput = container.querySelector('#contact-search');
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(newInput.value.length, newInput.value.length);
        }
      });
    }

    // Bind chat clicks
    const chatBtns = container.querySelectorAll('.contact-chat-btn');
    chatBtns.forEach(btn => {
       btn.addEventListener('click', (e) => {
          const card = e.currentTarget.closest('.team-member-card');
          const targetId = card.getAttribute('data-person-id');
          let channelId = 'u_' + targetId;
          if (window.fbCtx && window.fbCtx.chats) {
             const existingChat = window.fbCtx.chats.find(ch => ch.type === 'dm' && ch.name === card.querySelector('.team-member-name').textContent);
             if (existingChat) channelId = existingChat.id;
          }
          
          const chatTabBtn = document.querySelector('.tab-btn[data-tab="chat"]');
          if (chatTabBtn && typeof FlowBuddyApp !== 'undefined') {
             FlowBuddyApp.onTabClick('chat', chatTabBtn);
          } else {
             document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
             if (chatTabBtn) chatTabBtn.classList.add('active');
          }
          
          if (typeof ChatView !== 'undefined') {
             setTimeout(() => ChatView.openChat(channelId), 10);
          }
       });
    });

    // Bind email clicks
    const emailBtns = container.querySelectorAll('.contact-email-btn');
    emailBtns.forEach(btn => {
       btn.addEventListener('click', (e) => {
          const email = e.currentTarget.getAttribute('data-email');
          if (email && email.trim() !== '') {
             window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(email), '_blank');
          } else {
             if (typeof FlowBuddyApp !== 'undefined') {
                FlowBuddyApp.showToast('Email tidak tersedia untuk kontak ini');
             } else {
                alert('Email tidak tersedia untuk kontak ini');
             }
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
