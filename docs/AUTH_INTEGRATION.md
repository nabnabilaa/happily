# Dokumentasi Auth — Integrasi Maxy OAuth

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
  Maxy LMS API (Source of Truth)
  https://cms.maxy.academy/api/m2m
          │
          ▼
  Database Lokal Aplikasimu
  (users table — auto-sync dari Maxy)
```

**Konsep kunci:** Maxy adalah **satu-satunya sumber kebenaran (SOT)**. Aplikasimu tidak punya sistem user sendiri — semua login diverifikasi ke Maxy dulu, baru di-sync ke database lokal.

---

## 1. Environment Variables yang Dibutuhkan

Tambahkan ke file `.env.local`:

```env
# Google OAuth (daftarkan di Google Cloud Console)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# Maxy M2M API
MAXY_M2M_API_URL=https://cms.maxy.academy/api/m2m
MAXY_SERVICE_KEY=flowbee_secret_key
```

> **Catatan:** `MAXY_SERVICE_KEY` adalah shared secret antara aplikasimu dan Maxy. Minta ke tim Maxy backend.

---

## 2. Maxy M2M API Endpoints

Semua request ke Maxy harus menyertakan header:
```
Content-Type: application/json
X-Service-Key: <MAXY_SERVICE_KEY>
```

### 2a. Verifikasi Email + Password

```
POST https://cms.maxy.academy/api/m2m/auth/verify-credential
```

**Request body:**
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
    "name": "Nama Lengkap User",
    "password": "$2y$10$hashedpassword..."
  }
}
```

**Response gagal (4xx):**
```json
{
  "error": "Akun tidak ditemukan"
}
```

---

### 2b. Verifikasi Google OAuth Token

```
POST https://cms.maxy.academy/api/m2m/auth/verify-google
```

**Request body:**
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
    "name": "Nama Lengkap User",
    "password": "$2y$10$hashedpassword..."
  }
}
```

> **Catatan:** Kamu decode JWT dari Google di sisi Next.js, lalu kirim `email` + `name`-nya ke Maxy — bukan token mentah Google-nya.

---

## 3. Frontend — Komponen Auth

### Dependencies yang dibutuhkan

```bash
npm install @react-oauth/google
```

### Setup Google OAuth Client

Daftarkan aplikasimu di [Google Cloud Console](https://console.cloud.google.com/):
1. Buat OAuth 2.0 Client ID (tipe: Web Application)
2. Tambahkan `http://localhost:3000` dan domain produksimu ke **Authorized JavaScript origins**
3. Salin Client ID ke `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### Struktur komponen

```tsx
// components/auth/AuthScreen.tsx
"use client";

import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

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
    <GoogleOAuthProvider clientId={clientId}>
      {/* Form email/password kamu di sini */}
      
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

## 4. Backend — API Routes (Next.js App Router)

### 4a. Login Email + Password

**File:** `app/api/auth/login/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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
    return NextResponse.json({ error: lmsData.error || "Login gagal" }, { status: 401 });
  }

  const { user: lmsUser } = await lmsRes.json();

  // Langkah 2: Sync ke database lokal (auto-create jika belum ada)
  let localUser = await findOrCreateUser(email, lmsUser);

  // Langkah 3: Return user object
  return NextResponse.json({ user: localUser });
}
```

---

### 4b. Login Google OAuth

