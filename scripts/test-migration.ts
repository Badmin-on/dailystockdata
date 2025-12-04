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

async function testMigration() {
    try {
        await pgClient.connect();
        console.log('Connected\n');

        // Get mappings
        const pgCompaniesResult = await pgClient.query('SELECT id, code FROM companies');
        const pgIdToCode = new Map(pgCompaniesResult.rows.map(r => [r.id, r.code]));
        console.log(`PostgreSQL companies: ${pgIdToCode.size}`);

        const { data: supabaseCompanies } = await supabase
            .from('companies')
            .select('id, code');
        const codeToSupabaseId = new Map(supabaseCompanies?.map(c => [c.code, c.id]) || []);
        console.log(`Supabase companies: ${codeToSupabaseId.size}\n`);

        // Test with first 10 records
        const result = await pgClient.query(`
            SELECT company_id, date, close_price, volume
            FROM daily_stock_prices
            ORDER BY date DESC
            LIMIT 10
        `);

        console.log('Testing first 10 records:\n');
        let success = 0;
        let failed = 0;

        for (const row of result.rows) {
            const code = pgIdToCode.get(row.company_id);
            const supabaseId = code ? codeToSupabaseId.get(code) : null;

            console.log(`PG ID ${row.company_id} → Code ${code} → SB ID ${supabaseId}`);

            if (supabaseId) {
                success++;
            } else {
                failed++;
                console.log(`  ❌ FAILED: PG ID ${row.company_id}, Code: ${code}`);
            }
        }

        console.log(`\nSuccess: ${success}, Failed: ${failed}`);

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await pgClient.end();
    }
}

testMigration().catch(console.error);
