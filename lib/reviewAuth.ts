import { getRequesterAccess, canHrAdmin } from "@/lib/hrAuth";
import { resolveManagerTeam } from "@/lib/managerTeam";

export interface ReviewAuthResult {
  ok: boolean;
  status?: number;
  error?: string;
  /** Peran peninjau yang sudah diverifikasi dari DB. */
  role?: string | null;
  hrAccess?: boolean;
}

/**
 * Menentukan apakah `reviewerId` berhak memutuskan pekerjaan milik `targetUserId`.
 *
 * Dipakai bersama oleh dua jalur review yang sekarang ada — ACC per KPI
 * (`/api/kpi/review`) dan ACC hasil kerja tanpa KPI
 * (`/api/tasks/unlinked-review`). Keduanya sama-sama mencairkan poin lewat
 * `lib/taskReview.ts`, jadi keduanya wajib memakai penjaga yang sama; menyalin
 * aturannya ke masing-masing berkas adalah cara paling cepat membuat salah
 * satunya tertinggal saat aturannya berubah.
 *
 * Identitas peninjau SELALU dibaca ulang dari DB. Nilai yang dikirim klien
 * hanyalah klaim, dan endpoint-endpoint ini bisa menambah poin.
 *
 * Aturannya:
 *  - tidak ada yang boleh meninjau pekerjaannya sendiri, termasuk manajer & HR;
 *  - HR-Admin boleh lintas divisi;
 *  - manajer hanya untuk anggota timnya, atau untuk KPI yang ia tugaskan
 *    sendiri (lewat `opts.assignedBy`).
 */
export async function authorizeReview(
  reviewerId: string | null | undefined,
  targetUserId: string | null | undefined,
  opts?: { assignedBy?: string | null }
): Promise<ReviewAuthResult> {
  const reviewer = reviewerId ? String(reviewerId) : "";
  if (!reviewer) {
    return { ok: false, status: 400, error: "reviewedBy wajib diisi" };
  }

  const { role, hrAccess } = await getRequesterAccess(reviewer);
  if (!role) {
    return { ok: false, status: 403, error: "Peninjau tidak dikenal" };
  }

  const target = targetUserId ? String(targetUserId) : "";
  if (target && target === reviewer) {
    return {
      ok: false,
      status: 403,
      error: "Kamu tidak bisa meninjau pekerjaanmu sendiri",
      role,
      hrAccess,
    };
  }

  if (canHrAdmin(role, hrAccess)) return { ok: true, role, hrAccess };

  if (role === "manager") {
    if (opts?.assignedBy && String(opts.assignedBy) === reviewer) {
      return { ok: true, role, hrAccess };
    }
    if (target) {
      const { memberIds } = await resolveManagerTeam(reviewer);
      if (memberIds.includes(target)) return { ok: true, role, hrAccess };
    }
  }

  return {
    ok: false,
    status: 403,
    error: "Kamu tidak berhak meninjau pekerjaan ini",
    role,
    hrAccess,
  };
}
