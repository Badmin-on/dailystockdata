import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkFinancialData() {
    console.log('재무 데이터 확인\n');

    // DL이앤씨 (코드 375500) 확인
    const { data } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, operating_profit, data_source, companies!inner(code, name)')
        .eq('companies.code', '375500')
        .eq('year', 2025)
        .order('scrape_date', { ascending: false })
        .limit(5);

    console.log('DL이앤씨 (375500) 2025년 데이터:');
    data?.forEach(row => {
        console.log(`  ${row.scrape_date} (${row.data_source}): 매출=${row.revenue?.toLocaleString()}, 영익=${row.operating_profit?.toLocaleString()}`);
    });

    // 삼성전자 확인
    const { data: samsung } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, operating_profit, data_source, companies!inner(code, name)')
        .eq('companies.code', '005930')
        .eq('year', 2025)
        .order('scrape_date', { ascending: false })
        .limit(5);

    console.log('\n삼성전자 (005930) 2025년 데이터:');
    samsung?.forEach(row => {
        console.log(`  ${row.scrape_date} (${row.data_source}): 매출=${row.revenue?.toLocaleString()}, 영익=${row.operating_profit?.toLocaleString()}`);
    });

    // 최근 엑셀 복원 데이터 확인
    const { data: recent } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, operating_profit, data_source, companies!inner(code, name)')
        .eq('data_source', 'naver')
        .gte('scrape_date', '2025-07-09')
        .order('scrape_date', { ascending: false })
        .limit(10);

    console.log('\n최근 엑셀 복원 데이터 (naver 소스):');
    recent?.forEach(row => {
        console.log(`  ${row.companies.code} ${row.scrape_date}: 매출=${row.revenue?.toLocaleString()}`);
    });
}

checkFinancialData().catch(console.error);
