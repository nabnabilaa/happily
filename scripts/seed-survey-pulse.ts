/**
 * Mengganti survey uji coba dengan satu survey perusahaan yang layak tampil.
 *
 * Sebelum ini isi tabel `surveys` cuma satu baris: judul "test", satu pertanyaan
 * berbunyi "test", aktif untuk SELURUH perusahaan. Baris itu tampil di halaman
 * depan setiap karyawan lewat `components/home/SurveySection.tsx` — kartu
 * pertama yang dilihat orang saat aplikasi didemokan.
 *
 * Yang ditanam di sini adalah kerangka Pulse Survey bulanan: pertanyaannya nyata
 * dan bisa dijawab apa adanya, tapi seluruh isinya memang untuk disunting HR
 * lewat konsol Kelola Survey. Anggap ini titik awal yang masuk akal, bukan
 * naskah final.
 *
 * Jalankan:  npx tsx scripts/seed-survey-pulse.ts
 * Pratinjau: npx tsx scripts/seed-survey-pulse.ts --dry-run
 */

import { db } from "@/lib/db";

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Judul survey uji yang boleh dihapus.
 *
 * Sengaja daftar putih yang sempit, bukan pola seperti `LIKE '%test%'`: survey
 * asli HR suatu hari bisa saja berjudul "Tes Kesiapan Sistem Baru", dan skrip
 * pembersih tidak boleh punya kewenangan menebak.
 */
const JUNK_TITLES = ["test", "tes", "coba", "testing", "asdf", "dummy"];

/** Bentuk baris `surveys` yang benar-benar dibaca skrip ini. */
interface SurveyRow {
  id: number;
  title: string | null;
  status?: string | null;
  response_count?: number | null;
}

interface Question {
  id: string;
  question: string;
  type: "text" | "paragraph" | "rating" | "yes_no" | "multiple_choice";
  required: boolean;
  options?: string[];
  maxRating?: number;
}

/**
 * Pertanyaannya disusun mengerucut: angka yang bisa dibandingkan antar bulan
 * lebih dulu, baru alasan di baliknya, dan ditutup satu kolom bebas.
 *
 * Semua rating memakai arah yang sama — 5 selalu berarti "baik". Survei yang
 * membalik arah di tengah daftar menghasilkan data yang terlihat wajar tapi
 * salah baca, karena responden menjawab dengan pola, bukan dengan membaca ulang.
 *
 * Hanya tiga pertanyaan yang wajib. Survei bulanan yang mewajibkan sepuluh
 * jawaban akan diisi asal-asalan pada bulan kedua.
 */
const QUESTIONS: Question[] = [
  {
    id: "q_beban_kerja",
    question: "Sebulan terakhir, seberapa terkendali beban kerjamu?",
    type: "rating",
    required: true,
    maxRating: 5,
  },
  {
    id: "q_kejelasan",
    question: "Seberapa jelas kamu tahu apa yang diharapkan darimu bulan ini?",
    type: "rating",
    required: true,
    maxRating: 5,
  },
  {
    id: "q_dukungan_atasan",
    question: "Seberapa terbantu kamu oleh atasan langsungmu?",
    type: "rating",
    required: true,
    maxRating: 5,
  },
  {
    id: "q_alat_kerja",
    question: "Apa yang paling sering memperlambat pekerjaanmu?",
    type: "multiple_choice",
    required: false,
    options: [
      "Menunggu keputusan atau persetujuan",
      "Rapat yang terlalu banyak",
      "Informasi sulit dicari",
      "Alat atau akses yang kurang",
      "Beban kerja melebihi kapasitas",
      "Tidak ada — lancar saja",
    ],
  },
  {
    id: "q_istirahat",
    question: "Bulan ini kamu masih sempat istirahat cukup di hari kerja?",
    type: "yes_no",
    required: false,
  },
  {
    id: "q_apresiasi",
    question: "Ada rekan kerja yang menurutmu pantas diapresiasi bulan ini?",
    type: "text",
    required: false,
  },
  {
    id: "q_masukan",
    question: "Satu hal yang ingin kamu ubah dari cara kita bekerja?",
    type: "paragraph",
    required: false,
  },
];

const TITLE = "Pulse Check Bulanan";
const DESCRIPTION =
  "Tujuh pertanyaan singkat, sekitar tiga menit. Jawabanmu dibaca HR untuk " +
  "memperbaiki cara kerja tim — bukan untuk menilai kinerja perorangan.";

