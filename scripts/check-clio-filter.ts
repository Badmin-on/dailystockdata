import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkClioWithFilter() {
    console.log('클리오 데이터 (≥1000억 필터 적용)\n');

    const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('code', '237880')
        .single();

    if (!company) return;

    // 1000억 이상 데이터
    const { data: validData, count } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, data_source', { count: 'exact' })
        .eq('company_id', company.id)
        .eq('year', 2025)
        .gte('revenue', 100_000_000_000)
        .order('scrape_date', { ascending: false })
        .limit(10);

    console.log(`1000억 이상 데이터: ${count}개`);
    validData?.forEach(row => {
        const rev = row.revenue / 100_000_000;
        console.log(`  ${row.scrape_date}: ${rev.toFixed(0)}억 (${row.data_source})`);
    });

    // 모든 데이터
    const { data: allData, count: allCount } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, revenue, data_source', { count: 'exact' })
        .eq('company_id', company.id)
        .eq('year', 2025)
        .order('scrape_date', { ascending: false })
        .limit(10);

    console.log(`\n전체 데이터: ${allCount}개`);
    allData?.forEach(row => {
        const rev = row.revenue / 100_000_000;
        console.log(`  ${row.scrape_date}: ${rev.toFixed(0)}억 (${row.data_source})`);
    });
}

checkClioWithFilter().catch(console.error);
