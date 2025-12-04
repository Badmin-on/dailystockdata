import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const configFile = fs.readFileSync('postgreSQLID.txt', 'utf-8');
const pgConfig: any = {};
configFile.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        pgConfig[key.trim()] = value.trim();
    }
});

const pgClient = new Client({
    host: pgConfig.DB_HOST,
    port: parseInt(pgConfig.DB_PORT),
    database: pgConfig.DB_NAME,
    user: pgConfig.DB_USER,
    password: pgConfig.STOCK_USER_PASSWORD,
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function debugMapping() {
    try {
        await pgClient.connect();
        console.log('Connected to PostgreSQL\n');

        // PostgreSQL companies
        console.log('PostgreSQL companies (first 10):');
        const pgResult = await pgClient.query('SELECT id, code, name FROM companies ORDER BY id LIMIT 10');
        pgResult.rows.forEach(r => {
            console.log(`  PG ID ${r.id}: ${r.code} (${r.name})`);
        });

        // Supabase companies
        console.log('\nSupabase companies (first 10):');
        const { data: sbCompanies } = await supabase
            .from('companies')
            .select('id, code, name')
            .order('id')
            .limit(10);

        sbCompanies?.forEach(c => {
            console.log(`  SB ID ${c.id}: ${c.code} (${c.name})`);
        });

        // Check matching
        console.log('\nMatching test (삼성전자 005930):');
        const pgSamsung = await pgClient.query('SELECT id, code, name FROM companies WHERE code = $1', ['005930']);
        console.log('  PostgreSQL:', pgSamsung.rows[0]);

        const { data: sbSamsung } = await supabase
            .from('companies')
            .select('id, code, name')
            .eq('code', '005930')
            .single();
        console.log('  Supabase:', sbSamsung);

        // Sample stock price
        console.log('\nSample stock price from PostgreSQL:');
        const samplePrice = await pgClient.query(`
            SELECT sp.*, c.code, c.name
            FROM daily_stock_prices sp
            JOIN companies c ON sp.company_id = c.id
            LIMIT 5
        `);
        samplePrice.rows.forEach(r => {
            console.log(`  ${r.date}: ${r.code} (${r.name}) - ${r.close_price}원`);
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await pgClient.end();
    }
}

debugMapping().catch(console.error);
