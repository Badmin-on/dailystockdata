import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkDataSources() {
    console.log('데이터 소스별 현황\n');

    // fnguide 데이터
    const { count: fnguideCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('data_source', 'fnguide');

    // naver 데이터 (정상)
    const { count: naverGoodCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('data_source', 'naver')
        .gte('revenue', 100_000_000_000);  // 1000억 이상

    // naver 데이터 (잘못된)
    const { count: naverBadCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('data_source', 'naver')
        .lt('revenue', 100_000_000_000);  // 1000억 미만

    console.log('데이터 현황:');
    console.log(`  fnguide: ${fnguideCount?.toLocaleString()}개`);
    console.log(`  naver (정상, ≥1000억): ${naverGoodCount?.toLocaleString()}개`);
    console.log(`  naver (잘못된, <1000억): ${naverBadCount?.toLocaleString()}개`);

    // fnguide 날짜 범위
    const { data: fnguideDates } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .eq('data_source', 'fnguide')
        .order('scrape_date', { ascending: false })
        .limit(5);

    console.log('\nfnguide 최근 날짜:');
    fnguideDates?.forEach(d => console.log(`  ${d.scrape_date}`));

    // naver 정상 데이터 날짜 범위
    const { data: naverDates } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .eq('data_source', 'naver')
        .gte('revenue', 100_000_000_000)
        .order('scrape_date', { ascending: false })
        .limit(5);

    console.log('\nnaver (정상) 최근 날짜:');
    naverDates?.forEach(d => console.log(`  ${d.scrape_date}`));
}

checkDataSources().catch(console.error);
