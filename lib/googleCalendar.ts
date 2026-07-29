import { db } from "@/lib/db";
import { SQL_WIB_NOW } from "@/lib/timeUtils";

/**
 * Integrasi Google Calendar dua arah.
 *
 * Sebelum ini, "sambungkan kalender" adalah tombol di layar Kalender yang
 * memakai implicit flow: access token cuma hidup di React state, hilang setiap
 * refresh halaman, dan mati satu jam kemudian. Efeknya user harus menekan
 * "Hubungkan" berulang kali dan tidak ada satu pun event yang benar-benar
 * tersinkron — yang ada cuma link "tambahkan ke Google Calendar" per event.
 *
 * Di sini flow-nya diganti ke authorization code + refresh token yang disimpan
 * server-side. Konsekuensinya: user memberi izin SEKALI (di layar login), lalu
 * sinkronisasi berjalan tanpa browser mereka terbuka — termasuk dari cron.
 *
 * Catatan waktu: `calendar_events.start_time` menyimpan jam dinding WIB, bukan
 * UTC (lihat `app/api/calendar/route.ts` yang menulis langsung dari input form,
 * dan klien yang membacanya kembali sebagai waktu lokal). Google menuntut
 * RFC3339 dengan offset eksplisit, jadi setiap penyeberangan batas di file ini
 * melewati `toGoogleDateTime`/`fromGoogleDateTime`. Menganggapnya UTC akan
 * menggeser seluruh jadwal tujuh jam — diam-diam, dan hanya terlihat setelah
 * event masuk ke kalender orang lain.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/** Zona waktu tunggal aplikasi. Sejalan dengan WIB_OFFSET di lib/timeUtils.ts. */
const APP_TIMEZONE = "Asia/Jakarta";
const APP_UTC_OFFSET = "+07:00";

/**
 * Scope yang diminta saat login. `calendar.events` cukup untuk baca-tulis event
 * di kalender yang sudah dimiliki user — ia tidak bisa membuat atau menghapus
 * kalender, dan itu memang batas yang kita inginkan.
 */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

/** Jendela tarik data. Tanpa batas, kalender lama bisa menarik ribuan baris. */
const PULL_WINDOW_PAST_DAYS = 7;
const PULL_WINDOW_FUTURE_DAYS = 90;

export interface GoogleIntegration {
  userId: string;
  googleEmail: string | null;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  syncToken: string | null;
  calendarId: string;
  status: string;
}

// ── Konfigurasi ─────────────────────────────────────────────────────────────

export function googleOAuthConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) &&
      process.env.GOOGLE_CLIENT_SECRET
  );
}

function oauthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Gagal keras, bukan diam. Tanpa client secret pertukaran code selalu ditolak
  // Google dengan "invalid_client" — pesan yang tidak menunjukkan bahwa yang
  // kurang justru ada di .env.local kita sendiri.
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET wajib diisi di .env.local untuk integrasi Google Calendar."
    );
  }
  return { clientId, clientSecret };
}

// ── Konversi waktu ──────────────────────────────────────────────────────────

/** `2026-07-28 09:00:00` (jam dinding WIB) → `2026-07-28T09:00:00+07:00`. */
export function toGoogleDateTime(wallClock: string | Date): string {
  const raw = wallClock instanceof Date
    ? formatWallClock(wallClock)
    : String(wallClock).replace(" ", "T").slice(0, 19);
  const padded = raw.length === 16 ? `${raw}:00` : raw;
  return `${padded}${APP_UTC_OFFSET}`;
}

/** RFC3339 dari Google → `YYYY-MM-DD HH:MM:SS` dalam jam dinding WIB. */
export function fromGoogleDateTime(value: string): string {
  // Tanggal polos (all-day event) tidak punya zona waktu; memasukkannya ke
  // `new Date()` akan diperlakukan sebagai UTC dan mundur sehari di WIB.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value} 00:00:00`;

  const utcMs = new Date(value).getTime();
  return formatWallClock(new Date(utcMs + 7 * 60 * 60 * 1000), true);
}

