/* ==========================================================================
   FlowBuddy — Background Service Worker
   Alarms, notifications, dan mode fokus (blokir distraksi + tahan notifikasi).
   ========================================================================== */

// Track nudge IDs already shown this browser session (reset on service worker restart)
const _shownNudgeIds = new Set();

/* ──────────────────────────────────────────────────────────────────────────
   MODE FOKUS

   Keadaan fokus TIDAK boleh disimpan di variabel modul. Service worker MV3
   dimatikan Chrome kapan saja saat idle, dan variabel modul ikut hilang
   bersamanya — sesi fokus akan "selesai" sendiri tanpa ada yang mengakhirinya.
   `chrome.storage.session` hidup selama browser hidup, bukan selama worker
   hidup, jadi itu yang dipakai.

   Keadaannya juga punya masa berlaku. Kalau tab aplikasi ditutup paksa atau
   browsernya crash, tidak akan ada yang mengirim sinyal "sesi selesai" — tanpa
   masa berlaku, blokir situsnya akan menempel selamanya dan satu-satunya jalan
   keluar adalah mencopot extension. Aplikasi memperpanjangnya setiap ~20 detik
   lewat detak jantungnya, jadi 90 detik memberi ruang tiga detak terlewat.
   ────────────────────────────────────────────────────────────────────────── */

const FOCUS_TTL_MS = 90_000;
const FOCUS_ALARM = 'fb_focus_expiry';
const BLOCK_RULE_ID = 9001;

/**
 * Daftar bawaan, sengaja pendek dan bisa dibantah. Tujuannya bukan menyensor
 * internet — cuma memberi gesekan pada situs yang paling sering dibuka tanpa
 * sadar. Situs kerja tidak masuk sini: extension yang memblokir alat kerja akan
 * dicopot dalam sehari, dan mode fokusnya ikut mati bersamanya.
 */
const DISTRACTING_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'reddit.com',
  'pinterest.com',
  '9gag.com',
  'netflix.com',
  'twitch.tv',
  'shopee.co.id',
  'tokopedia.com',
];

async function readFocus() {
  try {
    const { fbFocus } = await chrome.storage.session.get('fbFocus');
    if (!fbFocus) return { active: false, held: 0 };
    return { active: Date.now() < fbFocus.until, held: fbFocus.held || 0 };
  } catch (e) {
    // Gagal membaca harus berarti "tidak sedang fokus". Menebak "sedang fokus"
    // akan memblokir situs dan menelan notifikasi karena sebuah error.
    console.warn('[FlowBuddy] Focus state read failed:', e);
    return { active: false, held: 0 };
  }
}

/**
 * Domain mana dari daftar bawaan yang benar-benar diblokir.
 *
 * Disimpan di `storage.local` (bukan `session`) karena ini preferensi, bukan
 * keadaan sesi — pilihannya harus bertahan setelah browser ditutup.
 *
 * Yang bisa dipilih SENGAJA dibatasi pada `DISTRACTING_DOMAINS`. Domain di luar
 * daftar itu tidak akan pernah bisa diblokir dengan cara ini: aturan `redirect`
 * menuntut host permission, dan host permission hanya bisa dideklarasikan di
 * manifest. Menerima domain bebas berarti setiap penambahan memicu prompt izin
 * Chrome yang menonaktifkan extension sampai user menyetujuinya ulang.
 */
async function enabledDomains() {
  try {
    const { fbBlocked } = await chrome.storage.local.get('fbBlocked');
    // Belum pernah diatur = semuanya aktif. Pengguna baru harus mendapat
    // perlindungan penuh tanpa perlu menyentuh pengaturan apa pun dulu.
    if (!Array.isArray(fbBlocked)) return DISTRACTING_DOMAINS;
    // Disaring terhadap daftar bawaan: nilai lama yang domainnya sudah dihapus
    // dari daftar tidak boleh ikut masuk ke aturan.
    return DISTRACTING_DOMAINS.filter((d) => fbBlocked.includes(d));
  } catch (e) {
    console.warn('[FlowBuddy] Blocklist preference read failed:', e);
    return DISTRACTING_DOMAINS;
  }
}

