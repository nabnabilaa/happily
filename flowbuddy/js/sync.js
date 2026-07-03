let FLOWBEE_API = 'https://flowbuddy.maxy.academy/api/ext';
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
          window.fbCtx.calendar = r.fb3.calendar || [];
          window.fbCtx.notifications = r.fb3.notifications || [];
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

async function flowbeeSyncAll(pullOnly = false, chatRequest = false) {
  if (document.hidden) return;
  if (!flowbeeUserId || !extensionEnabled) return;
  try {
    let localTasks = [];
    let localNotes = [];
    let localHabits = [];
    let localDeletedTaskIds = [];
    let localDeletedNoteIds = [];

    // Capture pending read IDs to send this cycle, then clear them after success
    const pendingReads = [...(window.fbCtx.pendingReadNotifIds || [])];

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
        chatRequest: chatRequest,
        deletedTaskIds: localDeletedTaskIds,
        deletedNoteIds: localDeletedNoteIds,
        readNotifIds: pendingReads,
      })
    });
    let data;
    try {
      data = await res.json();
    } catch (err) {
      console.warn("Flowbuddy Sync: Server returned non-JSON response (likely Next.js compiling). Retrying later.");
      return;
    }
    
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
      if (data.calendar !== undefined) window.fbCtx.calendar = data.calendar;
      if (data.notifications !== undefined) {
        window.fbCtx.notifications = data.notifications;
        // Clear pending reads that were acknowledged by the server
        if (pendingReads.length > 0) {
          window.fbCtx.pendingReadNotifIds = (window.fbCtx.pendingReadNotifIds || []).filter(id => !pendingReads.includes(id));
        }
        // Check for new senggol / apresiasi to show as overlay
        fbCheckNudgeNotifications(data.notifications);
      }
      
      // Merge tasks
      if (data.tasks) {
        let changed = false;
        data.tasks.forEach(wt => {
          const existing = window.fbCtx.tasks.find(lt => String(lt.id) === String(wt.id));
          if (!existing) {
            window.fbCtx.tasks.push({
              id: wt.id, text: wt.title, done: wt.done, date: wt.date || fbToday(), targetDate: wt.targetDate || null, description: wt.description || null, proofLink: wt.proofLink || null, priority: wt.energy || 'mid', progress: wt.progress || 0, created_at: wt.created_at || null
            });
            changed = true;
          } else {
            if (
              existing.done !== wt.done || 
              existing.text !== wt.title || 
              existing.progress !== (wt.progress || 0) ||
              existing.priority !== (wt.energy || 'mid') ||
              existing.created_at !== wt.created_at ||
              existing.targetDate !== wt.targetDate ||
              existing.description !== wt.description ||
              existing.proofLink !== wt.proofLink ||
              existing.date !== wt.date
            ) {
              existing.done = wt.done;
              existing.text = wt.title;
              existing.progress = wt.progress || 0;
              existing.priority = wt.energy || 'mid';
              existing.created_at = wt.created_at;
              existing.targetDate = wt.targetDate;
              existing.description = wt.description;
              existing.proofLink = wt.proofLink;
              if (wt.date) existing.date = wt.date;
              changed = true;
            }
          }
        });
        
        const webTaskIds = new Set(data.tasks.map(wt => String(wt.id)));
        const oldLen = window.fbCtx.tasks.length;
        window.fbCtx.tasks = window.fbCtx.tasks.filter(lt => {
          if (webTaskIds.has(String(lt.id))) return true;
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
  if (event.data && (event.data.type === 'FLOWBEE_DB_UPDATE' || event.data.type === 'FLOWBEE_WEBSITE_UPDATE')) {
    flowbeeSyncAll(true);
  }
});

// Listen to messages from extension popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FORCE_SYNC') {
    const isChatReq = !!msg.chatRequest;
    chrome.storage.local.get('fb3', (res) => {
      if (res.fb3) {
        if (res.fb3.tasks !== undefined) window.fbCtx.tasks = res.fb3.tasks;
        if (res.fb3.notes !== undefined) window.fbCtx.notes = res.fb3.notes;
        if (res.fb3.alarms !== undefined) window.fbCtx.alarms = res.fb3.alarms;
        if (res.fb3.deletedTaskIds !== undefined) window.fbCtx.deletedTaskIds = res.fb3.deletedTaskIds;
        if (res.fb3.deletedNoteIds !== undefined) window.fbCtx.deletedNoteIds = res.fb3.deletedNoteIds;
      }
      flowbeeSyncAll(false, isChatReq);
    });
    sendResponse({ ok: true });
    return true;
  }
});

