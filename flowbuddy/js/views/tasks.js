/* ==========================================================================
   FlowBuddy — Tasks View
   Quick-add, toggle complete (with bounce), progress bar, confetti on all done
   ========================================================================== */

const TasksView = {
  tasks: [],
  storageKey: 'flowbuddy-tasks',
  editingId: null,

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
          try { chrome.runtime.sendMessage({ type: 'FORCE_SYNC' }).catch(()=>{}); } catch(e) {}
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
    
    // Sort tasks: undone first, then done, then by energy level, then by creation date/ID
    const energyOrder = { high: 3, mid: 2, low: 1 };
    const sortedTasks = [...this.tasks].sort((a, b) => {
      if (!!a.done !== !!b.done) {
        return a.done ? 1 : -1;
      }
      
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

    let html = `
      <div class="task-form">
        <div id="task-form-title" class="section-title" style="border:none; margin-bottom: 8px;">TAMBAH TASK BARU</div>
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

          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button id="task-add-btn" class="btn-primary" style="flex: 1; background: var(--color-success); padding: 12px; font-size: 14px;">+ Tambah Task</button>
            <button id="task-cancel-edit-btn" class="btn-secondary" style="display: none; padding: 12px; font-size: 14px;">Batal</button>
          </div>
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
      html += '<div class="task-list stagger-in" style="padding-bottom: 60px;">';
      sortedTasks.forEach(task => {
        html += `
          <div class="task-card" data-task-id="${task.id}" style="position: relative; padding-right: 40px; align-items: flex-start;">
            <div class="task-checkbox ${task.done ? 'checked' : ''}" data-task-toggle="${task.id}" aria-label="${task.done ? 'Batal selesai' : 'Tandai selesai'}" role="checkbox" aria-checked="${task.done}" tabindex="0" style="margin-top: 2px;">
              ${task.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
            </div>
            <div style="flex:1; min-width:0; display: flex; flex-direction: column; gap: 2px;">
              <span class="task-text ${task.done ? 'done' : ''}">${this.esc(task.title || task.text)}</span>
              ${task.description ? `<span style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">${this.esc(task.description)}</span>` : ''}
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

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    container.appendChild(wrapper);

    // Bind events
    this.bindEvents(container);
  },

  bindEvents(container) {
    const input = container.querySelector('#task-quick-add');
    const inputDesc = container.querySelector('#task-detail-add');
    const inputDate = container.querySelector('#task-date-add');
    const inputKpi = container.querySelector('#task-kpi-add');
    const addBtn = container.querySelector('#task-add-btn');
    const cancelBtn = container.querySelector('#task-cancel-edit-btn');
    const formTitle = container.querySelector('#task-form-title');

    // Quick add / Update
    if (input && addBtn) {
      const doAdd = () => {
        const title = input.value;
        const desc = inputDesc ? inputDesc.value : null;
        const date = inputDate ? inputDate.value : null;
        const kpi = inputKpi ? inputKpi.value : null;
        
        if (title.trim().length < 5) {
          if(FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Deskripsi task minimal 5 karakter!');
          return;
        }

        if (this.editingId) {
           const task = this.tasks.find(t => String(t.id) === String(this.editingId));
           if (task) {
              task.title = title.trim();
              task.text = title.trim();
              task.description = desc ? desc.trim() : null;
              task.targetDate = date || new Date().toISOString().split('T')[0];
              task.kpiId = kpi || null;
              this.save();
              if(FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Task diperbarui!');
           }
           this.editingId = null;
        } else {
           this.addTask(title, desc, date, kpi);
           if(FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Task ditambahkan!');
        }
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
        
        // Reset all z-indexes and close all dropdowns
        container.querySelectorAll('.task-card').forEach(c => c.style.zIndex = '1');
        container.querySelectorAll('.task-dropdown').forEach(d => d.style.display = 'none');
        
        if (!isVisible) {
          drop.style.display = 'block';
          drop.style.position = 'absolute';
          
          // Bring the current task card to the front to prevent overlap
          if (taskCard) taskCard.style.zIndex = '100';
          
          // Check if there is enough space below
          const rect = btn.getBoundingClientRect();
          if (rect.bottom + 100 > window.innerHeight) {
             // Open upwards
             drop.style.top = 'auto';
             drop.style.bottom = '40px'; 
          } else {
             // Open downwards
             drop.style.bottom = 'auto';
             drop.style.top = '40px'; 
          }
          
          drop.style.left = 'auto';
          drop.style.right = '10px';
        }
      });
    });

    // Hover effects for dropdown items
    container.querySelectorAll('.task-edit-btn, .task-del-btn').forEach(btn => {
       btn.addEventListener('mouseover', () => btn.style.background = 'var(--bg-card-hover)');
       btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
    });

    // Close dropdowns on outside click
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
           // Populate form
           if(input) input.value = task.title || task.text || '';
           if(inputDesc) inputDesc.value = task.description || '';
           if(inputDate) inputDate.value = task.targetDate || new Date().toISOString().split('T')[0];
           if(inputKpi && task.kpiId) inputKpi.value = task.kpiId;
           
           if(addBtn) {
             addBtn.innerHTML = '✓ Update Task';
             addBtn.style.background = 'var(--color-role)'; 
           }
           if(cancelBtn) cancelBtn.style.display = 'block';
           if(formTitle) formTitle.textContent = 'EDIT TASK';
           
           container.querySelectorAll('.task-dropdown').forEach(d => d.style.display = 'none');
           
           // Scroll to top to see form
           container.scrollTo({top: 0, behavior: 'smooth'});
           input.focus();
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
           if(FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Task dihapus');
        }
      });
    });

    // Toggle tasks (Kerjakan)
    container.querySelectorAll('[data-task-toggle]').forEach(cb => {
      const handler = () => {
        const id = cb.getAttribute('data-task-toggle');
        const task = this.toggleTask(id);

        if (task && task.done) {
          cb.classList.add('checked');
          // Check if all tasks done → confetti!
          if (this.allDone()) {
            setTimeout(() => {
              if(typeof FlowBuddyConfetti !== 'undefined') FlowBuddyConfetti.burst(null, 50);
              if(FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('🎉 Semua beres! Kamu hebat!');
            }, 400);
          } else {
            if(FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Task Selesai! Kerja bagus 👍');
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