function formatWallClock(d: Date, asUtcParts = false): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const [y, mo, da, h, mi, s] = asUtcParts
    ? [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    : [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];
  return `${y}-${p(mo)}-${p(da)} ${p(h)}:${p(mi)}:${p(s)}`;
}

// ── Token ───────────────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

/**
 * Menukar authorization code jadi token.
 *
 * `redirect_uri: 'postmessage'` bukan salah ketik — itu nilai yang diwajibkan
 * Google untuk auth-code flow yang dijalankan lewat popup (`@react-oauth/google`
 * memakai mode ini). Mengisinya dengan URL sungguhan akan ditolak dengan
 * "redirect_uri_mismatch".
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri = "postmessage"
): Promise<TokenResponse> {
  const { clientId, clientSecret } = oauthConfig();

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google token exchange gagal: ${data.error_description || data.error || res.status}`);
  }
  return data as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = oauthConfig();

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(`Refresh token ditolak: ${data.error_description || data.error || res.status}`);
    // `invalid_grant` berarti izin dicabut user atau refresh token kedaluwarsa
    // (terjadi tiap 7 hari selama OAuth consent screen masih berstatus Testing).
    // Pemanggil perlu membedakannya dari gangguan jaringan biasa: yang satu
    // butuh user memberi izin ulang, yang lain cukup dicoba lagi nanti.
    err.code = data.error;
    throw err;
  }
  return data as TokenResponse;
}

/** Decode payload id_token tanpa verifikasi tanda tangan. */
export function decodeIdToken(idToken: string): any {
  const part = idToken.split(".")[1];
  if (!part) return null;
  const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  return JSON.parse(json);
}

// ── Penyimpanan integrasi ───────────────────────────────────────────────────

export async function saveIntegration(
  userId: string,
  tokens: TokenResponse,
  googleEmail: string | null
): Promise<boolean> {
  // Google hanya mengirim refresh_token pada consent PERTAMA. Kalau user pernah
  // memberi izin sebelumnya, respons berikutnya tidak memuatnya — menimpa kolom
  // dengan null di situ akan memutus integrasi yang sebenarnya masih sehat.
  if (!tokens.refresh_token) {
    const existing = await getIntegration(userId);
    if (!existing) return false;

    await db.execute({
      sql: `UPDATE google_integrations
            SET access_token = ?, access_token_expires_at = ?, status = 'active',
                error_message = NULL, updated_at = UTC_TIMESTAMP()
            WHERE user_id = ?`,
      args: [tokens.access_token, expiryFrom(tokens.expires_in), userId],
    });
    return true;
  }

  await db.execute({
    sql: `INSERT INTO google_integrations
            (user_id, google_email, refresh_token, access_token, access_token_expires_at, scope, status)
          VALUES (?, ?, ?, ?, ?, ?, 'active')
          ON DUPLICATE KEY UPDATE
            google_email = VALUES(google_email),
            refresh_token = VALUES(refresh_token),
            access_token = VALUES(access_token),
            access_token_expires_at = VALUES(access_token_expires_at),
            scope = VALUES(scope),
            status = 'active',
            error_message = NULL,
            updated_at = UTC_TIMESTAMP()`,
    args: [
      userId,
      googleEmail,
      tokens.refresh_token,
      tokens.access_token,
      expiryFrom(tokens.expires_in),
      tokens.scope || GOOGLE_SCOPES,
    ],
  });
  return true;
}

function expiryFrom(expiresInSecs: number): string {
  // Dikurangi satu menit supaya token tidak kedaluwarsa tepat di tengah request.
  const at = new Date(Date.now() + (expiresInSecs - 60) * 1000);
  return at.toISOString().slice(0, 19).replace("T", " ");
}

