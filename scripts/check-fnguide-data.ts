import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkFnGuideData() {
    console.log('FnGuide 데이터 확인\n');

    // SK하이닉스
    const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('code', '000660')
        .single();

    if (!company) return;

    // FnGuide 데이터 확인
    const { data: fnguideData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, operating_profit, data_source')
        .eq('company_id', company.id)
        .eq('data_source', 'fnguide')
        .eq('year', 2025)
        .order('scrape_date', { ascending: false })
        .limit(20);

    console.log('SK하이닉스 FnGuide 데이터:');
    fnguideData?.forEach(row => {
        const rev = row.revenue / 100_000_000;
        const op = row.operating_profit / 100_000_000;
        console.log(`  ${row.scrape_date}: 매출=${rev.toFixed(0)}억, 영익=${op.toFixed(0)}억`);
    });

    // 비교 날짜에 FnGuide 데이터가 있는지 확인
    const comparisonDates = ['2025-11-24', '2025-11-04', '2025-09-05', '2025-07-09'];

    console.log('\n\n비교 날짜별 FnGuide 데이터:');
    for (const date of comparisonDates) {
        const { data } = await supabase
            .from('financial_data_extended')
            .select('revenue, operating_profit')
            .eq('company_id', company.id)
            .eq('data_source', 'fnguide')
            .eq('year', 2025)
            .eq('scrape_date', date)
            .single();

        if (data) {
            const rev = data.revenue / 100_000_000;
            const op = data.operating_profit / 100_000_000;
            console.log(`  ${date}: ✅ 매출=${rev.toFixed(0)}억, 영익=${op.toFixed(0)}억`);
        } else {
            console.log(`  ${date}: ❌ 데이터 없음`);
        }
    }

    // 가장 가까운 날짜 찾기
    console.log('\n\n가장 가까운 FnGuide 날짜 찾기:');
    for (const targetDate of comparisonDates) {
        const { data: nearestData } = await supabase
            .from('financial_data_extended')
            .select('scrape_date, revenue, operating_profit')
            .eq('company_id', company.id)
            .eq('data_source', 'fnguide')
            .eq('year', 2025)
            .lte('scrape_date', targetDate)
            .order('scrape_date', { ascending: false })
            .limit(1)
            .single();

        if (nearestData) {
            const rev = nearestData.revenue / 100_000_000;
            console.log(`  ${targetDate} → ${nearestData.scrape_date}: 매출=${rev.toFixed(0)}억`);
        }
    }
}

checkFnGuideData().catch(console.error);