// ── Nudge / Apresiasi Overlay ─────────────────────────────────────────────

function fbDetectNudge(notif) {
  const t = notif.title || '';
  const m = notif.message || '';

  // Apresiasi (kudos): type=success, title contains "mengirim apresiasi"
  if (notif.type === 'success' && t.includes('mengirim apresiasi')) {
    const from = t.replace('🌱 ', '').replace(' mengirim apresiasi', '').trim() || 'Seseorang';
    return { id: notif.id, type: 'kudos', from, message: m };
  }

  // Senggol / greet: message contains Indonesian greeting patterns
  if (t.includes('Sapaan Baru') || t.includes('Ajak Ngopi') ||
      m.includes('menyapamu') || m.includes('mengajakmu')) {
    const fromMatch = m.match(/^(.+?)\s+(?:menyapamu|mengajakmu)/);
    const from = fromMatch ? fromMatch[1].trim() : 'Seseorang';
    return { id: notif.id, type: 'senggol', from, message: m };
  }

  return null;
}

let _fbNudgeQueue = [];
let _fbIsShowingNudge = false;

function fbCheckNudgeNotifications(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return;
  const shown = window.fbCtx.shownNotifIds || [];

  notifications.forEach(n => {
    if (shown.includes(n.id)) return;
    const nudge = fbDetectNudge(n);
    if (!nudge) return;

    // Ask background.js — only the first tab to ask gets to show it
    try {
      chrome.runtime.sendMessage({ type: 'SHOULD_SHOW_NUDGE', notifId: n.id }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp && resp.show) {
          window.fbCtx.shownNotifIds.push(n.id);
          window.fbCtx.pendingReadNotifIds.push(n.id);
          _fbNudgeQueue.push(nudge);
          fbProcessNudgeQueue();
        }
      });
    } catch (e) { /* context invalidated, ignore */ }
  });
}

function fbProcessNudgeQueue() {
  if (_fbIsShowingNudge || _fbNudgeQueue.length === 0) return;
  _fbIsShowingNudge = true;
  const nudge = _fbNudgeQueue.shift();
  fbShowNudgeOverlay(nudge, () => {
    _fbIsShowingNudge = false;
    setTimeout(fbProcessNudgeQueue, 300);
  });
}

