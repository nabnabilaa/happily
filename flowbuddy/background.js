/* ==========================================================================
   FlowBuddy — Background Service Worker
   Simplified: alarms, notifications only. No focus mode.
   ========================================================================== */

// Track nudge IDs already shown this browser session (reset on service worker restart)
const _shownNudgeIds = new Set();

// ── Alarm Handler ──
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith('fb_')) return;
  const label = decodeURIComponent(alarm.name.split('__')[1] || 'Pengingat');
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '🐝 Flowbuddy by Maxy',
    message: label,
    priority: 2,
    requireInteraction: true
  });
});

// ── Message Handler ──
chrome.runtime.onMessage.addListener((msg, sender, res) => {
  // Sync User Auth Data from Content Script
  if (msg.type === 'SYNC_USER_DATA') {
    chrome.storage.local.set({ 'flowbuddy-user': msg.payload }, () => {
      res({ ok: true });
    });
    return true;
  }
  // Set Alarm
  if (msg.type === 'SET_ALARM') {
    const delay = (msg.timestamp - Date.now()) / 60000;
    if (delay <= 0) { res({ ok: false }); return true; }
    chrome.alarms.create(
      `fb_${msg.id}__${encodeURIComponent(msg.label)}`,
      { delayInMinutes: delay }
    );
    res({ ok: true });
    return true;
  }

  // Clear Alarm
  if (msg.type === 'CLEAR_ALARM') {
    chrome.alarms.getAll(alarms => {
      alarms
        .filter(a => a.name.includes(`_${msg.id}__`))
        .forEach(a => chrome.alarms.clear(a.name));
    });
    res({ ok: true });
    return true;
  }

  // Show Notification
  if (msg.type === 'SHOW_NOTIFICATION') {
    const notifId = msg.id ? String(msg.id) : 'fb_notif_' + Date.now();
    chrome.notifications.create(notifId, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: msg.title || '🐝 Flowbuddy by Maxy',
      message: msg.message || '',
      priority: 1
    });
    res({ ok: true });
    return true;
  }

  // Fetch API Proxy (for future use when connecting to Web App)
  if (msg.type === 'FETCH_API') {
    const opts = {
      method: msg.method || 'GET',
      headers: msg.headers || {}
    };
    if (msg.body) opts.body = msg.body;

    fetch(msg.url, opts)
      .then(async response => {
        const text = await response.text();
        let json;
        try { json = JSON.parse(text); } catch(e) { json = text; }
        res({
          success: true,
          result: { ok: response.ok, status: response.status, data: json }
        });
      })
      .catch(err => {
        res({ success: false, error: err.message || String(err) });
      });
    return true;
  }

  // Relay FORCE_SYNC to active tab, preserving optional flags (e.g. chatRequest)
  if (msg.type === 'FORCE_SYNC') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'FORCE_SYNC',
          chatRequest: !!msg.chatRequest,
        }).catch(() => {});
      }
    });
    res({ ok: true });
    return false;
  }

  // Deduplicate nudge overlays across tabs — only one tab shows it per session
  if (msg.type === 'SHOULD_SHOW_NUDGE') {
    if (!_shownNudgeIds.has(msg.notifId)) {
      _shownNudgeIds.add(msg.notifId);
      res({ show: true });
    } else {
      res({ show: false });
    }
    return true;
  }

  // Handle unknown messages so channel doesn't hang
  res({ ok: false, error: 'Unhandled message type' });
  return false;
});
