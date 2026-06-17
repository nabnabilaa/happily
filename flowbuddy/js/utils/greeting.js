/* ==========================================================================
   FlowBuddy — Greeting Utility
   Dynamic time-based greeting in Bahasa Indonesia
   ========================================================================== */

const FlowBuddyGreeting = {
  get(name) {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return `Pagi yang produktif, ${name}! ☀️`;
    if (hour >= 10 && hour < 15) return `Semangat siang, ${name}! 💪`;
    if (hour >= 15 && hour < 18) return `Sore yang tenang, ${name}! 🌤️`;
    if (hour >= 18 && hour < 21) return `Selamat malam, ${name}! 🌙`;
    return `Istirahat yang cukup, ${name}! 🌟`;
  }
};
