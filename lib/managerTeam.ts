import { db } from "@/lib/db";

export interface ManagerTeam {
  managerId: string;
  department: string;
  /** Ids of the manager's direct reports. Never includes the manager. */
  memberIds: string[];
}

/**
 * Menentukan siapa saja yang menjadi tanggung jawab seorang manajer.
 *
 * Modelnya: **divisi adalah dasarnya, penugasan per orang adalah pengecualian.**
 * Karyawan memilih divisinya saat onboarding, dan sejak itu ia otomatis menjadi
 * tanggung jawab manajer divisi tersebut. HR hanya perlu turun tangan untuk
 * kasus khusus — memindahkan satu orang ke atasan lain — lewat kolom
 * `manager_id`.
 *
 * Jadi hasilnya adalah GABUNGAN dari:
 *  1. siapa pun yang secara eksplisit ditugaskan kepadanya (`manager_id`), dan
 *  2. orang sedivisi yang BELUM dipindahkan ke atasan mana pun.
 *
 * Syarat kedua pada butir 2 itu yang penting: orang yang sudah dipindahkan
 * secara eksplisit ke manajer lain tidak lagi muncul di sini walaupun divisinya
 * masih sama — kalau tidak, "memindahkan orang" tidak akan pernah benar-benar
 * memindahkan apa pun.
 *
 * Versi sebelumnya memakai urutan, bukan gabungan: begitu ada SATU penugasan
 * eksplisit, seluruh divisi berhenti terhitung. Akibatnya HR yang memindahkan
 * satu orang saja tanpa sadar membuat sisa divisinya lenyap dari dashboard
 * manajernya — dan pekerjaan mereka lenyap dari antrean ACC bersamanya.
 */
export async function resolveManagerTeam(managerId: string): Promise<ManagerTeam> {
  const managerRes = await db.execute({
    sql: "SELECT department FROM users WHERE id = ?",
    args: [managerId],
  });
  const department = (managerRes.rows[0] as any)?.department || "";

  const directRes = await db.execute({
    sql: "SELECT id FROM users WHERE manager_id = ? AND id != ?",
    args: [managerId, managerId],
  });

  const memberIds = new Set(directRes.rows.map((r) => String(r.id)));

  if (department) {
    const deptRes = await db.execute({
      sql: `SELECT id FROM users
            WHERE department = ? AND id != ?
              AND (manager_id IS NULL OR manager_id = '')
              AND (role IS NULL OR role NOT IN ('hr', 'admin', 'manager'))`,
      args: [department, managerId],
    });
    for (const r of deptRes.rows) memberIds.add(String(r.id));
  }

  return { managerId, department, memberIds: Array.from(memberIds) };
}

/**
 * Arah kebalikan dari {@link resolveManagerTeam}: siapa atasan seorang karyawan.
 *
 * Aturannya sengaja dicerminkan persis dari fungsi di atas, supaya tidak muncul
 * pasangan yang timpang — orang yang muncul di dashboard seorang manajer tapi
 * notifikasinya dikirim ke manajer lain. Urutannya:
 *
 *  1. `manager_id` eksplisit, kalau ada;
 *  2. kalau tidak, manajer di divisi yang sama.
 *
 * Mengembalikan `null` kalau tidak ada yang cocok — karyawan tanpa divisi dan
 * tanpa penugasan memang belum dimiliki siapa pun, dan itu bukan kesalahan.
 *
 * Dipakai jalur task untuk memberi tahu manajer bahwa ada yang perlu di-ACC.
 */
