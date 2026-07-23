import { db } from "@/lib/db";

/**
 * Akses ke konsol HR-Admin bisa berasal dari dua sumber:
 *  - role === 'hr'      → akun HR murni (konsol admin bersih)
 *  - hr_access === 1    → employee/manager yang diberi akses tambahan (bisa switch ke HR)
 *
 * Query pakai SELECT * agar aman jika kolom hr_access belum dimigrasi
 * (kolom hilang → undefined → dianggap false, perilaku lama tetap jalan).
 */
export async function getRequesterAccess(
  userId: string
): Promise<{ role: string | null; hrAccess: boolean; row: any }> {
  if (!userId) return { role: null, hrAccess: false, row: null };
  const res = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [userId] });
  const row = res.rows[0];
  if (!row) return { role: null, hrAccess: false, row: null };
  return {
    role: row.role ? String(row.role) : null,
    hrAccess: Number(row.hr_access) === 1,
    row,
  };
}

/** True jika user boleh mengakses fitur HR-Admin (People, laporan, kelola user, dll). */
export function canHrAdmin(role: string | null, hrAccess: boolean): boolean {
  return role === "hr" || hrAccess;
}

/** True jika user boleh mengakses fitur manajemen tim (HR-Admin atau Manager). */
export function canManageTeam(role: string | null, hrAccess: boolean): boolean {
  return role === "hr" || role === "manager" || hrAccess;
}
