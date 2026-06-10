window.__FB = window.__FB || {};

window.__FB.ROLE_MODULES = {
  employee: {
    tabs: [
      { key: 'tasks', icon: '✅', label: 'Tugas' },
      { key: 'notes', icon: '📝', label: 'Catatan' },
      { key: 'timer', icon: '⏱',  label: 'Timer' },
      { key: 'alarm', icon: '🗓️', label: 'Kalender' },
      { key: 'chat',  icon: '💬', label: 'Chat' },
    ],
    features: ['tasks', 'notes', 'timer', 'calendar', 'chat', 'kpi_link'],
    accent: '#4A90E2',
    accentSoft: 'rgba(74,144,226,0.08)',
    label: 'Employee',
  },
  manager: {
    tabs: [
      { key: 'tasks',    icon: '✅', label: 'Tugas' },
      { key: 'team',     icon: '👥', label: 'Tim' },
      { key: 'notes',    icon: '📝', label: 'Catatan' },
      { key: 'timer',    icon: '⏱',  label: 'Timer' },
      { key: 'alarm',    icon: '🗓️', label: 'Kalender' },
      { key: 'chat',     icon: '💬', label: 'Chat' },
    ],
    features: ['tasks', 'notes', 'timer', 'calendar', 'chat', 'team_overview', 'verify_tasks', 'kpi_link'],
    accent: '#3B6FA0',
    accentSoft: 'rgba(59,111,160,0.08)',
    label: 'Manager',
  },
  hr: {
    tabs: [
      { key: 'tasks',    icon: '✅', label: 'Tugas' },
      { key: 'people',   icon: '🏢', label: 'People' },
      { key: 'notes',    icon: '📝', label: 'Catatan' },
      { key: 'timer',    icon: '⏱',  label: 'Timer' },
      { key: 'alarm',    icon: '🗓️', label: 'Kalender' },
      { key: 'chat',     icon: '💬', label: 'Chat' },
    ],
    features: ['tasks', 'notes', 'timer', 'calendar', 'chat', 'people_overview', 'company_metrics', 'kpi_link'],
    accent: '#7B6BB5',
    accentSoft: 'rgba(123,107,181,0.08)',
    label: 'HR',
  },
};
window.__FB.currentUser = null;

window.__FB.getActiveRole = function() {
  const r = (window.__FB.currentUser?.role || 'employee').toLowerCase();
  return r;
};

window.__FB.getRoleConfig = function() {
  const role = window.__FB.getActiveRole();
  return window.__FB.ROLE_MODULES[role] || window.__FB.ROLE_MODULES.employee;
};

window.__FB.roleHas = function(feature) {
  return window.__FB.getRoleConfig().features.includes(feature);
};

window.__FB.fetch = async function(url, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'FETCH_API',
      url: url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body
    }, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (res && res.success) {
        resolve({
          ok: res.result.ok,
          status: res.result.status,
          json: async () => res.result.data,
          text: async () => typeof res.result.data === 'string' ? res.result.data : JSON.stringify(res.result.data)
        });
      } else {
        reject(new Error(res ? res.error : 'Unknown network error'));
      }
    });
  });
};

