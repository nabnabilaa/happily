window.__FB = window.__FB || {};

// Inject CSS styles for the HR/People pane
(function injectPeopleStyles() {
  const styleId = 'fb-people-pane-styles';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .fb-people-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .fb-people-metric-card {
      background: rgba(123,107,181,0.06);
      border: 1px solid rgba(123,107,181,0.15);
      padding: 8px 10px;
      border-radius: 0px;
      text-align: center;
    }
    .fb-people-metric-lbl {
      font-size: 9px;
      font-weight: 800;
      color: #7B6BB5;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    .fb-people-metric-val {
      font-size: 15px;
      font-weight: 900;
      color: #1F1D1B;
    }
    .fb-people-metric-trend {
      font-size: 8.5px;
      font-weight: 700;
      margin-top: 1px;
    }
    .fb-people-metric-trend.pos { color: #86C0A9; }
    .fb-people-metric-trend.neg { color: #E88B7D; }
    .fb-people-section-title {
      font-size: 11px;
      font-weight: 800;
      color: #524E49;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 14px 0 8px 0;
      border-bottom: 1.5px solid rgba(31,29,27,0.06);
      padding-bottom: 4px;
    }
    .fb-people-risk-card {
      background: #fff;
      border: 1.5px solid rgba(31,29,27,0.07);
      border-left: 3.5px solid #E88B7D;
      padding: 10px 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .fb-people-risk-card.med {
      border-left-color: #ffd43b;
    }
    .fb-people-risk-info {
      flex: 1;
      min-width: 0;
    }
    .fb-people-risk-name {
      font-size: 12.5px;
      font-weight: 700;
      color: #1F1D1B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fb-people-risk-sub {
      font-size: 10px;
      color: #8A837C;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fb-people-risk-badge-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }
    .fb-people-risk-level {
      font-size: 8.5px;
      font-weight: 850;
      color: #fff;
      background: #E88B7D;
      padding: 1px 5px;
      text-transform: uppercase;
    }
    .fb-people-risk-level.med {
      background: #ffd43b;
      color: #1F1D1B;
    }
    .fb-people-risk-stats {
      font-size: 10px;
      font-weight: 650;
      color: #8A837C;
    }
    .fb-people-dept-card {
      background: #fff;
      border: 1px solid rgba(31,29,27,0.06);
      padding: 10px 12px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .fb-people-dept-name {
      font-size: 12px;
      font-weight: 700;
      color: #1F1D1B;
    }
    .fb-people-dept-headcount {
      font-size: 10px;
      color: #8A837C;
    }
    .fb-people-dept-metrics {
      display: flex;
      gap: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .fb-people-pulse-wellbeing {
      color: #86C0A9;
    }
    .fb-people-pulse-wellbeing.low {
      color: #E88B7D;
    }
    .fb-people-pulse-wellbeing.mid {
      color: #ffd43b;
    }
    .fb-people-pulse-engagement {
      color: #7B6BB5;
    }
    .fb-people-clean-success {
      background: rgba(134,192,169,0.06);
      border: 1px solid rgba(134,192,169,0.18);
      color: #4B7865;
      padding: 12px;
      font-size: 12px;
      font-weight: 650;
      text-align: center;
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
        <div class="fb-people-metric-trend" style="color:#8A837C;">Aktif</div>
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
    html += `<div style="font-size:11px; color:#A09A93; font-style:italic;">Data departemen tidak tersedia</div>`;
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
