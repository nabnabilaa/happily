import mysql from 'mysql2/promise';
import dotenv from "dotenv";
import { reviewModeActive, ensureMaskMap, maskRows, unmaskArgs } from './anonymize';

dotenv.config({ path: ".env.local" });

const globalForDb = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

// `connectionLimit: 2` membuat setiap endpoint yang menjalankan puluhan query
// berurutan (dashboard HR, sync extension) menyerialkan dirinya di belakang dua
// koneksi. Yang muncul di layar bukan cuma lambat: permintaan menunggu koneksi
// sampai kehabisan waktu, gagal di tengah jalan, dan task tampak hilang. 10
// masih jauh di bawah batas koneksi paket DB, tapi cukup supaya query paralel
// tidak saling menunggu.
const poolOptions: mysql.PoolOptions = process.env.MYSQL_URI
  ? { uri: process.env.MYSQL_URI, waitForConnections: true, connectionLimit: 10, queueLimit: 0, enableKeepAlive: true, keepAliveInitialDelay: 10000, timezone: 'Z' }
  : {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'happily_productive',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      timezone: 'Z'
    };

const pool = globalForDb.mysqlPool ?? mysql.createPool(poolOptions);

// Kunci zona waktu sesi ke UTC. Tanpa ini `time_zone` ikut SYSTEM, jadi arti
// NOW()/CURDATE()/DEFAULT CURRENT_TIMESTAMP bergantung pada jam host database —
// dan diam-diam berubah kalau DB dipindah ke host lain. Kolom DATETIME di sini
// menyimpan UTC (mysql2 dikonfigurasi `timezone: 'Z'` untuk membacanya), jadi
// UTC adalah satu-satunya nilai yang konsisten. Konversi ke WIB dilakukan di
// lapisan query lewat helper di lib/timeUtils.ts.
pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.mysqlPool = pool;
}

/**
 * Query mentah tanpa penyamaran. HANYA untuk lib/anonymize.ts membangun peta
 * nama palsunya — kalau ia memakai `db.execute`, ia akan memanggil dirinya
 * sendiri untuk mengetahui nama asli yang perlu disamarkan.
 */
const rawExec = async (sql: string, args?: unknown[]): Promise<Record<string, unknown>[]> => {
  const [rows] = await pool.execute(sql, (args ?? []) as any[]);
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
};

/**
 * Parameter INSERT tidak dibalik ke nilai asli.
 *
 * Pembalikan parameter ada supaya nilai palsu yang dikirim balik UI sebagai
 * FILTER tetap menemukan datanya. Pada INSERT tidak ada yang perlu dicocokkan —
 * dan kalau tetap dibalik, orang yang mendaftar memakai email yang kebetulan
 * sama dengan email palsu milik akun lain akan tersimpan memakai email asli
 * akun tersebut. UPDATE/DELETE tetap dibalik karena WHERE-nya perlu cocok.
 */
function isInsert(sql: string): boolean {
  return /^\s*(\/\*.*?\*\/\s*)?insert\b/i.test(sql);
}

export const db = {
  execute: async (query: any, args?: any[]): Promise<{ rows: any[] }> => {
    let sqlString = '';
    let sqlArgs: any[] = [];

    if (typeof query === 'string') {
      sqlString = query;
      sqlArgs = args || [];
    } else {
      sqlString = query.sql;
      sqlArgs = query.args || [];
    }

    // mysql2 does not accept undefined, it requires null
    sqlArgs = sqlArgs.map(arg => arg === undefined ? null : arg);

    try {
      // Mode demo/review: nama, email, foto, dan departemen asli disaring di
      // sini — satu pintu untuk seluruh aplikasi. Lihat lib/anonymize.ts.
      if (await reviewModeActive(rawExec)) {
        const maskMap = await ensureMaskMap(rawExec);
        const patchedArgs = isInsert(sqlString) ? sqlArgs : unmaskArgs(sqlArgs, maskMap);
        const [rows] = await pool.execute(sqlString, patchedArgs as any[]);
        return {
          rows: Array.isArray(rows) ? maskRows(rows as any[], maskMap) : []
        };
      }

      const [rows] = await pool.execute(sqlString, sqlArgs);

      return {
        rows: Array.isArray(rows) ? rows : []
      };
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  },

  /**
   * Query yang HASILNYA tidak disamarkan. Pintu sempit, bukan jalan pintas.
   *
   * Ada satu hal yang tidak bisa dikerjakan lewat `execute` saat mode review
   * menyala: memeriksa password. `lib/anonymize.ts` mengosongkan kolom yang
   * namanya berbau kredensial (`password_hash`, `refresh_token`) supaya hash
   * milik karyawan asli tidak ikut terkirim oleh route yang memakai `SELECT *`.
   * Konsekuensinya, `bcrypt.compare` menerima `null` dan login gagal — diam-diam,
   * karena kegagalannya terlihat persis seperti password salah.
   *
   * Karena itu pemeriksaan kredensial mengambil hash-nya lewat sini, dan HANYA
   * hash-nya: baris yang ditampilkan ke klien tetap datang dari `execute` yang
   * tersamar, jadi orang yang login saat mode review menyala tetap melihat nama
   * palsu.
   *
   * Aturan pakainya: hanya untuk nilai yang dibandingkan di server dan tidak
   * pernah dikirim ke klien. Jangan dipakai untuk mengambil baris yang akan
   * dikembalikan sebagai respons. `scripts/anonymize-verify.ts` memeriksa daftar
   * berkas yang boleh memanggilnya dan gagal kalau ada pemanggil baru.
   */
  executeUnmasked: async (query: { sql: string; args?: any[] }): Promise<{ rows: any[] }> => {
    const rows = await rawExec(query.sql, (query.args ?? []).map(a => (a === undefined ? null : a)));
    return { rows };
  },

  transaction: async <T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // Transaksi memakai `connection` langsung, jadi ia melewati `execute` di
      // atas. Hari ini tidak ada transaksi yang membaca nama user, tapi lubang
      // yang menganga hanya menunggu transaksi berikutnya ditulis — jadi
      // koneksinya dibungkus, bukan diandalkan pada kebiasaan penulisnya.
      const guarded = (await reviewModeActive(rawExec))
        ? await wrapConnectionForAnonymize(connection)
        : connection;
      const result = await callback(guarded);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

async function wrapConnectionForAnonymize(
  connection: mysql.PoolConnection,
): Promise<mysql.PoolConnection> {
  const maskMap = await ensureMaskMap(rawExec);

  const wrapMethod = (method: 'execute' | 'query') => {
    const original = connection[method].bind(connection) as (...a: any[]) => Promise<any>;
    return async (...callArgs: any[]) => {
      const [sql, params] = callArgs;
      const patched =
        Array.isArray(params) && typeof sql === 'string' && !isInsert(sql)
          ? unmaskArgs(params, maskMap)
          : params;
      const result = await original(sql, patched);
      if (Array.isArray(result) && Array.isArray(result[0])) {
        maskRows(result[0] as any[], maskMap);
      }
      return result;
    };
  };

  return new Proxy(connection, {
    get(target, prop, receiver) {
      if (prop === 'execute' || prop === 'query') return wrapMethod(prop);
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
