# SPESIFIKASI SISTEM: OKR & TASK MANAGEMENT (3 ROLE)

> Gunakan dokumen ini sebagai system prompt / project brief untuk AI coding agent (Antigravity, Claude Code, dll). Dokumen ini mendeskripsikan rancangan alur, role, dan skema data untuk fitur OKR (Objectives & Key Results) beserta Task Management di dalam sistem HRIS.

---

## 1. KONTEKS & TUJUAN

Sistem ini adalah modul OKR & Task Management di dalam aplikasi HRIS. Sistem dibatasi hanya memiliki **3 role**: `HR`, `Manager`, `Employee`. Tidak ada role di atas Manager/HR (tidak ada CEO/Direktur/Super Admin). Karena itu, alur approval untuk task milik Manager dan HR menggunakan mekanisme **Self-Approve** agar task tidak "menggantung" menunggu approval dari role yang tidak ada.

Tujuan implementasi:
- Membuat hierarki OKR 3 level: Company OKR → Team OKR → Individual OKR.
- Membuat sistem Task yang terhubung ke Key Result dari OKR.
- Menerapkan alur status & approval Task sesuai role pembuat/pengerjanya.
- Menjaga skema database tetap sederhana (hanya 3 role di tabel `users`), namun tetap akuntabel lewat metadata tambahan pada Task.

---

## 2. DEFINISI ROLE & HAK AKSES

### 2.1 Employee
- Melihat OKR yang relevan (Company, Team divisinya, Individual miliknya).
- Mengerjakan Task yang menjadi tanggung jawabnya.
- Mengubah status Task menjadi `Submit for Review` saat selesai dikerjakan.
- **Tidak bisa** mengubah status Task menjadi `Done`/`Accepted` secara langsung — wajib menunggu Manager melakukan `Accept` atau `Revise`.

### 2.2 Manager
Manager memiliki **dua konteks akses** dalam satu akun (tanpa perlu role tambahan):

**A. Sebagai Atasan (Team Lead)**
- Membuat & mengelola **Team OKR** untuk divisinya.
- Membuat Key Result & memecahnya menjadi Task, lalu assign Task ke Employee di divisinya.
- Melakukan `Accept` atau `Revise` terhadap Task milik Employee yang berstatus `Review`.
- Hanya bisa melihat/mengelola data Employee yang berada di divisi yang sama dengannya.

**B. Sebagai Karyawan (Individual Contributor)**
- Memiliki **Individual OKR** miliknya sendiri.
- Saat mengerjakan Task dari Individual OKR-nya dan mengubah status ke `Done`, sistem otomatis mencatatnya sebagai `Accepted` (**Self-Approve**) — tidak ada langkah `Review` menunggu pihak lain.

### 2.3 HR
HR juga memiliki **dua konteks akses**:

**A. Sebagai Admin/Observer**
- Akses **read-only** ke seluruh data OKR & Task milik semua user (semua divisi).
- Bisa melakukan export/generate laporan performa (misal CSV/PDF) berdasarkan data OKR & Task seluruh organisasi.
- Memiliki wewenang membuat & mengelola **Company OKR**.
- **Tidak** memiliki kewenangan untuk melakukan `Accept`/`Revise` terhadap Task milik Manager atau Employee (read-only, bukan approver).

**B. Sebagai Karyawan (Individual Contributor)**
- Memiliki **Individual OKR** miliknya sendiri, sama seperti Manager.
- Task dari Individual OKR-nya juga bersifat **Self-Approve** — saat status diubah ke `Done`, otomatis `Accepted`.

---

## 3. HIERARKI OKR

| Level | Dibuat oleh | Scope | Catatan |
|---|---|---|---|
| **Company OKR** | HR | Seluruh organisasi, berlaku per periode (kuartal/tahun) | Entitas **global**, tidak terikat ke `user_id` HR tertentu. Jika ada >1 HR atau terjadi pergantian staff HR, data tetap satu sumber kebenaran. |
| **Team OKR** | Manager | Divisi/tim milik Manager tersebut | Wajib terhubung ke `division_id`. Idealnya (meski tidak wajib) di-link sebagai turunan dari salah satu Company OKR yang relevan. |
| **Individual OKR** | Employee, Manager, HR (untuk diri sendiri) | Per user | Bisa berdiri sendiri atau di-link sebagai turunan dari Team OKR. |

Setiap OKR memiliki minimal satu **Objective** dan beberapa **Key Result**. Setiap Key Result dapat dipecah menjadi satu atau lebih **Task**.

---

## 4. ALUR STATUS TASK & APPROVAL

### 4.1 Daftar Status Task
```
To Do → In Progress → Review → Done (Accepted)
                    ↘ Revise (kembali ke In Progress)
```
Untuk task yang Self-Approve:
```
To Do → In Progress → Done (Accepted otomatis)
```

### 4.2 Alur per Role

**Employee (Task dari Individual OKR Employee, di-assign oleh Manager):**
1. Status awal: `To Do` atau `In Progress`.
2. Employee mengerjakan, lalu klik **"Submit for Review"** → status menjadi `Review`.
3. Manager (sebagai atasan) melakukan:
   - **Accept** → status menjadi `Done`, `approval_type = reviewed`, `approved_by = manager_user_id`.
   - **Revise** → status kembali ke `In Progress`, ditambahkan `revision_note` dari Manager, Employee mengulang dari langkah 2.

**Manager (Task dari Individual OKR Manager sendiri):**
1. Status awal: `To Do` atau `In Progress`.
2. Manager mengerjakan, lalu klik **"Mark as Done"** → status langsung menjadi `Done`.
3. Sistem otomatis set: `approval_type = self_approved`, `approved_by = manager_user_id` (sama dengan `assignee_id`), `approved_at = now()`.
4. Tidak ada status `Review` untuk kasus ini.

