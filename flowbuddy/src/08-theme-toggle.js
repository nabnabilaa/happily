  // ═══════════════════════════════════════════════════════════════
  // THEME TOGGLE
  // ═══════════════════════════════════════════════════════════════
  const themeToggleBtn = $('fb-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      // Cycle: auto -> dark -> light -> auto
      if (_manualTheme === null) { _manualTheme = 'dark'; }
      else if (_manualTheme === 'dark') { _manualTheme = 'light'; }
      else { _manualTheme = null; }
      try { chrome.storage.local.set({ fbTheme: _manualTheme || '' }); } catch (e) {}
      syncTheme();
    });
  }

