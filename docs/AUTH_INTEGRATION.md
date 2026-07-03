# Dokumentasi Auth — Integrasi Maxy OAuth

Dokumen ini menjelaskan bagaimana sistem autentikasi Flowbuddy bekerja dan apa yang dibutuhkan untuk mengimplementasikannya di aplikasi web lain yang terhubung ke Maxy.

---

## Gambaran Besar Arsitektur

```
Browser/Client
     │
     ▼
Next.js App (Web Barumu)
  ├── /api/auth/login        ← email + password
  └── /api/auth/google       ← Google OAuth token
          │
          ▼
  Laravel Maxy Backend (Source of Truth)
  https://cms.maxy.academy/api/m2m
  ├── Middleware: VerifyMicroservice  ← validasi X-Service-Key
  └── MicroserviceAuthController
          │
          ▼
  Database Lokal Aplikasimu
  (users table — auto-sync dari Maxy)
```

**Konsep kunci:** Maxy adalah **satu-satunya sumber kebenaran (SOT)**. Aplikasimu tidak punya sistem user sendiri — semua login diverifikasi ke Maxy dulu, baru di-sync ke database lokal.

---

## 1. Environment Variables yang Dibutuhkan

### Di aplikasi web baru (Next.js `.env.local`)

```env
# Google OAuth (daftarkan di Google Cloud Console, satu per domain)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# Maxy M2M API
MAXY_M2M_API_URL=https://cms.maxy.academy/api/m2m
MAXY_SERVICE_KEY=nama_app_secret_key_xxxxx
```

### Di Laravel Maxy Backend (`.env`)

```env
# Daftar semua service key yang diizinkan, dipisah koma
MICROSERVICE_API_KEYS=flowbee_secret_key_12345,nama_app_secret_key_xxxxx
```

> Untuk mendaftarkan web baru, tim Maxy backend cukup **menambahkan service key baru** ke `MICROSERVICE_API_KEYS` — tidak perlu mengubah kode apapun.

---

## 2. Sisi Laravel Maxy Backend

### 2a. Middleware — `VerifyMicroservice`

**File:** `app/Http/Middleware/VerifyMicroservice.php`

Middleware ini menjaga semua endpoint M2M. Setiap request harus menyertakan header `X-Service-Key` yang valid.

```php
class VerifyMicroservice
{
    public function handle(Request $request, Closure $next)
    {
        $headerKey = $request->header('X-Service-Key');
        $allowedKeys = explode(',', env('MICROSERVICE_API_KEYS', ''));

        if (!$headerKey || !in_array($headerKey, $allowedKeys)) {
            return response()->json([
                'error' => 'Unauthorized Microservice',
                'message' => 'Invalid or missing X-Service-Key header.'
            ], 401);
        }

        return $next($request);
    }
}
```

**Cara kerja:** Nilai `MICROSERVICE_API_KEYS` di `.env` bisa berisi banyak key (dipisah koma). Setiap aplikasi yang terintegrasi punya key-nya sendiri.

---

### 2b. Routes M2M

**File:** `routes/api.php`

```php
// Semua endpoint ini dilindungi VerifyMicroservice
Route::middleware([\App\Http\Middleware\VerifyMicroservice::class])
    ->prefix('m2m/auth')
    ->group(function () {
        Route::post('/verify-credential', [MicroserviceAuthController::class, 'verifyCredential']);
        Route::post('/verify-google',     [MicroserviceAuthController::class, 'verifyGoogle']);
    });
```

---

### 2c. Controller — `MicroserviceAuthController`

**File:** `app/Http/Controllers/Api/MicroserviceAuthController.php`

