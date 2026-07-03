/* ==========================================================================
   FlowBuddy — Broadcast View (HR Only)
   Send announcements via chat interface
   ========================================================================== */

const BroadcastView = {
  broadcasts: [],

  init() {
    this.load();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['fb3']) {
          const fb3 = changes['fb3'].newValue;
          if (fb3 && fb3.broadcasts) {
            this.broadcasts = fb3.broadcasts;
            if (FlowBuddyApp.currentView === 'broadcast-chat') {
               const container = document.getElementById('view-broadcast-chat');
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
        if (res.fb3 && res.fb3.broadcasts) {
          this.broadcasts = res.fb3.broadcasts;
          const container = document.getElementById('view-broadcast-chat');
          if (container && FlowBuddyApp.currentView === 'broadcast-chat') this.render(container);
        }
      });
    }
  },

  save() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        const fb3 = res.fb3 || {};
        fb3.broadcasts = this.broadcasts;
        chrome.storage.local.set({ fb3: fb3 });
      });
    }
  },

  render(container) {
    let html = `
      <div class="section-title">📢 Quick Broadcast</div>

      <div style="margin-bottom: var(--space-lg);">
        <textarea
          class="broadcast-textarea"
          id="broadcast-textarea"
          placeholder="Tulis pengumuman untuk seluruh karyawan..."
          aria-label="Tulis pengumuman"
        ></textarea>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: var(--font-size-xs); color: var(--text-muted); font-weight: 600;">Akan dikirim ke seluruh karyawan</span>
          <button class="btn-primary" id="broadcast-send-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            Kirim Broadcast
          </button>
        </div>
      </div>
    `;

    if (this.broadcasts.length > 0) {
      html += '<div class="section-title">Riwayat Broadcast</div>';
      html += '<div class="stagger-in">';
      this.broadcasts.forEach(b => {
        html += `
          <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-left: 4px solid var(--color-role); border-radius: var(--radius-md); padding: var(--space-lg); margin-bottom: var(--space-md); box-shadow: var(--shadow-sm);">
            <div style="font-size: var(--font-size-base); color: var(--text-primary); line-height: 1.6; margin-bottom: var(--space-sm);">
              ${this.esc(b.message)}
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--text-muted); font-weight: 600;">
              ${b.sentBy} · ${b.date} ${b.time}
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // Chat section at the bottom
    html += `
      <div class="section-title" style="margin-top: var(--space-xl);">💬 Chat</div>
    `;

    // Show a mini inbox
    html += '<div class="chat-list">';
    ChatView.contacts.slice(0, 3).forEach(c => {
      html += `
        <div class="chat-item" data-chat-from-broadcast="${c.id}" style="padding: var(--space-sm) var(--space-md);">
          <div class="avatar avatar-sm avatar-${c.avatar}">${c.initials}</div>
          <div class="chat-info">
            <div class="chat-name" style="font-size: var(--font-size-sm);">${this.esc(c.name)}</div>
            <div class="chat-preview" style="font-size: var(--font-size-xs);">${this.esc(c.lastMsg)}</div>
          </div>
          ${c.unread > 0 ? `<div class="unread-badge" style="width: 16px; height: 16px; font-size: 9px;">${c.unread}</div>` : ''}
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
    this.bindEvents(container);
  },

  bindEvents(container) {
    const sendBtn = container.querySelector('#broadcast-send-btn');
    const textarea = container.querySelector('#broadcast-textarea');

    if (sendBtn && textarea) {
      sendBtn.addEventListener('click', async () => {
        const msg = textarea.value.trim();
        if (!msg) {
          textarea.classList.add('shake');
          setTimeout(() => textarea.classList.remove('shake'), 400);
          return;
        }

        const now = new Date();
        const authorId = FlowBuddyApp.userId || 'hr_user'; // Fallback if no user id
        
        this.broadcasts.unshift({
          id: 'b' + Date.now(),
          message: msg,
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          date: 'Hari ini',
          sentBy: 'HR Team'
        });

        textarea.value = '';
        FlowBuddyConfetti.sparkle(sendBtn);
        FlowBuddyApp.showToast('📢 Mengirim broadcast...');

        this.save();
        this.render(container); // Optimistic UI update

        // Send to real API
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['flowbee_base_url'], async (res) => {
            const baseUrl = res.flowbee_base_url || 'https://flowbuddy.maxy.academy';
            const url = baseUrl.replace(/\/$/, '') + '/api/announcements';
            try {
              const fetchCall = window.fbFetchAPI ? window.fbFetchAPI : fetch;
              const response = await fetchCall(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  authorId: authorId,
                  title: 'Pengumuman HR',
                  content: msg,
                  tone: 'purple',
                  glyph: 'bullhorn'
                })
              });
              if (response.ok) {
                FlowBuddyApp.showToast('📢 Broadcast sukses terkirim!');
              } else {
                FlowBuddyApp.showToast('⚠️ Broadcast lokal, gagal ke server');
              }
            } catch (e) {
              console.error(e);
              FlowBuddyApp.showToast('⚠️ Gagal terhubung ke server');
            }
          });
        }
      });
    }

    // Chat links from broadcast page
    container.querySelectorAll('[data-chat-from-broadcast]').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-chat-from-broadcast');
        ChatView.openChat(id);
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
