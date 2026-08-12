/* ==========================================================================
   FlowBuddy — Pengaturan blokir situs saat sesi fokus

   Daftar domainnya milik background.js, bukan file ini. Menyalinnya ke sini
   akan menciptakan dua daftar yang bisa berbeda, dan yang salah justru yang
   terlihat pengguna — jadi UI ini selalu bertanya dulu.
   ========================================================================== */

(function () {
  const listEl = document.getElementById('fb-blocklist');
  if (!listEl) return;

  /** Nama yang bisa dibaca orang. Domain mentah terbaca seperti pesan error. */
  const PRETTY = {
    'facebook.com': 'Facebook',
    'instagram.com': 'Instagram',
    'twitter.com': 'Twitter',
    'x.com': 'X',
    'tiktok.com': 'TikTok',
    'reddit.com': 'Reddit',
    'pinterest.com': 'Pinterest',
    '9gag.com': '9GAG',
    'netflix.com': 'Netflix',
    'twitch.tv': 'Twitch',
    'shopee.co.id': 'Shopee',
    'tokopedia.com': 'Tokopedia',
  };

  let all = [];
  let enabled = [];

  function save() {
    try {
      chrome.runtime.sendMessage({ type: 'SET_BLOCKLIST', domains: enabled }, () => {
        void chrome.runtime.lastError;
      });
    } catch (e) {
      /* service worker sedang di-reload; pilihan tersimpan saat percobaan berikutnya */
    }
  }

  function render() {
    listEl.innerHTML = '';

    all.forEach((domain) => {
      const row = document.createElement('label');
      row.style.cssText =
        'display:flex;align-items:center;gap:8px;padding:6px 2px;cursor:pointer;font-size:12px;font-weight:700;color:var(--text-primary);';

      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = enabled.includes(domain);
      box.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:var(--brand,#17915E);flex-shrink:0;';
      box.addEventListener('change', () => {
        enabled = box.checked
          ? all.filter((d) => d === domain || enabled.includes(d))
          : enabled.filter((d) => d !== domain);
        save();
        updateSummary();
      });

      const name = document.createElement('span');
      name.textContent = PRETTY[domain] || domain;

      row.appendChild(box);
      row.appendChild(name);
      listEl.appendChild(row);
    });

    updateSummary();
  }

  function updateSummary() {
    const summary = document.getElementById('fb-blocklist-summary');
    if (!summary) return;
    if (enabled.length === 0) {
      // Dinyatakan terang-terangan. Nol situs terblokir sambil tetap menyebut
      // dirinya "mode fokus" adalah persis jenis janji kosong yang sedang
      // kami singkirkan dari fitur ini.
      summary.textContent = 'Tidak ada situs yang diblokir saat sesi fokus.';
    } else if (enabled.length === all.length) {
      summary.textContent = `Semua ${all.length} situs diblokir saat sesi fokus.`;
    } else {
      summary.textContent = `${enabled.length} dari ${all.length} situs diblokir saat sesi fokus.`;
    }
  }

  try {
    chrome.runtime.sendMessage({ type: 'GET_BLOCKLIST' }, (resp) => {
      if (chrome.runtime.lastError || !resp) return;
      all = resp.all || [];
      enabled = resp.enabled || [];
      render();
    });
  } catch (e) {
    /* dibuka di luar konteks extension — bagian ini memang tidak berlaku */
  }
})();
