import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequesterAccess, canHrAdmin } from "@/lib/hrAuth";
import { validateManagerAssignment } from "@/lib/managerTeam";
import { requireHrAdmin } from "@/lib/apiAuth";

export async function POST(request: Request) {
  try {
    const { requesterId, targetUserId, newRole, jobTitle, department, name, hrAccess, managerId } = await request.json();

    if (!requesterId || !targetUserId) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    /*
     * Peran ditulis apa adanya ke `users.role`, dan tidak ada satu pun layar
     * yang punya cabang untuk peran di luar tiga ini. Artinya satu salah ketik
     * (`manger`) menghilangkan seluruh antarmuka milik orang itu — akunnya
     * masih bisa login, tapi tidak ada yang bisa dilihat maupun dikerjakan.
     * Diuji: `newRole: "dewa_tertinggi"` sebelumnya tersimpan dengan HTTP 200.
     */
    const VALID_ROLES = ['employee', 'manager', 'hr'];
    if (newRole !== undefined && newRole !== null && !VALID_ROLES.includes(String(newRole))) {
      return NextResponse.json(
        { error: `Peran tidak dikenal: ${newRole}. Gunakan ${VALID_ROLES.join(', ')}.` },
        { status: 400 }
      );
    }

    /*
     * Yang diperiksa adalah pemilik cookie, bukan `requesterId` dari body.
     *
     * Pemeriksaan lama memanggil `getRequesterAccess(requesterId)` — peran
     * ORANG YANG DISEBUT di body. Logikanya benar, orangnya salah: karyawan
     * biasa cukup mengirim `requesterId: "<id HR>"` untuk mengangkat dirinya
     * sendiri jadi HR. Terbukti runtime: emp003 berubah dari
     * `role=employee, hr_access=0` menjadi `role=hr, hr_access=1` dengan
     * HTTP 200.
     */
    const actor = await requireHrAdmin(request, requesterId);
    if ("response" in actor) return actor.response;

    // Atasan langsung diperiksa SEBELUM apa pun ditulis.
    //
    // Route ini menulis kolomnya satu per satu tanpa transaksi, jadi kalau
    // pemeriksaan dilakukan belakangan, satu simpanan yang gagal di tengah
    // menyisakan peran sudah berubah tapi atasannya belum — persis kondisi
    // setengah jadi yang paling sulit ditelusuri. Lihat
    // `validateManagerAssignment` untuk aturannya (bukan diri sendiri, harus
    // manager/HR, tidak boleh melingkar).
    const mgrCheck = await validateManagerAssignment(String(targetUserId), managerId);
    if (!mgrCheck.ok) {
      return NextResponse.json({ error: mgrCheck.error }, { status: 400 });
    }

    // Update fields
    if (name !== undefined) {
      await db.execute({
        sql: "UPDATE users SET name = ? WHERE id = ?",
        args: [name, targetUserId]
      });
    }

    if (newRole) {
      await db.execute({
        sql: "UPDATE users SET role = ?, user_role_context = ? WHERE id = ?",
        args: [newRole, newRole, targetUserId]
      });
    }

    // Akses HR-Admin tambahan (untuk employee/manager yang bisa switch ke konsol HR)
    if (hrAccess !== undefined) {
      await db.execute({
        sql: "UPDATE users SET hr_access = ? WHERE id = ?",
        args: [hrAccess ? 1 : 0, targetUserId]
      });
    }



    if (jobTitle !== undefined) {
      await db.execute({
        sql: "UPDATE users SET job_title = ? WHERE id = ?",
        args: [jobTitle, targetUserId]
      });
    }

    if (department !== undefined) {
      await db.execute({
        sql: "UPDATE users SET department = ? WHERE id = ?",
        args: [department, targetUserId]
      });
    }

    // Atasan langsung. Ini satu-satunya jalur di aplikasi yang menetapkannya;
    // sebelum ini `manager_id` hanya pernah diisi sekali oleh backfill data
    // contoh, sehingga siapa memimpin siapa tidak pernah benar-benar bisa diatur.
    if (!mgrCheck.untouched) {
      await db.execute({
        sql: "UPDATE users SET manager_id = ? WHERE id = ?",
        args: [mgrCheck.value, targetUserId]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update User Error:", error);
    return NextResponse.json({ error: "Gagal update data user" }, { status: 500 });
  }
}
