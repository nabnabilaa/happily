// content.js - FlowBuddy Auth Sync Script
// Script ini berjalan di web app utama (happily-flowbuddy.vercel.app & localhost)
// Tugasnya hanya membaca localStorage dan mengirim data user ke ekstensi.

function syncUserDataToExtension() {
  try {
    const userId = localStorage.getItem('hp_user_id');
    if (!userId) return; // Belum login

    const cachedDataRaw = localStorage.getItem(`hp_cached_state_${userId}`);
    if (cachedDataRaw) {
      const data = JSON.parse(cachedDataRaw);
      if (data && data.user) {
        // Kirim data user ke background script ekstensi
        chrome.runtime.sendMessage({
          type: 'SYNC_USER_DATA',
          payload: {
            id: data.user.id,
            name: data.user.name,
            role: data.user.userRole || data.user.role || 'employee',
            email: data.user.email
          }
        });
      }
    }
  } catch (err) {
    console.error('FlowBuddy Sync Error:', err);
  }
}

// Jalankan saat pertama kali dimuat
syncUserDataToExtension();

// Dengarkan event dari web app jika ada update real-time
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FLOWBEE_WEBSITE_UPDATE') {
    syncUserDataToExtension();
  }
});

// Pantau perubahan localStorage antar tab
window.addEventListener('storage', (e) => {
  if (e.key === 'hp_user_id' || e.key?.startsWith('hp_cached_state_')) {
    syncUserDataToExtension();
  }
});
