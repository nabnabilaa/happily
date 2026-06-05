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

    // === Stopwatch Timer Logic ===
    let startTime;
    let timerInterval;
    let isRunning = false;
    let elapsedMs = 0;
    
    const minEl = document.getElementById('timer-min');
    const secEl = document.getElementById('timer-sec');
    const msEl = document.getElementById('timer-ms');
    const btnReset = document.getElementById('btn-reset');
    const btnStartStop = document.getElementById('btn-start-stop');
    const startStopText = document.getElementById('start-stop-text');
    const iconPlay = document.querySelector('.icon-play');
    const iconStop = document.querySelector('.icon-stop');

    function updateDisplay(time) {
        const date = new Date(time);
        const m = String(date.getUTCHours() * 60 + date.getUTCMinutes()).padStart(2, '0');
        const s = String(date.getUTCSeconds()).padStart(2, '0');
        const ms = String(Math.floor(date.getUTCMilliseconds() / 10)).padStart(2, '0'); 
        if (minEl) minEl.textContent = m;
        if (secEl) secEl.textContent = s;
        if (msEl) msEl.textContent = ms;
    }

    if (btnStartStop) {
        btnStartStop.addEventListener('click', () => {
            if (isRunning) {
                clearInterval(timerInterval);
                isRunning = false;
                btnStartStop.classList.remove('btn-stop');
                btnStartStop.classList.add('btn-start');
                if (startStopText) startStopText.textContent = 'Start';
                if (iconPlay) iconPlay.style.display = 'block';
                if (iconStop) iconStop.style.display = 'none';
            } else {
                startTime = Date.now() - elapsedMs;
                timerInterval = setInterval(() => {
                    elapsedMs = Date.now() - startTime;
                    updateDisplay(elapsedMs);
                }, 10);
                isRunning = true;
                btnStartStop.classList.remove('btn-start');
                btnStartStop.classList.add('btn-stop');
                if (startStopText) startStopText.textContent = 'Stop';
                if (iconPlay) iconPlay.style.display = 'none';
                if (iconStop) iconStop.style.display = 'block';
            }
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            clearInterval(timerInterval);
            isRunning = false;
            elapsedMs = 0;
            updateDisplay(0);
            if (btnStartStop) {
                btnStartStop.classList.remove('btn-stop');
                btnStartStop.classList.add('btn-start');
            }
            if (startStopText) startStopText.textContent = 'Start';
            if (iconPlay) iconPlay.style.display = 'block';
            if (iconStop) iconStop.style.display = 'none';
        });
    }
});
