import mysql from 'mysql2/promise';
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const globalForDb = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

const poolOptions: mysql.PoolOptions = process.env.MYSQL_URI 
  ? { uri: process.env.MYSQL_URI, waitForConnections: true, connectionLimit: 50, queueLimit: 0 }
  : {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'happily_productive',
      waitForConnections: true,
      connectionLimit: 50,
      queueLimit: 0
    };

const pool = globalForDb.mysqlPool ?? mysql.createPool(poolOptions);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.mysqlPool = pool;
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
      const [rows] = await pool.execute(sqlString, sqlArgs);
      
      // AUTO-EVENT TRIGGER
      // REMOVED: Auto-emitting on every query causes infinite broadcast loops.
      // Use manual hpEventEmitter.emit in specific route handlers instead.
      // const isMutation = /^(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sqlString.trim());
      // if (isMutation) {
      //    import('@/lib/events').then(m => m.hpEventEmitter.emit('db_update', { type: 'refresh', timestamp: Date.now() })).catch(e => console.error("Event emit failed", e));
      // }

      return {
        rows: Array.isArray(rows) ? rows : []
      };
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }
};
