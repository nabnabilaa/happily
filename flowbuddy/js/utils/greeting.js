/* ==========================================================================
   FlowBuddy — Greeting Utility
   Dynamic time-based greeting in Bahasa Indonesia
   ========================================================================== */

const FlowBuddyGreeting = {
  /**
   * Sapaan menurut jam. `name` boleh kosong.
   *
   * Nama datang dari hasil sync, dan sync bisa terlambat atau gagal. Versi
   * sebelumnya menambal lubang itu dengan nama karangan ('Budi'), yang berarti
   * satu kegagalan jaringan cukup untuk membuat aplikasi menyapa orang yang
   * salah dengan yakin. Sekarang namanya benar-benar opsional: kalau belum ada,
   * sapaannya berhenti di koma dan tetap kalimat yang utuh — bukan
   * "Pagi yang produktif, !".
   */
  get(name) {
    const who = (name || '').trim();
    const suffix = who ? `, ${who}` : '';
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return `Pagi yang produktif${suffix}! ☀️`;
    if (hour >= 10 && hour < 15) return `Semangat siang${suffix}! 💪`;
    if (hour >= 15 && hour < 18) return `Sore yang tenang${suffix}! 🌤️`;
    if (hour >= 18 && hour < 21) return `Selamat malam${suffix}! 🌙`;
    return `Istirahat yang cukup${suffix}! 🌟`;
  }
};
