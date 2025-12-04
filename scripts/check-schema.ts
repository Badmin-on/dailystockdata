import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkSchema() {
    console.log('🔍 Checking financial_data_extended schema\n');

    // 샘플 데이터 조회
    const { data, error } = await supabase
        .from('financial_data_extended')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Sample record:');
        console.log(JSON.stringify(data[0], null, 2));

        console.log('\n\nAll columns:');
        Object.keys(data[0]).forEach(key => {
            console.log(`  - ${key}: ${typeof data[0][key]}`);
        });
    }

    // 날짜별 개수 확인
    console.log('\n\n날짜별 레코드 개수:');
    const { data: allData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .limit(10000);

    const dateCounts = new Map<string, number>();
    allData?.forEach(row => {
        const count = dateCounts.get(row.scrape_date) || 0;
        dateCounts.set(row.scrape_date, count + 1);
    });

    Array.from(dateCounts.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 20)
        .forEach(([date, count]) => {
            console.log(`  ${date}: ${count} records`);
        });
}

checkSchema().catch(console.error);
