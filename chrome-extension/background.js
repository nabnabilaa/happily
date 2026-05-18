const ALARM_NAME = "productivityAlarm";
const DEFAULT_INTERVAL = 10; // minutes

const quotes = [
  "Jangan lupa bernapas dalam-dalam. Kamu memegang kendali hari ini. 🧘‍♂️",
  "Ayo semangat! Kamu pasti bisa. 🐝",
  "Lebah kecil, kerja besar! Fokus ya. 🍯",
  "Kamu sedang melakukan pekerjaan hebat! ✨",
  "Tarik napas, fokus kembali ke tujuanmu. 🧘‍♂️",
  "Langkah kecil menuju hasil besar. 👣",
  "Kamu mampu melakukan hal-hal luar biasa! 🚀",
  "Fokuslah untuk menjadi produktif, bukan sekadar sibuk. 🎯",
  "Percayalah pada dirimu sendiri. 🌟",
  "Kesalahan adalah bukti bahwa kamu sedang mencoba. 💪",
  "Kerja kerasmu akan membuahkan hasil. 💎",
  "Tetap positif, kerja keras, buat itu terjadi. ✨",
  "Setiap momen adalah awal yang baru. 🌈",
  "Jangan berhenti sampai kamu bangga. 🏆",
  "Konsistensi adalah kunci. Kamu pasti bisa! 🔑"
];

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Installed");
  startAlarm(DEFAULT_INTERVAL);
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    showNotification();
  }
});

function startAlarm(interval, goal, progress) {
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: interval
  });
  chrome.storage.local.set({ isRunning: true, interval: interval, goal: goal, progress: progress });
}

function stopAlarm() {
  chrome.alarms.clear(ALARM_NAME);
  chrome.storage.local.set({ isRunning: false });
}

function showNotification() {
  chrome.storage.local.get(['goal', 'progress'], (data) => {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    let message = quote;
    
    if (data.goal) {
      const progText = data.progress ? ` (${data.progress}%)` : '';
      message += `\n\n🎯 Target: ${data.goal}${progText}`;
    }
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Lebah Produktif 🐝',
      message: message,
      priority: 2
    });
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start") {
    startAlarm(request.interval || DEFAULT_INTERVAL, request.goal, request.progress);
    sendResponse({ status: "started" });
  } else if (request.action === "stop") {
    stopAlarm();
    sendResponse({ status: "stopped" });
  } else if (request.action === "test") {
    showNotification();
  }
});
