#!/bin/bash
#
# Pemanggil pekerjaan terjadwal untuk hosting cPanel.
#
# ── Kenapa lewat skrip, bukan `curl` langsung di kolom cron cPanel ───────────
#
# Perintah cron terlihat apa adanya di panel, ikut tersalin ke email laporan,
# dan tersimpan di crontab yang bisa dibaca proses lain di server bersama. Menulis
# `?secret=...` di sana berarti menaruh kunci yang membuka SELURUH endpoint cron
# di empat tempat sekaligus. Skrip ini membacanya dari `.env.local`, berkas yang
# sama yang dipakai aplikasinya dan tidak pernah masuk git.
#
# Perilakunya sengaja: DIAM saat berhasil, BERISIK saat gagal. cron mengirim
# email hanya kalau perintahnya mengeluarkan sesuatu — jadi kotak masukmu sunyi
# selama semuanya berjalan, dan berbunyi tepat saat ada yang perlu kamu tahu.
#
# ── Pakai ───────────────────────────────────────────────────────────────────
#
#   bash scripts/cpanel-cron.sh morning    # tantangan, check-in, penalti, HR alert
#   bash scripts/cpanel-cron.sh midday     # cek yang belum bergerak
#   bash scripts/cpanel-cron.sh weekly     # rekap mingguan
#   bash scripts/cpanel-cron.sh monthly    # rekap bulanan
#   bash scripts/cpanel-cron.sh calendar   # sinkron Google Calendar
#
# Uji manual dulu sebelum dijadwalkan — keluarannya lengkap kalau dipanggil
# dengan --verbose:
#
#   bash scripts/cpanel-cron.sh morning --verbose

set -uo pipefail

JOB="${1:-}"
VERBOSE="${2:-}"

# Direktori skrip → akar aplikasi, supaya cron boleh dijalankan dari mana saja.
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$APP_ROOT/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "GAGAL: $ENV_FILE tidak ditemukan. Buat berkas env di server dulu." >&2
  exit 1
fi

# Dibaca baris per baris, bukan `source`: berkas env boleh memuat nilai dengan
# spasi, tanda kutip, dan karakter yang akan dieksekusi shell kalau di-source.
read_env() {
  local key="$1"
  local line
  line="$(grep -m1 "^${key}=" "$ENV_FILE" || true)"
  [ -z "$line" ] && return 0
  # Buang nama variabel, lalu tanda kutip di kedua ujung kalau ada.
  line="${line#*=}"
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  printf '%s' "$line"
}

BASE_URL="$(read_env CRON_BASE_URL)"
SECRET="$(read_env CRON_SECRET)"

if [ -z "$BASE_URL" ]; then
  echo "GAGAL: CRON_BASE_URL kosong di .env.local" >&2
  exit 1
fi

case "$JOB" in
  morning)  PATH_QS="/api/cron/daily-runner?slot=morning" ;;
  midday)   PATH_QS="/api/cron/daily-runner?slot=midday" ;;
  weekly)   PATH_QS="/api/cron/report-recap?type=weekly" ;;
  monthly)  PATH_QS="/api/cron/report-recap?type=monthly" ;;
  calendar) PATH_QS="/api/cron/google-calendar-sync" ;;
  *)
    echo "GAGAL: pekerjaan '$JOB' tidak dikenal." >&2
    echo "Pilihan: morning, midday, weekly, monthly, calendar" >&2
    exit 1
    ;;
esac

# Kunci ditaruh di header, bukan di query string: query string ikut tercatat di
# access log Apache dan di log proxy mana pun yang dilewatinya. Endpoint menerima
# kedua bentuk (lihat lib/cronAuth.ts).
AUTH_HEADER="Authorization: Bearer ${SECRET}"

URL="${BASE_URL%/}${PATH_QS}"

# --max-time menahan pekerjaan yang menggantung: tanpa itu, satu panggilan yang
# tidak pernah dijawab akan menumpuk proses cron sampai jadwal berikutnya.
RESPONSE="$(curl -sS --max-time 300 -w '\n__HTTP__%{http_code}' \
  -H "$AUTH_HEADER" -H 'Accept: application/json' "$URL" 2>&1)"
CURL_EXIT=$?

HTTP_CODE="$(printf '%s' "$RESPONSE" | sed -n 's/.*__HTTP__\([0-9]*\)$/\1/p')"
BODY="$(printf '%s' "$RESPONSE" | sed 's/__HTTP__[0-9]*$//')"

STAMP="$(date '+%Y-%m-%d %H:%M:%S %Z')"

if [ $CURL_EXIT -ne 0 ]; then
  echo "[$STAMP] $JOB GAGAL menghubungi server (curl keluar $CURL_EXIT)" >&2
  echo "$BODY" >&2
  exit 1
fi

if [ "$HTTP_CODE" != "200" ]; then
  echo "[$STAMP] $JOB dijawab HTTP $HTTP_CODE" >&2
  # 401 hampir selalu berarti CRON_SECRET di server berbeda dengan yang di sini.
  [ "$HTTP_CODE" = "401" ] && echo "Periksa CRON_SECRET di .env.local dan di environment aplikasi." >&2
  echo "$BODY" >&2
  exit 1
fi

# Berhasil: diam, kecuali diminta bicara.
if [ "$VERBOSE" = "--verbose" ]; then
  echo "[$STAMP] $JOB OK"
  echo "$BODY"
fi

exit 0
