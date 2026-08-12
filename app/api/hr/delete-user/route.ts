import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequesterAccess, canHrAdmin } from '@/lib/hrAuth';
import { requireHrAdmin } from "@/lib/apiAuth";

export async function POST(req: Request) {
  try {
    const { requesterId, targetUserId } = await req.json();

    if (!requesterId || !targetUserId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    /*
     * Diperiksa dari cookie sesi, bukan `requesterId` di body.
     *
     * Terbukti runtime sebelum perbaikan: emp004, karyawan biasa, menghapus
     * akun orang lain hanya dengan mengirim `requesterId: "<id HR>"` —
     * HTTP 200, barisnya benar-benar hilang. Ini penghapusan permanen, jadi
     * pemeriksaannya harus menyangkut orang yang benar-benar menekan tombol.
     */
    const actor = await requireHrAdmin(req, requesterId);
    if ("response" in actor) return actor.response;

    // 2. Lepaskan dulu bawahannya.
    //
    // Menghapus manajer tanpa ini meninggalkan `manager_id` yang menunjuk akun
    // yang sudah tidak ada. Bawahannya lalu menghilang dari semua sisi: tidak
    // ada manajer yang mengklaim mereka lewat relasi langsung, sementara layar
    // profil menampilkan atasan kosong. Dengan dilepas, mereka kembali
    // ditemukan lewat departemen sampai HR menetapkan atasan baru.
    const orphans = await db.execute({
      sql: "SELECT COUNT(*) AS c FROM users WHERE manager_id = ?",
      args: [targetUserId]
    });
    const released = Number((orphans.rows[0] as any)?.c) || 0;

    if (released > 0) {
      await db.execute({
        sql: "UPDATE users SET manager_id = NULL WHERE manager_id = ?",
        args: [targetUserId]
      });
    }

    // 3. Delete the user
    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [targetUserId]
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      releasedReports: released
    });
  } catch (error: any) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