/** Tenggat 14 hari: cukup lama untuk yang sedang cuti, cukup pendek untuk tidak terlupakan. */
function deadlineIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(23, 59, 0, 0);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

async function main() {
  if (DRY_RUN) console.log("— MODE PRATINJAU: tidak ada yang ditulis —\n");

  const existing = await db.executeUnmasked({
    sql: "SELECT id, title, response_count FROM surveys",
  });

  const rows = existing.rows as SurveyRow[];
  const junk = rows.filter((s) =>
    JUNK_TITLES.includes(String(s.title ?? "").trim().toLowerCase()),
  );

  console.log(`Survey saat ini: ${rows.length}`);
  for (const s of rows) {
    const mark = junk.some((j) => j.id === s.id) ? "  ← akan dihapus" : "";
    console.log(`  #${s.id} "${s.title}" (${s.response_count ?? 0} respons)${mark}`);
  }

  if (!junk.length) {
    console.log("\nTidak ada survey uji yang cocok dengan daftar putih. Tidak ada yang dihapus.");
  }

  // Sudah pernah ditanam? Jangan buat duplikat.
  const already = rows.some(
    (s) => String(s.title ?? "").trim().toLowerCase() === TITLE.toLowerCase(),
  );
  if (already) {
    console.log(`\n"${TITLE}" sudah ada. Tidak ada yang ditanam ulang.`);
    if (!junk.length) return;
  }

  // Pemilik survey: akun HR yang benar-benar ada. Tanpa ini `created_by`
  // menunjuk id yang tidak pernah bisa dibuka konsol HR-nya.
  //
  // Urutannya penting. `ORDER BY id` saja memilih `mock_hr_1` — akun tiruan —
  // sehingga survey perusahaan tercatat dibuat oleh "Mock HR", nama yang muncul
  // di layar hasil survey. Akun HR sungguhan didahulukan.
  const hr = await db.executeUnmasked({
    sql: `SELECT id FROM users
          WHERE role = 'hr'
          ORDER BY (id = 'user_hr') DESC,
                   (id LIKE 'mock%' OR email LIKE '%@mock.%') ASC,
                   id
          LIMIT 1`,
  });
  const createdBy = (hr.rows[0] as { id?: string } | undefined)?.id ?? "user_hr";

  if (DRY_RUN) {
    console.log(`\nAkan dibuat: "${TITLE}" oleh ${createdBy}, ${QUESTIONS.length} pertanyaan, target seluruh perusahaan.`);
    console.log(`Tenggat: ${deadlineIso()}`);
    for (const q of QUESTIONS) {
      console.log(`  [${q.type}${q.required ? ", wajib" : ""}] ${q.question}`);
    }
    return;
  }

  await db.transaction(async (conn) => {
    for (const s of junk) {
      // Responsnya ikut dibuang: jawaban atas pertanyaan berbunyi "test" tidak
      // punya arti apa pun, dan meninggalkannya membuat baris yatim di
      // survey_responses yang mengacu ke survey yang sudah tidak ada.
      await conn.execute("DELETE FROM survey_responses WHERE survey_id = ?", [s.id]);
      await conn.execute("DELETE FROM surveys WHERE id = ?", [s.id]);
      console.log(`\nDihapus: #${s.id} "${s.title}"`);
    }

    if (already) return;

    await conn.execute(
      `INSERT INTO surveys
         (title, url, status, published_at, description, deadline,
          target_audience, target_departments, questions, created_by, response_count)
       VALUES (?, '', 'active', NOW(), ?, ?, 'company', NULL, ?, ?, 0)`,
      [TITLE, DESCRIPTION, deadlineIso(), JSON.stringify(QUESTIONS), createdBy],
    );
    console.log(`\nDitanam: "${TITLE}" — ${QUESTIONS.length} pertanyaan, seluruh perusahaan, oleh ${createdBy}.`);
  });

  const after = await db.executeUnmasked({ sql: "SELECT id, title, status FROM surveys" });
  console.log(`\nSurvey sekarang: ${after.rows.length}`);
  for (const s of after.rows as SurveyRow[]) console.log(`  #${s.id} "${s.title}" (${s.status})`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Gagal:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
