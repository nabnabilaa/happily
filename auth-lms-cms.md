lms auth

Viewed .env:1-71
Viewed .env:1-63
Viewed auth.php:1-112
Viewed api.php:1-49
Viewed auth.php:1-112
Viewed web.php:1-575
Viewed AuthController.php:1-495

Sistem autentikasi pada aplikasi ini dibangun menggunakan standar bawaan Laravel dengan model sesi (Session-based Authentication). Berikut adalah penjelasan mendetail mengenai sistem autentikasi, database yang digunakan, dan alur kerjanya:

### 1. Database yang Digunakan
Berdasarkan file konfigurasi `.env`, aplikasi ini menggunakan **MySQL** sebagai sistem manajemen database (RDBMS).
- **Koneksi**: `DB_CONNECTION=mysql`
- **Host**: `127.0.0.1`
- **Port**: `3306`
- **Nama Database**: `maxy2`

Proyek ini tampaknya memiliki dua direktori (Backend dan Frontend yang juga merupakan proyek Laravel) yang mengarah ke dan berbagi database yang sama (`maxy2`).

### 2. Konfigurasi Sistem Autentikasi
Berdasarkan file `config/auth.php` (baik di backend maupun frontend), autentikasi diatur sebagai berikut:
- **Guard Default**: `web` (menggunakan driver `session`).
- **User Provider**: `users` (menggunakan driver `eloquent` yang terhubung langsung ke model `App\Models\User`).
- Jadi, ketika pengguna login, sesi mereka akan disimpan di storage sesi default (dalam hal ini `file` sesuai dengan pengaturan `SESSION_DRIVER=file` di `.env`).

### 3. Alur Autentikasi (Mendetail)

Berdasarkan file routing `routes/web.php` dan `app/Http/Controllers/AuthController.php` di sisi frontend, berikut adalah alurnya:

#### A. Alur Registrasi (`/register` & `postSignUp`)
1. Pengguna memasukkan `name`, `email`, `password`, dan `confirm_password`.
2. Validasi dilakukan untuk memastikan email belum terdaftar (unique) dan password memenuhi syarat minimal 6 karakter.
3. Password dienkripsi menggunakan fungsi `bcrypt()`.
4. User baru disimpan ke dalam tabel `users` dengan nilai default:
   - `access_group_id` = `2`
   - `status` = `1` (Aktif)
   - `type` = `'member'`
5. Setelah berhasil, pengguna akan di-redirect ke halaman login (`/login`).

*Catatan: Terdapat juga variasi registrasi seperti `postSignUpRedirect` atau `postSignUpRedirectNoPassword` di mana pengguna dimintai nomor telepon (`phone`) dan otomatis langsung login & diarahkan (redirect) ke suatu halaman tujuan.*

#### B. Alur Login (`/login` & `postSignIn`)
1. Pengguna menginputkan kredensial berupa `email` dan `password`.
2. Sistem menggunakan helper bawaan `auth()->attempt()` untuk memvalidasi kredensial tersebut dengan syarat tambahan bahwa akun tersebut harus aktif (`'status' => 1`).
3. Jika gagal, sistem akan mengecek apakah email terdaftar tetapi statusnya `0` (tidak aktif). Jika iya, sistem akan memberikan pesan bahwa ID tidak aktif. Jika salah password, sistem memberikan error bahwa login gagal.
4. **Jika Login Berhasil**:
   - Sistem akan mencatat aktivitas login untuk memperbarui kolom `last_loggedin` pada akun pengguna (menggunakan Carbon).
   - Terdapat logika penyesuaian kolom `strict` dengan menghitung selisih hari (`dayDifference`) dari login terakhir. Jika selisihnya tepat 1 hari, nilai `strict` (streak/aktivitas beruntun) akan bertambah 1. Namun jika lebih dari 1 hari, nilai streak ini di-reset kembali menjadi 0.
   - **Redirect Dinamis**: Sistem akan mendeteksi parameter `direct` dari request untuk mengarahkan pengguna ke halaman spesifik setelah sukses login. Contoh:
     - `direct == 1`: Diarahkan ke form input profil, atau langsung ke Dashboard LMS jika profil & nomor telepon sudah lengkap.
     - `direct == 2`: Diarahkan kembali ke halaman detail *Career Bootcamp* (biasanya terjadi jika pengguna menekan tombol saat belum login).
     - `direct == 3`: Diarahkan ke *Form Pembayaran / Registrasi Course*.
     - `direct == 4` hingga `6`: Diarahkan ke link pembayaran pihak ketiga (seperti Prakerja) atau detail course spesifik.

