window.__FB = window.__FB || {};

// Inject CSS styles for the team pane
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
  `;
  document.head.appendChild(style);
})();

// Expanded member cards state
window.__FB.expandedMembers = window.__FB.expandedMembers || {};

window.__FB.renderTeamPane = function() {
  const fbRoot = document.querySelector('#fb-root');
  const container = (fbRoot?.shadowRoot || fbRoot)?.querySelector('#fb-team-list');
  const emptyEl = (fbRoot?.shadowRoot || fbRoot)?.querySelector('#fb-team-empty');
  if (!container) return;

  const roleData = window.__FB.roleData;
  const members = roleData?.members || [];
  const teamTasks = roleData?.teamTasks || [];

  if (members.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    container.innerHTML = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  // Calculate Average KPI progress
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
    
    // Get mood icon
    const moodIcons = { joy: '😊', calm: '😌', neutral: '😐', tired: '😴', stress: '😰' };
    const moodLabel = moodIcons[member.mood] || '😐';

    // Get color for wellbeing
    let wellbeingColor = '#86C0A9'; // safe / high
    if (wellbeing < 40) wellbeingColor = '#E88B7D'; // low / at risk
    else if (wellbeing < 70) wellbeingColor = '#ffd43b'; // medium

    // Find tasks belonging to this member
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

  container.innerHTML = html;

  // Add click handlers for expanding/collapsing
  container.querySelectorAll('.fb-team-member-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't expand/collapse if verify button was clicked
      if (e.target.classList.contains('fb-team-verify-btn')) return;

      const card = header.closest('.fb-team-member-card');
      const memberId = card.dataset.memberId;
      window.__FB.expandedMembers[memberId] = !window.__FB.expandedMembers[memberId];
      window.__FB.renderTeamPane();
    });
  });

  // Add click handlers for Verify buttons
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
          // Trigger a global sync to refresh data
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
