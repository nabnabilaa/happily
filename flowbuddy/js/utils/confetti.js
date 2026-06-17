/* ==========================================================================
   FlowBuddy — Confetti & Sparkle Effects
   Lightweight particle system for celebrations
   ========================================================================== */

const FlowBuddyConfetti = {
  colors: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'],

  /**
   * Burst confetti from a point (or center of an element)
   * @param {HTMLElement|null} anchor - element to burst from, or null for center
   * @param {number} count - number of particles (default 30)
   */
  burst(anchor, count = 30) {
    const container = document.getElementById('app');
    if (!container) return;

    let cx, cy;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const appRect = container.getBoundingClientRect();
      cx = rect.left - appRect.left + rect.width / 2;
      cy = rect.top - appRect.top + rect.height / 2;
    } else {
      cx = container.offsetWidth / 2;
      cy = container.offsetHeight / 2;
    }

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      const drift = (Math.random() - 0.5) * 120;
      const size = 4 + Math.random() * 4;
      const duration = 600 + Math.random() * 600;
      const delay = Math.random() * 200;

      particle.style.cssText = `
        left: ${cx}px;
        top: ${cy}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        --drift: ${drift}px;
        animation-duration: ${duration}ms;
        animation-delay: ${delay}ms;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;

      container.appendChild(particle);
      setTimeout(() => particle.remove(), duration + delay + 50);
    }
  },

  /**
   * Show sparkle effect on an element
   */
  sparkle(element) {
    const container = document.getElementById('app');
    if (!container || !element) return;

    const rect = element.getBoundingClientRect();
    const appRect = container.getBoundingClientRect();
    const sparkles = ['✨', '⭐', '💫'];

    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
      s.style.left = (rect.left - appRect.left + Math.random() * rect.width) + 'px';
      s.style.top = (rect.top - appRect.top + Math.random() * rect.height) + 'px';
      s.style.animationDelay = (Math.random() * 300) + 'ms';
      container.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }
};