/** Satu aturan untuk semua domain — `requestDomains` sudah mencakup subdomain. */
async function setBlocklist(on) {
  try {
    const domains = on ? await enabledDomains() : [];
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [BLOCK_RULE_ID],
      // Daftar kosong bukan berarti "blokir semua": `requestDomains: []` adalah
      // kondisi tak sah di DNR, dan aturan tanpa kondisi domain akan memblokir
      // SELURUH internet. Kalau user mematikan semuanya, tidak ada aturan.
      addRules: on && domains.length > 0
        ? [{
            id: BLOCK_RULE_ID,
            priority: 1,
            action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
            // Hanya `main_frame`: memblokir sub-resource akan merusak situs lain
            // yang kebetulan memuat tombol share atau embed dari domain ini.
            condition: { requestDomains: domains, resourceTypes: ['main_frame'] },
          }]
        : [],
    });
  } catch (e) {
    console.warn('[FlowBuddy] Blocklist update failed:', e);
  }
}

/**
 * Membungkam notifikasi SELURUH SITUS di Chrome — WhatsApp Web, Gmail, Slack,
 * Google Calendar. Ini jauh lebih besar daripada blokir situs: yang benar-benar
 * merebut perhatian di laptop adalah notifikasi web, bukan situs yang sengaja
 * kamu buka.
 *
 * Pemulihannya memakai `clear()`, bukan menyimpan-lalu-mengembalikan nilai lama.
 * Chrome menumpuk pengaturan extension DI ATAS pengaturan milik user, dan
 * `clear()` hanya menghapus lapisan milik extension ini sendiri. Jadi izin yang
 * kamu atur sendiri per situs tidak pernah kami sentuh, tidak pernah kami baca,
 * dan tidak mungkin kami rusak — bahkan kalau kamu mengubahnya di tengah sesi.
 */
async function setWebNotificationBlock(on) {
  try {
    if (!chrome.contentSettings?.notifications) return;
    if (on) {
      await chrome.contentSettings.notifications.set({
        primaryPattern: '<all_urls>',
        setting: 'block',
        scope: 'regular',
      });
    } else {
      await chrome.contentSettings.notifications.clear({ scope: 'regular' });
    }
  } catch (e) {
    // Gagal memasang harus berarti sesi tetap jalan tanpa lapisan ini. Menggagalkan
    // seluruh mode fokus karena satu API ditolak jauh lebih merugikan.
    console.warn('[FlowBuddy] Web notification block failed:', e);
  }
}

/**
 * Sesi selesai: buka blokirnya, lalu laporkan yang tertahan dalam SATU
 * notifikasi. Melepaskan lima notifikasi beruntun di detik sesi berakhir bukan
 * menahan interupsi — itu menundanya lalu melipatgandakannya.
 */
async function endFocus() {
  const { fbFocus } = await chrome.storage.session.get('fbFocus').catch(() => ({}));
  // Aplikasi mengirim `active:false` di setiap pembaruan keadaan, bukan sekali
  // saat sesi berakhir — tanpa penjaga ini setiap 30 detik akan memicu satu
  // pembaruan aturan DNR yang tidak mengubah apa pun.
  if (!fbFocus) return;

  const held = fbFocus.held || 0;
  await chrome.storage.session.remove('fbFocus');
  await chrome.alarms.clear(FOCUS_ALARM);
  await setBlocklist(false);
  await setWebNotificationBlock(false);

  if (held > 0) {
    chrome.notifications.create('fb_focus_summary_' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🐝 Sesi fokusmu selesai',
      message: held === 1
        ? '1 pengingat ditahan selama kamu fokus.'
        : `${held} pengingat ditahan selama kamu fokus.`,
      priority: 1,
    });
  }
}

