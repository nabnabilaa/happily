import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/authSession";

/**
 * Direktori orang untuk fitur sehari-hari: apresiasi, senggol, mulai chat,
 * berbagi catatan, memilih target survei.
 *
 * Dua hal yang diperbaiki di sini.
 *
 * PERTAMA, endpoint ini dulu terbuka tanpa syarat apa pun. Siapa pun yang tahu
 * alamatnya — tanpa login, tanpa cookie — bisa mengunduh seluruh daftar
 * karyawan LENGKAP DENGAN EMAIL. Itu bahan jadi untuk phishing bertarget, dan
 * tidak ada satu pun fitur yang membutuhkannya terbuka.
 *
 * KEDUA, `email` dan `team_id` dibuang dari hasilnya. Tidak ada satu pun
 * pemakai di aplikasi yang membacanya (sudah dicek satu per satu: Appreciate,
 * Senggol, NewChat, Notes, ManageSurveys), jadi mengirimkannya hanya menambah
 * yang bisa bocor tanpa menambah yang bisa dikerjakan.
 *
 * Identitas pemanggil diterima dari cookie sesi ATAU `?requesterId=`. Cookie
 * saja belum cukup: sebagian klien lama menyimpan identitasnya di localStorage
 * dan belum tentu memegang cookie, dan menolak mereka berarti memutus fitur
 * yang selama ini jalan. Yang penting pemanggilnya adalah akun yang benar-benar
 * ada, bukan orang lewat.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const claimed = searchParams.get("requesterId");
    const callerId = getAuthUserId(request) || claimed;

    if (!callerId) {
      return NextResponse.json({ error: "Butuh login" }, { status: 401 });
    }

    const caller = await db.execute({
      sql: "SELECT id FROM users WHERE id = ? LIMIT 1",
      args: [String(callerId)],
    });
    if (caller.rows.length === 0) {
      return NextResponse.json({ error: "Butuh login" }, { status: 401 });
    }

    const res = await db.execute(
      "SELECT id, name, role, job_title, department, avatar_image FROM users ORDER BY name"
    );
    return NextResponse.json({ users: res.rows });
  } catch (error: any) {
    console.error("Users API Error:", error);
    return NextResponse.json({ error: "Gagal memuat users", details: error.message }, { status: 500 });
  }
}
