# Tutorial: Menghubungkan Web Baru ke Login Maxy

> Dokumen ini untuk siapa saja yang ingin membuat web/aplikasi baru yang bisa login menggunakan akun Maxy Academy — baik lewat email/password maupun tombol "Login dengan Google".

---

## Sebelum Mulai — Pahami Konsepnya Dulu

Bayangkan Maxy seperti **KTP pusat**. Setiap aplikasi yang ingin tahu "apakah orang ini boleh masuk?" harus tanya ke Maxy dulu. Kalau Maxy bilang boleh, baru aplikasinya buka pintu.

```
User → Web Baru → "Eh Maxy, orang ini valid nggak?" → Maxy jawab → Web Baru buka/tutup pintu
```

Jadi setiap web baru tidak perlu punya database user sendiri dari nol — cukup tanya ke Maxy, lalu simpan data minimal di database lokalnya.

---

## Bagian 1 — Minta Akses ke Tim Backend Maxy

Ini langkah pertama dan **wajib dilakukan sebelum coding apapun**.

### Yang perlu diminta:

Hubungi tim backend Maxy dan minta mereka menambahkan **Service Key** untuk aplikasi barumu.

Contoh pesannya:
> "Halo, tolong tambahkan service key baru untuk web [nama aplikasi] di `MICROSERVICE_API_KEYS`. Keynya: `namaapp_secret_key_xxxxx`"

### Yang mereka lakukan (untuk referensi tim backend):

Buka file `.env` di server Laravel Maxy, cari baris ini:

```
MICROSERVICE_API_KEYS=flowbee_secret_key_12345,vero_secret_key_12345
```

Tambahkan key barumu di belakang (pisah dengan koma):

```
MICROSERVICE_API_KEYS=flowbee_secret_key_12345,vero_secret_key_12345,namaapp_secret_key_xxxxx
```

Lalu jalankan:
```bash
php artisan config:cache
```

Selesai. Tidak ada perubahan kode lain. Sekarang web barumu sudah "dikenali" oleh Maxy.

---

## Bagian 2 — Daftarkan Aplikasi ke Google

Ini supaya tombol "Login dengan Google" bisa muncul di web barumu.

### Kenapa tidak pakai Client Secret seperti web Maxy?

Web Maxy (maxy.academy) menggunakan cara login Google yang berbeda — disebut **Authorization Code Flow** — di mana browser di-redirect ke Google, lalu Google redirect balik ke server. Cara ini butuh `GOOGLE_CLIENT_SECRET`.

Web satelit seperti Flowbuddy menggunakan cara yang lebih simpel — disebut **Implicit Flow** lewat library `@react-oauth/google` — di mana Google langsung memberikan token di browser tanpa redirect bolak-balik ke server. Cara ini **tidak butuh Client Secret sama sekali**, hanya butuh Client ID.

```
Web Maxy (Socialite):
User → redirect ke Google → Google redirect balik → server tukar code → butuh CLIENT SECRET

Web Baru (@react-oauth/google):
User → popup Google di browser → langsung dapat token → tidak perlu tukar → TIDAK butuh CLIENT SECRET
```

Jadi di tutorial ini kamu hanya perlu **Client ID**, bukan Client Secret.

### Langkah-langkahnya:

**1.** Buka [console.cloud.google.com](https://console.cloud.google.com/) — login dengan akun Google yang akan jadi pemilik proyek ini.

**2.** Klik dropdown nama proyek di pojok kiri atas → klik **"New Project"** → beri nama → **Create**.

**3.** Di menu kiri, cari **"APIs & Services"** → pilih **"Credentials"**.

**4.** Klik tombol **"+ CREATE CREDENTIALS"** → pilih **"OAuth client ID"**.

**5.** Pilih **Application type: Web application** → beri nama (contoh: "Web Baru Login").

**6.** Di bagian **"Authorized JavaScript origins"**, klik **ADD URI** dan tambahkan:
   ```
   http://localhost:3000
   ```
   *(Nanti kalau sudah live, tambahkan juga domain aslinya, contoh: `https://webbarumu.com`)*

   > Bagian **"Authorized redirect URIs"** dikosongkan saja — itu hanya untuk cara Socialite (seperti web Maxy), bukan untuk cara yang kita pakai di sini.

**7.** Klik **Create** → akan muncul **Client ID** (formatnya seperti `123456789-abc.apps.googleusercontent.com`).

**8.** Salin **Client ID**-nya saja. Client Secret yang muncul di sebelahnya tidak perlu disalin.

> Setiap domain/aplikasi harus punya Client ID Google yang berbeda. Client ID Flowbuddy tidak bisa dipakai untuk web lain.

---

## Bagian 3 — Siapkan Proyek Next.js

### Install yang dibutuhkan

Buka terminal di folder proyekmu, jalankan:

```bash
npm install @react-oauth/google bcryptjs
npm install --save-dev @types/bcryptjs
```

### Buat file `.env.local`

Di folder root proyekmu, buat file bernama `.env.local` dan isi dengan ini:

```env
# Client ID dari Google Cloud Console (langkah 2 tadi)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=isi_client_id_dari_google_disini

# URL API Maxy (ini tidak perlu diubah)
MAXY_M2M_API_URL=https://cms.maxy.academy/api/m2m

# Service Key yang sudah dimintakan ke tim backend (langkah 1 tadi)
MAXY_SERVICE_KEY=namaapp_secret_key_xxxxx
```

> **Penting:** File `.env.local` jangan di-upload ke GitHub! Pastikan ada di `.gitignore`.

---

## Bagian 4 — Buat Tabel Database

Di database aplikasimu, buat tabel untuk menyimpan data user:

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

Kamu bisa tambahkan kolom lain sesuai kebutuhan aplikasimu (misalnya `department`, `phone`, dll).

---

## Bagian 5 — Buat API di Next.js

Buat dua file API. Ini yang akan "menghubungkan" web barumu ke Maxy.

### File 1: Login Email + Password

Buat file di `app/api/auth/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // sesuaikan dengan koneksi DB-mu

export async function POST(request: Request) {
  const { email, password } = await request.json();

  // Tanya ke Maxy: "Apakah email + password ini valid?"
  const maxyRes = await fetch(`${process.env.MAXY_M2M_API_URL}/auth/verify-credential`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.MAXY_SERVICE_KEY!,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!maxyRes.ok) {
    const err = await maxyRes.json();
    return NextResponse.json({ error: err.error || "Login gagal" }, { status: maxyRes.status });
  }

  const { user: maxyUser } = await maxyRes.json();

  // Simpan/update user di database lokal
  const localUser = await syncUser(email, maxyUser);

  return NextResponse.json({ user: localUser });
}

// Fungsi bantu: cari user di DB lokal, kalau belum ada buat baru
async function syncUser(email: string, maxyUser: any) {
  const existing = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    return { id: row.id, email: row.email, name: row.name, role: row.role };
  }

  // User pertama kali login — buat akun lokal otomatis
  const newId = "u_" + Math.random().toString(36).substring(2, 9);
  await db.execute({
    sql: `INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, 'employee', ?)`,
    args: [newId, email, maxyUser.name, maxyUser.password],
  });

  return { id: newId, email, name: maxyUser.name, role: "employee" };
}
```

---

### File 2: Login Google

Buat file di `app/api/auth/google/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const { credential } = await request.json();

  // Buka "amplop" token dari Google untuk baca isinya
  const payload = decodeGoogleJWT(credential);
  const { email, name, picture } = payload;

  // Tanya ke Maxy: "Apakah email Google ini valid?"
  const maxyRes = await fetch(`${process.env.MAXY_M2M_API_URL}/auth/verify-google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.MAXY_SERVICE_KEY!,
    },
    body: JSON.stringify({ email, name }),
  });

  if (!maxyRes.ok) {
    return NextResponse.json({ error: "Akun tidak dikenali oleh Maxy" }, { status: 401 });
  }

  const { user: maxyUser } = await maxyRes.json();

  // Simpan/update user di database lokal
  const localUser = await syncUser(email, maxyUser, picture);

  return NextResponse.json({ user: localUser });
}

async function syncUser(email: string, maxyUser: any, picture?: string) {
  const existing = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    return { id: row.id, email: row.email, name: row.name, role: row.role, avatarImage: row.avatar_image };
  }

  const newId = "u_" + Math.random().toString(36).substring(2, 9);
  await db.execute({
    sql: `INSERT INTO users (id, email, name, role, password_hash, avatar_image) VALUES (?, ?, ?, 'employee', ?, ?)`,
    args: [newId, email, maxyUser.name, maxyUser.password, picture || null],
  });

  return { id: newId, email, name: maxyUser.name, role: "employee", avatarImage: picture };
}

function decodeGoogleJWT(token: string) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(
    decodeURIComponent(
      atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    )
  );
}
```

---

## Bagian 6 — Buat Halaman Login

Buat komponen halaman login. Ini yang akan dilihat user.

**File:** `components/LoginPage.tsx`

```tsx
"use client";

import { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

export default function LoginPage({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // --- Tombol Login biasa ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res  = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (res.ok) {
      onLogin(data.user); // berhasil — kirim data user ke parent
    } else {
      setError(data.error || "Login gagal");
    }
    setLoading(false);
  };

  // --- Tombol Login Google ---
  const handleGoogle = async (credentialResponse: any) => {
    setLoading(true);
    setError("");

    const res  = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: credentialResponse.credential }),
    });
    const data = await res.json();

    if (res.ok) {
      onLogin(data.user);
    } else {
      setError(data.error || "Login Google gagal");
    }
    setLoading(false);
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <div style={{ maxWidth: 400, margin: "100px auto", padding: 32, border: "1px solid #eee", borderRadius: 16 }}>
        <h2>Masuk ke Aplikasi</h2>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: 12, background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>

        <div style={{ textAlign: "center", margin: "16px 0", color: "#aaa" }}>— atau —</div>

        <GoogleLogin
          onSuccess={handleGoogle}
          onError={() => setError("Login Google gagal")}
          theme="outline"
          size="large"
          shape="pill"
          width="336"
        />
      </div>
    </GoogleOAuthProvider>
  );
}
```

---

## Bagian 7 — Pasang di Halaman Utama

Di halaman utama aplikasimu (misal `app/page.tsx`), pasang seperti ini:

```tsx
"use client";

import { useState } from "react";
import LoginPage from "@/components/LoginPage";

export default function Home() {
  const [user, setUser] = useState<any>(null);

  // Kalau belum login, tampilkan halaman login
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  // Kalau sudah login, tampilkan konten utama
  return (
    <div>
      <h1>Selamat datang, {user.name}!</h1>
      <p>Email: {user.email}</p>
      <button onClick={() => setUser(null)}>Logout</button>
    </div>
  );
}
```

---

## Bagian 8 — Coba Jalankan

```bash
npm run dev
```

Buka browser ke `http://localhost:3000`.

### Tes login email + password:
- Masukkan email dan password akun Maxy Academy yang valid
- Kalau berhasil: muncul halaman selamat datang dengan nama user
- Kalau gagal: muncul pesan error dari Maxy

### Tes login Google:
- Klik tombol "Sign in with Google"
- Pilih akun Google yang emailnya **terdaftar di Maxy Academy**
- Kalau berhasil: langsung masuk

> **Catatan:** Login Google hanya berhasil kalau emailnya memang terdaftar di Maxy Academy. Kalau pakai email Google yang belum pernah daftar di Maxy, akun akan dibuat otomatis di Maxy dengan role member.

---

## Ringkasan Checklist

Tandai satu per satu saat sudah selesai:

**Persiapan (minta ke orang lain):**
- [ ] Service Key sudah ditambahkan ke Maxy backend oleh tim teknis
- [ ] Google OAuth Client ID sudah dibuat di Google Cloud Console

**Coding:**
- [ ] Install package: `npm install @react-oauth/google bcryptjs`
- [ ] Buat `.env.local` dengan 3 variable yang dibutuhkan
- [ ] Buat tabel `users` di database
- [ ] Buat file `app/api/auth/login/route.ts`
- [ ] Buat file `app/api/auth/google/route.ts`
- [ ] Buat komponen `LoginPage.tsx`
- [ ] Pasang `LoginPage` di halaman utama

**Testing:**
- [ ] `npm run dev` berhasil jalan tanpa error
- [ ] Login email + password berhasil
- [ ] Login Google berhasil

---

## Kalau Ada Error

| Yang terjadi | Artinya | Solusinya |
|---|---|---|
| "Akun tidak ditemukan di LMS Maxy" | Email belum terdaftar di Maxy Academy | Daftar dulu di maxy.academy, atau pakai email yang sudah terdaftar |
| "Unauthorized Microservice" | Service Key salah atau belum ditambahkan | Cek kembali ke tim backend Maxy |
| Tombol Google tidak muncul | Client ID salah atau belum diset | Cek `.env.local`, pastikan `NEXT_PUBLIC_GOOGLE_CLIENT_ID` sudah diisi |
| Google popup langsung tutup | Authorized origins belum diset | Pastikan `http://localhost:3000` sudah ditambahkan di Google Cloud Console |
| Error "Failed to fetch" | Server API belum jalan atau URL salah | Pastikan `npm run dev` sudah jalan, cek `MAXY_M2M_API_URL` |