async function beginOrExtendFocus() {
  const prev = await readFocus();
  await chrome.storage.session.set({
    fbFocus: { until: Date.now() + FOCUS_TTL_MS, held: prev.held },
  });
  // Alarm minimum Chrome adalah 1 menit; ini cuma jaring pengaman kalau
  // aplikasinya berhenti mengabari, bukan penentu utama kedaluwarsa.
  chrome.alarms.create(FOCUS_ALARM, { delayInMinutes: FOCUS_TTL_MS / 60000 });
  if (!prev.active) {
    await setBlocklist(true);
    await setWebNotificationBlock(true);
  }
}

/**
 * Jaring pengaman untuk keadaan yatim.
 *
 * Blokir situs (DNR dinamis) dan blokir notifikasi web (contentSettings)
 * keduanya PERSISTEN — mereka bertahan melewati restart Chrome. Penanda sesinya
 * tidak: `storage.session` dikosongkan saat browser ditutup. Tanpa pembersihan
 * ini, Chrome yang crash di tengah sesi fokus akan bangun dengan notifikasi
 * seluruh situs mati dan tidak ada apa pun yang tersisa untuk menyalakannya
 * kembali — user hanya akan tahu bahwa notifikasinya "rusak", tidak akan pernah
 * menghubungkannya dengan Flowbee, dan satu-satunya jalan keluar yang dia temukan
 * adalah mencopot extension.
 *
 * Dipasang di `onStartup` dan `onInstalled` — dua momen tempat keadaan basi bisa
 * ada, dan bukan di setiap service worker bangun (itu akan memanggil dua API
 * puluhan kali sehari tanpa alasan).
 */
async function clearStaleBlocks() {
  const { active } = await readFocus();
  if (active) return;
  await setBlocklist(false);
  await setWebNotificationBlock(false);
}

chrome.runtime.onStartup.addListener(() => { void clearStaleBlocks(); });
chrome.runtime.onInstalled.addListener(() => { void clearStaleBlocks(); });

/** Menahan satu notifikasi dan menghitungnya. True kalau ditahan. */
async function holdIfFocusing() {
  const { active, held } = await readFocus();
  if (!active) return false;
  await chrome.storage.session.set({
    fbFocus: { until: Date.now() + FOCUS_TTL_MS, held: held + 1 },
  });
  return true;
}

// ── Alarm Handler ──
chrome.alarms.onAlarm.addListener(async (alarm) => {
  // Ditangani lebih dulu: namanya juga berawalan `fb_`, dan tanpa cabang ini ia
  // akan jatuh ke logika label di bawah dan memunculkan notifikasi "Pengingat".
  if (alarm.name === FOCUS_ALARM) {
    const { active } = await readFocus();
    if (!active) await endFocus();
    return;
  }

  if (!alarm.name.startsWith('fb_')) return;

  // Pengingat yang jatuh tempo di tengah sesi fokus ditahan, bukan dibuang:
  // hitungannya dilaporkan begitu sesinya selesai.
  if (await holdIfFocusing()) return;

  const label = decodeURIComponent(alarm.name.split('__')[1] || 'Pengingat');
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '🐝 Flowbuddy by Maxy',
    message: label,
    priority: 2,
    requireInteraction: true
  });
});

