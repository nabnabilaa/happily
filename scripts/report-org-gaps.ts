/**
 * Laporan lubang struktur organisasi — siapa yang tidak dimiliki manajer mana
 * pun, dan manajer mana yang "memimpin" orang yang bukan timnya.
 *
 * Hanya membaca. Tidak ada yang diubah: struktur organisasi adalah keputusan
 * HR, bukan sesuatu yang pantas ditebak skrip. Perbaikannya lewat layar
 * People → Edit → Atasan Langsung.
 *
 *   npx tsx scripts/report-org-gaps.ts
 */
import { db } from "../lib/db";
import { resolveManagerTeam } from "../lib/managerTeam";

function line(char = "─", n = 64) {
  return char.repeat(n);
}

async function main() {
  const usersRes = await db.execute(
    "SELECT id, name, role, department, manager_id FROM users ORDER BY role, name"
  );
  const users = usersRes.rows as any[];
  const byId = new Map(users.map((u) => [String(u.id), u]));

  const leaders = users.filter((u) => u.role === "manager" || u.role === "hr");
  const employees = users.filter((u) => u.role === "employee");

  // ── 1. Cakupan tiap pemimpin ────────────────────────────────────────────
  console.log(line("═"));
  console.log("CAKUPAN TIAP MANAJER / HR");
  console.log(line("═"));

  const covered = new Set<string>();
  for (const m of leaders) {
    const team = await resolveManagerTeam(String(m.id));
    const direct = users.filter((u) => String(u.manager_id) === String(m.id)).length;
    const source = direct > 0 ? "manager_id" : "tebakan departemen";
    team.memberIds.forEach((id) => covered.add(id));
    console.log(
      `${String(m.name).padEnd(24)} ${String(m.department || "tanpa dept").padEnd(18)} ` +
        `${String(team.memberIds.length).padStart(3)} anggota  (${source})`
    );
  }

  // ── 2. Karyawan yang tidak terjangkau siapa pun ─────────────────────────
  const unreachable = employees.filter((u) => !covered.has(String(u.id)));
  console.log(`\n${line("═")}`);
  console.log(`KARYAWAN TANPA MANAJER: ${unreachable.length} dari ${employees.length}`);
  console.log(line("═"));
  for (const u of unreachable) {
    console.log(`  ${String(u.name).padEnd(30)} dept=${u.department || "-"}`);
  }

  // ── 2b. Divisi yang punya anggota tapi belum punya manajer ──────────────
  //
  // Sejak divisi jadi dasar penentuan tim, sebuah divisi tanpa manajer berarti
  // pekerjaan seluruh anggotanya tidak punya penilai. Ini biasanya yang tersisa
  // setelah tautan atasan bawaan data contoh dibersihkan.
  const deptCounts = new Map<string, number>();
  const deptHasLeader = new Set<string>();
  for (const u of users) {
    const d = (u.department || "").trim();
    if (!d) continue;
    if (u.role === "manager" || u.role === "hr") deptHasLeader.add(d);
    else deptCounts.set(d, (deptCounts.get(d) || 0) + 1);
  }
  const leaderless = [...deptCounts.entries()].filter(([d]) => !deptHasLeader.has(d));

  console.log(`\n${line("═")}`);
  console.log(`DIVISI TANPA MANAJER: ${leaderless.length}`);
  console.log(line("═"));
  for (const [d, n] of leaderless) {
    console.log(`  ${d.padEnd(24)} ${n} orang tanpa penilai`);
  }
  if (leaderless.length > 0) {
    console.log(`  → angkat satu manajer per divisi, atau pindahkan orangnya ke divisi lain`);
  }

  // ── 3. manager_id yang menunjuk akun tidak ada / bukan pemimpin ─────────
  const dangling = users.filter((u) => {
    if (!u.manager_id) return false;
    const mgr = byId.get(String(u.manager_id));
    return !mgr || (mgr.role !== "manager" && mgr.role !== "hr");
  });
  console.log(`\n${line("═")}`);
  console.log(`TAUTAN ATASAN YANG RUSAK: ${dangling.length}`);
  console.log(line("═"));
  for (const u of dangling) {
    const mgr = byId.get(String(u.manager_id));
    console.log(
      `  ${String(u.name).padEnd(30)} → ${u.manager_id} ` +
        `(${mgr ? `peran ${mgr.role}` : "akun tidak ada"})`
    );
  }

  // ── 4. Pekerjaan yang menggantung karena tidak ada penilai ──────────────
  if (unreachable.length > 0) {
    const ph = unreachable.map(() => "?").join(",");
    const stuck = await db.execute({
      sql: `SELECT COUNT(*) AS c FROM daily_priorities dp
             WHERE dp.user_id IN (${ph})
               AND dp.is_done = 1 AND dp.is_verified = 0
               AND (dp.status IS NULL OR dp.status NOT IN ('approved','rejected','reject','revision','verified'))`,
      args: unreachable.map((u) => String(u.id)),
    });
    console.log(
      `\nTask selesai yang tidak masuk antrean ACC siapa pun: ${(stuck.rows[0] as any)?.c ?? 0}`
    );
  }

  // ── 5. KPI yang menunjuk akun yang sudah tidak ada ──────────────────────
  //
  // Terjadi karena penghapusan user tidak pernah membersihkan apa pun yang
  // menempel padanya. Barisnya tetap terhitung di layar review KPI HR, tanpa
  // nama pemilik, dan tidak akan pernah bisa diselesaikan siapa pun.
  const orphanKpis = await db.execute(`
    SELECT k.assigned_to, k.scope, COUNT(*) AS c
      FROM monthly_kpis k
      LEFT JOIN users u ON k.assigned_to = u.id
     WHERE k.scope <> 'team' AND u.id IS NULL AND k.status <> 'archived'
     GROUP BY k.assigned_to, k.scope
     ORDER BY c DESC`);
  const orphanTotal = (orphanKpis.rows as any[]).reduce((n, r) => n + Number(r.c), 0);

  console.log(`\n${line("═")}`);
  console.log(`KPI MILIK AKUN YANG SUDAH TIDAK ADA (belum diarsipkan): ${orphanTotal}`);
  console.log(line("═"));
  for (const r of (orphanKpis.rows as any[]).slice(0, 15)) {
    console.log(`  assigned_to=${String(r.assigned_to).padEnd(16)} ${r.c} KPI`);
  }
  if (orphanKpis.rows.length > 15) {
    console.log(`  … dan ${orphanKpis.rows.length - 15} id lain`);
  }

  // ── 6. KPI tim yang sasarannya tidak menunjuk tim mana pun ──────────────
  //
  // KPI ber-scope tim menyimpan sasarannya di `assigned_to`: nama departemen
  // (baru) atau id tim lama (masih dikenali demi kompatibilitas). Baris yang
  // tidak cocok dengan keduanya tidak akan pernah muncul di layar siapa pun.
  const teamKpis = await db.execute(`
    SELECT k.id, k.title, k.assigned_to, k.month, k.year,
           (SELECT COUNT(*) FROM users u
             WHERE u.department = k.assigned_to OR u.team_id = k.assigned_to) AS reach
      FROM monthly_kpis k
     WHERE k.scope = 'team'`);
  const unreachableTeamKpis = (teamKpis.rows as any[]).filter((k) => Number(k.reach) === 0);

  console.log(`\n${line("═")}`);
  console.log(`KPI TIM TANPA SASARAN YANG SAH: ${unreachableTeamKpis.length} dari ${teamKpis.rows.length}`);
  console.log(line("═"));
  for (const k of unreachableTeamKpis) {
    console.log(`  ${k.id}  "${String(k.title).slice(0, 40)}"  → '${k.assigned_to}' (${k.month}/${k.year})`);
  }

  console.log(`\nPerbaiki lewat: People → pilih orang → Edit → ATASAN LANGSUNG`);
  if (orphanTotal > 0) {
    console.log(`Arsipkan dengan: npx tsx scripts/repair-org-data.ts --apply`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