**HR (Task dari Individual OKR HR sendiri):**
- Sama persis seperti Manager pada poin di atas. `approval_type = self_approved`.

---

## 5. SKEMA DATABASE (Saran Struktur)

### 5.1 Tabel `users`
```
id, name, email, password, role (enum: 'hr' | 'manager' | 'employee'), division_id (FK -> divisions.id), created_at, updated_at
```
> Catatan: `division_id` wajib untuk role `manager` dan `employee`. Untuk `hr`, `division_id` boleh null (HR bersifat lintas divisi).

### 5.2 Tabel `divisions`
```
id, name, manager_id (FK -> users.id, nullable), created_at, updated_at
```

### 5.3 Tabel `okrs`
```
id, type (enum: 'company' | 'team' | 'individual'),
owner_id (FK -> users.id, nullable untuk type='company'),
division_id (FK -> divisions.id, nullable; wajib jika type='team'),
parent_okr_id (FK -> okrs.id, nullable; untuk linking Team->Company atau Individual->Team),
period (string, contoh: "2026-Q3"),
objective_title (text),
created_by (FK -> users.id),
created_at, updated_at
```
> Untuk `type='company'`: `owner_id` = null, dibuat oleh HR (`created_by`), bersifat global per `period`.

### 5.4 Tabel `key_results`
```
id, okr_id (FK -> okrs.id), title, target_value, current_value, unit, created_at, updated_at
```

### 5.5 Tabel `tasks`
```
id,
key_result_id (FK -> key_results.id, nullable jika task berdiri sendiri),
assignee_id (FK -> users.id),
created_by (FK -> users.id),
title, description,
status (enum: 'todo' | 'in_progress' | 'review' | 'done'),
approval_type (enum: 'reviewed' | 'self_approved', nullable selama belum 'done'),
approved_by (FK -> users.id, nullable),
approved_at (timestamp, nullable),
revision_note (text, nullable),
due_date, created_at, updated_at
```

### 5.6 Field Kunci untuk Akuntabilitas
- `approval_type` & `approved_by` **wajib diisi** saat status berubah menjadi `done`, baik via flow review maupun self-approve. Ini penting agar laporan HR bisa membedakan task yang melalui review pihak lain vs klaim selesai sendiri.

---

## 6. BUSINESS RULES / EDGE CASES PENTING

1. **Scoping akses Manager**: Manager hanya boleh melihat/mengelola Team OKR, Task, dan data Employee yang `division_id`-nya sama dengan miliknya. Query list Employee/Task untuk Manager harus selalu di-filter `WHERE division_id = current_user.division_id`.
2. **Company OKR bersifat global**: Hanya ada satu set Company OKR aktif per `period`. Semua user dengan role `hr` bisa edit Company OKR pada `period` yang sama (bukan milik personal salah satu HR).
3. **Self-Approve tidak butuh role baru**: Logic-nya cukup berbasis kondisi: `IF assignee.role IN ('manager','hr') AND task.created_by == task.assignee_id (Individual OKR milik sendiri) THEN auto-approve`.
4. **HR tidak pernah menjadi approver** Task milik Manager/Employee. Akses HR terhadap Task selain miliknya sendiri selalu `read-only`.
5. **Validasi assign Task**: Manager hanya bisa assign Task ke Employee dengan `division_id` yang sama dengannya.
6. **Notifikasi**: Saat Employee submit Task untuk review, Manager terkait mendapat notifikasi. Saat Manager/HR melakukan self-approve, tidak perlu notifikasi ke siapa pun (opsional: bisa di-log untuk audit trail).

---

## 7. FITUR / UI PER ROLE (RINGKASAN)

**Dashboard Employee**
- List Individual OKR & Key Result miliknya.
- List Task (filter by status), tombol "Submit for Review".
- Status badge menampilkan riwayat revisi jika ada.

**Dashboard Manager**
- Tab "Team": kelola Team OKR, Key Result, assign Task ke Employee, queue Task berstatus `Review` untuk di-Accept/Revise.
- Tab "My Work": Individual OKR miliknya, Task dengan self-approve (tombol langsung "Mark as Done").

**Dashboard HR**
- Tab "Company OKR": create/edit Company OKR per periode.
- Tab "Reports": read-only view seluruh OKR & Task semua divisi, dengan fitur export (CSV/PDF), filter berdasarkan `approval_type` (`reviewed` vs `self_approved`).
- Tab "My Work": Individual OKR miliknya, sama seperti Manager (self-approve).

---

## 8. CATATAN UNTUK AI CODING AGENT

- Implementasikan permission/middleware berbasis kombinasi `role` + (untuk task tertentu) `assignee_id == created_by` untuk menentukan apakah suatu Task masuk jalur **review** atau **self-approve**.
- Pastikan migration database mencakup semua tabel & field di Bagian 5, termasuk enum `approval_type`.
- Buat seed data contoh: 1 Company OKR (period aktif), 2 division (misal "IT" dan "Sales"), masing-masing 1 Manager + 2 Employee, serta 1 user HR.
- Tulis unit test khusus untuk:
  - Employee tidak bisa langsung set status Task ke `done`.
  - Manager/HR self-approve otomatis mengisi `approval_type = self_approved` dan `approved_by = assignee_id`.
  - Manager hanya bisa melihat/assign Task ke Employee di divisi yang sama.
  - HR tidak bisa melakukan Accept/Revise terhadap Task milik user lain (read-only).

---

*(Akhir spesifikasi)*