// ── Message Handler ──
chrome.runtime.onMessage.addListener((msg, sender, res) => {
  // Sync User Auth Data from Content Script
  if (msg.type === 'SYNC_USER_DATA') {
    chrome.storage.local.set({ 'flowbuddy-user': msg.payload }, () => {
      res({ ok: true });
    });
    return true;
  }
  // Set Alarm
  if (msg.type === 'SET_ALARM') {
    const delay = (msg.timestamp - Date.now()) / 60000;
    if (delay <= 0) { res({ ok: false }); return true; }
    chrome.alarms.create(
      `fb_${msg.id}__${encodeURIComponent(msg.label)}`,
      { delayInMinutes: delay }
    );
    res({ ok: true });
    return true;
  }

  // Clear Alarm
  if (msg.type === 'CLEAR_ALARM') {
    chrome.alarms.getAll(alarms => {
      alarms
        .filter(a => a.name.includes(`_${msg.id}__`))
        .forEach(a => chrome.alarms.clear(a.name));
    });
    res({ ok: true });
    return true;
  }

  // Daftar domain + pilihan pengguna, untuk pengaturan di popup.
  if (msg.type === 'GET_BLOCKLIST') {
    (async () => {
      res({ all: DISTRACTING_DOMAINS, enabled: await enabledDomains() });
    })();
    return true;
  }

  // Menyimpan pilihan pengguna. Kalau sesi fokus sedang berjalan, aturannya
  // langsung diperbarui — pengaturan yang baru berlaku "sesi depan" akan
  // terasa rusak bagi orang yang mengubahnya justru karena terganggu sekarang.
  if (msg.type === 'SET_BLOCKLIST') {
    (async () => {
      const picked = Array.isArray(msg.domains)
        ? DISTRACTING_DOMAINS.filter((d) => msg.domains.includes(d))
        : DISTRACTING_DOMAINS;
      await chrome.storage.local.set({ fbBlocked: picked });
      const { active } = await readFocus();
      if (active) await setBlocklist(true);
      res({ ok: true, enabled: picked });
    })();
    return true;
  }

  // Keadaan sesi fokus dari aplikasi web (lihat lib/focusPresence.ts →
  // js/sync.js). Dikirim berulang kali selama sesi berjalan, bukan sekali di
  // awal: itulah yang memperpanjang masa berlakunya.
  if (msg.type === 'FOCUS_STATE') {
    (async () => {
      if (msg.active) await beginOrExtendFocus();
      else await endFocus();
      res({ ok: true });
    })();
    return true;
  }

  // Show Notification
  if (msg.type === 'SHOW_NOTIFICATION') {
    (async () => {
      if (await holdIfFocusing()) { res({ ok: true, held: true }); return; }
      const notifId = msg.id ? String(msg.id) : 'fb_notif_' + Date.now();
      chrome.notifications.create(notifId, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: msg.title || '🐝 Flowbuddy by Maxy',
        message: msg.message || '',
        priority: 1
      });
      res({ ok: true });
    })();
    return true;
  }

  // Fetch API Proxy (for future use when connecting to Web App)
  if (msg.type === 'FETCH_API') {
    const opts = {
      method: msg.method || 'GET',
      headers: msg.headers || {}
    };
    if (msg.body) opts.body = msg.body;

    fetch(msg.url, opts)
      .then(async response => {
        const text = await response.text();
        let json;
        try { json = JSON.parse(text); } catch(e) { json = text; }
        res({
          success: true,
          result: { ok: response.ok, status: response.status, data: json }
        });
      })
      .catch(err => {
        res({ success: false, error: err.message || String(err) });
      });
    return true;
  }

  // Relay FORCE_SYNC to active tab, preserving optional flags (e.g. chatRequest)
  if (msg.type === 'FORCE_SYNC') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'FORCE_SYNC',
          chatRequest: !!msg.chatRequest,
        }).catch(() => {});
      }
    });
    res({ ok: true });
    return false;
  }

  // Deduplicate nudge overlays across tabs — only one tab shows it per session
  if (msg.type === 'SHOULD_SHOW_NUDGE') {
    (async () => {
      // Overlay maskot menutupi halaman yang sedang dibaca — bentuk interupsi
      // paling langsung yang dimiliki extension ini. Id-nya sengaja TIDAK
      // ditandai sudah tampil, supaya nudge-nya masih bisa muncul setelah sesi
      // selesai alih-alih hilang diam-diam.
      const { active } = await readFocus();
      if (active) { res({ show: false }); return; }

      if (!_shownNudgeIds.has(msg.notifId)) {
        _shownNudgeIds.add(msg.notifId);
        res({ show: true });
      } else {
        res({ show: false });
      }
    })();
    return true;
  }

  // Handle unknown messages so channel doesn't hang
  res({ ok: false, error: 'Unhandled message type' });
  return false;
});
