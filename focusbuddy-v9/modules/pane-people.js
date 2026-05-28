window.__FB = window.__FB || {};

// Inject CSS styles for the HR/People pane
(function injectPeopleStyles() {
  const styleId = 'fb-people-pane-styles';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .fb-people-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 10px !important;
      margin-bottom: 18px !important;
    }
    .fb-people-metric-card {
      background: var(--fb-card) !important;
      border: 1.5px solid var(--fb-line) !important;
      padding: 14px 10px !important;
      border-radius: 14px !important;
      text-align: center !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03) !important;
    }
    .fb-people-metric-card:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 20px rgba(0,0,0,0.06) !important;
    }
    .fb-people-metric-lbl {
      font-size: 10px !important;
      font-weight: 800 !important;
      color: var(--fb-blue) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      margin-bottom: 6px !important;
    }
    .fb-people-metric-val {
      font-size: 18px !important;
      font-weight: 850 !important;
      color: var(--fb-ink) !important;
    }
    .fb-people-metric-trend {
      font-size: 9px !important;
      font-weight: 700 !important;
      margin-top: 2px !important;
    }
    .fb-people-metric-trend.pos { color: #86C0A9 !important; }
    .fb-people-metric-trend.neg { color: #E88B7D !important; }
    .fb-people-section-title {
      font-size: 11.5px !important;
      font-weight: 800 !important;
      color: var(--fb-ink) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.8px !important;
      margin: 20px 0 12px 0 !important;
      border-bottom: 1.5px solid var(--fb-line) !important;
      padding-bottom: 8px !important;
    }
    .fb-people-risk-card {
      background: var(--fb-card) !important;
      border: 1.5px solid var(--fb-line) !important;
      border-left: 4.5px solid #E88B7D !important;
      padding: 14px 16px !important;
      margin-bottom: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
      border-radius: 14px !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03) !important;
    }
    .fb-people-risk-card:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important;
    }
    .fb-people-risk-card.med {
      border-left-color: var(--fb-yellow) !important;
    }
    .fb-people-risk-info {
      flex: 1 !important;
      min-width: 0 !important;
    }
    .fb-people-risk-name {
      font-size: 13.5px !important;
      font-weight: 700 !important;
      color: var(--fb-ink) !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .fb-people-risk-sub {
      font-size: 11px !important;
      color: var(--fb-ink-mute) !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      margin-top: 2px !important;
    }
    .fb-people-risk-badge-wrap {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 4px !important;
      flex-shrink: 0 !important;
    }
    .fb-people-risk-level {
      font-size: 9px !important;
      font-weight: 850 !important;
      color: #fff !important;
      background: #E88B7D !important;
      padding: 3px 8px !important;
      text-transform: uppercase !important;
      border-radius: 6px !important;
    }
    .fb-people-risk-level.med {
      background: var(--fb-yellow-soft) !important;
      color: var(--fb-yellow-dark) !important;
      border: 1px solid var(--fb-yellow) !important;
    }
    .fb-people-risk-stats {
      font-size: 10px !important;
      font-weight: 650 !important;
      color: var(--fb-ink-mute) !important;
    }
    .fb-people-dept-card {
      background: var(--fb-card) !important;
      border: 1.5px solid var(--fb-line) !important;
      padding: 14px 16px !important;
      margin-bottom: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-radius: 14px !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03) !important;
    }
    .fb-people-dept-card:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important;
    }
    .fb-people-dept-name {
      font-size: 13px !important;
      font-weight: 700 !important;
      color: var(--fb-ink) !important;
    }
    .fb-people-dept-headcount {
      font-size: 11px !important;
      color: var(--fb-ink-mute) !important;
      margin-top: 2px !important;
    }
    .fb-people-dept-metrics {
      display: flex !important;
      gap: 12px !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
    }
    .fb-people-pulse-wellbeing {
      color: #86C0A9 !important;
    }
    .fb-people-pulse-wellbeing.low {
      color: #E88B7D !important;
    }
    .fb-people-pulse-wellbeing.mid {
      color: var(--fb-yellow-dark) !important;
    }
    .fb-people-pulse-engagement {
      color: var(--fb-blue) !important;
    }
    .fb-people-clean-success {
      background: rgba(134,192,169,0.12) !important;
      border: 1.5px solid rgba(134,192,169,0.3) !important;
      color: #86C0A9 !important;
      padding: 16px !important;
      font-size: 13px !important;
      font-weight: 650 !important;
      text-align: center !important;
      border-radius: 14px !important;
    }
  `;
  document.head.appendChild(style);
})();

window.__FB.renderPeoplePane = function() {
  const fbRoot = document.querySelector('#fb-root');
  const container = (fbRoot?.shadowRoot || fbRoot)?.querySelector('#fb-people-list');
  const emptyEl = (fbRoot?.shadowRoot || fbRoot)?.querySelector('#fb-people-empty');
  if (!container) return;

  const roleData = window.__FB.roleData;
  const metrics = roleData?.metrics;
  const atRiskEmployees = roleData?.atRiskEmployees || [];
  const deptPulse = roleData?.deptPulse || [];

  if (!metrics) {
    if (emptyEl) emptyEl.style.display = 'flex';
    container.innerHTML = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  // 1. Grid Metrics
  const engagementTrend = parseFloat(metrics.engagementTrend || 0);
  const wellbeingTrend = parseFloat(metrics.wellbeingTrend || 0);

  let html = `
    <div class="fb-people-grid">
      <div class="fb-people-metric-card">
        <div class="fb-people-metric-lbl">Karyawan</div>
        <div class="fb-people-metric-val">${metrics.totalEmployees || 0}</div>
        <div class="fb-people-metric-trend" style="color:var(--fb-ink-mute);">Aktif</div>
      </div>
      <div class="fb-people-metric-card">
        <div class="fb-people-metric-lbl">Keterlibatan</div>
        <div class="fb-people-metric-val">${metrics.engagementScore || 0}%</div>
        <div class="fb-people-metric-trend ${engagementTrend >= 0 ? 'pos' : 'neg'}">
          ${engagementTrend >= 0 ? '▲ +' : '▼ '}${metrics.engagementTrend}%
        </div>
      </div>
      <div class="fb-people-metric-card">
        <div class="fb-people-metric-lbl">Kesejahteraan</div>
        <div class="fb-people-metric-val">${metrics.wellbeingAvg || 0}%</div>
        <div class="fb-people-metric-trend ${wellbeingTrend >= 0 ? 'pos' : 'neg'}">
          ${wellbeingTrend >= 0 ? '▲ +' : '▼ '}${metrics.wellbeingTrend}%
        </div>
      </div>
    </div>
  `;

  // 2. At-Risk Employees
  html += `<div class="fb-people-section-title">Karyawan Berisiko (${atRiskEmployees.length})</div>`;
  if (atRiskEmployees.length === 0) {
    html += `
      <div class="fb-people-clean-success">
        😊 Semua karyawan dalam kondisi baik hari ini!
      </div>
    `;
  } else {
    atRiskEmployees.forEach(emp => {
      const isHigh = emp.risk === 'high';
      html += `
        <div class="fb-people-risk-card ${isHigh ? '' : 'med'}">
          <div class="fb-people-risk-info">
            <div class="fb-people-risk-name">${esc(emp.name)}</div>
            <div class="fb-people-risk-sub">${esc(emp.role)} • ${esc(emp.dept)}</div>
          </div>
          <div class="fb-people-risk-badge-wrap">
            <span class="fb-people-risk-level ${isHigh ? '' : 'med'}">${isHigh ? 'High' : 'Med'}</span>
            <span class="fb-people-risk-stats">😊 ${emp.wellbeing}% • ✅ ${emp.completionRate}%</span>
          </div>
        </div>
      `;
    });
  }

  // 3. Department Pulse
  html += `<div class="fb-people-section-title">Nadi Departemen</div>`;
  if (deptPulse.length === 0) {
    html += `<div style="font-size:11.5px; color:var(--fb-ink-mute); font-style:italic;">Data departemen tidak tersedia</div>`;
  } else {
    deptPulse.forEach(dept => {
      let wbClass = '';
      if (dept.wellbeing < 40) wbClass = 'low';
      else if (dept.wellbeing < 70) wbClass = 'mid';

      html += `
        <div class="fb-people-dept-card">
          <div>
            <div class="fb-people-dept-name">${esc(dept.dept)}</div>
            <div class="fb-people-dept-headcount">${dept.headcount} anggota${dept.atRisk > 0 ? ` • <span style="color:#E88B7D; font-weight:700;">${dept.atRisk} berisiko</span>` : ''}</div>
          </div>
          <div class="fb-people-dept-metrics">
            <span class="fb-people-pulse-wellbeing ${wbClass}" title="Wellbeing">😊 ${dept.wellbeing}%</span>
            <span class="fb-people-pulse-engagement" title="Engagement">✅ ${dept.engagement}%</span>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = html;
};

// Helper function to escape HTML
function esc(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
