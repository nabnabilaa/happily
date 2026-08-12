import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/authSession";
import { isReviewModeOwner } from "@/lib/ownerAccess";
import {
  REVIEW_MODE_TABLE_DDL,
  invalidateReviewModeCache,
  reviewModeLockedByEnv,
} from "@/lib/anonymize";

/**
 * Saklar mode review (penyamaran identitas). Alat vendor, bukan fitur produk —
 * karena itu ia tidak berada di bawah `/api/hr`: HR di perusahaan pelanggan
 * tidak berkepentingan menyamarkan karyawannya sendiri, dan tidak boleh bisa.
 *
 * Dua hal yang membedakan route ini dari route HR lain:
 *
 *  • Identitas diambil dari cookie sesi, bukan dari `requesterId` di body.
 *    Route HR lain menerima id dari klien lalu memverifikasi perannya ke
 *    database; itu cukup untuk perbedaan wewenang di dalam satu perusahaan.
 *    Di sini yang dipertaruhkan berbeda — siapa pun yang bisa menyebut sebuah id
 *    bisa mencoba menjadi pemilik aplikasi. Cookie tidak bisa dikarang.
 *
 *  • Yang bukan pemilik menerima 404, bukan 403. 403 berarti "ada sesuatu di
 *    sini dan kamu tidak boleh"; 404 tidak memberi tahu apa pun. Alat ini tidak
 *    perlu mengumumkan keberadaannya kepada pelanggan.
 *
 * Statusnya disimpan di tabel `app_settings`, bukan di `process.env`: di hosting
 * serverless satu deploy berjalan sebagai banyak instance, jadi mengubah env
 * dari dalam route hanya mengenai instance yang kebetulan melayani permintaan
 * itu. Sebagian instance tersamar dan sebagian tidak adalah bentuk kebocoran
 * yang paling sulit disadari, karena layar orang yang menekan tombolnya justru
 * terlihat benar.
 */

const SETTING_KEY = "anonymize_data";

/** Balasan tunggal untuk siapa pun yang bukan pemilik. Sengaja tidak
 *  membedakan "belum login", "bukan pemilik", dan "daftar pemilik kosong" —
 *  ketiganya sama-sama tidak berhak tahu. */
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

async function ownerId(request: Request): Promise<string | null> {
  const userId = getAuthUserId(request);
  return isReviewModeOwner(userId) ? String(userId) : null;
}

async function readSetting(): Promise<{ enabled: boolean; updatedAt: string | null }> {
  try {
    const res = await db.execute({
      sql: "SELECT setting_value, updated_at FROM app_settings WHERE setting_key = ?",
      args: [SETTING_KEY],
    });
    const row = res.rows[0];
    if (!row) return { enabled: false, updatedAt: null };
    return {
      enabled: String(row.setting_value ?? "") === "1",
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  } catch (error) {
    // Tabelnya dibuat saat tombol pertama kali ditekan, jadi "belum ada" adalah
    // keadaan normal sebelum pemakaian pertama — bukan kegagalan.
    if ((error as { code?: string })?.code === "ER_NO_SUCH_TABLE") {
      return { enabled: false, updatedAt: null };
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    if (!(await ownerId(request))) return notFound();

    const lockedByEnv = reviewModeLockedByEnv();
    const stored = await readSetting();

    return NextResponse.json({
      // Yang benar-benar berlaku sekarang. Env menang atas nilai tersimpan.
      enabled: lockedByEnv || stored.enabled,
      lockedByEnv,
      updatedAt: stored.updatedAt,
    });
  } catch (error) {
    console.error("Review Mode Read Error:", error);
    return NextResponse.json({ error: "Gagal membaca status mode review" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await ownerId(request);
    if (!actor) return notFound();

    const { enabled } = await request.json();

    // Env dipasang lewat dashboard hosting, di luar jangkauan siapa pun yang
    // sedang memakai aplikasi. Lapisan kedua di atas daftar pemilik: kalau
    // perangkat pemilik sendiri yang sedang dipegang orang lain saat sesi
    // berlangsung, saklarnya tetap tidak bisa dimatikan dari dalam aplikasi.
    if (reviewModeLockedByEnv()) {
      return NextResponse.json(
        {
          error:
            "Mode review sedang dikunci lewat environment (ANONYMIZE_DATA). " +
            "Hapus variabel itu di dashboard hosting untuk bisa mematikannya dari sini.",
          lockedByEnv: true,
          enabled: true,
        },
        { status: 409 },
      );
    }

    await db.execute({ sql: REVIEW_MODE_TABLE_DDL, args: [] });
    await db.execute({
      sql: `INSERT INTO app_settings (setting_key, setting_value, updated_by)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
      args: [SETTING_KEY, enabled ? "1" : "0", actor],
    });

    // Instance ini melihat perubahannya seketika; instance lain menyusul dalam
    // hitungan detik saat cache statusnya kedaluwarsa.
    invalidateReviewModeCache();

    // Mematikan penyamaran adalah keputusan yang perlu berjejak: sesudahnya,
    // nama dan email karyawan asli kembali tersaji ke siapa pun yang sedang
    // memegang layar.
    console.warn(
      `[anonymize] Mode review ${enabled ? "DINYALAKAN" : "DIMATIKAN"} oleh pemilik ${actor}`,
    );

    const stored = await readSetting();
    return NextResponse.json({
      success: true,
      enabled: stored.enabled,
      lockedByEnv: false,
      updatedAt: stored.updatedAt,
    });
  } catch (error) {
    console.error("Review Mode Write Error:", error);
    return NextResponse.json({ error: "Gagal mengubah mode review" }, { status: 500 });
  }
}
