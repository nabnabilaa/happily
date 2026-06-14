  // ═══════════════════════════════════════════════════════════════
  // CHAT
  // ═══════════════════════════════════════════════════════════════
  let chatActiveChannelId = null;
  let chatPollIv = null;
  let chatChannelPollIv = null; // polls channel list (unread counts) when chat tab active

  function renderChannelItemsDom(channels, list) {
    if (!channels.length) {
      list.innerHTML = `<div class="fb-empty">Belum ada percakapan.</div>`;
      return;
    }
    list.innerHTML = '';
    channels.forEach(ch => {
      const div = document.createElement('div');
      div.style.cssText = 'padding:14px; margin-bottom:12px; background:var(--fb-card); border:1px solid var(--fb-line); border-radius:12px; cursor:pointer; display:flex; gap:14px; align-items:center; transition:all 0.2s ease; box-shadow:0 2px 4px rgba(0,0,0,0.02);';
      div.onmouseover = () => { div.style.borderColor = 'var(--fb-blue)'; div.style.transform = 'translateY(-1px)'; div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; };
      div.onmouseout = () => { div.style.borderColor = 'var(--fb-line)'; div.style.transform = 'none'; div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; };
      
      let dName = ch.name;
      if (!dName || String(dName).toLowerCase() === 'null') {
        dName = 'Pengguna Tidak Dikenal';
      }

      div.innerHTML = `
        <div style="width:44px;height:44px;border-radius:50%;background:var(--fb-line-soft);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">
          ${ch.emoji || '💬'}
        </div>
        <div style="flex:1;overflow:hidden;">
          <div style="color:var(--fb-ink);font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;">${esc(dName)}</div>
          <div style="color:var(--fb-ink-mute);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(ch.lastMessage || 'Mulai percakapan')}</div>
        </div>
        ${ch.unreadCount ? `<div style="background:#8b5cf6;color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;">${ch.unreadCount > 99 ? '99+' : ch.unreadCount}</div>` : ''}
      `;
      div.onclick = () => {
        chatActiveChannelId = ch.id;
        $('fb-chat-active-name').textContent = dName;
        renderChat();
      };
      list.appendChild(div);
    });
  }

  async function renderChat() {
    const list = $('fb-chat-channel-list');
    const msgView = $('fb-chat-messages-view');
    const chView = $('fb-chat-channels-view');

    if (!list) return;

    if (chatActiveChannelId) {
      chView.style.display = 'none';
      msgView.style.display = 'flex';
      renderChatMessages(chatActiveChannelId);
      
      // Stop channel poll
      if (chatChannelPollIv) { clearInterval(chatChannelPollIv); chatChannelPollIv = null; }
      return;
    }

    // Stop message poll
    if (chatPollIv) { clearInterval(chatPollIv); chatPollIv = null; }

    chView.style.display = 'block';
    msgView.style.display = 'none';

    if (!flowbeeUserId) {
      list.innerHTML = `<div class="fb-empty">Silakan login Flowbee di web.</div>`;
      return;
    }

    // Hanya tampilkan "Memuat" jika list belum ada isinya (mencegah glitch berkedip)
    if (!list.innerHTML || list.innerHTML.trim() === '') {
      list.innerHTML = `<div class="fb-empty">Memuat chat...</div>`;
    }

    try {
      const res = await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/chat')}?userId=${flowbeeUserId}`);
      const data = await res.json();
      renderChannelItemsDom(data.channels || [], list);
    } catch (e) {
      list.innerHTML = `<div class="fb-empty" style="color:#FA5252">Gagal memuat chat<br><small style="color:var(--fb-ink-mute);font-size:10px;display:block;margin-top:4px;">${e.message || String(e)}</small></div>`;
    }
  }

  // ── Fetch and re-render only the channel list (for unread badge updates) ──
  async function renderChatChannelList(silent = false) {
    if (!flowbeeUserId) return;
    const list = $('fb-chat-channel-list');
    if (!list || chatActiveChannelId) return; // only update when on channel list view
    
    try {
      const res = await window.__FB.fetch(`${FLOWBEE_API.replace('/ext', '/chat')}?userId=${flowbeeUserId}`);
      const data = await res.json();
      renderChannelItemsDom(data.channels || [], list);
    } catch (e) { /* offline — silent */ }
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
          const timeStr = new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const d = document.createElement('div');
          d.style.cssText = `display:flex; flex-direction:column; width:100%; font-family:inherit;`;
          
          if (isMe) {
            d.innerHTML = `
              <div style="display:flex; justify-content:flex-end; align-items:flex-end; gap:8px;">
                <div style="font-size:10px; color:var(--fb-ink-mute); display:flex; align-items:center; gap:4px; margin-bottom:4px; flex-shrink:0;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ${timeStr}
                </div>
                <div style="background:#8b5cf6 !important; color:white !important; padding:12px 16px !important; border-radius:18px 18px 4px 18px !important; font-size:13.5px !important; line-height:1.55 !important; max-width:75% !important; word-wrap:break-word !important; box-sizing:border-box !important; text-align:left !important;">
                  ${esc(m.content)}
                </div>
              </div>
            `;
          } else {
            d.innerHTML = `
              <div style="display:flex; flex-direction:column; align-items:flex-start; margin-left:42px; margin-bottom:4px;">
                <div style="font-size:11px; color:var(--fb-ink-mute); font-weight:600;">${esc(m.sender_name)}</div>
              </div>
              <div style="display:flex; justify-content:flex-start; align-items:flex-end; gap:8px;">
                <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, #e0e7ff, #c7d2fe); color:#1f2937; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; margin-bottom:2px;">
                  👤
                </div>
                <div style="background:var(--fb-line-soft) !important; color:var(--fb-ink) !important; border:1px solid var(--fb-line) !important; padding:12px 16px !important; border-radius:18px 18px 18px 4px !important; font-size:13.5px !important; line-height:1.55 !important; max-width:75% !important; word-wrap:break-word !important; box-sizing:border-box !important; text-align:left !important;">
                  ${esc(m.content)}
                </div>
                <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:4px; flex-shrink:0;">${timeStr}</div>
              </div>
            `;
          }
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
      d.style.cssText = `display:flex; flex-direction:column; width:100%; font-family:inherit; opacity:0.7;`;
      d.innerHTML = `
        <div style="display:flex; justify-content:flex-end; align-items:flex-end; gap:8px;">
          <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:4px; flex-shrink:0;">Mengirim...</div>
          <div style="background:#8b5cf6 !important; color:white !important; padding:12px 16px !important; border-radius:18px 18px 4px 18px !important; font-size:13.5px !important; line-height:1.55 !important; max-width:75% !important; word-wrap:break-word !important; box-sizing:border-box !important; text-align:left !important;">
            ${esc(txt)}
          </div>
        </div>
      `;
      msgWrap.appendChild(d);
      msgWrap.scrollTop = msgWrap.scrollHeight;

      try {
        await window.__FB.fetch(FLOWBEE_API.replace('/ext', '/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: chatActiveChannelId, senderId: flowbeeUserId, content: txt })
        });
        renderChatMessages(chatActiveChannelId);
        // ── Broadcast to all other tabs that chat has new message ──
        try {
          chrome.storage.local.set({ fb_chat_update: { ts: Date.now(), channelId: chatActiveChannelId } });
        } catch (e) { /* silent */ }
      } catch (e) { }
    };
  }

  const fbChatInput = $('fb-chat-input');
  if (fbChatInput) {
    fbChatInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('fb-chat-send-btn').click(); }
    };
  }

