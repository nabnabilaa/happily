/* ==========================================================================
   FlowBuddy — Tasks View
   Quick-add, toggle complete (with bounce), progress bar, confetti on all done
   ========================================================================== */

const TasksView = {
  tasks: [],
  kpis: [],
  weeklyTargets: [],
  storageKey: 'flowbuddy-tasks',
  editingId: null,

  init() {
    this.load();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['fb3']) {
          const fb3 = changes['fb3'].newValue;
          if (fb3) {
            if (fb3.tasks) this.tasks = fb3.tasks;
            if (fb3.kpis) this.kpis = fb3.kpis;
            if (fb3.weeklyTargets) this.weeklyTargets = fb3.weeklyTargets;
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
        if (res.fb3) {
          if (res.fb3.tasks) this.tasks = res.fb3.tasks;
          if (res.fb3.kpis) this.kpis = res.fb3.kpis;
          if (res.fb3.weeklyTargets) this.weeklyTargets = res.fb3.weeklyTargets;
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
          try { chrome.runtime.sendMessage({ type: 'FORCE_SYNC' }).catch(()=>{}); } catch(e) {}
        });
      });
    }
  },

  addTask(title, description, targetDate, deadline, weeklyTargetId, kpiId) {
    if (!title.trim()) return;
    this.tasks.push({
      id: Date.now().toString(),
      title: title.trim(),
      text: title.trim(),
      description: description ? description.trim() : null,
      targetDate: targetDate || new Date().toISOString().split('T')[0],
      deadline: deadline || null,
      weeklyTargetId: weeklyTargetId || null,
      kpiId: kpiId || null,
      goalId: kpiId || null,
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

  buildTargetOptions() {
    const kpis = this.kpis || [];
    const weeklyTargets = this.weeklyTargets || [];

    const grouped = {};
    weeklyTargets.forEach(wt => {
      const key = String(wt.kpiId);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(wt);
    });

    let html = '<option value="">Tidak terkait target mingguan</option>';
    kpis.forEach(kpi => {
      const targets = grouped[String(kpi.id)];
      if (!targets || targets.length === 0) return;
      html += `<optgroup label="${this.esc(String(kpi.title))}">`;
      targets.forEach(wt => {
        html += `<option value="${this.esc(String(wt.id))}" data-kpi="${this.esc(String(wt.kpiId))}">W${Number(wt.weekNumber)} — ${this.esc(String(wt.title))}</option>`;
      });
      html += '</optgroup>';
    });

    if (kpis.length === 0) {
      html += '<option value="" disabled>Belum ada KPI. Tambahkan di web dulu.</option>';
    }

    return html;
  },

  render(container) {
    const progress = this.getProgress();
    const pctClass = progress.pct === 100 ? 'complete' : '';
    const today = new Date().toISOString().split('T')[0];

    const energyOrder = { high: 3, mid: 2, low: 1 };
    const sortedTasks = [...this.tasks].sort((a, b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      const energyA = a.priority || a.energy || 'mid';
      const energyB = b.priority || b.energy || 'mid';
      const valA = energyOrder[String(energyA).toLowerCase()] || 2;
      const valB = energyOrder[String(energyB).toLowerCase()] || 2;
      if (valA !== valB) return valB - valA;
      const timeA = a.created_at || a.createdAt ? new Date(a.created_at || a.createdAt).getTime() : (isNaN(Number(a.id)) ? 0 : Number(a.id));
      const timeB = b.created_at || b.createdAt ? new Date(b.created_at || b.createdAt).getTime() : (isNaN(Number(b.id)) ? 0 : Number(b.id));
      if (timeA !== timeB) return timeA - timeB;
      return String(a.id).localeCompare(String(b.id));
    });

    const labelStyle = 'display:block; font-size:10px; font-weight:800; color:var(--text-muted); margin-bottom:4px; letter-spacing:0.5px;';

    let html = `
      <div class="task-form">
        <div id="task-form-title" class="section-title" style="border:none; margin-bottom: 8px;">TAMBAH TASK BARU</div>
        <div class="task-form-box">

          <div>
            <input type="text" id="task-quick-add"
              placeholder="Deskripsikan task (min. 5 karakter)..."
              class="task-form-input"
              autocomplete="off"
              style="width:100%; box-sizing:border-box;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:3px; min-height:16px;">
              <span id="task-char-hint" style="font-size:10px; font-weight:700;"></span>
              <span id="task-char-count" style="font-size:10px; color:var(--text-muted);">0/5</span>
            </div>
          </div>

          <textarea id="task-detail-add" placeholder="Detail task (opsional)..." class="task-form-textarea" rows="2" style="margin-top:4px;"></textarea>

          <div class="task-form-row" style="margin-top:4px;">
            <div class="task-form-col">
              <label style="${labelStyle}">TANGGAL MULAI / PELAKSANAAN</label>
              <input type="date" id="task-date-add" class="task-form-input" value="${today}">
            </div>
            <div class="task-form-col">
              <label style="${labelStyle}">DEADLINE / TENGGAT (opsional)</label>
              <input type="date" id="task-deadline-add" class="task-form-input" min="${today}">
            </div>
          </div>

          <div style="margin-top:4px;">
            <label style="${labelStyle}">TERKAIT TARGET MANA? (opsional)</label>
            <select id="task-target-add" class="task-form-input">
              ${this.buildTargetOptions()}
            </select>
          </div>

          <div class="task-form-info" style="margin-top:4px;">
            <span>💡</span>
            <span>Link bukti pengerjaan diisi nanti saat mencentang task selesai. Poin masuk setelah Manager ACC.</span>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button id="task-add-btn" class="btn-primary" style="flex: 1; padding: 12px; font-size: 14px; opacity:0.5; cursor:default;">+ Tambah Task</button>
            <button id="task-cancel-edit-btn" class="btn-secondary" style="display: none; padding: 12px; font-size: 14px;">Batal</button>
          </div>
        </div>
      </div>

      <div class="section-title" style="border:none; margin-top: 16px; margin-bottom: 8px;">TASK AKTIF HARI INI</div>
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
      html += '<div class="task-list stagger-in" style="padding-bottom: 60px;">';
      sortedTasks.forEach(task => {
        const wtLabel = task.weeklyTargetId
          ? (() => {
              const wt = (this.weeklyTargets || []).find(w => String(w.id) === String(task.weeklyTargetId));
              const kpi = wt ? (this.kpis || []).find(k => String(k.id) === String(wt.kpiId)) : null;
              return wt ? `${kpi ? kpi.title + ' · ' : ''}${wt.title}` : '';
            })()
          : '';
        html += `
          <div class="task-card" data-task-id="${task.id}" style="position: relative; padding-right: 40px; align-items: flex-start;">
            <div class="task-checkbox ${task.done ? 'checked' : ''}" data-task-toggle="${task.id}" aria-label="${task.done ? 'Batal selesai' : 'Tandai selesai'}" role="checkbox" aria-checked="${task.done}" tabindex="0" style="margin-top: 2px;">
              ${task.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
            </div>
            <div data-task-body="${task.id}" style="flex:1; min-width:0; display: flex; flex-direction: column; gap: 2px; cursor: pointer;">
              <span class="task-text ${task.done ? 'done' : ''}">${this.esc(task.title || task.text)}</span>
              ${task.description ? `<span style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">${this.esc(task.description)}</span>` : ''}
              ${wtLabel ? `<span style="font-size:10px; font-weight:700; color:var(--color-role); background:var(--color-role-soft); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:2px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🎯 ${this.esc(wtLabel)}</span>` : ''}
              ${task.deadline ? `<span style="font-size:10px; color:var(--text-muted);">⏳ Tenggat: ${task.deadline}</span>` : ''}
              
              <div class="task-badges" style="${(!task.proofLink && !task.isProject && !task.targetDate && !task.progress) ? 'display:none;' : ''}">
                ${(() => {
                  let links = [];
                  try { links = JSON.parse(task.proofLink); } catch { links = task.proofLink ? [task.proofLink] : []; }
                  return links.length > 0 ? `<span class="task-badge task-badge-link">📎 ${links.length}</span>` : '';
                })()}
                ${task.isProject ? `<span class="task-badge task-badge-project">📁 PROJECT</span>` : ''}
                ${task.targetDate ? `<span class="task-badge task-badge-date">📅 ${task.targetDate}</span>` : ''}
                ${task.progress && task.progress < 100 ? `<span class="task-badge task-badge-progress">📊 ${task.progress}% PROGRESS</span>` : ''}
              </div>
              
              ${task.progress && task.progress > 0 && task.progress < 100 ? `
              <div class="task-progress-bar-small">
                <div class="task-progress-fill-small" style="width: ${task.progress}%"></div>
              </div>` : ''}
            </div>
            <button class="task-menu-btn" data-id="${task.id}" style="position: absolute; right: 8px; top: 12px; background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 4px;">⋮</button>

            <div class="task-dropdown" id="dropdown-${task.id}" style="display: none; position: absolute; right: 10px; top: 40px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 8px; box-shadow: var(--shadow-md); z-index: 10; min-width: 130px; overflow: hidden;">
               <div class="task-edit-btn" data-id="${task.id}" style="padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text-primary); border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 8px; transition: background 0.2s;">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit
               </div>
               <div class="task-del-btn" data-id="${task.id}" style="padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--color-danger); display: flex; align-items: center; gap: 8px; transition: background 0.2s;">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Hapus
               </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    html += `
      <div class="progress-label" style="margin-top: 24px;">
        <span>Progress Hari Ini</span>
        <span>${progress.done}/${progress.total} (${progress.pct}%)</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${pctClass} animate" style="width: ${progress.pct}%"></div>
      </div>
    `;

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    container.appendChild(wrapper);

    this.bindEvents(container);
  },

  bindEvents(container) {
    const input = container.querySelector('#task-quick-add');
    const inputDesc = container.querySelector('#task-detail-add');
    const inputDate = container.querySelector('#task-date-add');
    const inputDeadline = container.querySelector('#task-deadline-add');
    const inputTarget = container.querySelector('#task-target-add');
    const addBtn = container.querySelector('#task-add-btn');
    const cancelBtn = container.querySelector('#task-cancel-edit-btn');
    const formTitle = container.querySelector('#task-form-title');
    const charHint = container.querySelector('#task-char-hint');
    const charCount = container.querySelector('#task-char-count');

    const updateCharUI = () => {
      if (!input || !addBtn) return;
      const len = input.value.length;
      if (charCount) charCount.textContent = `${len}/5`;
      if (len > 0 && len < 5) {
        if (charHint) { charHint.textContent = `⚠️ Minimal 5 karakter (${5 - len} lagi)`; charHint.style.color = 'var(--color-danger)'; }
        input.style.borderColor = 'var(--color-danger)';
        addBtn.style.opacity = '0.5'; addBtn.style.cursor = 'default'; addBtn.disabled = true;
      } else if (len >= 5) {
        if (charHint) { charHint.textContent = '✓ Deskripsi cukup'; charHint.style.color = 'var(--color-success)'; }
        input.style.borderColor = 'var(--color-success)';
        addBtn.style.opacity = '1'; addBtn.style.cursor = 'pointer'; addBtn.disabled = false;
      } else {
        if (charHint) charHint.textContent = '';
        input.style.borderColor = '';
        addBtn.style.opacity = '0.5'; addBtn.style.cursor = 'default'; addBtn.disabled = true;
      }
    };

    if (input) input.addEventListener('input', updateCharUI);

    // Keep deadline min in sync with start date
    if (inputDate && inputDeadline) {
      inputDate.addEventListener('change', () => {
        inputDeadline.min = inputDate.value;
        if (inputDeadline.value && inputDeadline.value < inputDate.value) {
          inputDeadline.value = '';
        }
      });
    }

    const getFormData = () => {
      const weeklyTargetId = inputTarget ? inputTarget.value : '';
      let kpiId = null;
      if (weeklyTargetId && inputTarget) {
        for (const opt of inputTarget.options) {
          if (opt.value === weeklyTargetId) { kpiId = opt.getAttribute('data-kpi'); break; }
        }
      }
      return {
        title: input ? input.value : '',
        desc: inputDesc ? inputDesc.value : '',
        date: inputDate ? inputDate.value : new Date().toISOString().split('T')[0],
        deadline: inputDeadline ? inputDeadline.value : '',
        weeklyTargetId,
        kpiId,
      };
    };

    const resetForm = () => {
      if (input) { input.value = ''; input.style.borderColor = ''; }
      if (inputDesc) inputDesc.value = '';
      if (inputDate) inputDate.value = new Date().toISOString().split('T')[0];
      if (inputDeadline) inputDeadline.value = '';
      if (inputTarget) inputTarget.value = '';
      if (charHint) charHint.textContent = '';
      if (charCount) charCount.textContent = '0/5';
      if (addBtn) { addBtn.style.opacity = '0.5'; addBtn.style.cursor = 'default'; addBtn.disabled = true; }
    };

    if (input && addBtn) {
      const doAdd = () => {
        const { title, desc, date, deadline, weeklyTargetId, kpiId } = getFormData();

        if (title.trim().length < 5) {
          if (FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Deskripsi task minimal 5 karakter!');
          return;
        }

        // Duplicate title check
        const isDuplicate = this.tasks.some(t =>
          t.title && t.title.toLowerCase().trim() === title.toLowerCase().trim() &&
          String(t.id) !== String(this.editingId)
        );
        if (isDuplicate) {
          if (FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Task dengan judul ini sudah ada!');
          return;
        }

        // Loading state
        if (addBtn) { addBtn.textContent = 'Menyimpan...'; addBtn.disabled = true; addBtn.style.opacity = '0.7'; }

        if (this.editingId) {
          const task = this.tasks.find(t => String(t.id) === String(this.editingId));
          if (task) {
            task.title = title.trim();
            task.text = title.trim();
            task.description = desc ? desc.trim() : null;
            task.targetDate = date || new Date().toISOString().split('T')[0];
            task.deadline = deadline || null;
            task.weeklyTargetId = weeklyTargetId || null;
            task.kpiId = kpiId || null;
            task.goalId = kpiId || null;
            this.save();
            if (FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Task diperbarui!');
          }
          this.editingId = null;
        } else {
          this.addTask(title, desc, date, deadline, weeklyTargetId, kpiId);
          if (FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Task ditambahkan!');
        }

        resetForm();
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

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.editingId = null;
        resetForm();
        if (formTitle) formTitle.textContent = 'TAMBAH TASK BARU';
        if (addBtn) { addBtn.innerHTML = '+ Tambah Task'; }
        if (cancelBtn) cancelBtn.style.display = 'none';
        this.render(container);
      });
    }

    // Toggle Dropdowns
    container.querySelectorAll('.task-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const drop = container.querySelector(`#dropdown-${id}`);
        const isVisible = drop.style.display === 'block';
        const taskCard = btn.closest('.task-card');

        container.querySelectorAll('.task-card').forEach(c => c.style.zIndex = '1');
        container.querySelectorAll('.task-dropdown').forEach(d => d.style.display = 'none');

        if (!isVisible) {
          drop.style.display = 'block';
          drop.style.position = 'absolute';
          if (taskCard) taskCard.style.zIndex = '100';
          const rect = btn.getBoundingClientRect();
          if (rect.bottom + 100 > window.innerHeight) {
            drop.style.top = 'auto';
            drop.style.bottom = '40px';
          } else {
            drop.style.bottom = 'auto';
            drop.style.top = '40px';
          }
          drop.style.left = 'auto';
          drop.style.right = '10px';
        }
      });
    });

    container.querySelectorAll('.task-edit-btn, .task-del-btn').forEach(btn => {
      btn.addEventListener('mouseover', () => btn.style.background = 'var(--bg-card-hover)');
      btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
    });

    const closeDropdowns = () => {
      container.querySelectorAll('.task-dropdown').forEach(d => d.style.display = 'none');
    };
    document.removeEventListener('click', closeDropdowns);
    document.addEventListener('click', closeDropdowns);

    // Edit Task
    container.querySelectorAll('.task-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const task = this.tasks.find(t => String(t.id) === String(id));
        if (task) {
          this.editingId = id;
          if (input) { input.value = task.title || task.text || ''; }
          if (inputDesc) inputDesc.value = task.description || '';
          if (inputDate) inputDate.value = task.targetDate || new Date().toISOString().split('T')[0];
          if (inputDeadline) inputDeadline.value = task.deadline || '';
          if (inputTarget) inputTarget.value = task.weeklyTargetId || '';

          updateCharUI();

          if (addBtn) {
            addBtn.innerHTML = '✓ Simpan Perubahan';
            addBtn.style.background = 'var(--color-role)';
            addBtn.style.opacity = input.value.length >= 5 ? '1' : '0.5';
            addBtn.style.cursor = input.value.length >= 5 ? 'pointer' : 'default';
            addBtn.disabled = input.value.length < 5;
          }
          if (cancelBtn) cancelBtn.style.display = 'block';
          if (formTitle) formTitle.textContent = 'EDIT TASK';

          container.querySelectorAll('.task-dropdown').forEach(d => d.style.display = 'none');
          container.scrollTo({ top: 0, behavior: 'smooth' });
          if (input) input.focus();
        }
      });
    });

    // Delete Task
    container.querySelectorAll('.task-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm('Yakin ingin menghapus task ini?')) {
          this.deleteTask(id);
          this.render(container);
          if (FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Task dihapus');
        }
      });
    });

    // Toggle tasks
    container.querySelectorAll('[data-task-toggle]').forEach(cb => {
      const handler = () => {
        const id = cb.getAttribute('data-task-toggle');
        const task = this.tasks.find(t => String(t.id) === String(id));
        if (!task) return;

        if (task.done) {
          // If already done, clicking unchecks it directly
          task.done = false;
          task.progress = 0;
          this.save();
          this.render(container);
        } else {
          // If not done, open modal
          this.openTaskModal(task);
        }
      };

      cb.addEventListener('click', handler);
      cb.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });

    // Open modal on body click
    container.querySelectorAll('[data-task-body]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-task-body');
        const task = this.tasks.find(t => String(t.id) === String(id));
        if (task) {
          this.openTaskModal(task);
        }
      });
    });
  },

  openTaskModal(task) {
    const modal = document.getElementById('task-completion-modal');
    if (!modal) return;
    
    const pctInput = document.getElementById('modal-task-pct');
    const dateInput = document.getElementById('modal-task-date');
    const projToggle = document.getElementById('modal-task-project');
    const pctHint = document.getElementById('modal-pct-hint');
    const linkContainer = document.getElementById('modal-links-container');
    
    document.getElementById('modal-task-summary').innerHTML = `
      <div style="background:#E5E7EB; width:24px; height:24px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style="font-size:14px; font-weight:800; color:var(--text-primary);">${this.esc(task.title || task.text)}</div>
    `;

    pctInput.value = task.progress || '';
    dateInput.value = task.targetDate || new Date().toISOString().split('T')[0];
    projToggle.checked = task.isProject || false;
    
    linkContainer.innerHTML = '';
    const addLinkInput = (val = '') => {
      const d = document.createElement('div');
      d.style.display = 'flex';
      d.style.gap = '8px';
      d.innerHTML = `
        <input type="text" class="task-form-input modal-link-input" placeholder="Link hasil kerja ..." value="${val}" style="flex:1;">
        <button class="btn-secondary modal-link-del" style="padding:10px; width:42px;">🗑️</button>
      `;
      d.querySelector('.modal-link-del').onclick = () => d.remove();
      linkContainer.appendChild(d);
    };
    
    let links = [];
    try { links = JSON.parse(task.proofLink); } catch { links = task.proofLink ? [task.proofLink] : []; }
    if (links && links.length > 0) {
      links.forEach(l => addLinkInput(l));
    } else {
      addLinkInput();
    }
    
    document.getElementById('btn-add-modal-link').onclick = () => addLinkInput();
    
    const updatePctUI = (val) => {
      document.querySelectorAll('.pct-btn').forEach(b => b.classList.remove('active', 'active-success'));
      const btn = document.querySelector(`.pct-btn[data-val="${val}"]`);
      if (btn) btn.classList.add(val == 100 ? 'active-success' : 'active');
      pctHint.style.display = val == 100 ? 'flex' : 'none';
    };
    updatePctUI(pctInput.value);

    document.querySelectorAll('.pct-btn').forEach(btn => {
      btn.onclick = () => {
        pctInput.value = btn.getAttribute('data-val');
        updatePctUI(pctInput.value);
      };
    });
    pctInput.oninput = () => updatePctUI(pctInput.value);
    
    modal.style.display = 'flex';

    document.getElementById('btn-close-task-modal').onclick = () => modal.style.display = 'none';
    
    document.getElementById('btn-save-task-modal').onclick = () => {
       task.progress = parseInt(pctInput.value) || 0;
       task.targetDate = dateInput.value;
       task.isProject = projToggle.checked;
       const newLinks = Array.from(document.querySelectorAll('.modal-link-input')).map(i => i.value).filter(v => v.trim() !== '');
       task.proofLink = newLinks.length > 0 ? JSON.stringify(newLinks) : '';
       task.done = task.progress >= 100;
       
       this.save();
       modal.style.display = 'none';
       this.render(document.getElementById('view-tasks'));
       
       if (task.done) {
         if (this.allDone()) {
            setTimeout(() => {
              if (typeof FlowBuddyConfetti !== 'undefined') FlowBuddyConfetti.burst(null, 50);
              if (FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('🎉 Semua beres! Kamu hebat!');
            }, 400);
         } else {
            if (FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Task Selesai! Kerja bagus 👍');
         }
       }
    };
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