#### C. Alur Logout (`/logout` & `postLogout`)
1. Ketika rute logout dipanggil, controller akan menjalankan `Auth::guard('web')->logout()`.
2. Selain mengakhiri sesi, sistem juga menghapus session key spesifik yaitu `token` (`session()->forget('token')`).
3. Pengguna kemudian akan dilempar kembali (redirect) ke Homepage atau halaman *redirect* yang diminta.

#### D. Lupa Password (`/forgot` & `/resetPassword`)
Sistem ini menggunakan mekanisme OTP *custom* alih-alih reset token standar Laravel:
1. Pengguna meminta reset password dengan menginput `email`.
2. Sistem mengecek status akun. Jika aktif, kolom `last_reset_password` pada user di-update dengan timestamp sekarang.
3. OTP unik di-generate dengan metode **Base64 Encode** berformat: `ID_User + "+reset+" + Timestamp`. (Contoh: `123+reset+170123456`).
4. OTP (beserta link) ini kemudian diemail ke pengguna menggunakan SMTP.
5. Saat pengguna mengubah password, sistem akan melakukan **Base64 Decode** terhadap OTP, mengambil ID dari format tersebut untuk memverifikasi `user`, serta memastikan bahwa request dilakukan tidak lebih dari `10 menit` dari waktu pengajuan reset.
6. Jika sukses, password di-hash ulang dengan `bcrypt()` dan aktivitas tersebut dicatat ke log `CourseClassMemberLog::changePassword()`.

#### E. Social Login (Google & Facebook)
Terdapat pula dukungan registrasi & login instan melalui pihak ketiga (OAuth). Pada file `routes/web.php`, terlihat pemanggilan `SignupController` untuk menghandle Google Callback & Facebook Callback (biasanya mengandalkan Laravel Socialite).

### Kesimpulan
Secara keseluruhan, ini adalah sistem **autentikasi monolitik berbasis *Session*** menggunakan **MySQL** sebagai database penyimpanannya, dilengkapi dengan variasi metode redirect yang dinamis (untuk mengakomodasi UX pembayaran / pembelian kursus LMS) dan fitur pencatatan *streak* harian (`strict`) bagi para penggunanya.


auth cms

Viewed .env:1-63
Listed directory routes
Viewed api.php:1-49
Searched for "(login|auth|register|logout)"
Viewed web.php:1-778
Viewed AuthController.php:1-71
Viewed AccessMiddleware.php:1-22
Viewed Kernel.php:1-75
Viewed Users.php:1-42

Berikut adalah penjelasan mendetail mengenai sistem autentikasi (Auth) dan database yang digunakan pada project Laravel ini.

