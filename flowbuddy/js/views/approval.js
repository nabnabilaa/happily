/* ==========================================================================
   FlowBuddy — Approval View (Manager Only)
   1-click approve/reject with confetti on approve
   ========================================================================== */

const ApprovalView = {
  pendingApprovals: [],
  teamTasks: [],
  baseUrl: null,
  userId: null,

  init() {
    this.load();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['fb3']) {
          const fb3 = changes['fb3'].newValue;
          if (fb3) {
            if (fb3.teamApprovals !== undefined) this.pendingApprovals = fb3.teamApprovals;
            if (fb3.teamTasks !== undefined) this.teamTasks = fb3.teamTasks;
            if (FlowBuddyApp.currentView === 'approval') {
               const container = document.getElementById('view-approval');
               if (container) this.render(container);
            }
          }
        }
      });
    }
  },

  load() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['fb3', 'flowbee_base_url', 'flowbee_user_id'], (res) => {
        if (res.flowbee_base_url) this.baseUrl = res.flowbee_base_url;
        if (res.flowbee_user_id) this.userId = res.flowbee_user_id;
        
        if (res.fb3) {
          if (res.fb3.teamApprovals !== undefined) this.pendingApprovals = res.fb3.teamApprovals;
          if (res.fb3.teamTasks !== undefined) this.teamTasks = res.fb3.teamTasks;
          const container = document.getElementById('view-approval');
          if (container && FlowBuddyApp.currentView === 'approval') this.render(container);
        }
      });
    }
  },

  save() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        const fb3 = res.fb3 || {};
        fb3.teamApprovals = this.pendingApprovals;
        fb3.teamTasks = this.teamTasks;
        chrome.storage.local.set({ fb3: fb3 }, () => {
          chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
        });
      });
    }
  },

  render(container) {
    const pendingTasks = (this.teamTasks || []).filter(t => t.status === 'pending_review');
    const processedTasks = (this.teamTasks || []).filter(t => t.status === 'approved' || t.status === 'rejected' || t.status === 'revision');

    let html = '<div class="section-title">📋 Persetujuan Tim</div>';

    if (pendingTasks.length === 0 && processedTasks.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-title">Semua sudah diverifikasi!</div>
          <div class="empty-state-text">Tidak ada tugas yang menunggu persetujuanmu saat ini.</div>
        </div>
      `;
    } else {
       // --- PENDING ---
       if (pendingTasks.length > 0) {
         html += '<div class="stagger-in">';
         
         // 1. Pending Tasks
         if (pendingTasks.length > 0) {
            html += '<div class="section-title" style="margin-top: 8px; font-size: 11px; border-bottom: none;">VERIFIKASI TUGAS HARIAN</div>';
            pendingTasks.forEach(item => {
              html += `
                <div class="approval-card" data-task-id="${item.id}">
                  <div class="approval-header">
                    <span style="font-size: 16px;">⚡</span>
                    <span class="approval-title">${this.esc(item.title)}</span>
                  </div>
                  <div class="approval-meta">
                    Selesai Oleh: <strong style="color: var(--color-role);">${this.esc(item.userName)}</strong>
                  </div>
                  <div class="approval-actions">
                    <button class="btn-success" data-task-action="approve" data-id="${item.id}">✓ Accept</button>
                    <button class="btn-warning" data-task-action="revision" data-id="${item.id}">↻ Revisi</button>
                    <button class="btn-danger" data-task-action="reject" data-id="${item.id}">✗ Reject</button>
                  </div>
                </div>
              `;
            });
         }
         
         html += '</div>';
       }

       // --- PROCESSED ---
       if (processedTasks.length > 0) {
         html += '<div class="section-title" style="margin-top: var(--space-xl);">Sudah Diproses</div>';
         
         if (processedTasks.length > 0) {
           html += '<div class="section-title" style="margin-top: 8px; font-size: 11px; border-bottom: none; color: var(--color-text-light);">RIWAYAT TUGAS HARIAN</div>';
           processedTasks.forEach(item => {
              const icon = item.status === 'approved' ? '✅' : item.status === 'rejected' ? '❌' : '↻';
              const label = item.status === 'approved' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Revisi';
              html += `
                <div class="approval-card" style="border-left-color: ${item.status === 'approved' ? 'var(--color-success)' : item.status === 'rejected' ? 'var(--color-danger)' : 'var(--color-urgent)'}; opacity: 0.7;">
                  <div class="approval-header">
                    <span>${icon}</span>
                    <span class="approval-title" style="text-decoration: ${item.status === 'rejected' ? 'line-through' : 'none'};">${this.esc(item.title)}</span>
                  </div>
                  <div class="approval-meta">${label} · Selesai Oleh: ${this.esc(item.userName)}</div>
                </div>
              `;
           });
         }
         
       }
    }

    container.innerHTML = html;
    this.bindEvents(container);
  },

  bindEvents(container) {
    container.querySelectorAll('[data-goal-action]').forEach(btn => {
       // KPI approval is no longer handled via extension, manager updates it directly via Web.
    });

    container.querySelectorAll('[data-task-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.getAttribute('data-task-action');
        const id = btn.getAttribute('data-id');
        const item = this.teamTasks.find(t => t.id === Number(id) || String(t.id) === String(id));
        if (!item) return;

        item.status = action;
        item.verified = action === 'approve';
        item.done = action !== 'reject' && action !== 'revision';

        if (action === 'approve') {
          FlowBuddyConfetti.burst(btn, 40);
          FlowBuddyApp.showToast('✅ Tugas disetujui!');
        } else if (action === 'reject') {
          FlowBuddyApp.showToast('❌ Tugas ditolak.');
        } else {
          FlowBuddyApp.showToast('↻ Diminta revisi.');
        }
        
        // Optimistic UI
        this.save();
        setTimeout(() => this.render(container), 400);

        // API Call
        if (this.baseUrl && this.userId) {
          try {
             const url = this.baseUrl.replace(/\/$/, '') + '/api/manager/tasks/pending';
             const apiStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revision';
             await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  taskId: item.id, 
                  status: apiStatus, 
                  notes: action === 'revision' ? 'Direvisi dari FlowBuddy' : '' 
                })
             });
          } catch(err) {}
        }
      });
    });
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