```php
class MicroserviceAuthController extends Controller
{
    // Endpoint: POST /api/m2m/auth/verify-credential
    public function verifyCredential(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required'
        ]);

        $user = DB::table('users')->where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'error' => 'Akun tidak ditemukan di LMS Maxy. Silakan daftar terlebih dahulu.'
            ], 404);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Password salah'], 401);
        }

        // Mengembalikan seluruh object user dari tabel users Maxy
        return response()->json(['user' => $user]);
    }

    // Endpoint: POST /api/m2m/auth/verify-google
    public function verifyGoogle(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'name'  => 'required|string',
        ]);

        $user = DB::table('users')->where('email', $request->email)->first();

        if (!$user) {
            // Auto-register ke Maxy jika belum ada (khusus Google login)
            $passwordHash = Hash::make(Str::random(12));

            DB::table('users')->insert([
                'name'            => $request->name,
                'email'           => $request->email,
                'password'        => $passwordHash,
                'access_group_id' => 2,       // default: member
                'status'          => 1,
                'type'            => 'member',
                'created_id'      => 1,
                'updated_id'      => 1,
                'created_at'      => Carbon::now(),
                'updated_at'      => Carbon::now(),
            ]);

            $user = DB::table('users')->where('email', $request->email)->first();
        }

        return response()->json(['user' => $user]);
    }
}
```

**Perbedaan penting antara dua endpoint:**

| | `verify-credential` | `verify-google` |
|---|---|---|
| Validasi | Cek email + Hash::check password | Cek email saja |
| Jika tidak ada | Return 404 (harus daftar dulu) | **Auto-register** ke Maxy |
| Password | Dari input user | Random (tidak dipakai) |

---

## 3. Maxy M2M API — Request & Response

Semua request wajib menyertakan header:
```
Content-Type: application/json
X-Service-Key: <nilai MAXY_SERVICE_KEY milikmu>
```

### 3a. Verifikasi Email + Password

```
POST https://cms.maxy.academy/api/m2m/auth/verify-credential
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "plaintext_password"
}
```

**Response sukses (200):**
```json
{
  "user": {
    "id": 123,
    "name": "Nama Lengkap User",
    "email": "user@example.com",
    "password": "$2y$10$hashedpassword...",
    "type": "member",
    "access_group_id": 2,
    "status": 1
  }
}
```

**Response gagal:**
```json
// 404 — email tidak ada di Maxy
{ "error": "Akun tidak ditemukan di LMS Maxy. Silakan daftar terlebih dahulu." }

// 401 — password salah
{ "error": "Password salah" }

// 401 — service key tidak valid
{ "error": "Unauthorized Microservice", "message": "Invalid or missing X-Service-Key header." }
```

---

### 3b. Verifikasi Google OAuth

```
POST https://cms.maxy.academy/api/m2m/auth/verify-google
```

**Request:**
```json
{
  "email": "user@gmail.com",
  "name": "Nama dari Google"
}
```

**Response sukses (200):**
```json
{
  "user": {
    "id": 456,
    "name": "Nama dari Google",
    "email": "user@gmail.com",
    "password": "$2y$10$randomhashedpassword...",
    "type": "member",
    "access_group_id": 2,
    "status": 1
  }
}
```

> Catatan: Untuk Google login, kamu decode JWT Google di sisi Next.js terlebih dahulu, lalu kirim `email` + `name`-nya saja ke Maxy — bukan raw token-nya.

---

## 4. Frontend — Komponen Auth (Next.js)

### Dependencies

```bash
npm install @react-oauth/google
```

### Setup Google OAuth Client

