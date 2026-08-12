/* ==========================================================================
   FlowBuddy — Dialog Utility

   Pengganti `confirm()` dan `alert()` bawaan browser.

   Dialog native Chrome muncul sebagai kotak abu-abu di tepi atas jendela,
   berjudul nama ekstensi, memakai font dan tombol sistem. Di tengah popup yang
   seluruhnya digarap sendiri, kotak itu terbaca sebagai sesuatu yang belum
   sempat dibuatkan tampilannya — dan di ekstensi Chrome ia bahkan membekukan
   seluruh popup selama masih terbuka.

   Modal di sini memakai kelas `.fb-modal-*` yang sudah dipakai modal
   penyelesaian task, jadi tidak ada bahasa visual baru yang diperkenalkan.
   ========================================================================== */

const FlowBuddyDialog = {
  _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  },

  /**
   * Menampilkan dialog dan menyelesaikan Promise dengan `true`/`false`.
   *
   * Selalu ada jalan keluar: tombol batal, tombol silang, klik latar, dan Esc
   * semuanya menutup dengan `false`. Dialog yang hanya bisa ditutup lewat satu
   * pintu adalah cara paling mudah membuat orang merasa terjebak.
   *
   * @param {{title: string, body?: string, confirmLabel?: string,
   *          cancelLabel?: string, tone?: 'danger'|'primary'}} opts
   * @returns {Promise<boolean>}
   */
  confirm(opts) {
    const {
      title,
      body = '',
      confirmLabel = 'Ya, lanjutkan',
      cancelLabel = 'Batal',
      tone = 'danger',
    } = opts || {};

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fb-modal-overlay';
      overlay.style.display = 'flex';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      const accent = tone === 'danger' ? '#DC2626' : 'var(--color-role)';

      overlay.innerHTML = `
        <div class="fb-modal-content" style="max-width: 300px;">
          <div class="fb-modal-header">
            <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);">
              ${this._esc(title)}
            </div>
            <button class="fb-modal-close" data-fb-dialog="cancel" aria-label="Tutup">&times;</button>
          </div>
          ${body ? `
          <div class="fb-modal-body" style="padding: 16px 20px;">
            <div style="font-size: 13px; font-weight: 500; line-height: 1.6; color: var(--text-secondary);">
              ${this._esc(body)}
            </div>
          </div>` : ''}
          <div class="fb-modal-footer" style="display: flex; gap: 8px;">
            ${cancelLabel ? `
            <button data-fb-dialog="cancel" class="btn-secondary"
              style="flex: 1; padding: 11px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;">
              ${this._esc(cancelLabel)}
            </button>` : ''}
            <button data-fb-dialog="confirm"
              style="flex: 1; padding: 11px; border-radius: 10px; border: none; cursor: pointer;
                     background: ${accent}; color: #fff; font-size: 13px; font-weight: 800;">
              ${this._esc(confirmLabel)}
            </button>
          </div>
        </div>
      `;

      // Fokus harus pindah ke dalam dialog, dan kembali ke tempat asalnya saat
      // ditutup — kalau tidak, pengguna keyboard mendarat di awal halaman.
      const previouslyFocused = document.activeElement;

      const close = (result) => {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus();
        }
        resolve(result);
      };

      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
      };

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { close(false); return; }
        const action = e.target.closest('[data-fb-dialog]');
        if (action) close(action.getAttribute('data-fb-dialog') === 'confirm');
      });

      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(overlay);

      const confirmBtn = overlay.querySelector('[data-fb-dialog="confirm"]');
      if (confirmBtn) confirmBtn.focus();
    });
  },

  /** Pemberitahuan satu arah. Hanya punya satu tombol, dan tidak mengembalikan pilihan. */
  alert(title, body) {
    return this.confirm({
      title,
      body,
      confirmLabel: 'Mengerti',
      cancelLabel: '',
      tone: 'primary',
    }).then(() => undefined);
  },
};

window.FlowBuddyDialog = FlowBuddyDialog;
