window.__FB = window.__FB || {};

// Inject CSS styles for the team pane (including KPI approval styles)
(function injectTeamStyles() {
  const styleId = 'fb-team-pane-styles';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .fb-team-summary {
      background: var(--fb-blue-soft) !important;
      border: 1.5px solid var(--fb-line) !important;
      padding: 16px 18px !important;
      margin-bottom: 18px !important;
      border-radius: 14px !important;
    }
    .fb-team-summary-title {
      font-size: 10.5px !important;
      font-weight: 800 !important;
      color: var(--fb-blue) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.8px !important;
      margin-bottom: 6px !important;
    }
    .fb-team-summary-val {
      font-size: 19px !important;
      font-weight: 800 !important;
      color: var(--fb-ink) !important;
    }
    .fb-team-member-card {
      background: var(--fb-card) !important;
      border: 1.5px solid var(--fb-line) !important;
      margin-bottom: 14px !important;
      padding: 16px 18px !important;
      border-radius: 14px !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03) !important;
    }
    .fb-team-member-card:hover {
      border-color: var(--fb-blue) !important;
      box-shadow: 0 6px 20px rgba(0,0,0,0.06) !important;
      transform: translateY(-2px) !important;
    }
    .fb-team-member-header {
      display: flex !important;
      align-items: center !important;
      gap: 14px !important;
      cursor: pointer !important;
    }
    .fb-team-member-avatar {
      width: 38px !important;
      height: 38px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, var(--fb-blue), var(--fb-yellow-dark)) !important;
      color: #fff !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-weight: 800 !important;
      font-size: 15px !important;
      flex-shrink: 0 !important;
    }
    .fb-team-member-info {
      flex: 1 !important;
      min-width: 0 !important;
    }
    .fb-team-member-name {
      font-size: 13.5px !important;
      font-weight: 700 !important;
      color: var(--fb-ink) !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .fb-team-member-role {
      font-size: 11px !important;
      color: var(--fb-ink-mute) !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .fb-team-member-badges {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 4px !important;
    }
    .fb-team-member-mood {
      font-size: 10.5px !important;
      font-weight: 700 !important;
      padding: 4px 10px !important;
      background: var(--fb-line-soft) !important;
      color: var(--fb-ink-mute) !important;
      border-radius: 8px !important;
    }
    .fb-team-member-tasks-stat {
      font-size: 10.5px !important;
      font-weight: 700 !important;
      color: var(--fb-blue) !important;
    }
    .fb-team-member-details {
      margin-top: 14px !important;
      border-top: 1.5px dashed var(--fb-line) !important;
      padding-top: 14px !important;
      animation: fbSlideDown 0.2s ease-out !important;
    }
    @keyframes fbSlideDown {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fb-team-member-tasks-title {
      font-size: 10.5px !important;
      font-weight: 800 !important;
      color: var(--fb-ink-mute) !important;
      text-transform: uppercase !important;
      margin-bottom: 10px !important;
      letter-spacing: 0.5px !important;
    }
    .fb-team-member-task-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
      padding: 10px 0 !important;
      font-size: 12.5px !important;
      border-bottom: 1.5px solid var(--fb-line-soft) !important;
    }
    .fb-team-member-task-row:last-child {
      border-bottom: none !important;
      padding-bottom: 0 !important;
    }
    .fb-team-member-task-txt {
      flex: 1 !important;
      color: var(--fb-ink) !important;
    }
    .fb-team-member-task-txt.done {
      text-decoration: line-through !important;
      color: var(--fb-ink-mute) !important;
    }
    .fb-team-verify-btn {
      background: var(--fb-blue) !important;
      color: #fff !important;
      border: none !important;
      font-size: 10.5px !important;
      font-weight: 700 !important;
      padding: 6px 14px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      transition: all 0.15s !important;
    }
    .fb-team-verify-btn:hover {
      opacity: 0.85 !important;
      transform: translateY(-1px) !important;
    }
    .fb-team-verified-badge {
      font-size: 10.5px !important;
      font-weight: 700 !important;
      color: #86C0A9 !important;
      display: flex !important;
      align-items: center !important;
      gap: 3px !important;
    }
    .fb-team-member-wellbeing {
      margin-top: 10px !important;
      background: var(--fb-line-soft) !important;
      height: 6px !important;
      border-radius: 3px !important;
      overflow: hidden !important;
      position: relative !important;
    }
    .fb-team-member-wellbeing-fill {
      height: 100% !important;
      border-radius: 3px !important;
      transition: width 0.3s ease !important;
    }

    /* ─── KPI Section Styles ─── */
    .fb-kpi-section {
      margin-bottom: 22px;
    }
    .fb-kpi-section-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-bottom: 14px !important;
      padding: 0 4px !important;
    }
    .fb-kpi-section-title {
      font-size: 11px !important;
      font-weight: 800 !important;
      color: var(--fb-blue) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.8px !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
    .fb-kpi-section-count {
      font-size: 11px !important;
      font-weight: 800 !important;
      color: #fff !important;
      background: var(--fb-blue) !important;
      padding: 2px 8px !important;
      border-radius: 10px !important;
      min-width: 18px !important;
      text-align: center !important;
    }
    .fb-kpi-card {
      background: var(--fb-card) !important;
      border: 1.5px solid var(--fb-line) !important;
      margin-bottom: 12px !important;
      padding: 16px 18px !important;
      border-radius: 14px !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03) !important;
    }
    .fb-kpi-card:hover {
      border-color: var(--fb-blue) !important;
      box-shadow: 0 6px 20px rgba(0,0,0,0.06) !important;
      transform: translateY(-2px) !important;
    }
    .fb-kpi-card.pending {
      border-left: 4px solid var(--fb-yellow) !important;
    }
    .fb-kpi-card.approved {
      border-left: 4px solid #86C0A9 !important;
    }
    .fb-kpi-card.rejected {
      border-left: 4px solid #E88B7D !important;
    }
    .fb-kpi-card.revision {
      border-left: 4px solid var(--fb-yellow-dark) !important;
    }
    .fb-kpi-title {
      font-size: 13.5px !important;
      font-weight: 700 !important;
      color: var(--fb-ink) !important;
      margin-bottom: 8px !important;
      line-height: 1.4 !important;
    }
    .fb-kpi-meta {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      flex-wrap: wrap !important;
    }
    .fb-kpi-owner {
      font-size: 10.5px !important;
      font-weight: 600 !important;
      color: var(--fb-ink-mute) !important;
    }
    .fb-kpi-badge {
      font-size: 9.5px !important;
      font-weight: 800 !important;
      padding: 2.5px 8px !important;
      border-radius: 6px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    .fb-kpi-badge.pending {
      background: var(--fb-yellow-soft) !important;
      color: var(--fb-yellow-dark) !important;
      border: 1px solid var(--fb-yellow) !important;
    }
    .fb-kpi-badge.approved {
      background: rgba(134,192,169,0.12) !important;
      color: #86C0A9 !important;
      border: 1px solid rgba(134,192,169,0.3) !important;
    }
    .fb-kpi-badge.rejected {
      background: rgba(232,139,125,0.12) !important;
      color: #E88B7D !important;
      border: 1px solid rgba(232,139,125,0.3) !important;
    }
    .fb-kpi-badge.revision {
      background: var(--fb-yellow-soft) !important;
      color: var(--fb-yellow-dark) !important;
      border: 1px solid var(--fb-yellow) !important;
    }
    .fb-kpi-progress-row {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      margin-top: 12px !important;
    }
    .fb-kpi-progress-bar {
      flex: 1 !important;
      height: 6px !important;
      background: var(--fb-line-soft) !important;
      border-radius: 3px !important;
      overflow: hidden !important;
    }
    .fb-kpi-progress-fill {
      height: 100% !important;
      border-radius: 3px !important;
      transition: width 0.3s ease !important;
    }
    .fb-kpi-progress-pct {
      font-size: 11.5px !important;
      font-weight: 800 !important;
      min-width: 36px !important;
      text-align: right !important;
    }
    .fb-kpi-actions {
      display: flex !important;
      gap: 10px !important;
      margin-top: 14px !important;
    }
    .fb-kpi-action-btn {
      flex: 1 !important;
      padding: 9px 8px !important;
      border: none !important;
      font-size: 10.5px !important;
      font-weight: 800 !important;
      cursor: pointer !important;
      transition: all 0.15s !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      border-radius: 10px !important;
    }
    .fb-kpi-action-btn.approve {
      background: #86C0A9 !important;
      color: #fff !important;
    }
    .fb-kpi-action-btn.approve:hover {
      opacity: 0.85 !important;
    }
    .fb-kpi-action-btn.revision {
      background: var(--fb-card) !important;
      color: var(--fb-yellow-dark) !important;
      border: 1.5px solid var(--fb-yellow) !important;
    }
    .fb-kpi-action-btn.revision:hover {
      background: var(--fb-yellow-soft) !important;
    }
    .fb-kpi-action-btn.reject {
      background: var(--fb-card) !important;
      color: #E88B7D !important;
      border: 1.5px solid #E88B7D !important;
    }
    .fb-kpi-action-btn.reject:hover {
      background: rgba(232,139,125,0.08) !important;
    }
    .fb-kpi-action-btn:disabled {
      opacity: 0.4 !important;
      cursor: not-allowed !important;
    }

    /* ─── Sub-tab switcher ─── */
    .fb-team-subtabs {
      display: flex !important;
      gap: 6px !important;
      margin-bottom: 20px !important;
      background: var(--fb-line-soft) !important;
      padding: 5px !important;
      border-radius: 12px !important;
    }
    .fb-team-subtab {
      flex: 1 !important;
      padding: 10px 8px !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      text-align: center !important;
      border: none !important;
      border-radius: 9px !important;
      cursor: pointer !important;
      background: transparent !important;
      color: var(--fb-ink-mute) !important;
      transition: all 0.2s cubic-bezier(.34,1.56,.64,1) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    .fb-team-subtab.active {
      background: var(--fb-blue) !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
    }
    .fb-team-subtab:hover:not(.active) {
      background: var(--fb-blue-soft) !important;
      color: var(--fb-blue) !important;
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
        🎯 KPI (${teamGoals.length})${teamApprovals.length > 0 ? ' <span style="background:#E88B7D; color:#fff; padding:2px 6px; border-radius:10px; font-size:9px; margin-left:4px; font-weight:800;">' + teamApprovals.length + '</span>' : ''}
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
      <div class="fb-team-summary-val">${avgPct}% <span style="font-size:12px; font-weight:500; color:var(--fb-ink-mute);">(${doneCounts}/${totalCounts} Tugas hari ini)</span></div>
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
        html += `<div style="font-size:11.5px; color:var(--fb-ink-mute); font-style:italic; padding:6px 0;">Belum membuat tugas hari ini</div>`;
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
            html += `<span style="font-size:11px; color:var(--fb-ink-mute); font-style:italic;">Aktif</span>`;
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
            <span class="fb-kpi-section-count" style="background:#E88B7D; color:#fff !important;">${teamApprovals.length}</span>
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
            ${a.due ? `<span style="font-size:10px; color:var(--fb-ink-mute);">📅 ${esc(a.due)}</span>` : ''}
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
              <span class="fb-kpi-section-count" style="background:var(--fb-yellow-soft); color:var(--fb-yellow-dark) !important; border:1px solid var(--fb-yellow);">${unapprovedPending.length}</span>
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
      <div style="text-align:center; padding:36px 20px; color:var(--fb-ink-mute);">
        <div style="font-size:34px; margin-bottom:12px;">🎯</div>
        <div style="font-size:13px; font-weight:600;">Belum ada KPI tim.</div>
        <div style="font-size:11.5px; margin-top:6px; color:var(--fb-ink-mute); opacity:0.8;">Buat KPI baru untuk anggota tim di aplikasi web.</div>
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
        ${g.is_kpi ? '<span class="fb-kpi-badge" style="background:var(--fb-blue-soft); color:var(--fb-blue) !important; border:1px solid var(--fb-line);">KPI</span>' : ''}
        ${g.due ? `<span style="font-size:10px; color:var(--fb-ink-mute);">📅 ${esc(String(g.due))}</span>` : ''}
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
