chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith('fb_')) return
  const label = decodeURIComponent(alarm.name.split('__')[1] || 'Alarm')
  chrome.notifications.create({ type:'basic', iconUrl:'icons/icon.png', title:'⏰ FocusBuddy', message:label, priority:2, requireInteraction:true })
  chrome.tabs.query({}, tabs => tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type:'FB_ALARM', label }).catch(()=>{})))
})

chrome.runtime.onMessage.addListener((msg, _, res) => {
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
    chrome.notifications.create('fb_notif_' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon.png',
      title: msg.title || '🐝 Flowbee',
      message: msg.message || '',
      priority: 1
    })
    res({ ok:true })
  }
  return true
})