**File:** `app/api/auth/google/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const { credential } = await request.json();

  // Langkah 1: Decode JWT dari Google (tanpa verifikasi signature — cukup untuk data)
  const base64Url = credential.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(
    decodeURIComponent(atob(base64).split("").map(c =>
      "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(""))
  );

  const { email, name, picture } = payload;

  // Langkah 2: Verifikasi ke Maxy (cek apakah email terdaftar di Maxy)
  const lmsRes = await fetch(`${process.env.MAXY_M2M_API_URL}/auth/verify-google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.MAXY_SERVICE_KEY!,
    },
    body: JSON.stringify({ email, name }),
  });

  if (!lmsRes.ok) {
    return NextResponse.json({ error: "Akun tidak ditemukan di Maxy" }, { status: 401 });
  }

  const { user: lmsUser } = await lmsRes.json();

  // Langkah 3: Sync ke database lokal
  let localUser = await findOrCreateUser(email, lmsUser, picture);

  return NextResponse.json({ user: localUser });
}
```

---

### 4c. Helper: findOrCreateUser

Fungsi ini bisa kamu taruh di `lib/auth-helpers.ts`:

```ts
export async function findOrCreateUser(email: string, lmsUser: any, picture?: string) {
  // Cari user di database lokal
  const existing = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  if (existing.rows.length === 0) {
    // Auto-register user baru dari Maxy
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

## 5. Skema Database Lokal (Minimal)

Tabel `users` yang dibutuhkan:

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

Kolom tambahan bisa disesuaikan dengan kebutuhan aplikasimu.

---

## 6. Alur Lengkap (Flow Diagram)

### Login Email + Password

```
User input email+password
        │
        ▼
POST /api/auth/login
        │
        ├─► POST Maxy /auth/verify-credential
        │         ├── OK (200) → lanjut sync
        │         └── Error → return 401 ke user
        │
        ├─► Cek users table (database lokal)
        │         ├── User ada → return user
        │         └── User tidak ada → INSERT baru → return user
        │
        ▼
onLogin(user) → simpan session/cookie di frontend
```

### Login Google OAuth

```
User klik "Login dengan Google"
        │
        ▼
Google popup → JWT credential token
        │
        ▼
POST /api/auth/google  { credential: "eyJ..." }
        │
        ├─► Decode JWT → dapat email, name, picture
        │
        ├─► POST Maxy /auth/verify-google { email, name }
        │         ├── OK (200) → lanjut sync
        │         └── Error → "Akun tidak ditemukan di Maxy"
        │
        ├─► Cek/buat user di database lokal
        │
        ▼
onLogin(user) → simpan session/cookie di frontend
```

---

## 7. Manajemen Session

Flowbuddy menggunakan **session berbasis state React** (disimpan di `useState`/`localStorage`). Untuk production, pertimbangkan salah satu dari:

| Opsi | Library | Keterangan |
|------|---------|------------|
| JWT Cookie | `jose` + Next.js middleware | Simpan JWT di httpOnly cookie |
| Iron Session | `iron-session` | Encrypted session di cookie |
| NextAuth.js | `next-auth` | Solusi lengkap, bisa extend dengan Credentials + Google provider |

**Contoh paling sederhana** (simpan di localStorage):
```ts
// Setelah onLogin dipanggil:
localStorage.setItem("user", JSON.stringify(user));

// Saat app load:
const saved = localStorage.getItem("user");
if (saved) setUser(JSON.parse(saved));
```

---

## 8. Checklist Implementasi di Web Baru

- [ ] Daftarkan Google OAuth Client ID baru di Google Cloud Console (satu Client ID per domain)
- [ ] Set environment variables: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `MAXY_M2M_API_URL`, `MAXY_SERVICE_KEY`
- [ ] Install dependency: `@react-oauth/google`, `bcryptjs`
- [ ] Buat tabel `users` di database lokal
- [ ] Salin/adaptasi `app/api/auth/login/route.ts`
- [ ] Salin/adaptasi `app/api/auth/google/route.ts`
- [ ] Buat komponen frontend dengan `GoogleOAuthProvider` + `GoogleLogin`
- [ ] Implementasi manajemen session (cookie/localStorage)
- [ ] Test login email+password dengan akun Maxy yang valid
- [ ] Test login Google dengan email yang terdaftar di Maxy

---

## 9. Error Umum & Solusinya

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `Akun tidak ditemukan` | Email tidak terdaftar di Maxy | User harus daftar di Maxy Academy dulu |
| `X-Service-Key invalid` | `MAXY_SERVICE_KEY` salah | Cek nilai key, minta ke tim Maxy |
| `popup_closed_by_user` | User tutup popup Google | Normal — tidak perlu ditangani |
| `AbortError [GSI_LOGGER]` | Google One Tap dibatalkan | Normal — suppress saja seperti di `AuthScreen.tsx` |
| Google login gagal di localhost | Authorized origins belum diset | Tambahkan `http://localhost:3000` di Google Cloud Console |