function fbShowNudgeOverlay(nudge, onCloseCb) {
  // Inject keyframe animation once
  if (!document.getElementById('fb-nudge-style')) {
    const style = document.createElement('style');
    style.id = 'fb-nudge-style';
    style.textContent = `
      @keyframes fb-buddy-float {
        0%   { transform: translateY(0); }
        100% { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
  }

  // Remove any existing overlay
  const old = document.getElementById('fb-nudge-overlay');
  if (old) old.remove();

  const isKudos  = nudge.type === 'kudos';
  const gid      = 'fbg' + Date.now();
  const w1       = isKudos ? '#FEEAF1' : '#E0F2FE';
  const w2       = isKudos ? '#F06595' : '#38BDF8';
  const wp       = isKudos ? '#FAA2C1' : '#93C5FD';
  const mouth    = isKudos
    ? 'M 78 125 Q 100 152 122 125'
    : 'M 82 128 Q 100 145 118 128';
  const cardBg   = isKudos
    ? 'linear-gradient(135deg,#FFBE0B,#FF9F1C)'
    : 'linear-gradient(135deg,#38bdf8,#818cf8)';
  const btnColor = isKudos ? '#FF9F1C' : '#38bdf8';
  const label    = isKudos ? '✨ Apresiasi Baru ✨' : '👀 Senggolan Masuk';
  const headline = isKudos
    ? `Wah! Pesan manis dari ${fbEscHtml(nudge.from)}!`
    : `${fbEscHtml(nudge.from)} baru saja menyenggolmu!`;
  const bodyText = nudge.message
    ? (isKudos ? `"${fbEscHtml(nudge.message)}"` : fbEscHtml(nudge.message))
    : (isKudos ? '"Kerja bagus!"' : 'Ayo semangat, jangan melamun!');
  const btnLabel = isKudos ? 'Yeay, Terima Kasih! 💛' : 'Oke, Siap! 🚀';

  const buddySVG = `
    <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" width="120" height="130"
         style="animation:fb-buddy-float 1.6s ease-in-out infinite alternate;display:block;">
      <defs>
        <radialGradient id="${gid}" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stop-color="${w1}"/>
          <stop offset="100%" stop-color="${w2}"/>
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="120" rx="65" ry="72" fill="url(#${gid})"/>
      <ellipse cx="72"  cy="130" rx="13" ry="9"  fill="${wp}" opacity=".55"/>
      <ellipse cx="128" cy="130" rx="13" ry="9"  fill="${wp}" opacity=".55"/>
      <ellipse cx="85"  cy="105" rx="9"  ry="11" fill="#1a1a2e"/>
      <ellipse cx="115" cy="105" rx="9"  ry="11" fill="#1a1a2e"/>
      <ellipse cx="88"  cy="101" rx="3.5" ry="3.5" fill="white"/>
      <ellipse cx="118" cy="101" rx="3.5" ry="3.5" fill="white"/>
      <path d="${mouth}" stroke="#1a1a2e" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    </svg>`;

  const overlay = document.createElement('div');
  overlay.id = 'fb-nudge-overlay';
  overlay.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
    'z-index:2147483647',
    'display:flex', 'align-items:center', 'justify-content:center',
    'padding:24px',
    'background:rgba(0,0,0,0.5)',
    'backdrop-filter:blur(6px)', '-webkit-backdrop-filter:blur(6px)',
    'opacity:0', 'transition:opacity .3s ease',
    "font-family:'Nunito',system-ui,sans-serif",
  ].join(';');

  overlay.innerHTML = `
    <div id="fb-nudge-card" style="
      background:${cardBg};border-radius:24px;padding:24px 20px 20px;
      width:100%;max-width:320px;text-align:center;
      box-shadow:0 24px 48px rgba(0,0,0,.25);
      transform:scale(.75) translateY(24px);
      transition:all .4s cubic-bezier(.34,1.56,.64,1);
      position:relative;color:#fff;
    ">
      <div style="margin-top:-56px;margin-bottom:10px;display:flex;justify-content:center;">
        ${buddySVG}
      </div>
      <div style="font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;
                  color:rgba(255,255,255,.9);margin-bottom:8px;">${label}</div>
      <div style="font-size:20px;font-weight:900;margin-bottom:14px;line-height:1.3;">
        ${headline}
      </div>
      <div style="background:rgba(255,255,255,.18);padding:14px 16px;border-radius:14px;
                  font-size:14px;font-weight:700;line-height:1.5;
                  border:1.5px solid rgba(255,255,255,.3);margin-bottom:22px;
                  ${isKudos ? 'font-style:italic;' : ''}">
        ${bodyText}
      </div>
      <button id="fb-nudge-btn" style="
        padding:12px 28px;border-radius:100px;border:none;
        background:#fff;color:${btnColor};
        font-family:inherit;font-weight:900;font-size:15px;cursor:pointer;
        box-shadow:0 6px 14px rgba(0,0,0,.12);
      ">${btnLabel}</button>
    </div>`;

  document.body.appendChild(overlay);

  // Animate in on next frame
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    const card = document.getElementById('fb-nudge-card');
    if (card) card.style.transform = 'scale(1) translateY(0)';
  });

  const dismiss = () => {
    overlay.style.opacity = '0';
    const card = document.getElementById('fb-nudge-card');
    if (card) card.style.transform = 'scale(.9) translateY(20px)';
    setTimeout(() => { 
      if (overlay.parentNode) overlay.remove(); 
      if (typeof onCloseCb === 'function') onCloseCb();
    }, 350);
  };

  document.getElementById('fb-nudge-btn').addEventListener('click', dismiss);
  overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(); });
  setTimeout(dismiss, 10000);
}

function fbEscHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Initial triggers — only pull after 3s so storage loads first
setTimeout(() => {
  detectFlowbeeUser();
  flowbeeSyncAll(true);
}, 3000);

// Pull sync every 30s (was 5s). Only run when tab is visible to avoid ghost requests.
setInterval(() => {
  if (document.hidden) return;
  detectFlowbeeUser();
  flowbeeSyncAll(true);
}, 30000);
