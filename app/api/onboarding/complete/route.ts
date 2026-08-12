import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelfOrHrAdmin } from "@/lib/apiAuth";

export async function POST(request: Request) {
  try {
    const { userId, department, departmentId, answers } = await request.json();

    // Identitas dari cookie sesi. Onboarding menentukan divisi dan status akun.
    const access = await requireSelfOrHrAdmin(request, userId);
    if ("response" in access) return access.response;

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    // Pastikan kolom department_status & onboarding_answers ada
    try {
      await db.execute("ALTER TABLE users ADD COLUMN department_status VARCHAR(20) DEFAULT NULL");
    } catch (_) {
      // Kolom sudah ada — abaikan error
    }
    try {
      await db.execute("ALTER TABLE users ADD COLUMN onboarding_answers TEXT DEFAULT NULL");
    } catch (_) {
      // Kolom sudah ada — abaikan error
    }

    // Divisi yang dipilih karyawan dicocokkan ke tabel `departments`.
    //
    // Kalau cocok, karyawan LANGSUNG masuk divisi itu (`approved`) — pilihannya
    // memang berasal dari daftar departemen HR sendiri, jadi tidak ada yang perlu
    // disetujui ulang. Antrean "Permintaan Departemen" tinggal menangani sisa
    // kasusnya: divisi dari konfigurasi onboarding lama yang belum terdaftar di HR.
    let resolvedName: string | null = department ? String(department).trim() : null;
    let matched = false;

    if (resolvedName) {
      try {
        // Cocokkan lewat id kalau dikirim, kalau tidak lewat nama (case-insensitive).
        const res = departmentId
          ? await db.execute({ sql: "SELECT id, name FROM departments WHERE id = ?", args: [departmentId] })
          : await db.execute({
              sql: "SELECT id, name FROM departments WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))",
              args: [resolvedName],
            });
        const row = res.rows[0] as { name?: string } | undefined;
        if (row?.name) {
          matched = true;
          // Pakai ejaan resmi dari tabel departemen, bukan label pilihan, supaya
          // filter per-divisi di layar Team/HR selalu cocok persis.
          resolvedName = String(row.name);
        }
      } catch (e) {
        console.error("Department lookup failed:", e);
      }
    }

    const departmentStatus = resolvedName ? (matched ? "approved" : "pending") : null;

    // Simpan divisi + status keanggotaan, serta seluruh jawaban onboarding
    // sebagai knowledge tambahan per user.
    await db.execute({
      sql: `UPDATE users
            SET is_onboarded = 1,
                department = ?,
                department_status = ?,
                onboarding_answers = ?
            WHERE id = ?`,
      args: [
        resolvedName,
        departmentStatus,
        Array.isArray(answers) ? JSON.stringify(answers) : null,
        userId,
      ],
    });

    return NextResponse.json({
      success: true,
      department: resolvedName,
      departmentStatus,
      /** true = langsung bergabung, false = masuk antrean persetujuan HR. */
      joined: matched,
    });
  } catch (error: any) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data onboarding" }, { status: 500 });
  }
}