export async function getIntegration(userId: string): Promise<GoogleIntegration | null> {
  const res = await db.execute({
    sql: `SELECT * FROM google_integrations WHERE user_id = ?`,
    args: [userId],
  });
  const row = res.rows[0];
  if (!row) return null;

  return {
    userId: String(row.user_id),
    googleEmail: row.google_email ?? null,
    refreshToken: String(row.refresh_token),
    accessToken: row.access_token ?? null,
    accessTokenExpiresAt: row.access_token_expires_at ? new Date(row.access_token_expires_at) : null,
    syncToken: row.sync_token ?? null,
    calendarId: row.calendar_id || "primary",
    status: row.status || "active",
  };
}

export async function markIntegrationNeedsReconsent(userId: string, message: string) {
  await db.execute({
    sql: `UPDATE google_integrations
          SET status = 'needs_reconsent', error_message = ?, updated_at = UTC_TIMESTAMP()
          WHERE user_id = ?`,
    args: [message.slice(0, 500), userId],
  });
}

export async function disconnectIntegration(userId: string) {
  const integration = await getIntegration(userId);
  if (integration) {
    // Best-effort: kalau pencabutan di sisi Google gagal, baris lokal tetap
    // harus hilang — kalau tidak, UI menampilkan "tersambung" untuk integrasi
    // yang sudah tidak dipakai siapa pun.
    try {
      await fetch(REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: integration.refreshToken }),
      });
    } catch (e) {
      console.error("Google revoke warning:", e);
    }
  }
  await db.execute({ sql: `DELETE FROM google_integrations WHERE user_id = ?`, args: [userId] });
  await db.execute({
    sql: `UPDATE calendar_events SET google_event_id = NULL, google_synced_at = NULL
          WHERE creator_id = ? AND source = 'flowbee'`,
    args: [userId],
  });
  // Event yang aslinya milik Google tidak punya arti tanpa integrasinya.
  await db.execute({
    sql: `DELETE FROM calendar_events WHERE creator_id = ? AND source = 'google'`,
    args: [userId],
  });
}

/** Access token yang dijamin masih hidup; memperbarui lewat refresh bila perlu. */
async function getAccessToken(integration: GoogleIntegration): Promise<string> {
  const stillValid =
    integration.accessToken &&
    integration.accessTokenExpiresAt &&
    integration.accessTokenExpiresAt.getTime() > Date.now();

  if (stillValid) return integration.accessToken as string;

  const tokens = await refreshAccessToken(integration.refreshToken);
  await db.execute({
    sql: `UPDATE google_integrations
          SET access_token = ?, access_token_expires_at = ?, status = 'active',
              error_message = NULL, updated_at = UTC_TIMESTAMP()
          WHERE user_id = ?`,
    args: [tokens.access_token, expiryFrom(tokens.expires_in), integration.userId],
  });
  return tokens.access_token;
}

// ── Pemanggilan Calendar API ────────────────────────────────────────────────

async function callCalendar(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || `Calendar API ${res.status}`);
    err.status = res.status;
    err.reason = data?.error?.errors?.[0]?.reason;
    throw err;
  }
  return data;
}

function toGooglePayload(ev: any) {
  return {
    summary: ev.title,
    description: ev.description || undefined,
    location: ev.location || undefined,
    start: { dateTime: toGoogleDateTime(ev.start_time), timeZone: APP_TIMEZONE },
    end: { dateTime: toGoogleDateTime(ev.end_time), timeZone: APP_TIMEZONE },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: Number(ev.notification_offset_minutes) || 15 }],
    },
    // Menandai asal event supaya kalau nanti ditarik kembali kita tahu ini
    // bukan event asing yang perlu diimpor ulang.
    extendedProperties: { private: { flowbeeEventId: String(ev.id) } },
  };
}

// ── Mesin sinkronisasi ──────────────────────────────────────────────────────

export interface SyncResult {
  pulled: number;
  pushed: number;
  updated: number;
  deleted: number;
  status: "ok" | "needs_reconsent" | "not_connected" | "error";
  message?: string;
}