### 1. Database yang Digunakan
Berdasarkan file konfigurasi [`.env`](file:///c:/laragon/www/laravel-maxy-backendv2/.env), aplikasi ini menggunakan **MySQL** sebagai sistem databasenya. 
Konfigurasinya adalah sebagai berikut:
- **Connection:** MySQL (`DB_CONNECTION=mysql`)
- **Host & Port:** `127.0.0.1` pada port `3306`
- **Nama Database:** `maxy2` (`DB_DATABASE=maxy2`)

### 2. Sistem Autentikasi (Auth)
Aplikasi ini menerapkan dua jenis autentikasi dari Laravel, namun fokus utamanya ada pada **Sistem Auth berbasis Session** dengan penambahan **Custom Role-Based Access Control (RBAC)**.

* **API Auth:** Menggunakan **Laravel Sanctum** (`auth:sanctum`) terlihat di file [api.php](file:///c:/laragon/www/laravel-maxy-backendv2/routes/api.php#L18) (utamanya hanya untuk endpoint get `/user`).
* **Web Auth (CMS):** Menggunakan **Session-based Authentication** standar Laravel ditambah dengan sistem Hak Akses Kustom.

### 3. Alur Autentikasi (Mendetail)

Alur login utamanya ditangani oleh `AuthController` pada method `postLogin`. Berikut adalah rincian alurnya dari awal proses login hingga pengecekan hak akses di tiap halaman:

#### A. Proses Login ([AuthController.php](file:///c:/laragon/www/laravel-maxy-backendv2/app/Http/Controllers/AuthController.php#L18-L60))
1. **Validasi Input:** Sistem memvalidasi apakah `email` (format yang benar) dan `password` (minimal 6 karakter) telah diisi.
2. **Cek Kredensial (Auth::attempt):** Sistem mengecek kesesuaian email dan password ke dalam tabel `users`. Jika salah, akan dikembalikan ke halaman login dengan pesan *error*.
3. **Pengecekan Akses Global (CMS Access):**
   - Setelah kredensial benar, sistem tidak langsung memasukkan user ke dashboard. 
   - Sistem mengambil `access_group_id` milik user tersebut.
   - Sistem melakukan pengecekan apakah grup akses dari user tersebut memiliki izin utama bernama `access_cms` (izin untuk masuk ke sistem CMS).
   - Jika **tidak punya**, user akan di-logout kembali (`Auth::logout()`) secara paksa dan dilempar kembali dengan pesan *"Tidak memiliki hak akses."*
4. **Penyimpanan Sesi (Session):**
   - Jika lolos pengecekan `access_cms`, sistem akan melakukan query untuk mengambil **semua daftar izin** (dari tabel `access_master` dan `access_group_detail`) yang terhubung dengan `access_group_id` milik user tersebut.
   - Daftar semua izin akses ini disimpan ke dalam Session PHP dengan key `access_master`.
5. **Regenerate Session & Redirect:** Sistem memperbarui ID sesi (`$request->session()->regenerate()`) untuk mencegah serangan *Session Fixation*, kemudian mengarahkan user masuk ke halaman Dashboard (`getDashboard`).

#### B. Proteksi Route / Halaman ([web.php](file:///c:/laragon/www/laravel-maxy-backendv2/routes/web.php) & Middleware)
Setelah user berhasil masuk, sistem menjaga setiap route/halaman menggunakan kombinasi dari 2 jenis middleware:

1. **Middleware `auth` bawaan Laravel:** Memastikan pengguna sudah login.
2. **Middleware Kustom bernama `access`:** Mengontrol secara ketat pengguna boleh mengakses menu apa. 
   - Contoh penggunaannya di route: `Route::get('/course', ...)->middleware('access:course_manage');`
   - **Cara kerja Middleware ini** ([Users.php](file:///c:/laragon/www/laravel-maxy-backendv2/app/Http/Middleware/Users.php#L19-L41)):
     - Setiap kali user mau mengakses route tersebut, middleware akan menjalankan sebuah Raw SQL Query:
       ```sql
       SELECT access_master.name as access_master_name ...
       FROM access_group_detail 
       INNER JOIN access_master ON access_group_detail.access_master_id = access_master.id 
       INNER JOIN access_group ON access_group_detail.access_group_id = access_group.id 
       WHERE access_group.id = ? AND access_master.name = ?;
       ```
     - Query ini akan mencocokkan apakah `access_group_id` milik user saat ini, memiliki akses persis yang diwajibkan oleh route tersebut (misal `course_manage`).
     - Jika hasil query ditemukan, maka user **diizinkan** lewat.
     - Jika tidak ditemukan, user akan **dilempar (redirect)** ke halaman `/noauthority` (Halaman tidak punya otoritas/bad access).

### Kesimpulan
Sistem autentikasi aplikasi ini cukup *robust*. Ia menggabungkan fungsi otentikasi (siapa kamu) dari bawaan Laravel standar, dengan otorisasi (apa yang boleh kamu lakukan) kustom yang memetakan **Users** → **Access Groups** → **Access Group Details** → **Access Master**. Akses setiap menu divalidasi secara dinamis langsung ke database setiap kali sebuah *route* dipanggil menggunakan custom middleware bernama `Users` (alias `access`).