Daftarkan di [Google Cloud Console](https://console.cloud.google.com/):
1. Buat **OAuth 2.0 Client ID** (tipe: Web Application)
2. Tambahkan `http://localhost:3000` dan domain produksimu ke **Authorized JavaScript origins**
3. Salin Client ID ke `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

> Setiap domain/aplikasi butuh Client ID Google yang **berbeda**.

### Komponen

```tsx
// components/auth/AuthScreen.tsx
"use client";

import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

export default function AuthScreen({ onLogin }: { onLogin: (user: any) => void }) {

  // === LOGIN EMAIL + PASSWORD ===
  const handleEmailLogin = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) onLogin(data.user);
    else alert(data.error);
  };

  // === LOGIN GOOGLE ===
  const handleGoogleSuccess = async (credentialResponse: any) => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: credentialResponse.credential }),
    });
    const data = await res.json();
    if (res.ok) onLogin(data.user);
    else alert(data.error);
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      {/* Form email/password di sini */}

      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => alert("Google login gagal")}
        useOneTap={process.env.NODE_ENV !== "development"}
        theme="outline"
        size="large"
        shape="pill"
      />
    </GoogleOAuthProvider>
  );
}
```

---

## 5. Backend — API Routes (Next.js App Router)

### 5a. Login Email + Password

**File:** `app/api/auth/login/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  // Langkah 1: Verifikasi ke Maxy
  const lmsRes = await fetch(`${process.env.MAXY_M2M_API_URL}/auth/verify-credential`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.MAXY_SERVICE_KEY!,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!lmsRes.ok) {
    const lmsData = await lmsRes.json();
    return NextResponse.json({ error: lmsData.error || "Login gagal" }, { status: lmsRes.status });
  }

  const { user: lmsUser } = await lmsRes.json();

  // Langkah 2: Sync ke database lokal
  const localUser = await findOrCreateUser(email, lmsUser);

  // Langkah 3: Return ke frontend
  return NextResponse.json({ user: localUser });
}
```

---

### 5b. Login Google OAuth

**File:** `app/api/auth/google/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const { credential } = await request.json();

  // Langkah 1: Decode JWT dari Google
  const base64Url = credential.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(
    decodeURIComponent(
      atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    )
  );
  const { email, name, picture } = payload;

  // Langkah 2: Verifikasi/auto-register ke Maxy
  const lmsRes = await fetch(`${process.env.MAXY_M2M_API_URL}/auth/verify-google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.MAXY_SERVICE_KEY!,
    },
    body: JSON.stringify({ email, name }),
  });

  if (!lmsRes.ok) {
    return NextResponse.json({ error: "Gagal autentikasi dengan Maxy" }, { status: 401 });
  }

  const { user: lmsUser } = await lmsRes.json();

  // Langkah 3: Sync ke database lokal
  const localUser = await findOrCreateUser(email, lmsUser, picture);

  return NextResponse.json({ user: localUser });
}
```

---

### 5c. Helper: findOrCreateUser

**File:** `lib/auth-helpers.ts`

```ts
import { db } from "@/lib/db";

export async function findOrCreateUser(email: string, lmsUser: any, picture?: string) {
  const existing = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  if (existing.rows.length === 0) {
    // User baru — auto-register ke DB lokal
    const newId = "u_" + Math.random().toString(36).substring(2, 9);
    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, password_hash, avatar_image)
            VALUES (?, ?, ?, 'employee', ?, ?)`,
      args: [newId, email, lmsUser.name, lmsUser.password, picture || null],
    });

    const created = await db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [newId],
    });
    return formatUser(created.rows[0]);
  }

  return formatUser(existing.rows[0]);
}

function formatUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatarImage: row.avatar_image,
  };
}
```

---

## 6. Skema Database Lokal (Minimal)

```sql
CREATE TABLE users (
  id            VARCHAR(20)  PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  role          VARCHAR(50)  DEFAULT 'employee',
  password_hash TEXT,
  avatar_image  TEXT,
  is_onboarded  TINYINT(1)   DEFAULT 0,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Alur Lengkap (Flow Diagram)

### Login Email + Password

```
User input email + password
        │
        ▼
POST /api/auth/login (Next.js)
        │
        ├─► POST Maxy /api/m2m/auth/verify-credential
        │     ├── VerifyMicroservice middleware cek X-Service-Key
        │     ├── Cek email di DB Maxy
        │     ├── Hash::check password
        │     ├── 404 → email tidak ada → return error ke user
        │     ├── 401 → password salah → return error ke user
        │     └── 200 → return user object Maxy
        │
        ├─► Cek/buat user di DB lokal
        │     ├── Ada → return user lokal
        │     └── Tidak ada → INSERT → return user baru
        │
        ▼
onLogin(user) di frontend → simpan session
```

### Login Google OAuth

```
User klik tombol Google
        │
        ▼
Google popup → JWT credential token
        │
        ▼
POST /api/auth/google (Next.js)
        │
        ├─► Decode JWT → ambil email, name, picture
        │
        ├─► POST Maxy /api/m2m/auth/verify-google
        │     ├── VerifyMicroservice middleware cek X-Service-Key
        │     ├── Cari email di DB Maxy
        │     ├── Tidak ada → Auto-register ke DB Maxy (type: member)
        │     └── 200 → return user object Maxy
        │
        ├─► Cek/buat user di DB lokal
        │
        ▼
onLogin(user) di frontend → simpan session
```

---

## 8. Cara Mendaftarkan Web Baru ke Maxy

Cukup **2 langkah** di sisi backend Maxy:

1. **Tambahkan service key baru** ke `.env` Laravel Maxy:
   ```env
   MICROSERVICE_API_KEYS=flowbee_secret_key_12345,vero_secret_key_12345,web_baru_secret_key_xxxxx
   ```

2. Tidak perlu deploy ulang kode — cukup restart Laravel atau reload config:
   ```bash
   php artisan config:cache
   ```

Tidak ada perubahan kode di controller atau routes.

---

## 9. Manajemen Session

Flowbuddy menggunakan state React + localStorage. Untuk production, pertimbangkan:

| Opsi | Library | Keterangan |
|------|---------|------------|
| JWT Cookie | `jose` + Next.js middleware | Simpan JWT di httpOnly cookie, lebih aman |
| Iron Session | `iron-session` | Encrypted session di cookie, mudah |
| NextAuth.js | `next-auth` | Solusi lengkap dengan banyak provider |

**Contoh sederhana (localStorage):**
```ts
// Setelah onLogin:
localStorage.setItem("user", JSON.stringify(user));

// Saat app load:
const saved = localStorage.getItem("user");
if (saved) setUser(JSON.parse(saved));
```

---

## 10. Checklist Implementasi di Web Baru

**Sisi Maxy Backend (minta ke tim backend):**
- [ ] Tambahkan service key baru ke `MICROSERVICE_API_KEYS` di `.env` Laravel
- [ ] Jalankan `php artisan config:cache`

**Sisi Web Baru:**
- [ ] Daftarkan Google OAuth Client ID baru di Google Cloud Console
- [ ] Set env vars: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `MAXY_M2M_API_URL`, `MAXY_SERVICE_KEY`
- [ ] Install: `npm install @react-oauth/google`
- [ ] Buat tabel `users` di database lokal
- [ ] Buat `app/api/auth/login/route.ts`
- [ ] Buat `app/api/auth/google/route.ts`
- [ ] Buat komponen frontend dengan `GoogleOAuthProvider` + `GoogleLogin`
- [ ] Implementasi manajemen session
- [ ] Test login email+password
- [ ] Test login Google

---

## 11. Error Umum & Solusinya

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `Unauthorized Microservice` | `MAXY_SERVICE_KEY` tidak ada di `MICROSERVICE_API_KEYS` | Minta tim Maxy backend tambahkan key ke `.env` |
| `Akun tidak ditemukan di LMS Maxy` | Email belum terdaftar di Maxy (login email) | User harus daftar di Maxy Academy dulu |
| `Password salah` | Password salah | Pastikan kirim plaintext, bukan yang sudah di-hash |
| Google login gagal di localhost | Authorized origins belum diset | Tambahkan `http://localhost:3000` di Google Cloud Console |
| `AbortError [GSI_LOGGER]` | Google One Tap dibatalkan oleh user | Normal — suppress seperti di `AuthScreen.tsx` Flowbuddy |
| User tidak ter-sync ke DB lokal | `findOrCreateUser` error | Cek koneksi DB lokal dan struktur tabel `users` |