/**
 * Sinkronisasi dua arah untuk satu user. Aman dipanggil berulang: pencocokan
 * memakai `google_event_id`, jadi event yang sudah pernah menyeberang tidak
 * pernah terduplikasi.
 */
export async function syncUserCalendar(userId: string): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, updated: 0, deleted: 0, status: "ok" };

  const integration = await getIntegration(userId);
  if (!integration) return { ...result, status: "not_connected" };

  let accessToken: string;
  try {
    accessToken = await getAccessToken(integration);
  } catch (e: any) {
    if (e.code === "invalid_grant") {
      await markIntegrationNeedsReconsent(userId, e.message);
      return { ...result, status: "needs_reconsent", message: e.message };
    }
    return { ...result, status: "error", message: e.message };
  }

  try {
    await drainDeletions(userId, integration, accessToken, result);
    await pullFromGoogle(userId, integration, accessToken, result);
    await pushToGoogle(userId, integration, accessToken, result);
    await pushInvitedEventsToGoogle(userId, integration, accessToken, result);

    await db.execute({
      sql: `UPDATE google_integrations SET last_synced_at = UTC_TIMESTAMP(), status = 'active',
            error_message = NULL, updated_at = UTC_TIMESTAMP() WHERE user_id = ?`,
      args: [userId],
    });
    return result;
  } catch (e: any) {
    if (e.status === 401 || e.status === 403) {
      await markIntegrationNeedsReconsent(userId, e.message);
      return { ...result, status: "needs_reconsent", message: e.message };
    }
    await db.execute({
      sql: `UPDATE google_integrations SET error_message = ?, updated_at = UTC_TIMESTAMP() WHERE user_id = ?`,
      args: [String(e.message).slice(0, 500), userId],
    });
    return { ...result, status: "error", message: e.message };
  }
}

async function pullFromGoogle(
  userId: string,
  integration: GoogleIntegration,
  accessToken: string,
  result: SyncResult
) {
  const calendarId = encodeURIComponent(integration.calendarId);
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  let useSyncToken = Boolean(integration.syncToken);

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ singleEvents: "true", showDeleted: "true", maxResults: "250" });
    if (pageToken) params.set("pageToken", pageToken);

    if (useSyncToken && integration.syncToken) {
      params.set("syncToken", integration.syncToken);
    } else {
      // Google menolak kombinasi syncToken dengan filter waktu, jadi keduanya
      // tidak pernah dikirim bersamaan.
      params.set("timeMin", isoDaysFromNow(-PULL_WINDOW_PAST_DAYS));
      params.set("timeMax", isoDaysFromNow(PULL_WINDOW_FUTURE_DAYS));
      params.set("orderBy", "startTime");
    }

    let data: any;
    try {
      data = await callCalendar(accessToken, `/calendars/${calendarId}/events?${params}`);
    } catch (e: any) {
      // 410 Gone: sync token basi. Google meminta kita mengulang dari nol —
      // sekali, lalu lanjut normal.
      if (e.status === 410 && useSyncToken) {
        useSyncToken = false;
        pageToken = undefined;
        await db.execute({
          sql: `UPDATE google_integrations SET sync_token = NULL WHERE user_id = ?`,
          args: [userId],
        });
        continue;
      }
      throw e;
    }

    for (const gEvent of data.items || []) {
      await applyGoogleEvent(userId, gEvent, result);
    }

    pageToken = data.nextPageToken;
    nextSyncToken = data.nextSyncToken || nextSyncToken;
    if (!pageToken) break;
  }

  if (nextSyncToken) {
    await db.execute({
      sql: `UPDATE google_integrations SET sync_token = ? WHERE user_id = ?`,
      args: [nextSyncToken, userId],
    });
  }
}

