  // ═══════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════
  // ── Notes ──────────────────────────────────────────────────────
  const NOTE_COLORS = [
    { id: 'blue', hex: '#4d9fff', bg: 'rgba(77,159,255,.14)' },
    { id: 'purple', hex: '#b197fc', bg: 'rgba(177,151,252,.14)' },
    { id: 'green', hex: '#69db7c', bg: 'rgba(105,219,124,.14)' },
    { id: 'yellow', hex: '#ffd43b', bg: 'rgba(255,212,59,.14)' },
    { id: 'orange', hex: '#ff922b', bg: 'rgba(255,146,43,.14)' },
    { id: 'pink', hex: '#f783ac', bg: 'rgba(247,131,172,.14)' },
  ]
  let noteColor = NOTE_COLORS[0].id
  let editingNoteId = null

  // Color picker removed from UI — keep logic for data compat
  const clrWrap = $('fb-note-clrs') // null (element removed)
  const noteComposer = $('fb-note-in') ? $('fb-note-in').closest('.fb-note-composer') : null
  const noteSaveBtn = $('fb-note-save')

  function applyNoteColor(colorId) {
    const c = NOTE_COLORS.find(x => x.id === colorId) || NOTE_COLORS[0]
    noteColor = c.id
    if (noteComposer) noteComposer.style.setProperty('--nc', c.hex)
    if (noteSaveBtn) noteSaveBtn.style.setProperty('--nc', c.hex)
    if (clrWrap) {
      clrWrap.querySelectorAll('.fb-clr-dot').forEach(d => d.classList.remove('sel'))
      const selDot = clrWrap.querySelector(`[data-cid="${c.id}"]`)
      if (selDot) selDot.classList.add('sel')
    }
  }

  if (clrWrap) {
    NOTE_COLORS.forEach(c => {
      const dot = document.createElement('button')
      dot.className = 'fb-clr-dot' + (c.id === noteColor ? ' sel' : '')
      dot.style.background = c.hex
      dot.style.setProperty('--dot-clr', c.hex)
      dot.dataset.cid = c.id
      dot.title = c.id.charAt(0).toUpperCase() + c.id.slice(1)
      dot.onclick = () => applyNoteColor(c.id)
      clrWrap.appendChild(dot)
    })
  }

  // Init with default color
  applyNoteColor(NOTE_COLORS[0].id)

  function relTime(ts) {
    const d = Date.now() - ts, m = Math.floor(d / 60000), h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000)
    if (d < 45000) return 'Baru saja'
    if (m < 60) return `${m} mnt lalu`
    if (h < 24) return `${h} jam lalu`
    if (dy < 7) return `${dy} hari lalu`
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  let _lastRenderNotesState = '';
  function renderNotes(filter) {
    const q = (filter !== undefined ? filter : ($('fb-note-search')?.value || '')).toLowerCase().trim()
    const stateStr = JSON.stringify(ctx.notes || []) + '::' + q;
    if (_lastRenderNotesState === stateStr) return;
    _lastRenderNotesState = stateStr;

    const list = $('fb-note-list')
    let notes = [...(ctx.notes || [])]
    if (q) notes = notes.filter(n => n.text.toLowerCase().includes(q) || (n.title || '').toLowerCase().includes(q))

    // Show/hide search bar
    const sw = $('fb-note-search-wrap')
    if (sw) sw.style.display = (ctx.notes || []).length > 2 ? 'block' : 'none'

    if (!notes.length) {
      list.innerHTML = q
        ? `<div class="fb-empty"><span class="fb-empty-ico">🔍</span>Tidak ditemukan</div>`
        : `<div class="fb-empty"><span class="fb-empty-ico">📝</span>Belum ada catatan</div>`
      return
    }

    list.innerHTML = ''
    const pinned = notes.filter(n => n.pinned).reverse()
    const regular = notes.filter(n => !n.pinned).reverse()

    const VIS_BADGE = {
      company:  { label: 'COMPANY',  bg: '#d3f9d8', color: '#2f9e44' },
      division: { label: 'DIVISI',   bg: '#dbe4ff', color: '#3b5bdb' },
      custom:   { label: 'CUSTOM',   bg: '#e5dbff', color: '#7048e8' },
      private:  { label: 'PRIBADI',  bg: '#f1f3f5', color: '#868e96' },
    }

    function mkCard(note) {
      const c = NOTE_COLORS.find(x => x.id === note.color) || NOTE_COLORS[0]
      const vis = VIS_BADGE[note.visibility || 'private'] || VIS_BADGE.private
      const timeStr = note.createdAt ? new Date(note.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',hour12:false}).replace(':','.') : ''
      const el = document.createElement('div')
      el.className = 'fb-note' + (note.pinned ? ' pinned' : '')
      el.style.cssText = `--nc:${c.hex}; --note-bg:${c.bg} !important; --note-border:${c.hex}30 !important; --note-border-hover:${c.hex}60 !important; border-left:3.5px solid ${c.hex} !important;`
      
      // Determine display text: if content looks like HTML, render it; otherwise escape
      const contentText = note.text || note.content || ''
      const isHTML = /<[a-z][\s\S]*>/i.test(contentText)
      const renderedContent = isHTML ? contentText : esc(contentText)
      
      // Sharing info
      const sharedCount = (note.sharedWithUsers || []).length
      const sharedInfo = note.visibility === 'custom' && sharedCount > 0
        ? `<span style="font-size:9px;font-weight:700;color:#7048e8;margin-left:4px;">(${sharedCount} orang)</span>` : ''
      const permBadge = note.sharedPermission === 'edit'
        ? `<span style="font-size:8.5px;font-weight:800;padding:1.5px 6px;border-radius:4px;background:#fff3bf;color:#8A6814;margin-left:4px;">EDIT</span>` : ''

      // Check if user has permission to edit/delete
      const isAuthor = !note.userId || String(note.userId) === String(flowbeeUserId)
      const canEdit = isAuthor || note.sharedPermission === 'edit'

      const authorText = isAuthor 
        ? 'DITULIS OLEH SAYA' 
        : `DITULIS OLEH ${esc((note.authorName || 'LAINNYA').toUpperCase())}${note.authorDepartment ? ` (${esc(note.authorDepartment.toUpperCase())})` : ''}`
      
      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
          <span style="font-size:11px;color:var(--fb-ink-mute);font-weight:600;font-variant-numeric:tabular-nums;">${timeStr}</span>
          <div style="display:flex;align-items:center;gap:5px;">
            ${note.pinned ? `<span style="font-size:10px;">📌</span>` : ''}
            <span style="font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:0;background:${vis.bg};color:${vis.color};letter-spacing:.4px;">${vis.label}</span>
            ${sharedInfo}${permBadge}
          </div>
        </div>
        ${note.title ? `<div style="font-size:13.5px;font-weight:800;color:var(--fb-ink);margin-bottom:4px;line-height:1.3;">${esc(note.title)}</div>` : ''}
        <div class="fb-note-txt clamped" style="font-size:12.5px;color:var(--fb-ink);opacity:0.9;line-height:1.55;">${renderedContent}</div>
        <button class="fb-note-expand" style="display:none;font-size:10px;color:var(--fb-blue);background:none;border:none;cursor:pointer;padding:2px 0;margin-top:2px;">Lihat semua ▾</button>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid var(--fb-line);">
          <div style="display:flex;align-items:center;gap:5px;color:var(--fb-ink-mute);font-size:10.5px;font-weight:600;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${authorText}
          </div>
          <div class="fb-note-actions">
            <button class="fb-note-act pin${note.pinned ? ' active' : ''}" title="${note.pinned ? 'Unpin' : 'Pin'}">📌</button>
            ${canEdit ? `<button class="fb-note-act edit" title="Edit">✏️</button>` : ''}
            <button class="fb-note-act copy" title="Salin">📋</button>
            ${isAuthor ? `<button class="fb-note-act del" title="Hapus">&#128465;</button>` : ''}
          </div>
        </div>`

      const txtEl = el.querySelector('.fb-note-txt')
      const expandBtn = el.querySelector('.fb-note-expand')
      requestAnimationFrame(() => { if (txtEl.scrollHeight > txtEl.clientHeight + 4) expandBtn.style.display = 'block' })
      let expanded = false
      expandBtn.onclick = e => {
        e.stopPropagation(); expanded = !expanded
        txtEl.classList.toggle('clamped', !expanded)
        expandBtn.textContent = expanded ? 'Sembunyikan ▴' : 'Lihat semua ▾'
      }
      
      const pinBtn = el.querySelector('.fb-note-act.pin')
      if (pinBtn) pinBtn.onclick = () => { note.pinned = !note.pinned; save(); renderNotes() }
      
      const editBtn = el.querySelector('.fb-note-act.edit')
      if (editBtn) {
        editBtn.onclick = () => {
          const inp = $('fb-note-in'), titleInp = $('fb-note-title')
          const contentText = note.text || note.content || ''
          if (inp) inp.innerHTML = contentText
          if (titleInp) titleInp.value = note.title || ''
          noteColor = note.color || NOTE_COLORS[0].id
          applyNoteColor(noteColor)
          editingNoteId = note.id
          
          // Set visibility
          const visEl = $('fb-note-vis')
          if (visEl) visEl.value = note.visibility || 'private'
          // Set permission
          const permEl = $('fb-note-perm')
          if (permEl) permEl.value = note.sharedPermission || 'view'
          // Set shared users
          noteSharedUsers = [...(note.sharedWithUsers || [])]
          
          // Trigger visibility change to show/hide panels
          handleVisibilityChange()
          
          const saveBtn = $('fb-note-save')
          if (saveBtn) { saveBtn.textContent = 'Update'; saveBtn.style.background = '#f0a500' }
          // Open composer
          const wrap = $('fb-note-composer-wrap'); if (wrap) wrap.style.display = 'block'
          inp.focus(); inp.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
      
      const copyBtn = el.querySelector('.fb-note-act.copy')
      if (copyBtn) {
        copyBtn.onclick = () => {
          const contentText = note.text || note.content || ''
          const stripped = contentText.replace(/<[^>]*>/g, '').trim()
          const fullText = (note.title ? note.title + '\n' : '') + stripped
          navigator.clipboard?.writeText(fullText).catch(() => {})
          copyBtn.textContent = '✅'; setTimeout(() => { copyBtn.textContent = '📋' }, 1200)
        }
      }
      
      const delBtn = el.querySelector('.fb-note-act.del')
      if (delBtn) {
        delBtn.onclick = () => {
          if (editingNoteId === note.id) cancelNoteEdit()
          if (!ctx.deletedNoteIds) ctx.deletedNoteIds = []
          ctx.deletedNoteIds.push(String(note.id))
          el.style.transition = 'opacity .2s,transform .2s'
          el.style.opacity = '0'; el.style.transform = 'translateX(12px)'
          setTimeout(() => { 
            ctx.notes = ctx.notes.filter(n => String(n.id) !== String(note.id)); 
            save(); 
            renderNotes(); 
            flowbeeSyncAll(); 
          }, 200)
        }
      }
      return el
    }

    function mkSectionLbl(txt) {
      const lbl = document.createElement('div')
      lbl.className = 'fb-note-section-lbl'; lbl.textContent = txt
      return lbl
    }
    function mkGroup(notesArr) {
      const wrap = document.createElement('div')
      wrap.className = 'fb-note-list-wrap'
      notesArr.forEach(n => wrap.appendChild(mkCard(n)))
      return wrap
    }
    function dateLabel(ts) {
      const d = new Date(ts)
      const today = new Date(); const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
      if (d.toDateString() === today.toDateString()) return '📅 HARI INI'
      if (d.toDateString() === yesterday.toDateString()) return '📅 KEMARIN'
      return d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase()
    }

    if (pinned.length) {
      list.appendChild(mkSectionLbl('📌 DISEMATKAN'))
      list.appendChild(mkGroup(pinned))
    }
    if (regular.length) {
      const groups = []; const seen = new Map()
      regular.forEach(n => {
        const lbl = dateLabel(n.createdAt || n.id)
        if (!seen.has(lbl)) { seen.set(lbl, []); groups.push(lbl) }
        seen.get(lbl).push(n)
      })
      groups.forEach(lbl => { list.appendChild(mkSectionLbl(lbl)); list.appendChild(mkGroup(seen.get(lbl))) })
    }
  }
  // Shared users state for member picker
  let noteSharedUsers = []
  let noteAllUsers = [] // populated from sync response

  function saveNote() {
    const inp = $('fb-note-in')
    const html = inp ? inp.innerHTML.trim() : ''
    // Check if contentEditable has actual content (not just tags/whitespace)
    const textContent = inp ? inp.textContent.trim() : ''
    if (!textContent && !html) return
    const titleInp = $('fb-note-title')
    const title = titleInp ? titleInp.value.trim() : ''
    if (!ctx.notes) ctx.notes = []
    const c = NOTE_COLORS.find(x => x.id === noteColor) || NOTE_COLORS[0]
    const vis = $('fb-note-vis') ? $('fb-note-vis').value : 'private'
    const perm = $('fb-note-perm') ? $('fb-note-perm').value : 'view'
    
    if (editingNoteId) {
      const idx = ctx.notes.findIndex(n => n.id === editingNoteId)
      if (idx !== -1) {
        ctx.notes[idx] = { 
          ...ctx.notes[idx], text: html, content: html, title, color: noteColor,
          visibility: vis, sharedWithUsers: vis === 'custom' ? [...noteSharedUsers] : [],
          sharedPermission: vis !== 'private' ? perm : 'view'
        }
      }
      cancelNoteEdit()
    } else {
      ctx.notes.push({ 
        id: Date.now(), text: html, content: html, title, color: noteColor, 
        pinned: false, createdAt: Date.now(), visibility: vis,
        sharedWithUsers: vis === 'custom' ? [...noteSharedUsers] : [],
        sharedPermission: vis !== 'private' ? perm : 'view'
      })
      if (inp) inp.innerHTML = ''
      if (titleInp) titleInp.value = ''
    }
    save(); renderNotes(); burst()
    flowbeeSyncAll()
    const comp = inp.closest('.fb-note-composer')
    if (comp) {
      comp.style.transition = 'box-shadow .15s'
      comp.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${c.hex} 40%, transparent)`
      setTimeout(() => { comp.style.boxShadow = '' }, 500)
    }
  }

  function cancelNoteEdit() {
    editingNoteId = null
    const inp = $('fb-note-in'), titleInp = $('fb-note-title')
    if (inp) inp.innerHTML = ''
    if (titleInp) titleInp.value = ''
    const saveBtn = $('fb-note-save')
    if (saveBtn) { saveBtn.textContent = 'Simpan Catatan'; saveBtn.style.background = '' }
    // Reset sharing state
    const visEl = $('fb-note-vis'); if (visEl) visEl.value = 'private'
    const permEl = $('fb-note-perm'); if (permEl) permEl.value = 'view'
    noteSharedUsers = []
    handleVisibilityChange()
  }

  // ── Visibility change handler ──
  function handleVisibilityChange() {
    const vis = $('fb-note-vis')?.value || 'private'
    const permEl = $('fb-note-perm')
    const memberPicker = $('fb-note-member-picker')
    // Show permission dropdown for non-private
    if (permEl) permEl.style.display = (vis !== 'private') ? 'block' : 'none'
    // Show member picker for custom
    if (memberPicker) memberPicker.style.display = (vis === 'custom') ? 'block' : 'none'
    // Re-render member picker
    if (vis === 'custom') renderMemberPicker()
  }

  // ── Member Picker ──
  function renderMemberPicker() {
    const listEl = $('fb-note-member-list')
    const tagsEl = $('fb-note-member-tags')
    const searchEl = $('fb-note-member-search')
    if (!listEl) return
    
    const query = (searchEl?.value || '').toLowerCase()
    const users = (noteAllUsers || []).filter(u => String(u.id) !== String(flowbeeUserId))
    const filtered = query 
      ? users.filter(u => u.name.toLowerCase().includes(query) || (u.department || '').toLowerCase().includes(query))
      : users
    
    // Group by department
    const byDept = {}
    filtered.forEach(u => {
      const dept = u.department || 'Lainnya'
      if (!byDept[dept]) byDept[dept] = []
      byDept[dept].push(u)
    })
    
    // Render tags
    if (tagsEl) {
      if (noteSharedUsers.length > 0) {
        tagsEl.style.display = 'flex'
        tagsEl.innerHTML = noteSharedUsers.map(uid => {
          const u = users.find(x => String(x.id) === String(uid))
          return u ? `<span class="fb-mp-tag" data-uid="${uid}">${esc(u.name.split(' ')[0])} ✕</span>` : ''
        }).join('')
        tagsEl.querySelectorAll('.fb-mp-tag').forEach(tag => {
          tag.onclick = () => { 
            noteSharedUsers = noteSharedUsers.filter(id => String(id) !== tag.dataset.uid)
            renderMemberPicker() 
          }
        })
      } else {
        tagsEl.style.display = 'none'
        tagsEl.innerHTML = ''
      }
    }
    
    // Render list
    let html = ''
    const depts = Object.keys(byDept).sort()
    if (depts.length === 0) {
      html = '<div style="text-align:center; padding:16px; color:var(--fb-ink-mute); font-size:11px;">Tidak ditemukan</div>'
    } else {
      depts.forEach(dept => {
        const deptUsers = byDept[dept]
        const allSelected = deptUsers.every(u => noteSharedUsers.includes(String(u.id)))
        const someSelected = deptUsers.some(u => noteSharedUsers.includes(String(u.id)))
        
        html += `<div class="fb-mp-dept-hdr" data-dept="${esc(dept)}">
          <span class="fb-mp-dept-name">${esc(dept)} (${deptUsers.length})</span>
          <button class="fb-mp-dept-selectall" data-dept="${esc(dept)}"
            style="background:${allSelected ? 'var(--fb-blue)' : someSelected ? 'rgba(74,144,226,.15)' : 'var(--fb-line-soft)'};
                   color:${allSelected ? '#fff' : 'var(--fb-blue)'};">${allSelected ? '✓ Semua' : 'Pilih Semua'}</button>
        </div>`
        
        deptUsers.forEach(u => {
          const sel = noteSharedUsers.includes(String(u.id))
          const initials = u.name ? u.name.charAt(0).toUpperCase() : '?'
          html += `<div class="fb-mp-user-row ${sel ? 'selected' : ''}" data-uid="${u.id}">
            <div class="fb-mp-avatar">${initials}</div>
            <div class="fb-mp-user-info">
              <div class="fb-mp-user-name">${esc(u.name)}</div>
              <div class="fb-mp-user-dept">${esc(u.department || '')}</div>
            </div>
            <div class="fb-mp-chk ${sel ? 'checked' : ''}">${sel ? '✓' : ''}</div>
          </div>`
        })
      })
    }
    listEl.innerHTML = html
    
    // Event handlers
    listEl.querySelectorAll('.fb-mp-user-row').forEach(row => {
      row.onclick = () => {
        const uid = String(row.dataset.uid)
        if (noteSharedUsers.includes(uid)) {
          noteSharedUsers = noteSharedUsers.filter(id => id !== uid)
        } else {
          noteSharedUsers.push(uid)
        }
        renderMemberPicker()
      }
    })
    listEl.querySelectorAll('.fb-mp-dept-selectall').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation()
        const dept = btn.dataset.dept
        const deptUserIds = (byDept[dept] || []).map(u => String(u.id))
        const allSel = deptUserIds.every(id => noteSharedUsers.includes(id))
        if (allSel) {
          noteSharedUsers = noteSharedUsers.filter(id => !deptUserIds.includes(id))
        } else {
          noteSharedUsers = [...new Set([...noteSharedUsers, ...deptUserIds])]
        }
        renderMemberPicker()
      }
    })
  }

  $('fb-note-save').onclick = saveNote
  
  // Rich text toolbar
  const rteToolbar = $('fb-note-toolbar')
  if (rteToolbar) {
    rteToolbar.querySelectorAll('.fb-rte-btn').forEach(btn => {
      btn.onmousedown = (e) => { e.preventDefault() } // Prevent losing focus from editor
      btn.onclick = () => {
        const cmd = btn.dataset.cmd
        document.execCommand(cmd, false, null)
        $('fb-note-in')?.focus()
      }
    })
  }
  
  // contentEditable Ctrl+Enter save
  const noteInEl = $('fb-note-in')
  if (noteInEl) {
    noteInEl.onkeydown = e => { if (e.key === 'Enter' && e.ctrlKey) saveNote() }
  }
  
  // Visibility change
  const noteVisEl = $('fb-note-vis')
  if (noteVisEl) noteVisEl.onchange = handleVisibilityChange
  
  // Member search
  const memberSearchEl = $('fb-note-member-search')
  if (memberSearchEl) memberSearchEl.oninput = () => renderMemberPicker()

  // Toggle composer visibility
  const noteAddToggle = $('fb-note-add-toggle')
  const noteComposerWrap = $('fb-note-composer-wrap')
  if (noteAddToggle && noteComposerWrap) {
    noteAddToggle.onclick = () => {
      const open = noteComposerWrap.style.display !== 'none'
      noteComposerWrap.style.display = open ? 'none' : 'block'
      noteAddToggle.textContent = open ? '+ Tambah' : '✕ Tutup'
      noteAddToggle.style.background = open ? '#4A90E2' : 'rgba(31,29,27,.08)'
      noteAddToggle.style.color = open ? '#fff' : '#524E49'
      noteAddToggle.style.boxShadow = 'none'
      if (!open) setTimeout(() => $('fb-note-in')?.focus(), 50)
    }
  }
  const noteCancelBtn = $('fb-note-cancel')
  if (noteCancelBtn) {
    noteCancelBtn.onclick = () => {
      cancelNoteEdit()
      if (noteComposerWrap) noteComposerWrap.style.display = 'none'
      if (noteAddToggle) { noteAddToggle.textContent = '+ Tambah'; noteAddToggle.style.background = '#4A90E2'; noteAddToggle.style.color = '#fff'; noteAddToggle.style.boxShadow = 'none' }
    }
  }

  // Search
  const srch = $('fb-note-search')
  if (srch) srch.oninput = () => renderNotes(srch.value)

  // TIMER — Minimalist Card Timer & History
  // ═══════════════════════════════════════════════════════════════
  let timerStartTime;
  let timerInterval;
  let isTimerRunning = false;
  let timerElapsedMs = 0;
  let timerMode = 'countdown';
  let timerTargetMs = 0;
  let timerSessionLabel = 'Timer';

  let timerHistory = [];
  let timerHistoryPage = 1;
  try {
      chrome.storage.local.get(['fb_timer_history'], (res) => {
          if (res.fb_timer_history) {
              timerHistory = res.fb_timer_history;
              renderTimerHistory();
          }
      });
  } catch(e) {}

  const hrsEl = $('fb-timer-hrs');
  const minEl = $('fb-timer-min');
  const secEl = $('fb-timer-sec');
  const btnStartStop = $('fb-btnStartStop');
  const btnReset = $('fb-btnReset');
  const iconPlay = $('fb-iconPlay');
  const iconStop = $('fb-iconStop');
  const textStartStop = $('fb-textStartStop');
  const labelInput = $('fb-timer-label-input');

  function getHistoryIcon(label) {
      const l = (label || '').toLowerCase();
      if (l.includes('pomo') || l.includes('fokus')) return '&#127811;'; // leaf/pomo
      if (l.includes('istirahat') || l.includes('break')) return '&#9749;';
      if (l.includes('coding') || l.includes('kode') || l.includes('develop')) return '&#128187;';
      if (l.includes('tulis') || l.includes('menulis') || l.includes('pena')) return '&#9999;&#65039;';
      if (l.includes('rapat') || l.includes('meeting')) return '&#128101;';
      if (l.includes('baca') || l.includes('riset')) return '&#128218;';
      return '\u23f1';
  }

  function formatDuration(ms) {
      const totalSec = Math.round(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const parts = [];
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      if (s > 0 || parts.length === 0) parts.push(`${s}s`);
      return parts.join(' ');
  }

  function renderTimerHistory() {
      const wrap = $('fb-timer-history-wrap');
      const list = $('fb-timer-history-list');
      const ts = $('fb-timer-history-ts');
      if (!wrap || !list) return;

      if (timerHistory.length === 0) {
          wrap.style.display = 'none';
          return;
      }
      wrap.style.display = 'block';
      const first = timerHistory[0];
      if (ts) ts.textContent = `${first.date} \u00b7 ‎${first.ts}`;

      const ITEMS_PER_PAGE = 2;
      const totalPages = Math.ceil(timerHistory.length / ITEMS_PER_PAGE);
      if (timerHistoryPage > totalPages) timerHistoryPage = totalPages;
      if (timerHistoryPage < 1) timerHistoryPage = 1;

      const startIdx = (timerHistoryPage - 1) * ITEMS_PER_PAGE;
      const pageItems = timerHistory.slice(startIdx, startIdx + ITEMS_PER_PAGE);

      let html = pageItems.map((h, i) => `
          <div class="fb-timer-history-item">
              <span class="fb-timer-history-icon">${getHistoryIcon(h.label)}</span>
              <div class="fb-timer-history-info">
                  <div class="fb-timer-history-title">${h.label}</div>
                  <div class="fb-timer-history-dur">${formatDuration(h.durationMs)} \u00b7 ${h.date} ${h.ts}</div>
              </div>
              <div class="fb-timer-history-actions">
                  <button class="fb-timer-history-restart" data-idx="${startIdx + i}">Mulai Ulang</button>
                  <button class="fb-timer-history-del" data-idx="${startIdx + i}" title="Hapus">&times;</button>
              </div>
          </div>
      `).join('');

      if (totalPages > 1) {
          html += `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding:0 4px;">
                  <button id="fb-timer-prev" style="background:var(--fb-line-soft); border:1px solid var(--fb-line); color:var(--fb-ink); padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; opacity:${timerHistoryPage === 1 ? '0.5' : '1'}; pointer-events:${timerHistoryPage === 1 ? 'none' : 'auto'}; transition:all 0.2s;">&lt; Prev</button>
                  <span style="font-size:12px; color:var(--fb-ink-mute); font-weight:600;">Hal ${timerHistoryPage} / ${totalPages}</span>
                  <button id="fb-timer-next" style="background:var(--fb-line-soft); border:1px solid var(--fb-line); color:var(--fb-ink); padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; opacity:${timerHistoryPage === totalPages ? '0.5' : '1'}; pointer-events:${timerHistoryPage === totalPages ? 'none' : 'auto'}; transition:all 0.2s;">Next &gt;</button>
              </div>
          `;
      }

      list.innerHTML = html;

      const btnPrev = list.querySelector('#fb-timer-prev');
      const btnNext = list.querySelector('#fb-timer-next');
      if (btnPrev) btnPrev.addEventListener('click', () => { timerHistoryPage--; renderTimerHistory(); });
      if (btnNext) btnNext.addEventListener('click', () => { timerHistoryPage++; renderTimerHistory(); });

      list.querySelectorAll('.fb-timer-history-restart').forEach(btn => {
          btn.addEventListener('click', () => {
              if (isTimerRunning) return;
              const idx = parseInt(btn.dataset.idx);
              const entry = timerHistory[idx];
              if (!entry) return;
              if (hrsEl) hrsEl.value = entry.h.toString().padStart(2, '0');
              if (minEl) minEl.value = entry.m.toString().padStart(2, '0');
              if (secEl) secEl.value = entry.s.toString().padStart(2, '0');
              if (labelInput) labelInput.value = entry.label;
              root.querySelectorAll('.fb-timer-preset-btn').forEach(b => b.classList.remove('active'));
              timerElapsedMs = 0;
          });
      });

      list.querySelectorAll('.fb-timer-history-del').forEach(btn => {
          btn.addEventListener('click', () => {
              const idx = parseInt(btn.dataset.idx);
              timerHistory.splice(idx, 1);
              try { chrome.storage.local.set({fb_timer_history: timerHistory}); } catch(e) {}
              renderTimerHistory();
          });
      });
  }

  function saveTimerHistory(label, durationMs) {
      const now = new Date();
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
      const tsStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;

      const totalSec = Math.round(durationMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      timerHistory.unshift({
          label: label || 'Timer',
          durationMs,
          date: dateStr,
          ts: tsStr,
          h, m, s
      });
      timerHistory = timerHistory.slice(0, 50);
      timerHistoryPage = 1;
      try { chrome.storage.local.set({fb_timer_history: timerHistory}); } catch(e) {}
      renderTimerHistory();
  }

  function getTimerLabel() {
      if (!labelInput) return 'Timer';
      return labelInput.value.trim() || 'Timer';
  }

  function updateTimerDisplay(totalMs) {
      const hours = Math.floor(Math.abs(totalMs) / 3600000);
      const minutes = Math.floor((Math.abs(totalMs) % 3600000) / 60000);
      const seconds = Math.floor((Math.abs(totalMs) % 60000) / 1000);
      
      if (hrsEl) hrsEl.value = hours.toString().padStart(2, '0');
      if (minEl) minEl.value = minutes.toString().padStart(2, '0');
      if (secEl) secEl.value = seconds.toString().padStart(2, '0');
  }

  function handleTimerTick() {
      const now = Date.now();
      const delta = now - timerStartTime;
      
      if (timerMode === 'countdown') {
          timerElapsedMs = timerTargetMs - delta;
          if (timerElapsedMs <= 0) {
              timerElapsedMs = 0;
              stopTimer();
              if (timerTargetMs > 0) saveTimerHistory(timerSessionLabel, timerTargetMs);
              playChime(false); burst(); forceState('EXCITED', 5000);
              currentState = 'EXCITED'; updateBuddySVG('EXCITED'); applyMood('EXCITED');
              showToast('\u23f1 Timer Selesai!', `${timerSessionLabel} berakhir! \u{1F389}`);
              
              if (flowbeeUserId) {
                  window.__FB.fetch(FLOWBEE_API + '/timer-complete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: flowbeeUserId, durationMinutes: Math.max(1, Math.round(timerTargetMs / 60000)), label: timerSessionLabel })
                  }).then(r => r.json()).then(data => {
                      if (data.success && typeof flowbeeUser !== 'undefined') {
                          flowbeeUser.points = (flowbeeUser.points || 0) + 20;
                          try { chrome.storage.local.set({ flowbee_user: flowbeeUser }); } catch(e) {}
                          if (typeof updateIdentityUI === 'function') updateIdentityUI();
                      }
                  }).catch(() => {});
              }
          }
      } else {
          timerElapsedMs = delta;
      }
      updateTimerDisplay(timerElapsedMs);
  }

  function startTimer() {
      let h = 0; let m = 0; let s = 0;
      if (hrsEl) h = parseInt(hrsEl.value) || 0;
      if (minEl) m = parseInt(minEl.value) || 0;
      if (secEl) s = parseInt(secEl.value) || 0;
      
      const totalRequestedMs = (h * 3600 + m * 60 + s) * 1000;
      
      if (totalRequestedMs > 0) {
          timerMode = 'countdown';
          timerTargetMs = totalRequestedMs;
      } else {
          timerMode = 'stopwatch';
          timerTargetMs = 0;
      }
      
      if (timerElapsedMs === 0 || timerMode === 'countdown') {
          if (timerMode === 'countdown' && timerElapsedMs > 0 && timerElapsedMs < timerTargetMs) {
             timerTargetMs = timerElapsedMs;
          }
          timerStartTime = Date.now();
      } else {
          timerStartTime = Date.now() - timerElapsedMs;
      }
      
      timerSessionLabel = getTimerLabel();
      isTimerRunning = true;
      ctx.timerRunning = true;
      if (hrsEl) { hrsEl.readOnly = true; hrsEl.style.pointerEvents = 'none'; }
      if (minEl) { minEl.readOnly = true; minEl.style.pointerEvents = 'none'; }
      if (secEl) { secEl.readOnly = true; secEl.style.pointerEvents = 'none'; }
      
      if (btnStartStop) btnStartStop.classList.add('running');
      if (textStartStop) textStartStop.textContent = 'Stop';
      if (iconPlay) iconPlay.style.display = 'none';
      if (iconStop) iconStop.style.display = 'block';
      if (labelInput) { labelInput.disabled = true; labelInput.style.opacity = '0.7'; }
      
      timerInterval = setInterval(handleTimerTick, 100);
      updateBuddySVG('FOCUS'); applyMood('FOCUS');
  }

  function stopTimer() {
      isTimerRunning = false;
      ctx.timerRunning = false;
      clearInterval(timerInterval);
      
      if (hrsEl) { hrsEl.readOnly = false; hrsEl.style.pointerEvents = 'auto'; }
      if (minEl) { minEl.readOnly = false; minEl.style.pointerEvents = 'auto'; }
      if (secEl) { secEl.readOnly = false; secEl.style.pointerEvents = 'auto'; }
      
      if (btnStartStop) btnStartStop.classList.remove('running');
      if (textStartStop) textStartStop.textContent = 'Mulai';
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconStop) iconStop.style.display = 'none';
      if (labelInput) { labelInput.disabled = false; labelInput.style.opacity = '1'; }
      
      applyMood(currentState);
  }

  function resetTimer() {
      stopTimer();
      timerElapsedMs = 0;
      if (hrsEl) hrsEl.value = '00';
      if (minEl) minEl.value = '25';
      if (secEl) secEl.value = '00';
      try { stopChime(); } catch(e) {}
  }

  if (btnStartStop) {
      btnStartStop.addEventListener('click', () => {
          if (isTimerRunning) stopTimer();
          else startTimer();
      });
  }

  if (btnReset) {
      btnReset.addEventListener('click', resetTimer);
  }
  
  [hrsEl, minEl, secEl].forEach(el => {
      if (!el) return;
      el.addEventListener('input', () => {
          if (el.value.length > 2) el.value = el.value.slice(-2);
          if (parseInt(el.value) < 0) el.value = '00';
          root.querySelectorAll('.fb-timer-preset-btn').forEach(b => b.classList.remove('active'));
      });
      el.addEventListener('blur', () => {
          if (!el.value) el.value = '00';
          else el.value = el.value.padStart(2, '0');
      });
  });

  root.querySelectorAll('.fb-timer-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
          if (isTimerRunning) return;
          const h = parseInt(btn.dataset.h) || 0;
          const m = parseInt(btn.dataset.m) || 0;
          const s = parseInt(btn.dataset.s) || 0;
          const label = btn.dataset.label || 'Timer';
          
          if (hrsEl) hrsEl.value = h.toString().padStart(2, '0');
          if (minEl) minEl.value = m.toString().padStart(2, '0');
          if (secEl) secEl.value = s.toString().padStart(2, '0');
          if (labelInput) labelInput.value = label;
          
          root.querySelectorAll('.fb-timer-preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          timerElapsedMs = 0;
      });
  });

  renderTimerHistory();
