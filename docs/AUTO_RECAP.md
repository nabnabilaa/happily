# Auto-Recap Laporan (Mingguan & Bulanan)

Rekap AI tersimpan otomatis lewat satu endpoint cron:

```
GET /api/cron/report-recap?type=weekly     # rekap minggu berjalan (week-of-month hari ini)
GET /api/cron/report-recap?type=monthly    # rekap bulan yang baru berakhir (bulan lalu)
```

Untuk setiap scope (`all` + tiap divisi) endpoint ini menghitung ulang metrik, memanggil AI,
lalu meng-upsert hasilnya ke tabel `report_narratives`. Dashboard HR otomatis menampilkan rekap
tersimpan ini saat filter yang cocok dibuka (dengan cap waktu "🕒 Rekap ...").

Override manual/testing: `&month=6&year=2026&week=2` (week=0 → bulanan).

## Keamanan

Set env `CRON_SECRET`. Endpoint menerima **salah satu**:
- `?secret=<CRON_SECRET>` (lokal / VPS)
- Header `Authorization: Bearer <CRON_SECRET>` (di-inject otomatis oleh Vercel Cron)

Tanpa `CRON_SECRET`, endpoint terbuka (hanya untuk dev lokal).

---

## 0) VPS — Scheduler IN-APP (rekomendasi, zero-setup) ⭐

Sudah aktif otomatis. `instrumentation.ts` menjalankan scheduler internal (`lib/reportScheduler.ts`)
saat proses server boot. Jadi begitu kamu **push + restart** app di VPS (`next start` / pm2),
recap langsung terjadwal sendiri — **tanpa crontab sama sekali**.

- Weekly: **Jumat ≥ 17:00**  ·  Monthly: **tanggal 1 ≥ 00:30** (window, bukan detik pas → tahan restart)
- Anti-dobel antar-instance (pm2 cluster) lewat DB lock `cron_run_locks` — aman.
- **Waktu = zona waktu server.** Set `TZ=Asia/Jakarta` di environment VPS agar jadwal sesuai WIB.

Kontrol:
- Nonaktifkan: env `ENABLE_INAPP_SCHEDULER=false`
- Otomatis **dilewati di Vercel** (deteksi `process.env.VERCEL`) — di sana pakai `vercel.json`.
- Hanya jalan di runtime Node persisten. Kalau app-mu serverless, pakai opsi crontab/Vercel di bawah.

> Restart yang memicu scheduler: `pm2 restart flowbee` atau service manager kamu. Push saja (tanpa
> restart proses) tidak otomatis — pastikan pipeline deploy-mu me-restart app.

---

## 1) Lokal (laragon / Windows Task Scheduler)

Buat `scripts/report-recap.ps1` sudah tersedia. Daftarkan 2 task (jalankan di PowerShell **as Admin**),
ganti `SECRET` sesuai `.env.local`:

```powershell
$base = "http://localhost:3000/api/cron/report-recap"
$secret = "GANTI_DENGAN_CRON_SECRET"

# Mingguan — tiap Jumat 17:00
schtasks /Create /TN "Flowbee-RecapWeekly" /SC WEEKLY /D FRI /ST 17:00 /F `
  /TR "powershell -NoProfile -Command `"Invoke-RestMethod '$base?type=weekly&secret=$secret'`""

# Bulanan — tanggal 1 tiap bulan 00:30
schtasks /Create /TN "Flowbee-RecapMonthly" /SC MONTHLY /D 1 /ST 00:30 /F `
  /TR "powershell -NoProfile -Command `"Invoke-RestMethod '$base?type=monthly&secret=$secret'`""
```

Cek: `schtasks /Run /TN "Flowbee-RecapWeekly"`  ·  Hapus: `schtasks /Delete /TN "Flowbee-RecapWeekly" /F`

> Catatan: task hanya jalan saat komputer nyala. Untuk produksi 24/7 pakai VPS/Vercel.

## 2) VPS (Linux crontab)

`crontab -e`, ganti domain + secret:

```cron
# Mingguan — Jumat 17:00
0 17 * * 5 curl -s "https://APPMU.com/api/cron/report-recap?type=weekly&secret=CRON_SECRET" >/dev/null
# Bulanan — tanggal 1, 00:30
30 0 1 * * curl -s "https://APPMU.com/api/cron/report-recap?type=monthly&secret=CRON_SECRET" >/dev/null
```

## 3) Vercel

`vercel.json` (sudah ada) mendaftarkan cron-nya. Set env `CRON_SECRET` di dashboard Vercel —
Vercel meng-inject header `Authorization: Bearer <CRON_SECRET>` otomatis.

```json
{
  "crons": [
    { "path": "/api/cron/report-recap?type=weekly",  "schedule": "0 17 * * 5" },
    { "path": "/api/cron/report-recap?type=monthly", "schedule": "30 0 1 * *" }
  ]
}
```

> Vercel **Hobby** membatasi cron ke frekuensi harian. Bila jadwal mingguan/bulanan tak jalan,
> upgrade ke Pro, atau ganti ke harian (`0 20 * * *`) — upsert aman dijalankan berulang.
