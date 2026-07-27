# Implementation Plan — Sprint Features Bee Flow

Empat item perubahan berikut ditangani bersamaan dalam sprint ini. Setiap item telah diinvestigasi langsung dari kode aktif.

---

## ⚠️ Catatan Penting

> **Item 4 (Bug investigasi)** memerlukan konfirmasi tambahan sebelum bisa diperbaiki. Baca bagian Open Questions di bawah.

> **Item 3 (Role C-level)** menambah nilai baru ke ENUM `role` di tabel `users` (database schema change). Ini adalah **breaking migration** — perlu dijalankan script SQL secara manual di database.

---

## Open Questions

**Bug employee input tidak muncul di dashboard leader (Item 4)**:
Investigasi awal menemukan bahwa `ReviewTaskWidget` mengambil data via `/api/manager/tasks/pending`, yang melakukan query berdasarkan kolom `department`. Pertanyaan:
1. Task employee yang "tidak muncul" itu sudah pernah muncul sebelumnya, atau memang belum pernah?
2. Apakah employee tersebut sudah mengisi `department` saat onboarding?
3. Apakah status task employee sudah di-submit ke `pending_review`?

Jawaban ini akan menentukan apakah bug-nya di query SQL, di field nama kolom, atau di logic submit task employee.

---

## Proposed Changes

---

### Item 1: KPI — Pemisahan Hak Kelola (HR vs Manager)

**Kondisi saat ini**: `ManageKPIModal` dan `/api/kpi` sudah ada, tapi tidak membedakan secara eksplisit siapa yang boleh membuat/mengelola KPI untuk siapa. HR dan Manager sama-sama bisa membuat KPI ke siapa saja tanpa pembatasan.

**Target**: HR mengelola KPI untuk Manager. Manager mengelola KPI untuk Employee (bawahan di divisinya). Employee hanya read-only.

---

#### [MODIFY] `app/api/kpi/route.ts`

- **POST**: Tambahkan validasi `kpi_scope_type` — jika `assignedBy` adalah HR, `assignedTo` hanya boleh user dengan role `manager`. Jika `assignedBy` adalah Manager, `assignedTo` harus berada di divisi yang sama.
- **GET**: Perbaiki query untuk HR agar menampilkan KPI yang HR assign ke Manager. Query saat ini ada subquery yang mencari `team_id` yang mungkin tidak ada kolomnya.

#### [MODIFY] `components/modals/ManageKPIModal.tsx`

- Saat `user.role === 'hr'`: dropdown `assignTo` hanya menampilkan user dengan `role === 'manager'`.
- Saat `user.role === 'manager'`: dropdown `assignTo` hanya menampilkan user di divisi yang sama dengan role `employee`.
- Saat `user.role === 'employee'`: sembunyikan tombol "Buat KPI baru" / form create KPI. Tampilkan mode read-only.
- Tambahkan label/badge di header modal untuk menegaskan konteks: _"KPI untuk Manager"_ (jika HR) atau _"KPI untuk Tim"_ (jika Manager).

---

### Item 2: Reward — Alur Pencatatan Tukar Reward

**Kondisi saat ini**: `/api/rewards/redeem` hanya melakukan transaksi (potong koin, log XP, kirim notifikasi ke HR). Tidak ada tabel rekam jejak/riwayat penukaran reward yang bisa ditampilkan ke HR untuk tracking status fulfilment.

**Target**: Tambah tabel `reward_redemptions` untuk mencatat setiap penukaran. HR bisa melihat daftar klaim dan mengubah statusnya (Pending → In Progress → Fulfilled / Rejected).

---

#### [NEW] Migration SQL — Tabel `reward_redemptions`

