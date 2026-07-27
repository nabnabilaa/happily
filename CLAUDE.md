@AGENTS.md

# Design system — WAJIB DIBACA SEBELUM MENULIS UI

Baca `DESIGN_SYSTEM.md` sebelum membuat atau mengubah komponen visual apa pun.

Ringkasnya:
- Jangan pernah hardcode hex. Semua warna dari `HP_TOKENS`.
- Jangan set `fontWeight` manual. Pakai role dari `HP_TEXT` (skala berhenti di 700).
- Kedalaman dari nilai permukaan + garis rambut, bukan shadow.
- Susun dari `@/components/ui` (`Stack`, `Row`, `Grid`, `HPCard`, `HPButton`, `ListRow`, …),
  jangan tulis objek flex inline sendiri.
- Motion diimpor dari `@/components/ui`, bukan langsung dari `motion/react`.

Jalankan `npm run check` sebelum selesai — ini type-check plus gagal kalau ada
regresi token. Kalau kamu memigrasi file lama, jalankan
`npm run check:design:update` untuk menurunkan baseline lalu commit.

# Arsitektur Role Screen — WAJIB DIBACA SEBELUM GENERATE KODE

## Prinsip utama: Fitur di shared component, bukan di role screen

Flowbuddy punya tiga role: **employee**, **manager**, **HR**.
Semua fitur yang ada di employee **harus identik** di manager dan HR.
Bedanya hanya izin akses dan fitur tambahan eksklusif per role.

### Aturan yang TIDAK BOLEH dilanggar

**JANGAN pernah taruh logika fitur langsung di role screen.**

Role screen yang ada:
- `components/goals/ManagerGoalsScreen.tsx`
- `components/goals/HRPeopleScreen.tsx`
- `app/(home)/page.tsx` (employee home)

Role screen ini HANYA boleh berisi:
- Tab switching
- Import dan komposisi shared components
- Prop role-specific (seperti `managerMode={true}`)

**SELALU taruh fitur di shared component:**
- Task harian → `components/home/TaskHarianWidget.tsx`
- KPI/target → `components/goals/GoalCard.tsx`
- Modal (clock-out, logbook, focus) → `components/modals/`
- Section/widget baru → buat file baru di `components/home/` atau `components/goals/`

### Cara tambah fitur baru

1. **Tanya dulu:** apakah fitur ini dibutuhkan semua role?
   - Ya → buat/update shared component, lalu import di semua role screen yang relevan
   - Tidak (murni role-specific, misal "Manage Employees" di HR) → boleh di role screen

2. **Kalau fitur butuh perbedaan per role** (misal tombol ACC khusus manager):
   - Tambah sebagai **prop** ke shared component, JANGAN buat komponen terpisah
   - Contoh: `<GoalCard managerMode={true} onManagerVerify={...} />`

3. **Setelah update shared component**, pastikan semua role screen yang menggunakannya
   sudah mendapat update yang sama — cek `ManagerPersonalView`, `HRPeopleScreen` tab personal, dll.

### Kenapa aturan ini ada

Sebelumnya `ManagerPersonalView` punya primitive task list sendiri yang tidak ikut
update ketika `TaskHarianWidget` diupdate. Ini menyebabkan fitur employee tidak
muncul di manager/HR. Semua perubahan sekarang harus melalui shared components
agar otomatis menyebar ke semua role.