async function applyGoogleEvent(userId: string, gEvent: any, result: SyncResult) {
  const existingRes = await db.execute({
    sql: `SELECT id, source, updated_at, google_synced_at FROM calendar_events
          WHERE google_event_id = ? AND creator_id = ?`,
    args: [gEvent.id, userId],
  });
  const existing = existingRes.rows[0];

  if (gEvent.status === "cancelled") {
    if (existing) {
      await db.execute({ sql: `DELETE FROM calendar_events WHERE id = ?`, args: [existing.id] });
      result.deleted++;
    }
    return;
  }

  // Event tanpa waktu mulai (kalender ulang tahun, item aneh) tidak punya
  // tempat di grid kalender kita.
  const startRaw = gEvent.start?.dateTime || gEvent.start?.date;
  const endRaw = gEvent.end?.dateTime || gEvent.end?.date;
  if (!startRaw || !endRaw) return;

  const startTime = fromGoogleDateTime(startRaw);
  const endTime = fromGoogleDateTime(endRaw);
  const title = gEvent.summary || "(Tanpa judul)";
  const isAllDay = Boolean(gEvent.start?.date);

  if (!existing) {
    const id = "gcal_" + String(gEvent.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 60);
    await db.execute({
      sql: `INSERT INTO calendar_events
              (id, creator_id, title, description, start_time, end_time, location,
               is_all_day, source, google_event_id, google_synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'google', ?, UTC_TIMESTAMP())
            ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      args: [id, userId, title, gEvent.description || "", startTime, endTime,
             gEvent.location || null, isAllDay ? 1 : 0, gEvent.id],
    });
    result.pulled++;
    return;
  }

  // Event asal Flowbee yang diubah di Google: perubahan tetap diterima, tapi
  // hanya kalau versi Google memang lebih baru dari yang terakhir kita kirim.
  // Tanpa penjagaan ini, tarikan yang datang tepat setelah dorongan akan
  // menimpa suntingan lokal yang belum sempat terkirim.
  const googleUpdated = gEvent.updated ? new Date(gEvent.updated).getTime() : 0;
  const localSynced = existing.google_synced_at ? new Date(existing.google_synced_at).getTime() : 0;
  if (existing.source === "flowbee" && googleUpdated <= localSynced) return;

  await db.execute({
    sql: `UPDATE calendar_events
          SET title = ?, description = ?, start_time = ?, end_time = ?, location = ?,
              is_all_day = ?, google_synced_at = UTC_TIMESTAMP()
          WHERE id = ?`,
    args: [title, gEvent.description || "", startTime, endTime, gEvent.location || null,
           isAllDay ? 1 : 0, existing.id],
  });
  result.updated++;
}

async function pushToGoogle(
  userId: string,
  integration: GoogleIntegration,
  accessToken: string,
  result: SyncResult
) {
  const calendarId = encodeURIComponent(integration.calendarId);

  // Hanya event yang lahir di Flowbee. Event asal Google tidak pernah didorong
  // balik — itulah yang membuat sinkronisasi tidak berputar tanpa henti.
  const pendingRes = await db.execute({
    sql: `SELECT * FROM calendar_events
          WHERE creator_id = ? AND source = 'flowbee'
            AND start_time >= DATE_SUB(${SQL_WIB_NOW}, INTERVAL ? DAY)
            AND (google_event_id IS NULL OR google_synced_at IS NULL OR updated_at > google_synced_at)
          ORDER BY start_time ASC
          LIMIT 100`,
    args: [userId, PULL_WINDOW_PAST_DAYS],
  });

  for (const ev of pendingRes.rows) {
    const payload = toGooglePayload(ev);

    if (ev.google_event_id) {
      try {
        await callCalendar(accessToken, `/calendars/${calendarId}/events/${encodeURIComponent(ev.google_event_id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        result.updated++;
      } catch (e: any) {
        // Dihapus langsung dari Google: lepaskan tautannya supaya putaran
        // berikutnya membuat ulang, bukan menabrak 404 selamanya.
        if (e.status === 404 || e.status === 410) {
          await db.execute({
            sql: `UPDATE calendar_events SET google_event_id = NULL, google_synced_at = NULL WHERE id = ?`,
            args: [ev.id],
          });
          continue;
        }
        throw e;
      }
    } else {
      const created = await callCalendar(accessToken, `/calendars/${calendarId}/events`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await db.execute({
        sql: `UPDATE calendar_events SET google_event_id = ? WHERE id = ?`,
        args: [created.id, ev.id],
      });
      result.pushed++;
    }

    await db.execute({
      sql: `UPDATE calendar_events SET google_synced_at = UTC_TIMESTAMP() WHERE id = ?`,
      args: [ev.id],
    });
  }
}

/**
 * Menyalin agenda yang mengundang user ini ke Google Calendar miliknya.
 *
 * Dikerjakan dari sisi penerima, bukan difan-out dari request pembuat acara.
 * Alasannya dua: menyentuh kalender seseorang hanya sah dengan tokennya
 * sendiri, dan mengundang seluruh perusahaan tidak boleh berarti request
 * "Buat Agenda" menunggu ratusan panggilan API selesai. Konsekuensinya salinan
 * itu muncul saat putaran sinkronisasi peserta berikutnya — seketika kalau
 * mereka sedang membuka Flowbee, paling lambat satu siklus cron.
 *
 * Tidak ada email undangan yang dikirim: `attendees` sengaja tidak pernah masuk
 * payload, jadi Google memperlakukan salinan ini sebagai event biasa milik user.
 */
async function pushInvitedEventsToGoogle(
  userId: string,
  integration: GoogleIntegration,
  accessToken: string,
  result: SyncResult
) {
  const calendarId = encodeURIComponent(integration.calendarId);

  const res = await db.execute({
    sql: `SELECT e.*, ca.google_event_id AS attendee_google_event_id
          FROM calendar_events e
          JOIN calendar_attendees ca ON ca.event_id = e.id
          WHERE ca.user_id = ? AND e.creator_id <> ? AND e.source = 'flowbee'
            AND e.start_time >= DATE_SUB(${SQL_WIB_NOW}, INTERVAL ? DAY)
            AND (ca.google_event_id IS NULL OR ca.google_synced_at IS NULL
                 OR e.updated_at > ca.google_synced_at)
          ORDER BY e.start_time ASC
          LIMIT 100`,
    args: [userId, userId, PULL_WINDOW_PAST_DAYS],
  });

  for (const ev of res.rows) {
    const payload = toGooglePayload(ev);
    const existingId = ev.attendee_google_event_id;

    if (existingId) {
      try {
        await callCalendar(accessToken, `/calendars/${calendarId}/events/${encodeURIComponent(existingId)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        result.updated++;
      } catch (e: any) {
        // Peserta menghapus salinannya sendiri dari Google. Itu keputusan
        // mereka atas kalender mereka — jangan dibuat ulang tiap 15 menit.
        if (e.status === 404 || e.status === 410) {
          await db.execute({
            sql: `UPDATE calendar_attendees SET google_synced_at = UTC_TIMESTAMP()
                  WHERE event_id = ? AND user_id = ?`,
            args: [ev.id, userId],
          });
          continue;
        }
        throw e;
      }
    } else {
      const created = await callCalendar(accessToken, `/calendars/${calendarId}/events`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await db.execute({
        sql: `UPDATE calendar_attendees SET google_event_id = ? WHERE event_id = ? AND user_id = ?`,
        args: [created.id, ev.id, userId],
      });
      result.pushed++;
    }

    await db.execute({
      sql: `UPDATE calendar_attendees SET google_synced_at = UTC_TIMESTAMP()
            WHERE event_id = ? AND user_id = ?`,
      args: [ev.id, userId],
    });
  }
}

/** Menitipkan penghapusan supaya dikerjakan pemilik kalendernya sendiri nanti. */
export async function queueGoogleEventDeletion(userId: string, googleEventId: string) {
  if (!googleEventId) return;
  await db.execute({
    sql: `INSERT INTO google_event_deletions (user_id, google_event_id) VALUES (?, ?)`,
    args: [userId, googleEventId],
  });
}

async function drainDeletions(
  userId: string,
  integration: GoogleIntegration,
  accessToken: string,
  result: SyncResult
) {
  const pending = await db.execute({
    sql: `SELECT id, google_event_id FROM google_event_deletions
          WHERE user_id = ? AND attempts < 5 ORDER BY id ASC LIMIT 50`,
    args: [userId],
  });

  for (const row of pending.rows) {
    try {
      await callCalendar(
        accessToken,
        `/calendars/${encodeURIComponent(integration.calendarId)}/events/${encodeURIComponent(String(row.google_event_id))}`,
        { method: "DELETE" }
      );
      result.deleted++;
      await db.execute({ sql: `DELETE FROM google_event_deletions WHERE id = ?`, args: [row.id] });
    } catch (e: any) {
      // Sudah tidak ada di sana: tujuannya tercapai, antreannya boleh bersih.
      if (e.status === 404 || e.status === 410) {
        await db.execute({ sql: `DELETE FROM google_event_deletions WHERE id = ?`, args: [row.id] });
        continue;
      }
      // Batas percobaan mencegah satu baris rusak dicoba selamanya tiap siklus.
      await db.execute({
        sql: `UPDATE google_event_deletions SET attempts = attempts + 1 WHERE id = ?`,
        args: [row.id],
      });
    }
  }
}

/**
 * Mendorong satu event ke Google segera setelah dibuat atau diubah di Flowbee.
 *
 * Ada supaya user tidak perlu menunggu cron berikutnya untuk melihat event-nya
 * muncul di Google Calendar. Best-effort: kegagalan di sini tidak boleh
 * membatalkan penyimpanan event, dan putaran sinkronisasi berikutnya akan
 * menyusulkannya lewat penanda `google_synced_at` yang belum terisi.
 */
export async function pushEventToGoogle(userId: string, eventId: string): Promise<void> {
  try {
    const integration = await getIntegration(userId);
    if (!integration || integration.status !== "active") return;

    const accessToken = await getAccessToken(integration);
    const res = await db.execute({
      sql: `SELECT * FROM calendar_events WHERE id = ? AND creator_id = ? AND source = 'flowbee'`,
      args: [eventId, userId],
    });
    const ev = res.rows[0];
    if (!ev) return;

    const calendarId = encodeURIComponent(integration.calendarId);
    const payload = toGooglePayload(ev);

    if (ev.google_event_id) {
      await callCalendar(accessToken, `/calendars/${calendarId}/events/${encodeURIComponent(ev.google_event_id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      const created = await callCalendar(accessToken, `/calendars/${calendarId}/events`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await db.execute({
        sql: `UPDATE calendar_events SET google_event_id = ? WHERE id = ?`,
        args: [created.id, eventId],
      });
    }

    await db.execute({
      sql: `UPDATE calendar_events SET google_synced_at = UTC_TIMESTAMP() WHERE id = ?`,
      args: [eventId],
    });
  } catch (e: any) {
    console.error("Google Calendar push warning:", e?.message || e);
  }
}

/**
 * Menghapus event di Google saat dihapus di Flowbee. Sengaja best-effort:
 * kegagalan di sini tidak boleh membuat penghapusan lokal ikut gagal.
 */
export async function deleteGoogleEvent(userId: string, googleEventId: string): Promise<void> {
  try {
    const integration = await getIntegration(userId);
    if (!integration || !googleEventId) return;

    const accessToken = await getAccessToken(integration);
    await callCalendar(
      accessToken,
      `/calendars/${encodeURIComponent(integration.calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      { method: "DELETE" }
    );
  } catch (e: any) {
    if (e?.status === 404 || e?.status === 410) return;
    console.error("Google Calendar delete warning:", e?.message || e);
  }
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}
