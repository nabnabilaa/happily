/* ==========================================================================
   FlowBuddy — Chat View
   Inbox (contact list) + Chat detail with slide transitions
   ========================================================================== */

const ChatView = {
  contacts: [],
  messages: {},
  currentContactId: null,

  baseUrl: null,
  userId: null,

  init() {
    this.load();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['fb3']) {
          const fb3 = changes['fb3'].newValue;
          if (fb3) {
            if (fb3.chats && fb3.chats.length > 0) {
               this.contacts = this.formatChats(fb3.chats);
            } else if (fb3.allUsers && this.contacts.length === 0) {
               this.contacts = this.formatContacts(fb3.allUsers);
            }
            if (FlowBuddyApp.currentView === 'chat') {
               const container = document.getElementById('view-chat');
               if (container) this.renderInbox(container);
               
               // Update detail view if open
               if (this.currentContactId) {
                  const detailContainer = document.getElementById('view-chat-detail');
                  if (detailContainer) this.renderMessages(detailContainer, this.currentContactId);
               }
            }
          }
        }
      });
    }
  },

  load() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['fb3', 'flowbee_base_url', 'flowbee_user_id'], (res) => {
        if (res.flowbee_base_url) this.baseUrl = res.flowbee_base_url;
        if (res.flowbee_user_id) this.userId = res.flowbee_user_id;

        if (res.fb3) {
          if (res.fb3.chats && res.fb3.chats.length > 0) {
            this.contacts = this.formatChats(res.fb3.chats);
          } else if (res.fb3.allUsers) {
            this.contacts = this.formatContacts(res.fb3.allUsers);
          }
          
          const container = document.getElementById('view-chat');
          if (container && FlowBuddyApp.currentView === 'chat') this.renderInbox(container);
        }
      });
    }
  },

  save() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        const fb3 = res.fb3 || {};
        fb3.messages = this.messages;
        chrome.storage.local.set({ fb3: fb3 });
      });
    }
  },

  formatChats(rawChats) {
    const avatars = ['rose', 'emerald', 'purple', 'amber', 'indigo', 'cyan', 'blue'];
    return rawChats.map((ch, i) => {
      let dateDisplay = '';
      if (ch.lastMessageAt) {
         const d = new Date(ch.lastMessageAt);
         if (d.toDateString() === new Date().toDateString()) {
            dateDisplay = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
         } else {
            dateDisplay = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }).toUpperCase();
         }
      }
      
      const parts = ch.name ? ch.name.split(' ') : ['?'];
      const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0] + (parts[0][1] || '');

      // Store messages
      this.messages[ch.id] = (ch.messages || []).map((m) => {
         const isMe = String(m.senderId) === String(this.userId);
         const md = new Date(m.createdAt);
         return {
            from: isMe ? 'me' : 'them',
            text: m.content,
            time: md.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            senderName: isMe ? 'Saya' : m.senderName
         };
      });

      return {
        id: ch.id,
        name: ch.name || 'Unknown',
        initials: ch.emoji !== '👤' && ch.emoji !== '💬' ? ch.emoji : initials.toUpperCase(),
        avatar: avatars[i % avatars.length],
        lastMsg: ch.lastMessage ? (ch.lastSenderName ? ch.lastSenderName.split(' ')[0] + ': ' + ch.lastMessage : ch.lastMessage) : 'Mulai percakapan',
        time: dateDisplay,
        unread: ch.unreadCount || 0,
        status: 'online',
        type: ch.type || 'dm'
      };
    });

    // Preserve locally created contacts that haven't synced from the server yet
    this.contacts.forEach(oldContact => {
       if (!newContacts.find(nc => String(nc.id) === String(oldContact.id))) {
          newContacts.unshift(oldContact); // Add to top since it's likely a recent local chat
       }
    });
    
    return newContacts;
  },

  formatContacts(rawUsers) {
    const avatars = ['rose', 'emerald', 'purple', 'amber', 'indigo', 'cyan', 'blue'];
    return rawUsers.map((u, i) => {
      const parts = u.name ? u.name.split(' ') : ['?'];
      const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0] + (parts[0][1] || '');
      
      return {
        id: 'u_' + u.id, // fake channel id
        name: u.name,
        initials: initials.toUpperCase(),
        avatar: avatars[i % avatars.length],
        lastMsg: 'Mulai percakapan',
        time: '',
        unread: 0,
        status: 'online'
      };
    });
  },

  renderInbox(container) {
    let html = '';

    if (this.contacts.length === 0) {
      html = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <div class="empty-state-title">Hore! Inbox zero</div>
          <div class="empty-state-text">Saatnya ambil nafas sejenak ☕</div>
        </div>
      `;
    } else {
      html = '<div class="chat-list stagger-in">';
      this.contacts.forEach(c => {
        html += `
          <div class="chat-item" data-chat-id="${c.id}">
            <div class="avatar avatar-lg avatar-${c.avatar}">${c.initials}</div>
            <div class="chat-info">
              <div class="chat-header-info">
                <h3 class="chat-name">${this.esc(c.name)}</h3>
                <span class="chat-time">${c.time}</span>
              </div>
              <p class="chat-preview">${this.esc(c.lastMsg)}</p>
            </div>
            ${c.unread > 0 ? `<div class="unread-badge pulse">${c.unread}</div>` : ''}
          </div>
        `;
      });
      html += '</div>';
    }

    container.innerHTML = html;

    // Bind click handlers
    container.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-chat-id');
        this.openChat(id);
      });
    });
  },

  openChat(contactId) {
    this.currentContactId = contactId;
    let contact = this.contacts.find(c => String(c.id) === String(contactId));
    
    // If not found in active chats, try to find in global users and add to contacts
    if (!contact && window.fbCtx) {
       const allAvailable = (window.fbCtx.allUsers || []).concat(window.fbCtx.members || []);
       const rawUser = allAvailable.find(u => 'u_' + u.id === String(contactId) || String(u.id) === String(contactId));
       if (rawUser) {
          const parts = rawUser.name ? rawUser.name.split(' ') : ['?'];
          const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0] + (parts[0][1] || '');
          contact = {
             id: 'u_' + rawUser.id,
             name: rawUser.name,
             initials: initials.toUpperCase(),
             avatar: 'blue', // default
             lastMsg: 'Mulai percakapan',
             time: '',
             unread: 0,
             status: 'online'
          };
          this.contacts.push(contact);
          this.currentContactId = contact.id; // ensure correct ID format
       }
    }

    if (!contact) return;

    // Clear unread
    contact.unread = 0;

    // Update header
    FlowBuddyApp.showChatHeader(contact);

    // Switch to chat detail view
    FlowBuddyApp.showView('chat-detail', 'right');

    // Show chat input
    document.getElementById('footer-chat-input').classList.add('active');
    document.getElementById('footer-tabs').classList.add('hidden');

    // Render messages
    const container = document.getElementById('view-chat-detail');
    this.renderMessages(container, contactId);
  },

  closeChat() {
    this.currentContactId = null;

    // Restore header
    FlowBuddyApp.hideChatHeader();

    // Switch back
    FlowBuddyApp.showView('chat', 'left');

    // Show nav tabs, hide chat input
    document.getElementById('footer-chat-input').classList.remove('active');
    document.getElementById('footer-tabs').classList.remove('hidden');

    // Re-render inbox
    const container = document.getElementById('view-chat');
    this.renderInbox(container);
  },

  renderMessages(container, contactId) {
    const msgs = this.messages[contactId] || [];

    let html = '<div class="chat-messages" id="chat-messages-container">';
    html += '<div class="date-divider">Riwayat Percakapan</div>';

    msgs.forEach(msg => {
      const cls = msg.from === 'me' ? 'outgoing' : 'incoming';
      html += `
        <div class="message ${cls}">
          <div class="bubble">
            ${msg.from === 'them' ? `<div style="font-size: 10px; font-weight: 700; color: var(--brand-primary); margin-bottom: 2px;">${this.esc(msg.senderName)}</div>` : ''}
            ${this.esc(msg.text)}
            <div class="msg-time">${msg.time}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Scroll to bottom
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
  },

  async sendMessage(text) {
    if (!text.trim() || !this.currentContactId) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (!this.messages[this.currentContactId]) {
      this.messages[this.currentContactId] = [];
    }
    this.messages[this.currentContactId].push({ from: 'me', text: text.trim(), time: timeStr, senderName: 'Saya' });

    // Update last message in contacts
    const contact = this.contacts.find(c => String(c.id) === String(this.currentContactId));
    if (contact) {
      contact.lastMsg = 'Saya: ' + text.trim();
      contact.time = timeStr;
    }

    // Append to DOM directly for smooth UX
    const msgContainer = document.getElementById('chat-messages-container');
    if (msgContainer) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message outgoing';
      msgDiv.innerHTML = `
        <div class="bubble">
          ${this.esc(text.trim())}
          <div class="msg-time">${timeStr}</div>
        </div>
      `;
      msgContainer.appendChild(msgDiv);

      // Scroll to bottom
      const panel = document.getElementById('view-chat-detail');
      if (panel) panel.scrollTop = panel.scrollHeight;
    }

    // Call API to persist
    if (this.baseUrl && this.userId) {
       const url = this.baseUrl.replace(/\/$/, '') + '/api/chat';
       
       let targetChannelId = this.currentContactId;
       let action = 'send_message';
       
       // If it's a fake channel (started from member list without previous chat)
       if (String(this.currentContactId).startsWith('u_')) {
          action = 'create_dm';
          const targetUserId = this.currentContactId.replace('u_', '');
          
          try {
             const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create_dm', userId: this.userId, targetUserId })
             });
             const data = await res.json();
             if (data.channelId) {
                targetChannelId = data.channelId;
                
                // Migrate local messages to new channel ID
                if (this.messages[this.currentContactId]) {
                   this.messages[targetChannelId] = this.messages[this.currentContactId];
                   delete this.messages[this.currentContactId];
                }
                
                // Migrate contact ID
                const c = this.contacts.find(c => String(c.id) === String(this.currentContactId));
                if (c) c.id = targetChannelId;
                
                this.currentContactId = targetChannelId; // update context
                action = 'send_message'; // proceed to send
             }
          } catch(e) {}
       }
       
       if (action === 'send_message') {
          try {
             await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                   channelId: targetChannelId,
                   senderId: this.userId,
                   content: text.trim()
                })
             });
          } catch (e) { console.error('Failed to send msg:', e); }
       }
    }
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
