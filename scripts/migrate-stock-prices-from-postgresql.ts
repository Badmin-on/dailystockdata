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

async function migrateStockPrices() {
    console.log('🚀 PostgreSQL → Supabase 주가 데이터 마이그레이션\n');
    console.log('='.repeat(80));
    console.log('\n⚠️  PostgreSQL은 읽기 전용으로 접근합니다 (원본 데이터 보호)\n');

    try {
        await pgClient.connect();
        console.log('✅ PostgreSQL 연결 성공\n');

        // 1. PostgreSQL에서 company_id → code 매핑 (숫자를 문자열로 변환)
        console.log('📋 Step 1: PostgreSQL companies 매핑 가져오기...');
        const pgCompaniesResult = await pgClient.query('SELECT id, code FROM companies');
        const pgIdToCode = new Map(pgCompaniesResult.rows.map(r => [String(r.id), r.code]));
        console.log(`   ${pgIdToCode.size}개 회사 매핑 완료\n`);

        // 2. Supabase에서 code → company_id 매핑
        console.log('📋 Step 2: Supabase companies 매핑 가져오기...');
        const { data: supabaseCompanies } = await supabase
            .from('companies')
            .select('id, code');
        const codeToSupabaseId = new Map(supabaseCompanies?.map(c => [c.code, c.id]) || []);
        console.log(`   ${codeToSupabaseId.size}개 회사 매핑 완료\n`);

        // 3. PostgreSQL에서 주가 데이터 가져오기
        console.log('📊 Step 3: PostgreSQL 주가 데이터 가져오기...');

        const batchSize = 10000;
        let offset = 0;
        let totalProcessed = 0;
        let totalInserted = 0;
        let totalSkipped = 0;

        while (true) {
            const result = await pgClient.query(`
                SELECT company_id, date, close_price, volume
                FROM daily_stock_prices
                ORDER BY date, company_id
                LIMIT $1 OFFSET $2
            `, [batchSize, offset]);

            if (result.rows.length === 0) break;

            console.log(`\n   Batch ${Math.floor(offset / batchSize) + 1}: ${result.rows.length} records`);

            // 4. 데이터 변환
            const records: any[] = [];
            let skipped = 0;

            for (const row of result.rows) {
                // PostgreSQL company_id → code → Supabase company_id
                const code = pgIdToCode.get(String(row.company_id));
                if (!code) {
                    skipped++;
                    continue;
                }

                const supabaseCompanyId = codeToSupabaseId.get(code);
                if (!supabaseCompanyId) {
                    skipped++;
                    continue;
                }

                records.push({
                    company_id: supabaseCompanyId,
                    date: row.date,
                    close_price: row.close_price,
                    volume: row.volume ? String(row.volume) : null,
                });
            }

            console.log(`   Converted: ${records.length} records, Skipped: ${skipped}`);

            // 5. Supabase에 삽입
            if (records.length > 0) {
                const insertBatchSize = 500;
                let inserted = 0;

                for (let i = 0; i < records.length; i += insertBatchSize) {
                    const batch = records.slice(i, i + insertBatchSize);

                    const { error } = await supabase
                        .from('daily_stock_prices')
                        .upsert(batch, {
                            onConflict: 'company_id,date'
                        });

                    if (error) {
                        console.error(`   ❌ Insert error:`, error.message);
                    } else {
                        inserted += batch.length;
                    }
                }

                console.log(`   ✅ Inserted: ${inserted} records`);
                totalInserted += inserted;
            }

            totalProcessed += result.rows.length;
            totalSkipped += skipped;
            offset += batchSize;

            // 진행상황
            if (offset % 50000 === 0) {
                console.log(`\n📈 Progress: ${totalProcessed.toLocaleString()} processed, ${totalInserted.toLocaleString()} inserted`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n🎉 마이그레이션 완료!\n');
        console.log(`Summary:`);
        console.log(`  Processed: ${totalProcessed.toLocaleString()} records`);
        console.log(`  Inserted: ${totalInserted.toLocaleString()} records`);
        console.log(`  Skipped: ${totalSkipped.toLocaleString()} records`);

        // 최종 검증
        const { count } = await supabase
            .from('daily_stock_prices')
            .select('*', { count: 'exact', head: true });

        const { data: dates } = await supabase
            .from('daily_stock_prices')
            .select('date')
            .order('date', { ascending: false })
            .limit(5000);

        const uniqueDates = [...new Set(dates?.map(d => d.date) || [])].sort();

        console.log(`\n  Supabase total: ${count?.toLocaleString()} records`);
        console.log(`  Unique dates: ${uniqueDates.length}`);
        if (uniqueDates.length > 0) {
            console.log(`  Date range: ${uniqueDates[0]} ~ ${uniqueDates[uniqueDates.length - 1]}`);
        }

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await pgClient.end();
        console.log('\n✅ PostgreSQL 연결 종료 (원본 데이터 보호됨)');
    }
}

migrateStockPrices().catch(console.error);
