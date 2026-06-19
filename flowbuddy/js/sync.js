let FLOWBEE_API = 'http://localhost:3000/api/ext';
let flowbeeUserId = null;
let flowbeeUser = null;
let todayAttendance = null;
let extensionEnabled = true;
let noteAllUsers = [];

// Utility to send message to background to fetch API
window.fbFetchAPI = function(url, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'FETCH_API',
      url: url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body
    }, (res) => {
      if (res && res.success) {
        // Mock a Response object
        resolve({
          ok: res.result.ok,
          status: res.result.status,
          json: async () => typeof res.result.data === 'string' ? JSON.parse(res.result.data) : res.result.data
        });
      } else {
        reject(new Error(res ? res.error : 'No response from background'));
      }
    });
  });
};

function detectFlowbeeUser() {
  try {
    const stored = localStorage.getItem('hp_user_id');
    if (stored) {
      if (flowbeeUserId && flowbeeUserId !== stored) {
        window.fbCtx.tasks = []; window.fbCtx.notes = []; window.fbCtx.alarms = [];
        window.fbCtx.deletedTaskIds = []; window.fbCtx.deletedNoteIds = [];
        flowbeeUser = null;
        todayAttendance = null;
      }
      flowbeeUserId = stored;
      const origin = location.origin;
      FLOWBEE_API = origin.replace(/\/$/, '') + '/api/ext';
      chrome.storage.local.set({ flowbee_user_id: stored, flowbee_base_url: origin });
      return;
    }
  } catch (e) {}

  try {
    chrome.storage.local.get(['flowbee_user_id', 'flowbee_base_url', 'flowbee_user', 'flowbee_today_attendance', 'fb3'], r => {
      if (r) {
        // Detect logout on the web app tab itself
        if (r.flowbee_base_url && location.origin === r.flowbee_base_url) {
          try {
            const stored = localStorage.getItem('hp_user_id');
            if (!stored && r.flowbee_user_id) {
              chrome.storage.local.remove(['flowbee_user_id', 'flowbee_user', 'flowbee_today_attendance', 'fb3', 'flowbuddy-user']);
              flowbeeUserId = null;
              flowbeeUser = null;
              todayAttendance = null;
              window.fbCtx.tasks = []; window.fbCtx.notes = [];
              const mc = document.getElementById('flowbuddy-mascot-container');
              if (mc) mc.style.display = 'none';
              return;
            }
          } catch(e){}
        }

        // Detect if another tab logged out (chrome.storage is missing user id)
        if (!r.flowbee_user_id && flowbeeUserId) {
          chrome.storage.local.remove(['flowbuddy-user']);
          flowbeeUserId = null;
          flowbeeUser = null;
          todayAttendance = null;
          window.fbCtx.tasks = []; window.fbCtx.notes = [];
          const mc = document.getElementById('flowbuddy-mascot-container');
          if (mc) mc.style.display = 'none';
          return;
        }

        if (r.flowbee_user_id) flowbeeUserId = r.flowbee_user_id;
        if (r.flowbee_base_url) FLOWBEE_API = r.flowbee_base_url.replace(/\/$/, '') + '/api/ext';
        if (r.flowbee_today_attendance) todayAttendance = r.flowbee_today_attendance;
        if (r.flowbee_user && !flowbeeUser) {
          flowbeeUser = r.flowbee_user;
          chrome.runtime.sendMessage({ type: 'SYNC_USER_DATA', payload: flowbeeUser });
        }
        if (r.fb3) {
          window.fbCtx.tasks = r.fb3.tasks || [];
          window.fbCtx.notes = r.fb3.notes || [];
          window.fbCtx.alarms = r.fb3.alarms || [];
          window.fbCtx.deletedTaskIds = r.fb3.deletedTaskIds || [];
          window.fbCtx.deletedNoteIds = r.fb3.deletedNoteIds || [];
          window.fbCtx.members = r.fb3.members || [];
          window.fbCtx.teamTasks = r.fb3.teamTasks || [];
          window.fbCtx.teamGoals = r.fb3.teamGoals || [];
          window.fbCtx.teamApprovals = r.fb3.teamApprovals || [];
          window.fbCtx.metrics = r.fb3.metrics || null;
          window.fbCtx.atRiskEmployees = r.fb3.atRiskEmployees || [];
          window.fbCtx.deptPulse = r.fb3.deptPulse || [];
          window.fbCtx.chats = r.fb3.chats || [];
        }
      }
    });
  } catch (e) {
    // Ignore context invalidated errors during reload
    if (!e.message.includes('Extension context invalidated')) {
      console.error(e);
    }
  }
}

function isHappilyWebsite() {
  try { return !!localStorage.getItem('hp_user_id'); } catch (e) { return false; }
}

