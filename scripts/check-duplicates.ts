import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkDuplicates() {
    console.log('중복 데이터 확인\n');

    // DL이앤씨 (375500) 2025년 데이터 확인
    const { data } = await supabase
        .from('financial_data_extended')
        .select('id, company_id, year, scrape_date, revenue, operating_profit, data_source, companies!inner(code, name)')
        .eq('companies.code', '375500')
        .eq('year', 2025)
        .in('scrape_date', ['2025-12-02', '2025-12-03'])
        .order('scrape_date', { ascending: false });

    console.log('DL이앤씨 (375500) 2025년 데이터:');
    console.log(`총 ${data?.length}개 레코드\n`);

    data?.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`  날짜: ${row.scrape_date}`);
        console.log(`  소스: ${row.data_source}`);
        console.log(`  매출: ${row.revenue?.toLocaleString()}`);
        console.log(`  영익: ${row.operating_profit?.toLocaleString()}`);
        console.log('');
    });

    // 2025-12-02와 2025-12-03 날짜의 중복 확인
    const { data: duplicates } = await supabase
        .from('financial_data_extended')
        .select('company_id, year, scrape_date, data_source, companies!inner(code, name)')
        .eq('year', 2025)
        .in('scrape_date', ['2025-12-02', '2025-12-03'])
        .order('company_id');

    // company_id + year + scrape_date 조합으로 그룹화
    const grouped = new Map<string, any[]>();
    duplicates?.forEach(row => {
        const key = `${row.company_id}-${row.year}-${row.scrape_date}`;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(row);
    });

    // 중복 찾기
    console.log('\n중복 데이터 (같은 회사, 같은 연도, 같은 날짜):');
    let duplicateCount = 0;
    grouped.forEach((rows, key) => {
        if (rows.length > 1) {
            duplicateCount++;
            if (duplicateCount <= 10) {
                console.log(`\n${rows[0].companies.name} (${rows[0].companies.code}) - ${rows[0].scrape_date}:`);
                rows.forEach(r => {
                    console.log(`  - data_source: ${r.data_source}`);
                });
            }
        }
    });

    console.log(`\n총 ${duplicateCount}개 중복 조합 발견`);
}

checkDuplicates().catch(console.error);
