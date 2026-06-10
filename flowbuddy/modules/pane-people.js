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
      padding: 12px 14px !important;
      margin-bottom: 10px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 8px !important;
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
      flex-direction: column !important;
      align-items: stretch !important;
      border-radius: 14px !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03) !important;
    }
    .fb-people-dept-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      cursor: pointer !important;
      width: 100% !important;
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
      const triggers = [];
      if (emp.wellbeing < 50) {
        triggers.push(`Tingkat wellbeing rendah (Skor ${emp.wellbeing}/100${emp.mood ? ` - Mood: ${emp.mood}` : ''})`);
      }
      if (emp.completionRate < 30) {
        triggers.push(`Penyelesaian tugas harian di bawah target (Hanya ${emp.completionRate}%)`);
      }
      if (triggers.length === 0) {
        triggers.push("Penurunan konsistensi performa kerja mingguan");
      }

      html += `
        <div class="fb-people-risk-card ${isHigh ? '' : 'med'}">
          <div style="display: flex !important; justify-content: space-between !important; align-items: flex-start !important; gap: 12px !important;">
            <div class="fb-people-risk-info">
              <div class="fb-people-risk-name">${esc(emp.name)}</div>
              <div class="fb-people-risk-sub">${esc(emp.role || emp.department || 'Team Member')} • ${esc(emp.dept || 'Unassigned')}</div>
            </div>
            <div class="fb-people-risk-badge-wrap">
              <span class="fb-people-risk-level ${isHigh ? '' : 'med'}">${isHigh ? 'Risiko Tinggi' : 'Risiko Sedang'}</span>
            </div>
          </div>
          
          <div style="margin-top: 4px !important;">
            <div style="font-size: 10px !important; font-weight: 800 !important; margin-bottom: 4px !important; color: var(--fb-ink) !important;">
              Indikator:
            </div>
            <ul style="margin: 0 !important; padding-left: 16px !important; font-size: 11px !important; color: var(--fb-ink-mute) !important; line-height: 1.4 !important; list-style-type: disc !important;">
              ${triggers.map(trig => `<li style="margin-bottom: 2px !important;">${esc(trig)}</li>`).join('')}
            </ul>
          </div>

          <div style="margin-top: 4px !important; display: flex !important; gap: 8px !important;">
            <div style="padding: 4px 8px !important; border-radius: 6px !important; background: rgba(134,192,169,0.12) !important; color: #86C0A9 !important; font-size: 10.5px !important; font-weight: 800 !important; display: inline-block !important;">
              ✅ Pesan Otomatis Terkirim
            </div>
          </div>
        </div>
      `;
    });
  }

  // Initialize expandedDepts if not already
  window.__FB.expandedDepts = window.__FB.expandedDepts || {};

  // 3. Department Pulse
  html += `<div class="fb-people-section-title">Nadi Departemen</div>`;
  if (deptPulse.length === 0) {
    html += `<div style="font-size:11.5px; color:var(--fb-ink-mute); font-style:italic;">Data departemen tidak tersedia</div>`;
  } else {
    deptPulse.forEach(dept => {
      let wbClass = '';
      if (dept.wellbeing < 40) wbClass = 'low';
      else if (dept.wellbeing < 70) wbClass = 'mid';

      const isExpanded = !!window.__FB.expandedDepts[dept.dept];
      const deptMembers = (roleData?.members || []).filter(m => m.dept === dept.dept);

      html += `
        <div class="fb-people-dept-card" data-dept-name="${esc(dept.dept)}" style="cursor: pointer !important;">
          <div class="fb-people-dept-header">
            <div>
              <div class="fb-people-dept-name">${esc(dept.dept)}</div>
              <div class="fb-people-dept-headcount">${dept.headcount} anggota${dept.atRisk > 0 ? ` • <span style="color:#E88B7D; font-weight:700;">${dept.atRisk} berisiko</span>` : ''}</div>
            </div>
            <div style="display: flex !important; align-items: center !important; gap: 10px !important;">
              <div class="fb-people-dept-metrics">
                <span class="fb-people-pulse-wellbeing ${wbClass}" title="Wellbeing">😊 ${dept.wellbeing}%</span>
                <span class="fb-people-pulse-engagement" title="Engagement">✅ ${dept.engagement}%</span>
              </div>
              <span class="fb-people-dept-arrow" style="font-size: 9px !important; color: var(--fb-ink-mute) !important; transition: transform 0.2s !important; display: inline-block !important; transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};">▼</span>
            </div>
          </div>
      `;

      if (isExpanded) {
        html += `
          <div class="fb-people-dept-members" style="margin-top: 12px !important; border-top: 1.5px dashed var(--fb-line) !important; padding-top: 10px !important; display: flex !important; flex-direction: column !important; gap: 8px !important; width: 100% !important;">
        `;
        if (deptMembers.length === 0) {
          html += `<div style="font-size: 11px; color: var(--fb-ink-mute); font-style: italic; padding: 4px 0;">Tidak ada anggota di departemen ini</div>`;
        } else {
          deptMembers.forEach(member => {
            const initials = member.name ? member.name.charAt(0).toUpperCase() : '?';
            const wellbeing = member.wellbeing || 70;
            const moodIcons = { joy: '😊', calm: '😌', neutral: '😐', tired: '😴', stress: '😰' };
            const moodLabel = moodIcons[member.mood] || '😐';
            
            html += `
              <div class="fb-people-member-row" style="display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 10px !important; padding: 8px 10px !important; border-radius: 10px !important; background: var(--fb-line-soft) !important;">
                <div style="display: flex !important; align-items: center !important; gap: 10px !important; min-width: 0 !important; flex: 1 !important;">
                  <div style="width: 30px !important; height: 30px !important; border-radius: 50% !important; background: linear-gradient(135deg, var(--fb-blue), var(--fb-yellow-dark)) !important; color: #fff !important; display: flex !important; align-items: center !important; justify-content: center !important; font-weight: 800 !important; font-size: 12px !important; flex-shrink: 0 !important;">${initials}</div>
                  <div style="min-width: 0 !important; flex: 1 !important;">
                    <div style="font-size: 12px !important; font-weight: 700 !important; color: var(--fb-ink) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">${esc(member.name)}</div>
                    <div style="font-size: 10.5px !important; color: var(--fb-ink-mute) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">${esc(member.role)}</div>
                  </div>
                </div>
                <div style="display: flex !important; flex-direction: column !important; align-items: flex-end !important; gap: 2px !important; flex-shrink: 0 !important;">
                  <span style="font-size: 10px !important; font-weight: 700 !important; padding: 2.5px 6px !important; background: var(--fb-card) !important; color: var(--fb-ink-mute) !important; border-radius: 6px !important; border: 1.5px solid var(--fb-line) !important; display: inline-block !important;">${moodLabel} ${wellbeing}%</span>
                  <span style="font-size: 10px !important; font-weight: 700 !important; color: var(--fb-blue) !important;">${member.tasks?.done || 0}/${member.tasks?.total || 0} Selesai</span>
                </div>
              </div>
            `;
          });
        }
        html += `</div>`;
      }

      html += `</div>`;
    });
  }

  container.innerHTML = html;

  // Add click handlers for department expansion
  container.querySelectorAll('.fb-people-dept-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.fb-people-dept-members')) return;
      const deptName = card.dataset.deptName;
      window.__FB.expandedDepts[deptName] = !window.__FB.expandedDepts[deptName];
      window.__FB.renderPeoplePane();
    });
  });
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