export async function resolveManagerFor(userId: string): Promise<string | null> {
  const res = await db.execute({
    sql: "SELECT manager_id, department FROM users WHERE id = ?",
    args: [userId],
  });
  const row = res.rows[0] as any;
  if (!row) return null;

  const explicit = row.manager_id ? String(row.manager_id).trim() : "";
  if (explicit) return explicit;

  const department = row.department ? String(row.department) : "";
  if (!department) return null;

  // `LIMIT 1` cukup: model datanya mengasumsikan satu manajer per divisi, dan
  // itu asumsi yang sama yang dipakai resolveManagerTeam saat mengumpulkan
  // anggota berdasarkan divisi.
  const mgrRes = await db.execute({
    sql: `SELECT id FROM users
          WHERE department = ? AND id != ? AND role = 'manager'
          ORDER BY id LIMIT 1`,
    args: [department, userId],
  });
  const mgr = mgrRes.rows[0] as any;
  return mgr ? String(mgr.id) : null;
}

/** `?, ?, ?` placeholder list for an `IN (...)` clause. */
export function placeholdersFor(ids: string[]): string {
  return ids.map(() => "?").join(",");
}

/** Sedalam apa rantai atasan ditelusuri saat mencari siklus. */
const MAX_CHAIN_DEPTH = 20;

export interface ManagerAssignmentCheck {
  ok: boolean;
  error?: string;
  /** Field-nya tidak dikirim sama sekali — biarkan kolomnya apa adanya. */
  untouched?: boolean;
  /** Nilai yang siap ditulis ke `users.manager_id` — null berarti dilepas. */
  value?: string | null;
}

/**
 * Memeriksa apakah `managerId` boleh dipasang sebagai atasan `targetUserId`.
 *
 * Sampai sekarang tidak ada satu pun jalur di aplikasi yang menulis
 * `users.manager_id`: satu-satunya pengisinya adalah backfill data contoh di
 * migrate-schema. Akibatnya struktur organisasi ditebak dari kecocokan nama
 * departemen, dan siapa pun yang departemennya kosong tidak dimiliki manajer
 * mana pun. Begitu HR bisa mengisinya dari layar, nilai yang masuk harus
 * diperiksa di sini — bukan dipercaya dari klien.
 *
 * Aturannya:
 *  - kosong berarti melepas atasan, bukan kesalahan;
 *  - orang tidak bisa menjadi atasan dirinya sendiri;
 *  - atasan harus akun yang ada dan ber-peran `manager`/`hr`;
 *  - rantai atasan tidak boleh melingkar (A → B → A). Siklus membuat
 *    penelusuran "atasan dari atasan" berputar selamanya.
 */
export async function validateManagerAssignment(
  targetUserId: string,
  managerId: unknown
): Promise<ManagerAssignmentCheck> {
  if (managerId === undefined) return { ok: true, untouched: true };

  const wanted = managerId === null ? "" : String(managerId).trim();
  if (!wanted) return { ok: true, value: null };

  if (wanted === String(targetUserId)) {
    return { ok: false, error: "Seseorang tidak bisa menjadi atasan dirinya sendiri" };
  }

  const mgrRes = await db.execute({
    sql: "SELECT id, role FROM users WHERE id = ?",
    args: [wanted],
  });
  const mgr = mgrRes.rows[0] as any;
  if (!mgr) return { ok: false, error: "Manajer yang dipilih tidak ditemukan" };

  const role = mgr.role ? String(mgr.role) : "";
  if (role !== "manager" && role !== "hr") {
    return { ok: false, error: "Atasan harus akun ber-peran manager atau HR" };
  }

  // Telusuri ke atas dari calon atasan. Kalau kita sampai lagi ke orang yang
  // sedang diatur, pemasangan ini menutup lingkaran.
  let cursor: string | null = wanted;
  for (let depth = 0; cursor && depth < MAX_CHAIN_DEPTH; depth++) {
    if (cursor === String(targetUserId)) {
      return { ok: false, error: "Penugasan ini membuat rantai atasan melingkar" };
    }
    const up: { rows: any[] } = await db.execute({
      sql: "SELECT manager_id FROM users WHERE id = ?",
      args: [cursor],
    });
    const next = (up.rows[0] as any)?.manager_id;
    cursor = next ? String(next) : null;
  }

  return { ok: true, value: wanted };
}