async function flowbeeSyncAll(pullOnly = false) {
  if (document.hidden) return;
  if (!flowbeeUserId || !extensionEnabled) return;
  try {
    let localTasks = [];
    let localNotes = [];
    let localHabits = [];
    let localDeletedTaskIds = [];
    let localDeletedNoteIds = [];

    if (!pullOnly) {
      localTasks = window.fbCtx.tasks.filter(t => t.date === fbToday()).map(t => ({
        id: String(t.id), title: t.text || t.title || '', done: !!t.done,
        energy: t.priority || 'mid', est: '30m', tone: 'sage',
        proofLink: t.proofLink || null,
        progress: t.progress || 0,
        isProject: !!t.isProject,
        description: t.description || null,
        targetDate: t.targetDate || null
      }));

      localNotes = window.fbCtx.notes.map(n => ({
        id: String(n.id), title: n.title || '', content: n.text || n.content || ''
      }));

      localHabits = (window.fbCtx.habits || []).map(h => ({
        name: h.name, streak: h.streak || 0, target: h.target || 30, done: !!h.done
      }));
      
      localDeletedTaskIds = window.fbCtx.deletedTaskIds || [];
      localDeletedNoteIds = window.fbCtx.deletedNoteIds || [];
    }

    const res = await window.fbFetchAPI(`${FLOWBEE_API}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: flowbeeUserId,
        tasks: localTasks,
        notes: localNotes,
        habits: localHabits,
        calendarRequest: true,
        deletedTaskIds: localDeletedTaskIds,
        deletedNoteIds: localDeletedNoteIds,
      })
    });
    
    const data = await res.json();
    if (data.success) {
      if (!pullOnly) {
        window.fbCtx.deletedTaskIds = [];
        window.fbCtx.deletedNoteIds = [];
      }
      
      if (data.todayAttendance) {
        todayAttendance = data.todayAttendance;
        chrome.storage.local.set({ flowbee_today_attendance: todayAttendance });
      } else {
        todayAttendance = null;
        chrome.storage.local.remove('flowbee_today_attendance');
      }

      if (data.user) {
        flowbeeUser = data.user;
        try {
          chrome.storage.local.set({ flowbee_user: data.user });
          chrome.runtime.sendMessage({ type: 'SYNC_USER_DATA', payload: data.user });
        } catch (e) {
          if (!e.message.includes('Extension context invalidated')) console.error(e);
        }
      }

      if (data.allUsers) {
        noteAllUsers = data.allUsers;
        window.fbCtx.allUsers = data.allUsers;
      }
      
      if (data.members !== undefined) window.fbCtx.members = data.members;
      if (data.teamTasks !== undefined) window.fbCtx.teamTasks = data.teamTasks;
      if (data.teamGoals !== undefined) window.fbCtx.teamGoals = data.teamGoals;
      if (data.teamApprovals !== undefined) window.fbCtx.teamApprovals = data.teamApprovals;
      if (data.metrics !== undefined) window.fbCtx.metrics = data.metrics;
      if (data.atRiskEmployees !== undefined) window.fbCtx.atRiskEmployees = data.atRiskEmployees;
      if (data.deptPulse !== undefined) window.fbCtx.deptPulse = data.deptPulse;
      if (data.chats !== undefined) window.fbCtx.chats = data.chats;
      
      // Merge tasks
      if (data.tasks) {
        let changed = false;
        data.tasks.forEach(wt => {
          const existing = window.fbCtx.tasks.find(lt => String(lt.id) === String(wt.id));
          if (!existing) {
            window.fbCtx.tasks.push({
              id: wt.id, text: wt.title, done: wt.done, date: wt.date || fbToday(), priority: wt.energy || 'mid', progress: wt.progress || 0
            });
            changed = true;
          } else {
            if (existing.done !== wt.done || existing.text !== wt.title || existing.progress !== (wt.progress || 0)) {
              existing.done = wt.done;
              existing.text = wt.title;
              existing.progress = wt.progress || 0;
              changed = true;
            }
          }
        });
        
        const webTaskIds = new Set(data.tasks.map(wt => String(wt.id)));
        const oldLen = window.fbCtx.tasks.length;
        window.fbCtx.tasks = window.fbCtx.tasks.filter(lt => {
          if (lt.date !== fbToday() || webTaskIds.has(String(lt.id))) return true;
          if (window.fbCtx.deletedTaskIds && window.fbCtx.deletedTaskIds.includes(String(lt.id))) return true;
          return false;
        });
        if (window.fbCtx.tasks.length !== oldLen) changed = true;
      }

      // Merge notes
      if (data.notes) {
        data.notes.forEach(wn => {
          const existing = window.fbCtx.notes.find(ln => String(ln.id) === String(wn.id));
          if (!existing) {
            window.fbCtx.notes.push({ id: wn.id, title: wn.title || '', text: wn.content || '' });
          } else {
            existing.title = wn.title;
            existing.text = wn.content;
          }
        });
        const webNoteIds = new Set(data.notes.map(wn => String(wn.id)));
        window.fbCtx.notes = window.fbCtx.notes.filter(ln => webNoteIds.has(String(ln.id)) || (window.fbCtx.deletedNoteIds && window.fbCtx.deletedNoteIds.includes(String(ln.id))));
      }

      // Save to chrome.storage for popup to read
      try {
        chrome.storage.local.set({ fb3: window.fbCtx });
      } catch (e) {
        if (!e.message.includes('Extension context invalidated')) console.error(e);
      }
    }
  } catch (e) {
    console.error("FlowBuddy Sync Error:", e);
  }
}

// Global hook to force push from UI
window.fbForceSync = function() {
  flowbeeSyncAll(false);
};

// Listen to messages from window (web-to-extension)
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FLOWBEE_DB_UPDATE') {
    flowbeeSyncAll(true);
  }
});

// Listen to messages from extension popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FORCE_SYNC') {
    flowbeeSyncAll(false);
    sendResponse({ ok: true });
  }
});

// Initial triggers
setTimeout(() => {
  detectFlowbeeUser();
  flowbeeSyncAll();
}, 2000);

setInterval(() => {
  detectFlowbeeUser();
  flowbeeSyncAll();
}, 5000);
