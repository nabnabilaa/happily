/* ==========================================================================
   FlowBuddy — Notes View (Brain-dump)
   Auto-save to localStorage
   ========================================================================== */

const NotesView = {
  viewMode: 'list', // 'list' | 'form'
  editingNoteId: null,
  searchQuery: '',
  notes: [], // Will sync from fbCtx.notes
  
  // temporary form states
  content: '',
  title: '',
  visibility: 'private',
  saveTimeout: null,

  init() {
    this.load();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['fb3']) {
          this.load();
          if (FlowBuddyApp.currentView === 'notes') {
            const container = document.getElementById('view-notes');
            if (container) {
               // Only re-render if we are in list mode to avoid disrupting form editing
               if (this.viewMode === 'list') {
                  this.render(container);
               }
            }
          }
        }
      });
    }
  },

  load() {
    if (typeof window.fbCtx !== 'undefined' && window.fbCtx.notes) {
      this.notes = window.fbCtx.notes;
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        if (res.fb3 && res.fb3.notes) {
          this.notes = res.fb3.notes;
          window.fbCtx = window.fbCtx || {};
          window.fbCtx.notes = this.notes;
        }
      });
    }
  },

  saveCurrentForm() {
    if (!this.editingNoteId) return;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        const fb3 = res.fb3 || { tasks: [], notes: [], alarms: [], deletedTaskIds: [], deletedNoteIds: [] };
        
        const existingIdx = fb3.notes.findIndex(n => String(n.id) === String(this.editingNoteId));
        if (existingIdx >= 0) {
          fb3.notes[existingIdx].text = this.content;
          fb3.notes[existingIdx].title = this.title;
          fb3.notes[existingIdx].visibility = this.visibility;
        } else {
          fb3.notes.unshift({ 
            id: this.editingNoteId, 
            title: this.title, 
            text: this.content, 
            visibility: this.visibility,
            authorName: 'SAYA',
            createdAt: new Date().toISOString()
          });
        }
        
        window.fbCtx = window.fbCtx || {};
        window.fbCtx.notes = fb3.notes;
        this.notes = fb3.notes;

        chrome.storage.local.set({ fb3: fb3 }, () => {
          chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
        });
      });
    }
    localStorage.setItem(`flowbuddy-note-${this.editingNoteId}-updated`, new Date().toISOString());
  },

  deleteNote(id) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('fb3', (res) => {
        const fb3 = res.fb3 || { tasks: [], notes: [], alarms: [], deletedTaskIds: [], deletedNoteIds: [] };
        
        // Remove from notes array
        fb3.notes = fb3.notes.filter(n => String(n.id) !== String(id));
        
        // Add to deletedNoteIds
        if (!fb3.deletedNoteIds) fb3.deletedNoteIds = [];
        if (!fb3.deletedNoteIds.includes(String(id)) && !String(id).startsWith('local-')) {
          fb3.deletedNoteIds.push(String(id));
        }

        window.fbCtx = window.fbCtx || {};
        window.fbCtx.notes = fb3.notes;
        window.fbCtx.deletedNoteIds = fb3.deletedNoteIds;
        this.notes = fb3.notes;

        chrome.storage.local.set({ fb3: fb3 }, () => {
          chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
          if (FlowBuddyApp.currentView === 'notes') {
             this.render(document.getElementById('view-notes'));
          }
        });
      });
    }
  },

  openForm(noteId) {
    this.viewMode = 'form';
    this.editingNoteId = noteId;
    if (noteId && noteId !== 'new') {
      const note = this.notes.find(n => String(n.id) === String(noteId));
      this.title = note ? (note.title || '') : '';
      this.content = note ? (note.text || '') : '';
      this.visibility = note ? (note.visibility || 'private') : 'private';
    } else {
      this.editingNoteId = 'local-' + Date.now();
      this.title = '';
      this.content = '';
      this.visibility = 'private';
      
      // Auto-save blank note immediately so it appears in the list if the user goes back
      this.saveCurrentForm();
    }
    const container = document.getElementById('view-notes');
    if (container) this.render(container);
  },

  closeForm() {
    if (this.editingNoteId) {
      // If the note is completely empty, delete it when returning to list
      if (!this.title.trim() && !this.content.trim()) {
        const idToDelete = this.editingNoteId;
        // Remove locally immediately for snappy UI
        this.notes = this.notes.filter(n => String(n.id) !== String(idToDelete));
        if (window.fbCtx && window.fbCtx.notes) {
          window.fbCtx.notes = this.notes;
        }
        // Async delete in storage
        this.deleteNote(idToDelete);
      }
    }

    this.viewMode = 'list';
    this.editingNoteId = null;
    const container = document.getElementById('view-notes');
    if (container) {
      this.render(container);
    }
  },

  render(container) {
    if (!container) return;
    if (this.viewMode === 'list') {
      this.renderList(container);
    } else {
      this.renderForm(container);
    }
  },

  renderList(container) {
    let html = `
      <div style="margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 26px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.5px;">Catatan</h2>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">Semua catatan meeting, ide, dan informasi.</p>
      </div>

      <button id="add-note-btn" style="width: 100%; padding: 14px; border-radius: 16px; background: var(--color-success); color: white; font-weight: 700; border: none; cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); margin-bottom: 20px; transition: transform 0.2s;">
         ✨ Buat Catatan Baru
      </button>

      <div class="search-input-wrap" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        <span style="font-size: 18px; color: #94a3b8;">🔍</span>
        <input type="text" id="note-search" class="search-input" placeholder="Cari judul, isi, atau penulis..." value="${this.esc(this.searchQuery)}" style="background: transparent; border: none; flex: 1; outline: none; color: #1e293b; font-size: 14px; font-family: var(--font-family);">
      </div>
      
      <div class="notes-grid" style="display: flex; flex-direction: column; gap: 16px; padding-bottom: 24px;">
    `;

    const filtered = this.notes.filter(n => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (n.title || '').toLowerCase().includes(q) || 
             (n.text || '').toLowerCase().includes(q) || 
             (n.authorName || '').toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      html += `
        <div class="empty-state" style="padding: 40px 20px;">
          <div class="empty-state-icon" style="font-size: 64px; margin-bottom: 16px;">📝</div>
          <div class="empty-state-title" style="color: #334155; font-size: 18px; font-weight: 800; margin-bottom: 12px;">Belum ada catatan</div>
          <div class="empty-state-text" style="color: #64748b; font-size: 14px; line-height: 1.6; max-width: 240px; margin: 0 auto;">Klik tombol ✨ di pojok untuk membuat catatan baru.</div>
        </div>
      `;
    } else {
      filtered.forEach(note => {
        const d = note.createdAt ? new Date(note.createdAt) : new Date();
        const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        
        html += `
          <div class="note-card" style="background: #fffbeb; border-radius: 16px; padding: 20px; position: relative; border: 1px solid rgba(0,0,0,0.03); overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
            <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: #fef3c7; border-radius: 50%; z-index: 0;"></div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px; position: relative; z-index: 1;">
              <div style="font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;">📝 CATATAN</div>
              <div style="display: flex; gap: 8px;">
                <button class="icon-btn edit-note-btn" data-id="${note.id}" style="width: 28px; height: 28px; background: #ffffff; border-radius: 8px; color: #f59e0b; padding: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #fde68a;" title="Edit">✏️</button>
                <button class="icon-btn delete-note-btn" data-id="${note.id}" style="width: 28px; height: 28px; background: #ffffff; border-radius: 8px; color: #ef4444; padding: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #fecaca;" title="Hapus">❌</button>
              </div>
            </div>
            <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #d97706; position: relative; z-index: 1;">${this.esc(note.title) || 'Catatan Tanpa Judul'}</h3>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; position: relative; z-index: 1;">
              ${this.esc(this.stripHtml(note.text)) || 'Belum ada isi catatan...'}
            </p>
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #d97706; position: relative; z-index: 1;">
              <span>${dateStr}</span>
              <span style="color: #64748b;">oleh ${this.esc(note.authorName) || 'Maya'}</span>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;

    container.innerHTML = html;

    const searchInput = container.querySelector('#note-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        
        // Filter DOM directly instead of re-rendering everything to prevent losing focus
        const cards = container.querySelectorAll('.note-card');
        let anyVisible = false;
        
        cards.forEach(card => {
           const titleEl = card.querySelector('h3');
           const textEl = card.querySelector('p');
           
           const title = titleEl ? titleEl.textContent.toLowerCase() : '';
           const text = textEl ? textEl.textContent.toLowerCase() : '';
           
           if (!this.searchQuery || title.includes(this.searchQuery) || text.includes(this.searchQuery)) {
              card.style.display = 'block';
              anyVisible = true;
           } else {
              card.style.display = 'none';
           }
        });
        
        // Handle empty state for search
        const grid = container.querySelector('.notes-grid');
        let emptyState = container.querySelector('.empty-state-search');
        
        if (!anyVisible && cards.length > 0) {
           if (!emptyState) {
              emptyState = document.createElement('div');
              emptyState.className = 'empty-state empty-state-search';
              emptyState.innerHTML = '<div class="empty-state-icon" style="font-size:48px; margin-bottom:16px;">🔍</div><div class="empty-state-title">Tidak ditemukan</div><div class="empty-state-text">Coba kata kunci lain.</div>';
              if (grid) grid.appendChild(emptyState);
           }
           emptyState.style.display = 'flex';
        } else if (emptyState) {
           emptyState.style.display = 'none';
        }
      });
    }

    const addBtn = container.querySelector('#add-note-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openForm('new'));

    container.querySelectorAll('.edit-note-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.openForm(id);
      });
    });

    container.querySelectorAll('.delete-note-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Yakin ingin menghapus catatan ini?')) {
          const id = e.currentTarget.getAttribute('data-id');
          this.deleteNote(id);
        }
      });
    });
  },

  renderForm(container) {
    const lastSaved = localStorage.getItem(`flowbuddy-note-${this.editingNoteId}-updated`);
    const lastSavedStr = lastSaved ? new Date(lastSaved).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null;

    container.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 24px; gap: 16px;">
        <button id="back-notes-btn" class="icon-btn" style="font-size: 32px; width: 44px; height: 44px; padding: 0; background: transparent; border: none; cursor: pointer;" title="Kembali" style="display: flex; align-items: center; justify-content: center;">📝</button>
        <div>
          <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.5px;">Catatan Baru</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">Tulis, simpan, dan bagikan ide cemerlangmu.</p>
        </div>
      </div>

      <div class="task-form-box" style="margin-bottom: 20px; padding: 20px; border-radius: 20px; border: 1px solid rgba(0,0,0,0.04); background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <div class="section-title" style="border:none; margin-bottom: 16px; padding-bottom: 0; font-size: 11px; color: #94a3b8; font-weight: 800; letter-spacing: 1px;">AKSES & BAGIKAN CATATAN</div>
        <select id="note-visibility" class="task-form-input" style="padding: 14px 16px; font-weight: 700; font-size: 15px; border-radius: 12px; border: 1px solid #e2e8f0; appearance: none; background: #fff url('data:image/svg+xml;utf8,<svg width=\"12\" height=\"8\" viewBox=\"0 0 12 8\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1 1.5L6 6.5L11 1.5\" stroke=\"%2394A3B8\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>') no-repeat right 16px center; background-size: 12px; color: #1e293b; outline: none; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <option value="private" ${this.visibility === 'private' ? 'selected' : ''}>🔒 Pribadi (Hanya Saya)</option>
          <option value="company" ${this.visibility === 'company' ? 'selected' : ''}>🏢 Seluruh Perusahaan</option>
          <option value="custom" ${this.visibility === 'custom' ? 'selected' : ''}>👥 Pilih Anggota Spesifik...</option>
        </select>
      </div>

      <div class="task-form-box" style="margin-bottom: 20px; padding: 20px; border-radius: 20px; border: 1px solid rgba(0,0,0,0.04); background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <div class="section-title" style="border:none; margin-bottom: 16px; padding-bottom: 0; font-size: 11px; color: #94a3b8; font-weight: 800; letter-spacing: 1px;">TEMA WARNA</div>
        <div style="display: flex; gap: 16px;">
           <div style="width: 40px; height: 40px; border-radius: 20px; background: #fffbeb; border: 2px solid #f59e0b; cursor: pointer; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);"></div>
           <div style="width: 40px; height: 40px; border-radius: 20px; background: #f0f9ff; cursor: pointer; border: 2px solid transparent;"></div>
           <div style="width: 40px; height: 40px; border-radius: 20px; background: #f0fdf4; cursor: pointer; border: 2px solid transparent;"></div>
           <div style="width: 40px; height: 40px; border-radius: 20px; background: #faf5ff; cursor: pointer; border: 2px solid transparent;"></div>
           <div style="width: 40px; height: 40px; border-radius: 20px; background: #fdf2f8; cursor: pointer; border: 2px solid transparent;"></div>
        </div>
      </div>

      <div class="task-form-box" style="margin-bottom: 20px; padding: 20px; border-radius: 20px; border: 1px solid rgba(0,0,0,0.04); background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <div class="section-title" style="border:none; margin-bottom: 12px; padding-bottom: 0; font-size: 11px; color: #94a3b8; font-weight: 800; letter-spacing: 1px;">JUDUL CATATAN</div>
        <input type="text" id="note-title" class="task-form-input" placeholder="Rapat Mingguan, Ide Kreatif, dll." value="${this.esc(this.title)}" style="font-weight: 800; border: none; padding: 0; background: transparent; font-size: 16px; outline: none; color: #1e293b;">
      </div>

      <div class="task-form-box" style="margin-bottom: 20px; padding: 0; overflow: hidden; border-radius: 20px; border: 1px solid rgba(0,0,0,0.04); background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <div class="section-title" style="border:none; margin: 20px 20px 16px 20px; padding-bottom: 0; font-size: 11px; color: #94a3b8; font-weight: 800; letter-spacing: 1px;">ISI CATATAN</div>
        
        <div style="background: #ffffff; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 12px 20px; display: flex; gap: 16px; color: #475569; font-size: 15px; align-items: center; overflow-x: auto;">
          <span style="cursor: pointer; opacity: 0.6;">↩</span>
          <span style="cursor: pointer; opacity: 0.6;">↪</span>
          <select style="border: none; background: #f8fafc; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; color: #475569; outline: none; cursor: pointer; appearance: none; padding-right: 24px; background-image: url('data:image/svg+xml;utf8,<svg width=\"10\" height=\"6\" viewBox=\"0 0 10 6\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1 1L5 5L9 1\" stroke=\"%23475569\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>'); background-repeat: no-repeat; background-position: right 8px center;">
             <option>Paragraph</option>
          </select>
          <span style="cursor: pointer; font-weight: 800; color: #0f172a;">B</span>
          <span style="cursor: pointer; font-style: italic;">I</span>
          <span style="cursor: pointer; text-decoration: underline;">U</span>
          <span style="cursor: pointer; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 2px;">A<svg width="8" height="4" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L4 3L7 1" stroke="#0F172A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span style="cursor: pointer; opacity: 0.8;">≡</span>
          <span style="cursor: pointer; opacity: 0.8;">≡</span>
          <span style="cursor: pointer; opacity: 0.8;">≡</span>
          <span style="cursor: pointer; opacity: 0.8;">≡</span>
          <span style="cursor: pointer; opacity: 0.8;">•••</span>
        </div>

        <textarea
          class="note-textarea"
          id="note-textarea"
          placeholder="Tuliskan semua idemu di sini..."
          aria-label="Isi Catatan"
          style="border: none; border-radius: 0; min-height: 240px; box-shadow: none; padding: 20px; background: #ffffff; color: #334155; font-size: 15px; line-height: 1.7; font-family: var(--font-family);"
        >${this.esc(this.content)}</textarea>
      </div>

      <div class="note-meta" id="note-meta" style="text-align: right; margin-top: -8px; margin-bottom: 16px; color: #94a3b8;">
        ${lastSavedStr ? '💾 Terakhir disimpan: ' + lastSavedStr : ''}
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 32px;">
        <button id="cancel-note-btn" style="padding: 12px 24px; border-radius: 12px; background: #f1f5f9; color: #64748b; font-weight: 700; border: none; cursor: pointer; font-size: 14px;">Batal</button>
        <button id="save-note-btn" style="padding: 12px 24px; border-radius: 12px; background: var(--color-success); color: white; font-weight: 700; border: none; cursor: pointer; font-size: 14px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">Simpan Catatan</button>
      </div>
    `;

    const backBtn = container.querySelector('#back-notes-btn');
    if (backBtn) backBtn.addEventListener('click', () => this.closeForm());

    const cancelBtn = container.querySelector('#cancel-note-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeForm());

    const textarea = container.querySelector('#note-textarea');
    const titleInput = container.querySelector('#note-title');
    const visSelect = container.querySelector('#note-visibility');
    const meta = container.querySelector('#note-meta');
    const saveBtn = container.querySelector('#save-note-btn');

    if (textarea && titleInput && visSelect) {
      const triggerSave = () => {
        this.content = textarea.value;
        this.title = titleInput.value;
        this.visibility = visSelect.value;
        
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
          this.saveCurrentForm();
          const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          if (meta) meta.innerHTML = '💾 Tersimpan otomatis: ' + now;
        }, 500);
      };

      textarea.addEventListener('input', triggerSave);
      titleInput.addEventListener('input', triggerSave);
      visSelect.addEventListener('change', triggerSave);

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          triggerSave();
          this.closeForm();
        });
      }

      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(180, textarea.scrollHeight) + 'px';
      });
    }
  },

  esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  stripHtml(str) {
    if (!str) return '';
    return String(str).replace(/<[^>]+>/g, '').trim();
  }
};
