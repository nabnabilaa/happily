/* ==========================================================================
   FlowBuddy — Tasks View
   Quick-add, toggle complete (with bounce), progress bar, confetti on all done
   ========================================================================== */

const TasksView = {
  tasks: [],
  storageKey: 'flowbuddy-tasks',

  init() {
    this.load();
    // Listen for storage changes from background sync
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['fb3']) {
          const fb3 = changes['fb3'].newValue;
          if (fb3 && fb3.tasks) {
            this.tasks = fb3.tasks;
            if (FlowBuddyApp.currentView === 'tasks') {
               const container = document.getElementById('view-tasks');
               if (container) this.render(container);
            }
          }
        }
      });
    }
  },

  load() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        if (res.fb3 && res.fb3.tasks) {
          this.tasks = res.fb3.tasks;
          const container = document.getElementById('view-tasks');
          if (container && FlowBuddyApp.currentView === 'tasks') this.render(container);
        }
      });
    }
  },

  save() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        const fb3 = res.fb3 || { tasks: [], notes: [], alarms: [], deletedTaskIds: [], deletedNoteIds: [] };
        fb3.tasks = this.tasks;
        chrome.storage.local.set({ fb3: fb3 }, () => {
          // Force push sync immediately
          chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
        });
      });
    }
  },

  addTask(title, description, targetDate, kpiId) {
    if (!title.trim()) return;
    this.tasks.push({
      id: Date.now().toString(),
      title: title.trim(),
      text: title.trim(),
      description: description ? description.trim() : null,
      targetDate: targetDate || new Date().toISOString().split('T')[0],
      kpiId: kpiId || null,
      done: false,
      date: new Date().toISOString().split('T')[0]
    });
    this.save();
  },

  toggleTask(id) {
    const task = this.tasks.find(t => String(t.id) === String(id));
    if (task) {
      task.done = !task.done;
      this.save();
    }
    return task;
  },

  deleteTask(id) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        const fb3 = res.fb3 || {};
        fb3.deletedTaskIds = fb3.deletedTaskIds || [];
        fb3.deletedTaskIds.push(String(id));
        chrome.storage.local.set({ fb3 });
      });
    }
    this.tasks = this.tasks.filter(t => String(t.id) !== String(id));
    this.save();
  },

  getProgress() {
    if (this.tasks.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = this.tasks.filter(t => t.done).length;
    return { done, total: this.tasks.length, pct: Math.round((done / this.tasks.length) * 100) };
  },

  allDone() {
    return this.tasks.length > 0 && this.tasks.every(t => t.done);
  },

  render(container) {
    const progress = this.getProgress();
    const pctClass = progress.pct === 100 ? 'complete' : '';

    let html = `
      <div class="task-form">
        <div class="section-title" style="border:none; margin-bottom: 8px;">TAMBAH TASK BARU</div>
        <div class="task-form-box">
          <textarea id="task-quick-add" placeholder="Deskripsikan task (min. 5 karakter)..." class="task-form-textarea" rows="2"></textarea>
          
          <textarea id="task-detail-add" placeholder="Detail task (opsional)..." class="task-form-textarea" rows="2" style="margin-top: 4px;"></textarea>

          <div class="task-form-row" style="margin-top: 4px;">
            <div class="task-form-col">
              <label>TANGGAL PELAKSANAAN</label>
              <input type="date" id="task-date-add" class="task-form-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="task-form-col">
              <label>TERKAIT KPI MANA?</label>
              <select id="task-kpi-add" class="task-form-input">
                <option value="">Umum (tidak terkait KPI spesifik) ⓘ</option>
              </select>
            </div>
          </div>
          
          <div class="task-form-info" style="margin-top: 4px;">
            <span>💡</span>
            <span>Link bukti pengerjaan diisi nanti saat mencentang task selesai. Poin masuk setelah Manager ACC.</span>
          </div>

          <button id="task-add-btn" class="btn-primary" style="width: 100%; background: #96B2A1; padding: 12px; margin-top: 4px; font-size: 14px;">+ Tambah Task</button>
        </div>
      </div>

      <div class="section-title" style="border:none; margin-top: 16px; margin-bottom: 8px;">TASK AKTIF HARI INI</div>

      <div class="progress-label">
        <span>Progress Hari Ini</span>
        <span>${progress.done}/${progress.total} (${progress.pct}%)</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${pctClass} animate" style="width: ${progress.pct}%"></div>
      </div>
    `;

    if (this.tasks.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Belum ada tugas</div>
          <div class="empty-state-text">Tambahkan tugas pertamamu dan mulai produktif hari ini!</div>
        </div>
      `;
    } else if (this.allDone()) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">🎉</div>
          <div class="empty-state-title">Semua beres!</div>
          <div class="empty-state-text">Kamu sudah menyelesaikan semuanya! Nikmati sisa harimu. ☕</div>
        </div>
      `;
    } else {
      html += '<div class="task-list stagger-in">';
      this.tasks.forEach(task => {
        html += `
          <div class="task-card" data-task-id="${task.id}">
            <div class="task-checkbox ${task.done ? 'checked' : ''}" data-task-toggle="${task.id}" aria-label="${task.done ? 'Batal selesai' : 'Tandai selesai'}" role="checkbox" aria-checked="${task.done}" tabindex="0">
              ${task.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
            </div>
            <span class="task-text ${task.done ? 'done' : ''}">${this.esc(task.title || task.text)}</span>
          </div>
        `;
      });
      html += '</div>';
    }

    // Render non-done tasks first, then done tasks
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    container.appendChild(wrapper);

    // Bind events
    this.bindEvents(container);
  },

  bindEvents(container) {
    // Quick add
    const input = container.querySelector('#task-quick-add');
    const inputDesc = container.querySelector('#task-detail-add');
    const inputDate = container.querySelector('#task-date-add');
    const inputKpi = container.querySelector('#task-kpi-add');
    const addBtn = container.querySelector('#task-add-btn');

    if (input && addBtn) {
      const doAdd = () => {
        const title = input.value;
        const desc = inputDesc ? inputDesc.value : null;
        const date = inputDate ? inputDate.value : null;
        const kpi = inputKpi ? inputKpi.value : null;
        
        if (title.trim().length < 5) {
          FlowBuddyApp.showToast('Deskripsi task minimal 5 karakter!');
          return;
        }

        this.addTask(title, desc, date, kpi);
        this.render(container);
      };
      addBtn.addEventListener('click', doAdd);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          doAdd();
        }
      });
    }

    // Toggle tasks
    container.querySelectorAll('[data-task-toggle]').forEach(cb => {
      const handler = () => {
        const id = cb.getAttribute('data-task-toggle');
        const task = this.toggleTask(id);

        if (task && task.done) {
          cb.classList.add('checked');
          // Check if all tasks done → confetti!
          if (this.allDone()) {
            setTimeout(() => {
              FlowBuddyConfetti.burst(null, 50);
              FlowBuddyApp.showToast('🎉 Semua beres! Kamu hebat!');
            }, 400);
          }
        }

        // Re-render after animation completes
        setTimeout(() => this.render(container), 300);
      };

      cb.addEventListener('click', handler);
      cb.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
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
