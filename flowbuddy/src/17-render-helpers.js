  // ═══════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════
  function renderAll() { 
    const tabsEl = root.querySelector('#fb-tabs');
    const lockedPane = root.querySelector('#pane-locked');
    
    if (!flowbeeUserId) {
      if (tabsEl) tabsEl.style.setProperty('display', 'none', 'important');
      root.querySelectorAll('.fb-pane').forEach(p => p.classList.remove('show'));
      if (lockedPane) {
        lockedPane.classList.add('show');
        lockedPane.style.setProperty('display', 'flex', 'important');
      }
      return;
    }

    if (lockedPane) {
      lockedPane.classList.remove('show');
      lockedPane.style.setProperty('display', 'none', 'important');
    }
    if (tabsEl) {
      tabsEl.style.setProperty('display', 'flex', 'important');
      buildTabs();
    }

    renderTasks(); 
    renderNotes(); 
    renderAlarms(); 
    if (activeTab === 'chat') renderChat(); 
    if (activeTab === 'timer') {
      setTimeout(() => {
        drumScrollTo('fb-drum-h-scroll', drumH, false);
        drumScrollTo('fb-drum-m-scroll', drumM, false);
        drumScrollTo('fb-drum-s-scroll', drumS, false);
        syncDrumHighlight('fb-drum-h-scroll');
        syncDrumHighlight('fb-drum-m-scroll');
        syncDrumHighlight('fb-drum-s-scroll');
      }, 0);
    }
    if (activeTab === 'team' && typeof window.__FB?.renderTeamPane === 'function') window.__FB.renderTeamPane();
    if (activeTab === 'people' && typeof window.__FB?.renderPeoplePane === 'function') window.__FB.renderPeoplePane();
  }
  
  function renderTab(t) {
    if (!flowbeeUserId) {
      renderAll();
      return;
    }
    if (t === 'tasks') renderTasks()
    if (t === 'notes') renderNotes()
    if (t === 'timer') {
      setTimeout(() => {
        drumScrollTo('fb-drum-h-scroll', drumH, false);
        drumScrollTo('fb-drum-m-scroll', drumM, false);
        drumScrollTo('fb-drum-s-scroll', drumS, false);
        syncDrumHighlight('fb-drum-h-scroll');
        syncDrumHighlight('fb-drum-m-scroll');
        syncDrumHighlight('fb-drum-s-scroll');
      }, 0);
    }
    if (t === 'alarm') { renderAlarms(); renderMiniCalendar() }
    if (t === 'chat') renderChat()
    if (t === 'team' && typeof window.__FB?.renderTeamPane === 'function') window.__FB.renderTeamPane()
    if (t === 'people' && typeof window.__FB?.renderPeoplePane === 'function') window.__FB.renderPeoplePane()
  }