```sql
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    reward_id VARCHAR(255) NOT NULL,
    reward_title VARCHAR(255) NOT NULL,
    reward_points INT NOT NULL,
    status ENUM('pending', 'in_progress', 'fulfilled', 'rejected') DEFAULT 'pending',
    hr_notes TEXT,
    fulfilled_by VARCHAR(255),
    fulfilled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### [MODIFY] `app/api/rewards/redeem/route.ts`

- Setelah potong koin dan log XP, tambah INSERT ke `reward_redemptions` dengan `status = 'pending'`.

#### [NEW] `app/api/rewards/redemptions/route.ts`

- `GET`: Mengambil daftar semua redemptions (untuk HR dashboard). Support filter by `status`.
- `PUT`: HR mengupdate status redemption (`in_progress`, `fulfilled`, `rejected`) + opsional `hr_notes`.

#### [NEW] `RewardRedemptionDashboard` component (di dalam `HRHomeScreen` atau modal baru)

- Tabel daftar klaim reward dengan kolom: Nama Karyawan, Reward, Poin, Status, Tanggal.
- Tombol aksi per baris: "Proses", "Selesai", "Tolak".
- Badge counter di header HR jika ada pending redemptions.

#### [MODIFY] `PRD.md` — Tambah Section Reward Redemption Flow

- Dokumentasikan alur baru: Submit → Pending → In Progress → Fulfilled/Rejected.

---

### Item 3: Role C-Level — Akun Baru dengan Akses KPI Global

**Kondisi saat ini**: Tipe role di `UserRole` hanya `'hr' | 'manager' | 'employee'`. Tidak ada role yang bisa membuat KPI lintas-divisi sekaligus lintas-role.

**Target**: Tambah role `c_level` yang menjadi **satu-satunya role yang bisa membuat dan mengatur KPI** ke HR maupun Manager. HR tetap bisa mengelola KPI ke Manager, tapi C-Level bisa ke semua pihak.

---

> **⚠️ Breaking Change — Diperlukan ALTER TABLE pada database:**
> ```sql
> ALTER TABLE users MODIFY COLUMN role ENUM('hr', 'manager', 'employee', 'c_level') NOT NULL DEFAULT 'employee';
> ```

#### [MODIFY] `lib/HPContext.tsx`

- Tambah `'c_level'` ke type `UserRole`.
- Update interface `HPUser` untuk mendukung role baru.

#### [MODIFY] `app/page.tsx`

- Tambah `c_level` ke `ROLE_META` (label, color, glyph).
- Di `renderScreen()`: tambah blok `if (currentRole === 'c_level')` yang mengarahkan ke tampilan khusus (bisa share layout dengan HR namun dengan akses KPI penuh).

#### [NEW] `components/home/CLevelHomeScreen.tsx`

- Dashboard eksekutif: ringkasan KPI semua divisi, progress KPI per Manager, distribusi target.
- Akses penuh ke `ManageKPIModal` dengan dropdown `assignTo` mencakup semua user (HR, Manager, Employee).

#### [MODIFY] `components/modals/ManageKPIModal.tsx`

- Tambahkan kondisi `user.role === 'c_level'`: tampilkan semua user di dropdown tanpa filter.
- Label konteks: _"KPI Global — C-Level"_.

#### [MODIFY] `app/api/kpi/route.ts`

- POST: Jika `assignedBy` adalah `c_level`, izinkan assign ke role manapun tanpa validasi divisi.
- GET: C-Level bisa melihat semua KPI tanpa filter divisi.

#### [MODIFY] `components/modals/CreateUserModal.tsx`

- Tambah opsi `c_level` di dropdown role (hanya tampil jika creator adalah HR atau `c_level`).

#### [MODIFY] `PRD.md` — Section 2: RBAC

- Tambah baris `c_level` ke matriks akses.
- Update diagram Mermaid untuk menyertakan hierarki C-Level di atas HR dan Manager.

---

### Item 4: Bug — Input Employee Tidak Muncul di Dashboard Leader

**Kondisi saat ini** (temuan investigasi):

`ReviewTaskWidget` memanggil `/api/manager/tasks/pending?userId={managerId}`. API tersebut melakukan:
1. Query `department` dari tabel `users` untuk manager.
2. Cari semua user lain di `department` yang sama.
3. Cari task dengan `status = 'pending_review'` dari user-user tersebut.

**Potensi penyebab bug** (3 kandidat, perlu dikonfirmasi):

| # | Penyebab Kandidat | Cara Verifikasi |
|---|---|---|
| A | Kolom `department` employee `NULL` atau tidak match dengan department manager | Cek DB: `SELECT id, name, department FROM users` |
| B | Task employee tidak pernah mencapai status `pending_review` — stuck di `todo`/`in_progress` | Cek DB: `SELECT status FROM daily_priorities WHERE user_id = '{employee_id}'` |
| C | Employee belum mengisi task melalui flow yang benar (bukan via `ManagePrioritiesModal` melainkan flow lain) | Cek apakah ada dua tabel task berbeda |

---

#### [MODIFY] `app/api/manager/tasks/pending/route.ts` *(setelah konfirmasi penyebab)*

- **Fix A**: Fallback ke `division_id` jika `department` NULL, atau normalize nama kolom menjadi konsisten.
- **Fix B**: Pastikan API submit task employee mengubah status ke `pending_review` saat "Submit for Review".
- **Fix C**: Jika ada dua jalur submit task (tabel berbeda), unifikasi query agar membaca dari semua sumber task.

#### [NEW] `app/api/dev/task-debug/route.ts` *(temporary, dev-only)*

- Endpoint diagnostik untuk dump data task + department linkage tanpa filter. **Dihapus setelah bug confirmed fixed.**

---

## Verification Plan

### Automated Checks
- Jalankan `npm run build` setelah setiap perubahan untuk memastikan tidak ada TypeScript error.
- Verifikasi API response format tidak berubah untuk endpoint yang ada (backward compatible).

### Manual Verification

| Item | Skenario Test |
|---|---|
| 1 — KPI HR vs Manager | Login sebagai HR → buka ManageKPIModal → pastikan dropdown hanya tampilkan Manager. Login sebagai Manager → pastikan hanya tampilkan employee divisi sendiri. Login sebagai Employee → pastikan tidak ada tombol Create KPI. |
| 2 — Reward Flow | Employee tukar reward → cek tabel `reward_redemptions` ada record baru dengan `status='pending'`. Login HR → buka dashboard reward → bisa ubah status ke `fulfilled`. |
| 3 — C-Level Role | Buat user baru dengan role `c_level` → login → pastikan bisa assign KPI ke HR dan Manager. Verifikasi Manager/HR tidak bisa assign KPI ke C-Level. |
| 4 — Bug Fix | Submit task dari akun employee → login ke akun manager yang sama departemennya → verifikasi task muncul di `ReviewTaskWidget`. |

### Database Migrations (Urutan Eksekusi)
1. `ALTER TABLE users` untuk tambah ENUM `c_level`
2. `CREATE TABLE reward_redemptions`
3. Seed / update data `department` jika ada NULL values (untuk bug fix)
