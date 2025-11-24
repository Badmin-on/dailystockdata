
import { Pool } from 'pg';

// Use environment variables for connection
// Note: In Next.js, we should be careful about creating too many connections in dev mode
// but for this scale, a simple global pool pattern works well.

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10, // Max connections in pool
    idleTimeoutMillis: 30000,
});

// Helper to execute queries
export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
};

export default pool;
