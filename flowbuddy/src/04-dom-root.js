  // ═══════════════════════════════════════════════════════════════
  // DOM ROOT
  // ═══════════════════════════════════════════════════════════════
  const root = document.createElement('div')
  root.id = 'fb-root'
  root.style.cssText = [
    'all:initial!important', 'position:fixed!important',
    'z-index:2147483647!important', 'pointer-events:none!important',
    'font-family:\"Nunito\",system-ui,sans-serif!important',
    'width:0!important', 'height:0!important',
  ].join(';')

  // Attach Shadow DOM for style and DOM isolation
  const shadow = root.attachShadow({ mode: 'open' })

  // Inner root container that matches CSS selectors (#fb-root)
  const innerRoot = document.createElement('div')
  innerRoot.id = 'fb-root'
  shadow.appendChild(innerRoot)

  // Redirect classList operations to innerRoot
  Object.defineProperty(root, 'classList', {
    get() { return innerRoot.classList; }
  });

  // Redirect selector queries & appends to innerRoot/shadow
  root.querySelector = shadow.querySelector.bind(shadow)
  root.querySelectorAll = shadow.querySelectorAll.bind(shadow)
  root.appendChild = innerRoot.appendChild.bind(innerRoot)

  // Auto-move styling injected by modules into the shadow DOM
  const teamStyles = document.getElementById('fb-team-pane-styles')
  if (teamStyles) shadow.appendChild(teamStyles)
  const peopleStyles = document.getElementById('fb-people-pane-styles')
  if (peopleStyles) shadow.appendChild(peopleStyles)
  
  // Theme sync function — supports manual override via fbTheme
  let _manualTheme = null; // null = auto, 'light', 'dark'
  function syncTheme() {
    let isDark;
    if (_manualTheme === 'dark') { isDark = true; }
    else if (_manualTheme === 'light') { isDark = false; }
    else {
      isDark = document.documentElement.classList.contains('dark');
      if (!isDark && typeof window !== 'undefined') {
        try { isDark = localStorage.getItem('hp-theme') === 'dark'; } catch (e) {}
      }
      if (!isDark && typeof window !== 'undefined' && window.matchMedia) {
        try { isDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) {}
      }
    }
    root.classList.toggle('dark', isDark);
    updateThemeToggleIcon();
  }
  function updateThemeToggleIcon() {
    const btn = root.querySelector('#fb-theme-toggle');
    if (!btn) return;
    const isDark = root.classList.contains('dark');
    btn.innerHTML = isDark
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.title = isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap';
  }
  // Load saved theme preference
  try {
    chrome.storage.local.get('fbTheme', r => {
      if (r && r.fbTheme) { _manualTheme = r.fbTheme; }
      syncTheme();
    });
  } catch (e) { syncTheme(); }
  
  // Listen to mutation changes on <html>
  const themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  
  // Listen to custom custom event
  window.addEventListener('hp_theme_change', (e) => {
    if (e.detail && e.detail.theme) {
      root.classList.toggle('dark', e.detail.theme === 'dark');
    }
  });

  document.documentElement.appendChild(root)

  if (!document.querySelector('#fb-font')) {
    const l = document.createElement('link')
    l.id = 'fb-font'; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap'
    document.head && document.head.appendChild(l)
  }

