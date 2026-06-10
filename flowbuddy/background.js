chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: 'FB_TOGGLE' }).catch(() => {})
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith('fb_')) return
  const label = decodeURIComponent(alarm.name.split('__')[1] || 'Alarm')
  chrome.notifications.create({ type:'basic', iconUrl:'icons/icon.png', title:'⏰ FocusBuddy', message:label, priority:2, requireInteraction:true })
  chrome.tabs.query({}, tabs => tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type:'FB_ALARM', label }).catch(()=>{})))
})

chrome.runtime.onMessage.addListener((msg, _, res) => {
  if (msg.type === 'FETCH_API') {
    const opts = {
      method: msg.method || 'GET',
      headers: msg.headers || {}
    }
    if (msg.body) {
      opts.body = msg.body
    }
    fetch(msg.url, opts)
      .then(async response => {
        const text = await response.text()
        let json
        try {
          json = JSON.parse(text)
        } catch(e) {
          json = text
        }
        res({
          success: true,
          result: {
            ok: response.ok,
            status: response.status,
            data: json
          }
        })
      })
      .catch(err => {
        res({
          success: false,
          error: err.message || String(err)
        })
      })
    return true
  }

  if (msg.type === 'SET_ALARM') {
    const delay = (msg.timestamp - Date.now()) / 60000
    if (delay <= 0) { res({ ok:false }); return true }
    chrome.alarms.create(`fb_${msg.id}__${encodeURIComponent(msg.label)}`, { delayInMinutes: delay })
    res({ ok:true })
  }
  if (msg.type === 'CLEAR_ALARM') {
    chrome.alarms.getAll(alarms => alarms.filter(a => a.name.includes(`_${msg.id}__`)).forEach(a => chrome.alarms.clear(a.name)))
    res({ ok:true })
  }
  if (msg.type === 'SHOW_NOTIFICATION') {
    const notifId = msg.id ? String(msg.id) : 'fb_notif_' + Date.now() + Math.random()
    chrome.notifications.create(notifId, {
      type: 'basic',
      iconUrl: 'icons/icon.png',
      title: msg.title || '🐝 Flowbee',
      message: msg.message || '',
      priority: 1
    })
    res({ ok:true })
  }

  // ── Focus Mode: Enable distraction blocking ──
  if (msg.type === 'FB_FOCUS_START') {
    const sitesToBlock = msg.sitesToBlock || ['youtube.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'reddit.com', 'facebook.com', 'netflix.com', 'twitch.tv'];
    
    // Create dynamic rules for selected sites
    const rules = sitesToBlock.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'redirect', redirect: { extensionPath: '/focus_blocked.html' } },
      condition: { urlFilter: domain, resourceTypes: ['main_frame'] }
    }));

    // First clear existing dynamic rules, then add new ones
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // Clear enough IDs
      addRules: rules
    }).then(() => {
      chrome.storage.local.set({ fb_focus_active: true, fb_focus_started: Date.now() })
      if (msg.durationMins) {
        chrome.alarms.create('fb_focus_end', { delayInMinutes: msg.durationMins })
      }
      chrome.tabs.query({}, tabs => {
        tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type: 'FB_FOCUS_STATUS', active: true }).catch(() => {}))
      })
      chrome.notifications.create('fb_focus_start', {
        type: 'basic', iconUrl: 'icons/icon.png', title: '🔒 Focus Mode Aktif',
        message: `Situs distraksi diblokir selama ${msg.durationMins || 25} menit. Semangat!`, priority: 2
      })
      res({ ok: true })
    }).catch(err => {
      console.error('Failed to set dynamic rules:', err)
      res({ ok: false, error: err.message })
    })
    return true
  }

  // ── Focus Mode: Disable distraction blocking ──
  if (msg.type === 'FB_FOCUS_END') {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    }).then(() => {
      chrome.storage.local.set({ fb_focus_active: false })
      chrome.alarms.clear('fb_focus_end')
      chrome.tabs.query({}, tabs => {
        tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type: 'FB_FOCUS_STATUS', active: false }).catch(() => {}))
      })
      chrome.notifications.create('fb_focus_end', {
        type: 'basic', iconUrl: 'icons/icon.png', title: '🎉 Focus Session Selesai!',
        message: 'Situs distraksi sudah dibuka kembali. Istirahat dulu ya!', priority: 1
      })
      res({ ok: true })
    }).catch(err => {
      res({ ok: false, error: err.message })
    })
    return true
  }

  // ── Focus Mode: Check status ──
  if (msg.type === 'FB_FOCUS_STATUS_CHECK') {
    chrome.storage.local.get(['fb_focus_active'], (data) => {
      res({ active: !!data.fb_focus_active })
    })
    return true
  }

  return true
})

// Auto-end focus when alarm fires
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'fb_focus_end') {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    }).then(() => {
      chrome.storage.local.set({ fb_focus_active: false })
      
      chrome.tabs.query({}, tabs => {
        tabs.forEach(t => {
          chrome.tabs.sendMessage(t.id, { type: 'FB_FOCUS_STATUS', active: false }).catch(() => {})
        })
      })
      
      chrome.notifications.create('fb_focus_auto_end', {
        type: 'basic',
        iconUrl: 'icons/icon.png',
        title: '🎉 Focus Session Selesai!',
        message: 'Waktu fokus habis. Situs distraksi sudah dibuka kembali.',
        priority: 2,
        requireInteraction: true
      })
    })
  }
})
