import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/authSession";
import { normalizeHabitName } from "@/lib/habits";

/**
 * Menghapus sebuah habit.
 *
 * Inilah "jalur penghapusan tersendiri" yang diminta catatan di
 * `app/api/storage/route.ts`. Sinkronisasi blob sengaja MEMBIARKAN baris habit
 * yang tidak ada di payload — karena GET membuang habit bernama kosong dan yang
 * namanya bentrok, sehingga payload klien memang bukan daftar lengkap dan
 * menghapus selisihnya berarti menghapus baris yang klien tak pernah lihat.
 *
 * Konsekuensinya, selama jalur ini belum ada, tombol hapus di ManageHabitsModal
 * hanya membuang habit dari state React: baris di database tetap hidup dan
 * habit-nya muncul lagi pada GET berikutnya. Bug itu tidak terlihat sampai
 * halaman dimuat ulang, sering kali di sesi lain.
 *
 * Kelulusan punya route-nya sendiri (`/api/habits/graduate`) karena ia juga
 * membayar poin dan harus memverifikasi targetnya lebih dulu. Yang ini murni
 * penghapusan: menyerah di tengah jalan tidak berpoin, dan tidak dihukum.
 */
export async function DELETE(request: Request) {
  try {
    // Pemilik diambil dari cookie sesi, tidak pernah dari body — kalau tidak,
    // siapa pun bisa menghapus habit milik orang lain dari console browser.
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Sesi kamu sudah tidak berlaku. Silakan login ulang.", needsReauth: true },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const wanted = normalizeHabitName(body?.name);
    if (!wanted) {
      return NextResponse.json({ error: "Nama kebiasaan wajib diisi" }, { status: 400 });
    }

    const res = await db.execute({
      sql: "SELECT id, name FROM habits WHERE user_id = ?",
      args: [userId],
    });
    const row = (res.rows as any[]).find((r) => normalizeHabitName(r.name) === wanted);

    // Tidak ditemukan bukan kegagalan. Habit yang dibuat lalu dihapus sebelum
    // sinkronisasi sempat menuliskannya memang tidak pernah punya baris, dan
    // klien tetap harus boleh membuangnya dari layar.
    if (!row) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    await db.execute({
      sql: "DELETE FROM habits WHERE id = ? AND user_id = ?",
      args: [row.id, userId],
    });

    return NextResponse.json({ success: true, deleted: 1, name: row.name });
  } catch (error) {
    console.error("[habits] Gagal menghapus kebiasaan:", error);
    return NextResponse.json({ error: "Gagal menghapus kebiasaan" }, { status: 500 });
  }
}
