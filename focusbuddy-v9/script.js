document.addEventListener('DOMContentLoaded', () => {
    // === Clock-in Logic ===
    const clockInBtn = document.querySelector('.clock-in-btn');
    
    if (clockInBtn) {
        clockInBtn.addEventListener('click', () => {
            // 1. Ubah tampilan tombol secara visual (State: Success)
            clockInBtn.style.backgroundColor = '#40C057'; // Warna Hijau Flat (Success)
            clockInBtn.style.color = '#FFFFFF';
            clockInBtn.innerHTML = '✅ Berhasil Clock-in (08:00)';
            
            // 2. Nonaktifkan tombol agar tidak diklik berkali-kali
            clockInBtn.style.pointerEvents = 'none';
            clockInBtn.style.cursor = 'default';
            
            // =================================================================
            // TODO untuk Developer (Backend Integration):
            // Di sinilah Anda memasukkan kode untuk mengirim data ke server/database
            // Contoh menggunakan Fetch API:
            // 
            // fetch('https://api.websiteanda.com/absen', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ userId: 123, action: 'clock-in', timestamp: new Date() })
            // }).then(response => {
            //     console.log('Absen tersimpan!');
            // }).catch(err => {
            //     console.error('Gagal absen', err);
            // });
            // =================================================================
        });
    }

    // === Timer Pills Logic (Contoh interaksi tambahan) ===
    const pillBtns = document.querySelectorAll('.pill-btn');
    const minInput = document.querySelector('.timer-input[aria-label="Minutes"]');

    pillBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Hapus class 'active' dari semua tombol
            pillBtns.forEach(b => b.classList.remove('active'));
            // Tambahkan class 'active' ke tombol yang diklik
            btn.classList.add('active');

            // Ambil angka dari teks tombol (misal: "+15m" -> 15)
            const text = btn.innerText;
            const minutes = text.replace(/[^0-9]/g, '');
            
            if(minutes && minInput) {
                // Update input menit
                minInput.value = minutes.padStart(2, '0');
            }
        });
    });
});
