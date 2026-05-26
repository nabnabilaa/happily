window.__FB = window.__FB || {};

// Inject CSS styles for the team pane (including KPI approval styles)
(function injectTeamStyles() {
  const styleId = 'fb-team-pane-styles';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .fb-team-summary {
      background: rgba(59,111,160,0.06);
      border: 1px solid rgba(59,111,160,0.15);
      padding: 12px;
      margin-bottom: 14px;
      border-radius: 0px;
    }
    .fb-team-summary-title {
      font-size: 10px;
      font-weight: 800;
      color: #3B6FA0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .fb-team-summary-val {
      font-size: 18px;
      font-weight: 900;
      color: #1F1D1B;
    }
    .fb-team-member-card {
      background: #fff;
      border: 1px solid rgba(31,29,27,0.08);
      margin-bottom: 10px;
      padding: 12px;
      transition: all 0.2s ease;
    }
    .fb-team-member-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .fb-team-member-header {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .fb-team-member-avatar {
      width: 32px;
      height: 32px;
      border-radius: 0px;
      background: linear-gradient(135deg, #3B6FA0, #86C0A9);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
    }
    .fb-team-member-info {
      flex: 1;
      min-width: 0;
    }
    .fb-team-member-name {
      font-size: 13px;
      font-weight: 700;
      color: #1F1D1B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fb-team-member-role {
      font-size: 10.5px;
      color: #8A837C;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fb-team-member-badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .fb-team-member-mood {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      background: #F0F4F8;
      color: #3B6FA0;
    }
    .fb-team-member-tasks-stat {
      font-size: 10px;
      font-weight: 700;
      color: #86C0A9;
    }
    .fb-team-member-details {
      margin-top: 10px;
      border-top: 1px dashed rgba(31,29,27,0.08);
      padding-top: 10px;
      animation: fbSlideDown 0.2s ease-out;
    }
    @keyframes fbSlideDown {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fb-team-member-tasks-title {
      font-size: 10px;
      font-weight: 800;
      color: #8A837C;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .fb-team-member-task-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 0;
      font-size: 12px;
      border-bottom: 1px solid rgba(31,29,27,0.03);
    }
    .fb-team-member-task-row:last-child {
      border-bottom: none;
    }
    .fb-team-member-task-txt {
      flex: 1;
      color: #524E49;
    }
    .fb-team-member-task-txt.done {
      text-decoration: line-through;
      color: #A09A93;
    }
    .fb-team-verify-btn {
      background: #3B6FA0;
      color: #fff;
      border: none;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .fb-team-verify-btn:hover {
      background: #2B5286;
    }
    .fb-team-verified-badge {
      font-size: 10px;
      font-weight: 700;
      color: #86C0A9;
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .fb-team-member-wellbeing {
      margin-top: 6px;
      background: #F0F0F2;
      height: 4px;
      position: relative;
    }
    .fb-team-member-wellbeing-fill {
      height: 100%;
      background: #86C0A9;
    }

    /* ─── KPI Section Styles ─── */
    .fb-kpi-section {
      margin-bottom: 16px;
    }
    .fb-kpi-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 0 2px;
    }
    .fb-kpi-section-title {
      font-size: 10px;
      font-weight: 800;
      color: #3B6FA0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .fb-kpi-section-count {
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      background: #3B6FA0;
      padding: 1px 6px;
      border-radius: 8px;
      min-width: 16px;
      text-align: center;
    }
    .fb-kpi-card {
      background: #fff;
      border: 1px solid rgba(31,29,27,0.08);
      margin-bottom: 8px;
      padding: 12px;
      transition: all 0.2s ease;
    }
    .fb-kpi-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }
    .fb-kpi-card.pending {
      border-left: 3px solid #ffd43b;
    }
    .fb-kpi-card.approved {
      border-left: 3px solid #86C0A9;
    }
    .fb-kpi-card.rejected {
      border-left: 3px solid #E88B7D;
    }
    .fb-kpi-card.revision {
      border-left: 3px solid #ffa94d;
    }
    .fb-kpi-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #1F1D1B;
      margin-bottom: 4px;
      line-height: 1.3;
    }
    .fb-kpi-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .fb-kpi-owner {
      font-size: 10px;
      font-weight: 600;
      color: #8A837C;
    }
    .fb-kpi-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .fb-kpi-badge.pending {
      background: #fff3cd;
      color: #8A6814;
    }
    .fb-kpi-badge.approved {
      background: rgba(134,192,169,0.15);
      color: #4a8a6f;
    }
    .fb-kpi-badge.rejected {
      background: rgba(232,139,125,0.15);
      color: #c0392b;
    }
    .fb-kpi-badge.revision {
      background: rgba(255,169,77,0.15);
      color: #d68910;
    }
    .fb-kpi-progress-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .fb-kpi-progress-bar {
      flex: 1;
      height: 4px;
      background: #F0F0F2;
      overflow: hidden;
    }
    .fb-kpi-progress-fill {
      height: 100%;
      background: #3B6FA0;
      transition: width 0.3s ease;
    }
    .fb-kpi-progress-pct {
      font-size: 11px;
      font-weight: 800;
      color: #3B6FA0;
      min-width: 32px;
      text-align: right;
    }
    .fb-kpi-actions {
      display: flex;
      gap: 6px;
      margin-top: 10px;
    }
    .fb-kpi-action-btn {
      flex: 1;
      padding: 6px 4px;
      border: none;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .fb-kpi-action-btn.approve {
      background: #86C0A9;
      color: #fff;
    }
    .fb-kpi-action-btn.approve:hover {
      background: #6aab90;
    }
    .fb-kpi-action-btn.revision {
      background: #fff;
      color: #d68910;
      border: 1px solid #ffd43b;
    }
    .fb-kpi-action-btn.revision:hover {
      background: #fff8e6;
    }
    .fb-kpi-action-btn.reject {
      background: #fff;
      color: #c0392b;
      border: 1px solid #E88B7D;
    }
    .fb-kpi-action-btn.reject:hover {
      background: #fef0ee;
    }
    .fb-kpi-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ─── Sub-tab switcher ─── */
    .fb-team-subtabs {
      display: flex;
      gap: 4px;
      margin-bottom: 14px;
      background: rgba(31,29,27,0.03);
      padding: 3px;
    }
    .fb-team-subtab {
      flex: 1;
      padding: 7px 4px;
      font-size: 10px;
      font-weight: 800;
      text-align: center;
      border: none;
      cursor: pointer;
      background: transparent;
      color: #8A837C;
      transition: all 0.15s;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .fb-team-subtab.active {
      background: #3B6FA0;
      color: #fff;
    }
    .fb-team-subtab:hover:not(.active) {
      background: rgba(59,111,160,0.08);
      color: #3B6FA0;
    }
  `;
  document.head.appendChild(style);
})();

// Expanded member cards state
window.__FB.expandedMembers = window.__FB.expandedMembers || {};
// Active sub-tab in team pane: 'members' or 'kpi'
window.__FB.teamSubTab = window.__FB.teamSubTab || 'members';

window.__FB.renderTeamPane = function() {
  const fbRoot = document.querySelector('#fb-root');
  const container = (fbRoot?.shadowRoot || fbRoot)?.querySelector('#fb-team-list');
  const emptyEl = (fbRoot?.shadowRoot || fbRoot)?.querySelector('#fb-team-empty');
  if (!container) return;

  const roleData = window.__FB.roleData;
  const members = roleData?.members || [];
  const teamTasks = roleData?.teamTasks || [];
  const teamGoals = roleData?.teamGoals || [];
  const teamApprovals = roleData?.teamApprovals || [];

  if (members.length === 0 && teamGoals.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    container.innerHTML = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  const subTab = window.__FB.teamSubTab || 'members';

  // ─── Sub-tab Switcher ───
  let html = `
    <div class="fb-team-subtabs">
      <button class="fb-team-subtab ${subTab === 'members' ? 'active' : ''}" data-subtab="members">
        👥 Anggota (${members.length})
      </button>
      <button class="fb-team-subtab ${subTab === 'kpi' ? 'active' : ''}" data-subtab="kpi">
        🎯 KPI (${teamGoals.length})${teamApprovals.length > 0 ? ' <span style="background:#E88B7D;color:#fff;padding:0 4px;border-radius:8px;font-size:8px;margin-left:2px;">' + teamApprovals.length + '</span>' : ''}
      </button>
    </div>
  `;

  if (subTab === 'members') {
    html += renderMembersTab(members, teamTasks);
  } else {
    html += renderKPITab(teamGoals, teamApprovals);
  }

  container.innerHTML = html;

  // ── Subtab click handlers ──
  container.querySelectorAll('.fb-team-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      window.__FB.teamSubTab = btn.dataset.subtab;
      window.__FB.renderTeamPane();
    });
  });

  // ── Member expand/collapse handlers ──
  container.querySelectorAll('.fb-team-member-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('fb-team-verify-btn')) return;
      const card = header.closest('.fb-team-member-card');
      const memberId = card.dataset.memberId;
      window.__FB.expandedMembers[memberId] = !window.__FB.expandedMembers[memberId];
      window.__FB.renderTeamPane();
    });
  });

  // ── Verify task handlers ──
  container.querySelectorAll('.fb-team-verify-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.taskId;
      const goalId = btn.dataset.goalId;
      
      btn.textContent = '...';
      btn.disabled = true;

      try {
        const flowbeeApi = window.__FB.FLOWBEE_API || (window.location.origin + '/api/ext');
        const res = await fetch(flowbeeApi.replace('/ext', '/manager/verify-task'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            goalId: goalId || null,
            managerId: window.__FB.currentUser?.id || null
          })
        });
        const data = await res.json();
        if (data.success) {
          if (typeof window.__FB.flowbeeSyncAll === 'function') {
            await window.__FB.flowbeeSyncAll();
          }
        } else {
          alert('Gagal memverifikasi tugas: ' + (data.error || 'error'));
          window.__FB.renderTeamPane();
        }
      } catch (err) {
        console.error('Error verifying task:', err);
        alert('Gagal memverifikasi tugas karena masalah jaringan.');
        window.__FB.renderTeamPane();
      }
    });
  });

  // ── KPI Approval action handlers ──
  container.querySelectorAll('.fb-kpi-action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const goalId = btn.dataset.goalId;
      const action = btn.dataset.action; // 'approved', 'revision', 'rejected'
      
      btn.textContent = '...';
      btn.disabled = true;

      // Disable sibling buttons
      const actionRow = btn.closest('.fb-kpi-actions');
      if (actionRow) {
        actionRow.querySelectorAll('.fb-kpi-action-btn').forEach(b => b.disabled = true);
      }

      try {
        const flowbeeApi = window.__FB.FLOWBEE_API || (window.location.origin + '/api/ext');
        const res = await fetch(flowbeeApi.replace('/ext', '/goals/update'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalId,
            updates: { status: action }
          })
        });
        const data = await res.json();
        if (data.success || res.ok) {
          // Sync to refresh data
          if (typeof window.__FB.flowbeeSyncAll === 'function') {
            await window.__FB.flowbeeSyncAll();
          }
        } else {
          alert('Gagal: ' + (data.error || 'error'));
          window.__FB.renderTeamPane();
        }
      } catch (err) {
        console.error('Error updating KPI status:', err);
        alert('Gagal memperbarui status KPI.');
        window.__FB.renderTeamPane();
      }
    });
  });
};

// ─── Members Tab Renderer ───
function renderMembersTab(members, teamTasks) {
  // Calculate Average task completion
  const doneCounts = members.reduce((sum, m) => sum + (m.tasks?.done || 0), 0);
  const totalCounts = members.reduce((sum, m) => sum + (m.tasks?.total || 0), 0);
  const avgPct = totalCounts > 0 ? Math.round((doneCounts / totalCounts) * 100) : 0;

  let html = `
    <div class="fb-team-summary">
      <div class="fb-team-summary-title">Rata-rata Tugas Selesai Tim</div>
      <div class="fb-team-summary-val">${avgPct}% <span style="font-size:12px; font-weight:500; color:#8A837C;">(${doneCounts}/${totalCounts} Tugas hari ini)</span></div>
    </div>
  `;

  members.forEach(member => {
    const isExpanded = !!window.__FB.expandedMembers[member.id];
    const initials = member.name ? member.name.charAt(0).toUpperCase() : '?';
    const wellbeing = member.wellbeing || 70;
    
    const moodIcons = { joy: '😊', calm: '😌', neutral: '😐', tired: '😴', stress: '😰' };
    const moodLabel = moodIcons[member.mood] || '😐';

    let wellbeingColor = '#86C0A9';
    if (wellbeing < 40) wellbeingColor = '#E88B7D';
    else if (wellbeing < 70) wellbeingColor = '#ffd43b';

    const memberTasks = teamTasks.filter(t => String(t.userId) === String(member.id));

    html += `
      <div class="fb-team-member-card" data-member-id="${member.id}">
        <div class="fb-team-member-header">
          <div class="fb-team-member-avatar">${initials}</div>
          <div class="fb-team-member-info">
            <div class="fb-team-member-name">${esc(member.name)}</div>
            <div class="fb-team-member-role">${esc(member.role)}</div>
          </div>
          <div class="fb-team-member-badges">
            <span class="fb-team-member-mood" title="Wellbeing: ${wellbeing}%">${moodLabel} ${wellbeing}%</span>
            <span class="fb-team-member-tasks-stat">${member.tasks?.done || 0}/${member.tasks?.total || 0} Selesai</span>
          </div>
        </div>
        <div class="fb-team-member-wellbeing" title="Wellbeing: ${wellbeing}%">
          <div class="fb-team-member-wellbeing-fill" style="width: ${wellbeing}%; background-color: ${wellbeingColor};"></div>
        </div>
    `;

    if (isExpanded) {
      html += `
        <div class="fb-team-member-details">
          <div class="fb-team-member-tasks-title">Tugas Hari Ini</div>
      `;

      if (memberTasks.length === 0) {
        html += `<div style="font-size:11px; color:#A09A93; font-style:italic; padding:4px 0;">Belum membuat tugas hari ini</div>`;
      } else {
        memberTasks.forEach(task => {
          const isDone = !!task.done;
          const isVerified = !!task.verified;
          html += `
            <div class="fb-team-member-task-row">
              <span class="fb-team-member-task-txt ${isDone ? 'done' : ''}">
                ${isDone ? '✓' : '○'} ${esc(task.title)}
              </span>
              <div style="flex-shrink: 0;">
          `;

          if (isDone && !isVerified) {
            html += `<button class="fb-team-verify-btn" data-task-id="${task.id}" data-goal-id="${task.goalId || ''}">Verifikasi</button>`;
          } else if (isVerified) {
            html += `<span class="fb-team-verified-badge">✓ Terverifikasi</span>`;
          } else {
            html += `<span style="font-size:10.5px; color:#A09A93; font-style:italic;">Aktif</span>`;
          }

          html += `
              </div>
            </div>
          `;
        });
      }

      html += `</div>`;
    }

    html += `</div>`;
  });

  return html;
}

// ─── KPI Tab Renderer ───
function renderKPITab(teamGoals, teamApprovals) {
  let html = '';

  // ── Pending Approvals (urgent, show first) ──
  if (teamApprovals.length > 0) {
    html += `
      <div class="fb-kpi-section">
        <div class="fb-kpi-section-header">
          <div class="fb-kpi-section-title">
            ⚠️ Menunggu Persetujuan
            <span class="fb-kpi-section-count" style="background:#E88B7D;">${teamApprovals.length}</span>
          </div>
        </div>
    `;

    teamApprovals.forEach(a => {
      html += `
        <div class="fb-kpi-card pending">
          <div class="fb-kpi-title">${esc(a.desc)}</div>
          <div class="fb-kpi-meta">
            <span class="fb-kpi-owner">👤 ${esc(a.from)}</span>
            <span class="fb-kpi-badge pending">${a.type || 'GOAL'}</span>
            ${a.due ? `<span style="font-size:9px; color:#8A837C;">📅 ${esc(a.due)}</span>` : ''}
          </div>
          <div class="fb-kpi-progress-row">
            <div class="fb-kpi-progress-bar">
              <div class="fb-kpi-progress-fill" style="width:${a.progress || 0}%;"></div>
            </div>
            <span class="fb-kpi-progress-pct">${a.progress || 0}%</span>
          </div>
          <div class="fb-kpi-actions">
            <button class="fb-kpi-action-btn approve" data-goal-id="${a.id}" data-action="approved">✓ Approve</button>
            <button class="fb-kpi-action-btn revision" data-goal-id="${a.id}" data-action="revision">↻ Revisi</button>
            <button class="fb-kpi-action-btn reject" data-goal-id="${a.id}" data-action="rejected">✗ Reject</button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  // ── All Team Goals ──
  if (teamGoals.length > 0) {
    // Group by status
    const statusOrder = ['pending', 'revision', 'approved', 'rejected'];
    const grouped = {};
    teamGoals.forEach(g => {
      const s = g.status || 'pending';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(g);
    });

    // Only show non-pending goals here (pending already shown above with actions)
    const activeGoals = teamGoals.filter(g => (g.status || 'pending') !== 'pending');
    const pendingGoals = teamGoals.filter(g => (g.status || 'pending') === 'pending');

    // Show pending goals that aren't in teamApprovals (edge case)
    const approvalIds = new Set(teamApprovals.map(a => String(a.id)));
    const unapprovedPending = pendingGoals.filter(g => !approvalIds.has(String(g.id)));

    if (unapprovedPending.length > 0) {
      html += `
        <div class="fb-kpi-section">
          <div class="fb-kpi-section-header">
            <div class="fb-kpi-section-title">
              📋 Pending KPI
              <span class="fb-kpi-section-count" style="background:#ffd43b;color:#8A6814;">${unapprovedPending.length}</span>
            </div>
          </div>
      `;

      unapprovedPending.forEach(g => {
        html += renderGoalCard(g, true);
      });

      html += `</div>`;
    }

    if (activeGoals.length > 0) {
      html += `
        <div class="fb-kpi-section">
          <div class="fb-kpi-section-header">
            <div class="fb-kpi-section-title">
              📊 KPI Tim
              <span class="fb-kpi-section-count">${activeGoals.length}</span>
            </div>
          </div>
      `;

      activeGoals.forEach(g => {
        html += renderGoalCard(g, false);
      });

      html += `</div>`;
    }
  }

  if (teamGoals.length === 0 && teamApprovals.length === 0) {
    html += `
      <div style="text-align:center; padding:30px 16px; color:#A09A93;">
        <div style="font-size:28px; margin-bottom:8px;">🎯</div>
        <div style="font-size:12px; font-weight:600;">Belum ada KPI tim.</div>
        <div style="font-size:10.5px; margin-top:4px; color:#BDB6AE;">Buat KPI baru untuk anggota tim di aplikasi web.</div>
      </div>
    `;
  }

  return html;
}

// ─── Single Goal Card ───
function renderGoalCard(g, showActions) {
  const status = g.status || 'pending';
  const statusLabels = { pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED', revision: 'REVISI' };
  const progressColor = status === 'approved' ? '#86C0A9' : status === 'rejected' ? '#E88B7D' : '#3B6FA0';

  let html = `
    <div class="fb-kpi-card ${status}">
      <div class="fb-kpi-title">${esc(g.title)}</div>
      <div class="fb-kpi-meta">
        <span class="fb-kpi-owner">👤 ${esc(g.owner)}</span>
        <span class="fb-kpi-badge ${status}">${statusLabels[status] || status.toUpperCase()}</span>
        ${g.is_kpi ? '<span class="fb-kpi-badge" style="background:rgba(59,111,160,0.1);color:#3B6FA0;">KPI</span>' : ''}
        ${g.due ? `<span style="font-size:9px; color:#8A837C;">📅 ${esc(String(g.due))}</span>` : ''}
      </div>
      <div class="fb-kpi-progress-row">
        <div class="fb-kpi-progress-bar">
          <div class="fb-kpi-progress-fill" style="width:${g.progress || 0}%; background:${progressColor};"></div>
        </div>
        <span class="fb-kpi-progress-pct" style="color:${progressColor};">${g.progress || 0}%</span>
      </div>
  `;

  if (showActions && status === 'pending') {
    html += `
      <div class="fb-kpi-actions">
        <button class="fb-kpi-action-btn approve" data-goal-id="${g.id}" data-action="approved">✓ Approve</button>
        <button class="fb-kpi-action-btn revision" data-goal-id="${g.id}" data-action="revision">↻ Revisi</button>
        <button class="fb-kpi-action-btn reject" data-goal-id="${g.id}" data-action="rejected">✗ Reject</button>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

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
