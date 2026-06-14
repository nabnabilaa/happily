import mysql from 'mysql2/promise';
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const globalForDb = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

const poolOptions: mysql.PoolOptions = process.env.MYSQL_URI 
  ? { uri: process.env.MYSQL_URI, waitForConnections: true, connectionLimit: 2, queueLimit: 0, enableKeepAlive: true, keepAliveInitialDelay: 10000, timezone: 'Z' }
  : {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'happily_productive',
      waitForConnections: true,
      connectionLimit: 2,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      timezone: 'Z'
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
      
      return {
        rows: Array.isArray(rows) ? rows : []
      };
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  },
  
  transaction: async <T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback(connection);
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
