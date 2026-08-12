import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequesterAccess, canHrAdmin } from "@/lib/hrAuth";
import { requireHrAdmin } from "@/lib/apiAuth";

// GET — daftar user dengan department_status = 'pending'
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Identitas dari cookie sesi; daftar permintaan divisi menyangkut
  // seluruh karyawan, jadi hanya HR-Admin yang boleh melihatnya.
  const actor = await requireHrAdmin(request);
  if ("response" in actor) return actor.response;
  const requesterId = actor.userId;

  if (!requesterId) {
    return NextResponse.json({ error: "requesterId wajib diisi" }, { status: 400 });
  }

  // Pastikan requester bisa akses HR (role hr ATAU hr_access)
  const requester = await getRequesterAccess(requesterId);
  if (!canHrAdmin(requester.role, requester.hrAccess)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const result = await db.execute({
    sql: `SELECT id, name, email, department, department_status, job_title
          FROM users
          WHERE department_status = 'pending'
          ORDER BY name ASC`,
    args: [],
  });

  return NextResponse.json({ requests: result.rows });
}

// POST — HR approve / reject / ubah divisi
export async function POST(request: Request) {
  try {
    const { requesterId, targetUserId, action, department } = await request.json();

    // Menyetujui/menolak permintaan divisi adalah wewenang HR.
    const actor = await requireHrAdmin(request, requesterId);
    if ("response" in actor) return actor.response;

    if (!requesterId || !targetUserId || !action) {
      return NextResponse.json({ error: "requesterId, targetUserId, dan action wajib diisi" }, { status: 400 });
    }

    // Pastikan requester bisa akses HR (role hr ATAU hr_access)
    const requester = await getRequesterAccess(requesterId);
    if (!canHrAdmin(requester.role, requester.hrAccess)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    if (action === "approve") {
      await db.execute({
        sql: "UPDATE users SET department_status = 'approved' WHERE id = ?",
        args: [targetUserId],
      });
    } else if (action === "reject") {
      await db.execute({
        sql: "UPDATE users SET department_status = 'rejected' WHERE id = ?",
        args: [targetUserId],
      });
    } else if (action === "change") {
      if (!department) {
        return NextResponse.json({ error: "department wajib diisi untuk action=change" }, { status: 400 });
      }
      await db.execute({
        sql: "UPDATE users SET department = ?, department_status = 'approved' WHERE id = ?",
        args: [department, targetUserId],
      });
    } else {
      return NextResponse.json({ error: "action tidak valid (approve/reject/change)" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Department request error:", error);
    return NextResponse.json({ error: "Gagal memproses permintaan" }, { status: 500 });
  }
}
