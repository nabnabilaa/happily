/**
 * Satu sumber kebenaran untuk menampilkan "dari mana" seseorang absen.
 *
 * Baris attendance cuma menyimpan `check_in_type` + `office_id` + koordinat.
 * Nama kantor datang dari JOIN ke `office_locations` (lihat
 * /api/attendance/logs dan /api/logbook/daily-summary), jadi field yang dibaca
 * di sini — `office_name`, `location_lat`, `location_lng`, `notes` — harus
 * tetap ikut di setiap query yang memberi makan komponen kehadiran.
 */

export type AttendanceKind = 'WFO' | 'WFA' | 'DINAS';

/** Tone HPChip per tipe absen. */
type ChipTone = 'primary' | 'info' | 'honey';

export interface AttendanceLocation {
  /** WFO / WFA / DINAS — sudah dinormalisasi huruf besar. */
  kind: AttendanceKind;
  /** Label pendek untuk badge, mis. "WFO". */
  label: string;
  /** Label panjang untuk teks keterangan, mis. "Work From Anywhere". */
  longLabel: string;
  icon: string;
  tone: ChipTone;
  /** Nama kantor (WFO) atau alasan/catatan (WFA & Dinas). Null kalau tak ada. */
  place: string | null;
  /** Koordinat terformat, null kalau tidak terekam. */
  coords: string | null;
  /** Link Google Maps ke koordinat, null kalau tidak terekam. */
  mapsUrl: string | null;
  /** Ringkasan satu baris: tipe + tempat. Selalu terisi. */
  summary: string;
}

const KINDS: Record<AttendanceKind, { longLabel: string; icon: string; tone: ChipTone }> = {
  WFO:   { longLabel: 'Work From Office',   icon: '🏢', tone: 'primary' },
  WFA:   { longLabel: 'Work From Anywhere', icon: '🏠', tone: 'info' },
  DINAS: { longLabel: 'Perjalanan Dinas',   icon: '✈️', tone: 'honey' },
};

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function describeAttendanceLocation(log: any): AttendanceLocation {
  const raw = String(log?.check_in_type || 'WFO').toUpperCase();
  const kind: AttendanceKind = raw === 'WFA' || raw === 'DINAS' ? raw : 'WFO';
  const meta = KINDS[kind];

  const lat = toNum(log?.location_lat ?? log?.lat);
  const lng = toNum(log?.location_lng ?? log?.lng);
  const coords = lat !== null && lng !== null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : null;

  const notes = log?.notes ? String(log.notes).trim() : '';
  const officeName = log?.office_name ? String(log.office_name).trim() : '';

  // WFO diidentifikasi lewat kantornya; WFA/Dinas tidak punya kantor, jadi
  // catatan (alasan yang wajib diisi saat check-in) yang jadi keterangan lokasi.
  const place = kind === 'WFO' ? (officeName || null) : (notes || null);
  const fallback = kind === 'WFO' ? 'Kantor tidak tercatat' : 'Lokasi luar kantor';

  return {
    kind,
    label: kind,
    longLabel: meta.longLabel,
    icon: meta.icon,
    tone: meta.tone,
    place,
    coords,
    mapsUrl: lat !== null && lng !== null ? `https://www.google.com/maps?q=${lat},${lng}` : null,
    summary: `${meta.longLabel} · ${place || coords || fallback}`,
  };
}
