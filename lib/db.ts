
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not defined in environment variables.');
}

// Check if connecting to Supabase (usually contains 'supabase.co' or region specific host)
const isSupabase = connectionString?.includes('supabase.co') || connectionString?.includes('aws-0-ap-northeast-2');

const pool = new Pool({
    connectionString,
    // Force SSL for Supabase, otherwise respect NODE_ENV
    ssl: isSupabase || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
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
