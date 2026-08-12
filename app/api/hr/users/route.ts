import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequesterAccess, canManageTeam } from "@/lib/hrAuth";
import { requireActor } from "@/lib/apiAuth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    /*
     * Identitas diambil dari cookie sesi, bukan dari query.
     *
     * `?requesterId=` dulu dipercaya apa adanya, jadi karyawan biasa cukup
     * menyebut id HR untuk menarik 101 baris user lengkap dengan email —
     * terbukti runtime lewat audit/probe-authz.js. Parameter lamanya sengaja
     * tidak dihapus dari kontrak supaya klien lama tidak patah; nilainya kini
     * diabaikan.
     */
    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    const requesterId = actor.userId;

    const requester = await getRequesterAccess(requesterId);
    if (!canManageTeam(requester.role, requester.hrAccess)) {
      return NextResponse.json({ error: "Unauthorized. Only HR and Managers can view user lists." }, { status: 403 });
    }

    // SELECT * agar aman jika kolom hr_access belum dimigrasi (kolom hilang → undefined).
    const res = await db.execute("SELECT * FROM users ORDER BY created_at DESC");

    /*
     * `password_hash` dibuang sebelum dikirim.
     *
     * `SELECT *` di atas dipertahankan dengan sengaja — alasannya masih berlaku:
     * menyebut kolom satu per satu membuat endpoint ini pecah di lingkungan yang
     * kolomnya belum dimigrasi. Tapi konsekuensinya, balasan ini ikut membawa
     * hash password SETIAP karyawan (81 baris di basis data ini) ke browser HR,
     * lalu ke devtools, log, dan cache mana pun yang dilewatinya.
     *
     * Hash bcrypt memang tidak bisa dibalik, tapi ia bisa diserang offline
     * sesantai mungkin oleh siapa pun yang menyalinnya — dan tidak ada satu pun
     * layar yang membutuhkannya. Disaring di sini, bukan di query, supaya
     * penjaga ini tetap berlaku untuk kolom yang ditambahkan nanti.
     */
    const users = res.rows.map((row) => {
      const safe: Record<string, unknown> = { ...row };
      for (const key of Object.keys(safe)) {
        if (/pass|secret|refresh_token/i.test(key)) delete safe[key];
      }
      return safe;
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
