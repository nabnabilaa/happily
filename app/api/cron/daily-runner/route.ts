import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cronAuth';

import { GET as dailyChallenges } from '@/app/api/cron/daily-challenges/route';
import { GET as checkinReminder } from '@/app/api/cron/checkin-reminder/route';
import { GET as inactivityCheck } from '@/app/api/cron/inactivity-check/route';
import { GET as penaltyCheck } from '@/app/api/cron/penalty-check/route';
import { GET as hrAlerts } from '@/app/api/cron/hr-alerts/route';
import { GET as fridayReview } from '@/app/api/cron/friday-review/route';

/**
 * Satu pintu untuk pekerjaan terjadwal harian.
 *
 * Delapan endpoint cron sudah ditulis, tapi `vercel.json` hanya pernah
 * menjadwalkan dua di antaranya. Sisanya — pengingat check-in, penalti
 * ketidakaktifan, tantangan harian, peringatan kesejahteraan, pengingat review
 * Jumat — ada lengkap di kode dan tidak pernah sekali pun berjalan. Fiturnya
 * terlihat hidup di layar pengaturan, hasilnya tidak pernah ada.
 *
 * Dijalankan lewat satu runner, bukan satu entri jadwal per pekerjaan, karena:
 *  - jumlah entri cron dibatasi oleh paket Vercel, dan batas itu diam-diam
 *    membuat entri berlebih tidak jalan alih-alih memberi error;
 *  - urutannya jadi pasti (tantangan dibuat sebelum pengingatnya dikirim);
 *  - satu pekerjaan yang gagal tidak menghentikan sisanya.
 *
 * `slot` memilih rombongan mana yang jalan, karena tidak semua pekerjaan cocok
 * di jam yang sama:
 *   ?slot=morning — awal hari kerja: bagi tantangan, ingatkan check-in, hitung
 *                   penalti, kirim peringatan kesejahteraan, review Jumat.
 *   ?slot=midday  — tengah hari: cek siapa yang belum bergerak sejak check-in.
 *
 * Pekerjaan yang punya syarat waktunya sendiri (friday-review hanya Jumat,
 * inactivity-check melewati akhir pekan) tetap menjaga dirinya masing-masing,
 * jadi memanggilnya di luar waktunya aman — ia akan melewatkan diri.
 */

type Job = { name: string; run: (req: Request) => Promise<Response> };

const SLOTS: Record<string, Job[]> = {
  morning: [
    { name: 'daily-challenges', run: dailyChallenges },
    { name: 'checkin-reminder', run: checkinReminder },
    { name: 'penalty-check', run: penaltyCheck },
    { name: 'hr-alerts', run: hrAlerts },
    { name: 'friday-review', run: fridayReview },
  ],
  midday: [
    { name: 'checkin-reminder', run: checkinReminder },
    { name: 'inactivity-check', run: inactivityCheck },
  ],
};

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slot = new URL(request.url).searchParams.get('slot') || 'morning';
  const jobs = SLOTS[slot];
  if (!jobs) {
    return NextResponse.json(
      { error: `slot tidak dikenal: ${slot}. Pilihan: ${Object.keys(SLOTS).join(', ')}` },
      { status: 400 }
    );
  }

  const results: Record<string, unknown> = {};

  for (const job of jobs) {
    const startedAt = Date.now();
    try {
      // Request yang sama diteruskan supaya penjaga di tiap endpoint melihat
      // kredensial yang sudah lolos di sini.
      const res = await job.run(request);
      let body: unknown = null;
      try { body = await res.json(); } catch { body = null; }
      results[job.name] = { status: res.status, ms: Date.now() - startedAt, body };
    } catch (e: any) {
      // Satu pekerjaan yang jatuh tidak boleh menyeret sisanya. Kegagalannya
      // dicatat di respons, bukan ditelan diam-diam seperti sebelumnya.
      console.error(`[daily-runner] ${job.name} gagal:`, e);
      results[job.name] = { status: 500, ms: Date.now() - startedAt, error: e?.message || String(e) };
    }
  }

  const failed = Object.entries(results)
    .filter(([, r]) => (r as any).status >= 400)
    .map(([name]) => name);

  return NextResponse.json({ success: failed.length === 0, slot, failed, results });
}
