/* ==========================================================================
   FlowBuddy — Theme Toggle & Font Preferences
   ========================================================================== */

const FlowBuddyTheme = {
  init() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const current = document.documentElement.getAttribute('data-theme');
      this.updateIcon(btn, current === 'dark' ? 'dark' : 'light');

      btn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('flowbuddy-theme', 'light');
          this.updateIcon(btn, 'light');
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('flowbuddy-theme', 'dark');
          this.updateIcon(btn, 'dark');
        }
      });
    }

    this.initFont();
  },

  initFont() {
    const fontSelect = document.getElementById('font-select');
    const savedFont = localStorage.getItem('flowbuddy-font') || 'nunito';
    document.documentElement.setAttribute('data-font', savedFont);

    if (fontSelect) {
      fontSelect.value = savedFont;
      fontSelect.addEventListener('change', (e) => {
        const selectedFont = e.target.value;
        document.documentElement.setAttribute('data-font', selectedFont);
        localStorage.setItem('flowbuddy-font', selectedFont);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ 'flowbuddy-font': selectedFont });
        }
      });
    }
  },

  updateIcon(btn, theme) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
};
