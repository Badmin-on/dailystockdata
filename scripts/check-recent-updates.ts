import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkRecentUpdates() {
    console.log('최근 업데이트 확인\n');

    // SK하이닉스 최근 데이터 확인
    const { data: skhynix } = await supabase
        .from('companies')
        .select('id')
        .eq('code', '000660')
        .single();

    if (!skhynix) {
        console.log('SK하이닉스를 찾을 수 없습니다.');
        return;
    }

    const { data: recentData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, operating_profit, data_source, created_at, updated_at')
        .eq('company_id', skhynix.id)
        .eq('year', 2025)
        .order('created_at', { ascending: false })
        .limit(20);

    console.log('SK하이닉스 (000660) 최근 업데이트:');
    console.log('');

    const grouped = new Map<string, any[]>();
    recentData?.forEach(row => {
        if (!grouped.has(row.scrape_date)) {
            grouped.set(row.scrape_date, []);
        }
        grouped.get(row.scrape_date)!.push(row);
    });

    const dates = Array.from(grouped.keys()).sort().reverse();

    dates.forEach(date => {
        const rows = grouped.get(date)!;
        console.log(`${date}:`);
        rows.forEach(row => {
            const revenue = row.revenue / 100_000_000;
            const opProfit = row.operating_profit / 100_000_000;
            console.log(`  ${row.data_source}: 매출=${revenue.toFixed(0)}억, 영익=${opProfit.toFixed(0)}억`);
            console.log(`    생성: ${row.created_at}`);
            console.log(`    수정: ${row.updated_at || 'N/A'}`);
        });
        console.log('');
    });

    // 0인 데이터가 언제 생성되었는지 확인
    const { data: zeroData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, data_source, created_at')
        .eq('company_id', skhynix.id)
        .eq('year', 2025)
        .eq('revenue', 0)
        .eq('operating_profit', 0)
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('\n0 값 데이터 생성 시간:');
    zeroData?.forEach(row => {
        console.log(`  ${row.scrape_date} (${row.data_source}): ${row.created_at}`);
    });
}

checkRecentUpdates().catch(console.error);
