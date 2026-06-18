/* ==========================================================================
   FlowBuddy — Calendar View
   Menampilkan kalender mini dan daftar agenda dengan fitur penambahan agenda
   ========================================================================== */

const CalendarView = {
  events: [],
  storageKey: 'flowbuddy-events',
  currentDate: new Date(),
  selectedDate: null,
  editingEventId: null,

  init() {
    this.load();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['fb3']) {
          const fb3 = changes['fb3'].newValue;
          if (fb3 && fb3.events) {
            this.events = fb3.events;
            if (FlowBuddyApp.currentView === 'calendar') {
               const container = document.getElementById('view-calendar');
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
        if (res.fb3 && res.fb3.events) {
          this.events = res.fb3.events;
          const container = document.getElementById('view-calendar');
          if (container && FlowBuddyApp.currentView === 'calendar') this.render(container);
        }
      });
    }
  },

  save() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        const fb3 = res.fb3 || { tasks: [], notes: [], events: [] };
        fb3.events = this.events;
        chrome.storage.local.set({ fb3: fb3 }, () => {
          try { chrome.runtime.sendMessage({ type: 'FORCE_SYNC' }).catch(()=>{}); } catch(e) {}
        });
      });
    }
  },

  addEvent(title, date, time, color) {
    if (!title.trim() || !date) return;
    this.events.push({
      id: Date.now().toString(),
      title: title.trim(),
      date: date,
      time: time || '',
      color: color || '#FF6B35'
    });
    this.save();
  },

  deleteEvent(id) {
    this.events = this.events.filter(e => String(e.id) !== String(id));
    this.save();
  },

  changeMonth(offset) {
    this.currentDate.setMonth(this.currentDate.getMonth() + offset);
    const container = document.getElementById('view-calendar');
    if (container) this.render(container);
  },

  render(container) {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const curYear = this.currentDate.getFullYear();
    const curMonth = this.currentDate.getMonth();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    // Calculate grid
    const firstDow = new Date(curYear, curMonth, 1).getDay();
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const daysInPrev = new Date(curYear, curMonth, 0).getDate();

    let gridHtml = '';
    
    // Header for days
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    let headerHtml = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; font-weight: 700; color: var(--gray); margin-bottom: 8px;">';
    dayNames.forEach(d => {
       headerHtml += `<div>${d}</div>`;
    });
    headerHtml += '</div>';

    let cellsHtml = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">';

    // Helper to format date string
    const dStr = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    // Prev month
    for (let i = 0; i < firstDow; i++) {
       const day = daysInPrev - firstDow + 1 + i;
       const pM = curMonth === 0 ? 11 : curMonth - 1;
       const pY = curMonth === 0 ? curYear - 1 : curYear;
       cellsHtml += this.renderDayCell(day, dStr(pY, pM, day), true, todayStr);
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
       cellsHtml += this.renderDayCell(d, dStr(curYear, curMonth, d), false, todayStr);
    }

    // Next month fill
    const total = firstDow + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= remaining; d++) {
       const nM = curMonth === 11 ? 0 : curMonth + 1;
       const nY = curMonth === 11 ? curYear + 1 : curYear;
       cellsHtml += this.renderDayCell(d, dStr(nY, nM, d), true, todayStr);
    }
    cellsHtml += '</div>';

    // List of events
    let eventsHtml = '';
    const eventsToShow = this.selectedDate 
      ? this.events.filter(e => e.date === this.selectedDate)
      : this.events.filter(e => e.date >= todayStr).sort((a,b) => a.date.localeCompare(b.date));
      
    if (eventsToShow.length === 0) {
      eventsHtml = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <div class="empty-state-title">Kosong</div>
          <div class="empty-state-text">${this.selectedDate ? 'Tidak ada agenda di tanggal ini.' : 'Belum ada agenda mendatang.'}</div>
        </div>
      `;
    } else {
      eventsHtml = '<div class="task-list stagger-in" style="margin-top:12px; padding-bottom: 20px;">';
      eventsToShow.forEach(ev => {
        const evD = new Date(ev.date);
        const dateDisp = `${evD.getDate()} ${monthNames[evD.getMonth()]} ${evD.getFullYear()}`;
        eventsHtml += `
          <div class="task-card" style="border-left: 4px solid ${ev.color}; padding-left: 12px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; position: relative;">
            <div style="font-size: 14px; font-weight: 700; color: var(--dk); width: calc(100% - 24px);">${this.esc(ev.title)}</div>
            <div style="font-size: 12px; color: var(--gray);">${dateDisp}${ev.time ? ' • ' + ev.time : ''}</div>
            
            <button class="cal-menu-btn" data-id="${ev.id}" style="position: absolute; right: 8px; top: 12px; background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 4px;">⋮</button>
            
            <div class="cal-dropdown" id="cal-dropdown-${ev.id}" style="display: none; position: absolute; right: 10px; top: 40px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 8px; box-shadow: var(--shadow-md); z-index: 10; min-width: 130px; overflow: hidden;">
               <div class="cal-edit-btn" data-id="${ev.id}" style="padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text-primary); border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 8px; transition: background 0.2s;">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit
               </div>
               <div class="cal-del-btn" data-id="${ev.id}" style="padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--color-danger); display: flex; align-items: center; gap: 8px; transition: background 0.2s;">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Hapus
               </div>
            </div>
          </div>
        `;
      });
      eventsHtml += '</div>';
    }

    let html = `
      <div class="cal-container">
        <div class="section-title" style="border:none; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <button id="cal-prev" style="background: none; border: none; cursor: pointer; color: var(--c1); font-weight: bold; padding: 4px;">‹ Prev</button>
          <span style="font-size: 14px; color: var(--dk);">${monthNames[curMonth]} ${curYear}</span>
          <button id="cal-next" style="background: none; border: none; cursor: pointer; color: var(--c1); font-weight: bold; padding: 4px;">Next ›</button>
        </div>
        ${headerHtml}
        ${cellsHtml}

        <div style="margin-top: 16px; margin-bottom: 16px; border-top: 1px solid var(--border); padding-top: 16px;">
           <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
             <span style="font-size: 12px; font-weight: 800; color: var(--gray);">AGENDA ${this.selectedDate ? '(' + this.selectedDate + ')' : 'MENDATANG'}</span>
             ${this.selectedDate ? '<button id="cal-clear-sel" style="background:none;border:none;font-size:11px;color:var(--c1);cursor:pointer;font-weight:700;">Lihat Semua</button>' : ''}
           </div>
           ${eventsHtml}
        </div>

        <div class="task-form" style="margin-top: 16px;" id="cal-form-section">
          <div id="cal-form-title" class="section-title" style="border:none; margin-bottom: 8px;">TAMBAH AGENDA</div>
          <div class="task-form-box">
            <input type="text" id="ev-title" class="task-form-input" placeholder="Nama acara..." style="margin-bottom: 8px; width:100%; box-sizing: border-box;" />
            <div class="task-form-row" style="margin-bottom: 8px;">
              <div class="task-form-col">
                <input type="date" id="ev-date" class="task-form-input" value="${this.selectedDate || todayStr}" style="width:100%; box-sizing: border-box;" />
              </div>
              <div class="task-form-col">
                <input type="time" id="ev-time" class="task-form-input" style="width:100%; box-sizing: border-box;" />
              </div>
            </div>
            <div style="margin-bottom: 12px; display: flex; gap: 8px;" id="ev-colors">
              <button class="color-dot sel" data-c="#FF6B35" style="width: 24px; height: 24px; border-radius: 50%; background: #FF6B35; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--border); cursor: pointer;"></button>
              <button class="color-dot" data-c="#1D3557" style="width: 24px; height: 24px; border-radius: 50%; background: #1D3557; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--border); cursor: pointer;"></button>
              <button class="color-dot" data-c="#2EC4B6" style="width: 24px; height: 24px; border-radius: 50%; background: #2EC4B6; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--border); cursor: pointer;"></button>
              <button class="color-dot" data-c="#FFBE0B" style="width: 24px; height: 24px; border-radius: 50%; background: #FFBE0B; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--border); cursor: pointer;"></button>
              <button class="color-dot" data-c="#A855F7" style="width: 24px; height: 24px; border-radius: 50%; background: #A855F7; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--border); cursor: pointer;"></button>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="ev-add-btn" class="btn-primary" style="flex: 1; padding: 12px; font-size: 14px;">Simpan Agenda</button>
              <button id="ev-cancel-btn" class="btn-secondary" style="display: none; padding: 12px; font-size: 14px;">Batal</button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.bindEvents(container);
  },

  renderDayCell(dayNum, dateKey, isOtherMonth, todayStr) {
    const isToday = dateKey === todayStr;
    const isSelected = dateKey === this.selectedDate;
    const dayEvents = this.events.filter(e => e.date === dateKey);

    let bg = 'transparent';
    let color = isOtherMonth ? 'rgba(0,0,0,0.3)' : 'var(--dk)';
    let border = '1px solid transparent';

    if (isToday) {
      bg = 'var(--c1p)';
      color = 'var(--c1)';
      border = '1px solid var(--c1)';
    }
    if (isSelected) {
      bg = 'var(--c1)';
      color = '#fff';
    }

    let dotsHtml = '';
    if (dayEvents.length > 0) {
      dotsHtml = '<div style="display:flex; gap: 2px; justify-content: center; margin-top: 2px;">';
      dayEvents.slice(0, 3).forEach(e => {
         dotsHtml += `<div style="width: 4px; height: 4px; border-radius: 50%; background: ${isSelected ? '#fff' : e.color};"></div>`;
      });
      dotsHtml += '</div>';
    }

    return `
      <div class="cal-day" data-date="${dateKey}" style="
        aspect-ratio: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        cursor: pointer;
        background: ${bg};
        color: ${color};
        border: ${border};
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
      ">
        ${dayNum}
        ${dotsHtml}
      </div>
    `;
  },

  bindEvents(container) {
    const btnPrev = container.querySelector('#cal-prev');
    const btnNext = container.querySelector('#cal-next');
    if (btnPrev) btnPrev.addEventListener('click', () => this.changeMonth(-1));
    if (btnNext) btnNext.addEventListener('click', () => this.changeMonth(1));

    const days = container.querySelectorAll('.cal-day');
    days.forEach(d => {
       d.addEventListener('click', () => {
          const dt = d.getAttribute('data-date');
          this.selectedDate = (this.selectedDate === dt) ? null : dt;
          this.render(container);
       });
    });

    const btnClearSel = container.querySelector('#cal-clear-sel');
    if (btnClearSel) {
       btnClearSel.addEventListener('click', () => {
          this.selectedDate = null;
          this.render(container);
       });
    }

    let selectedColor = '#FF6B35';
    const dots = container.querySelectorAll('.color-dot');
    
    // Function to apply color selection
    const selectColor = (color) => {
       dots.forEach(od => { od.classList.remove('sel'); od.style.boxShadow = '0 0 0 1px var(--border)'; });
       const targetDot = container.querySelector(`.color-dot[data-c="${color}"]`);
       if (targetDot) {
          targetDot.classList.add('sel');
          targetDot.style.boxShadow = `0 0 0 2px ${color}`;
       }
       selectedColor = color;
    };

    dots.forEach(d => {
       d.addEventListener('click', () => {
          selectColor(d.getAttribute('data-c'));
       });
    });

    // Dropdown toggles
    container.querySelectorAll('.cal-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const drop = container.querySelector(`#cal-dropdown-${id}`);
        const isVisible = drop.style.display === 'block';
        
        container.querySelectorAll('.cal-dropdown').forEach(d => d.style.display = 'none');
        if (!isVisible) drop.style.display = 'block';
      });
    });

    container.querySelectorAll('.cal-edit-btn, .cal-del-btn').forEach(btn => {
       btn.addEventListener('mouseover', () => btn.style.background = 'var(--bg-card-hover)');
       btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
    });

    const closeDropdowns = () => {
      container.querySelectorAll('.cal-dropdown').forEach(d => d.style.display = 'none');
    };
    document.removeEventListener('click', closeDropdowns);
    document.addEventListener('click', closeDropdowns);

    const addBtn = container.querySelector('#ev-add-btn');
    const cancelBtn = container.querySelector('#ev-cancel-btn');
    const titleInp = container.querySelector('#ev-title');
    const dateInp = container.querySelector('#ev-date');
    const timeInp = container.querySelector('#ev-time');
    const formTitle = container.querySelector('#cal-form-title');

    // Edit event
    container.querySelectorAll('.cal-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const ev = this.events.find(t => String(t.id) === String(id));
        if (ev) {
           this.editingEventId = id;
           if(titleInp) titleInp.value = ev.title || '';
           if(dateInp) dateInp.value = ev.date || '';
           if(timeInp) timeInp.value = ev.time || '';
           selectColor(ev.color || '#FF6B35');
           
           if(addBtn) {
             addBtn.innerHTML = '✓ Update Agenda';
             addBtn.style.background = 'var(--color-role)'; 
           }
           if(cancelBtn) cancelBtn.style.display = 'block';
           if(formTitle) formTitle.textContent = 'EDIT AGENDA';
           
           closeDropdowns();
           
           // Scroll to form
           const formSection = container.querySelector('#cal-form-section');
           if (formSection) formSection.scrollIntoView({behavior: 'smooth', block: 'end'});
           if (titleInp) titleInp.focus();
        }
      });
    });

    // Delete event
    container.querySelectorAll('.cal-del-btn').forEach(btn => {
       btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Yakin ingin menghapus agenda ini?')) {
             this.deleteEvent(btn.getAttribute('data-id'));
             this.render(container);
             if(FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Agenda dihapus');
          }
       });
    });

    if (cancelBtn) {
       cancelBtn.addEventListener('click', () => {
          this.editingEventId = null;
          this.render(container);
       });
    }

    if (addBtn && titleInp && dateInp) {
       const doAdd = () => {
          const title = titleInp.value;
          const date = dateInp.value;
          const time = timeInp ? timeInp.value : '';
          
          if (!title.trim() || !date) {
            if (FlowBuddyApp && FlowBuddyApp.showToast) {
               FlowBuddyApp.showToast('Nama acara & tanggal wajib diisi!');
            }
            return;
          }

          if (this.editingEventId) {
             const ev = this.events.find(t => String(t.id) === String(this.editingEventId));
             if (ev) {
                ev.title = title.trim();
                ev.date = date;
                ev.time = time;
                ev.color = selectedColor;
                this.save();
                if(FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Agenda diperbarui!');
             }
             this.editingEventId = null;
          } else {
             this.addEvent(title, date, time, selectedColor);
             if(FlowBuddyApp && FlowBuddyApp.showToast) FlowBuddyApp.showToast('Agenda berhasil ditambahkan! 📅');
          }
          this.render(container);
       };
       addBtn.addEventListener('click', doAdd);
       titleInp.addEventListener('keypress', (e) => {
         if (e.key === 'Enter') doAdd();
       });
    }
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
