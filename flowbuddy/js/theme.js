/* ==========================================================================
   FlowBuddy — Theme Toggle (Dark Mode)
   Manual toggle via data-theme="dark" on <html>
   Persists to localStorage, loads before first render to prevent white-flash
   ========================================================================== */

const FlowBuddyTheme = {
  init() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    // Set initial icon (theme already applied in inline <script>)
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
  },

  updateIcon(btn, theme) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
};
