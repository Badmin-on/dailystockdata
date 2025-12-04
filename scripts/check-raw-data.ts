import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkRawData() {
    console.log('원본 데이터 직접 확인\n');

    // SK하이닉스 ID
    const { data: skhynix } = await supabase
        .from('companies')
        .select('id')
        .eq('code', '000660')
        .single();

    if (!skhynix) return;

    // 2025-11-24 데이터 직접 확인
    const { data: nov24 } = await supabase
        .from('financial_data_extended')
        .select('*')
        .eq('company_id', skhynix.id)
        .eq('scrape_date', '2025-11-24')
        .eq('year', 2025);

    console.log('2025-11-24 SK하이닉스 데이터:');
    nov24?.forEach(row => {
        console.log(`  ${row.data_source}:`);
        console.log(`    revenue: ${row.revenue}`);
        console.log(`    operating_profit: ${row.operating_profit}`);
        console.log(`    created_at: ${row.created_at}`);
    });

    // 모든 naver 데이터 확인
    const { data: naverData, count } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, revenue, operating_profit', { count: 'exact' })
        .eq('company_id', skhynix.id)
        .eq('data_source', 'naver')
        .eq('year', 2025)
        .order('scrape_date', { ascending: false })
        .limit(10);

    console.log(`\n\nSK하이닉스 naver 데이터 (총 ${count}개):`);
    naverData?.forEach(row => {
        const rev = row.revenue / 100_000_000;
        const op = row.operating_profit / 100_000_000;
        console.log(`  ${row.scrape_date}: 매출=${rev.toFixed(0)}억, 영익=${op.toFixed(0)}억`);
    });
}

checkRawData().catch(console.error);
