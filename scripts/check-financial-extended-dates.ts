import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkFinancialDataExtended() {
    console.log('🔍 financial_data_extended 테이블 최근 데이터 확인\n');

    // 1. 최근 scrape_date 목록 확인
    console.log('📊 1. 최근 scrape_date 목록:');
    const { data: recentDates, error: dateError } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(100);

    if (dateError) {
        console.error('❌ 에러:', dateError);
        return;
    }

    const uniqueDates = [...new Set(recentDates?.map(d => d.scrape_date))];
    console.log('최근 10개 날짜:', uniqueDates.slice(0, 10));

    // 2. 각 날짜별 데이터 개수 상세 확인
    console.log('\n📈 2. 날짜별 데이터 분포:');
    for (const date of uniqueDates.slice(0, 10)) {
        const { count } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);
        console.log(`  ${date}: ${count}개 레코드`);
    }

    // 3. 11-27 이후 날짜 확인
    console.log('\n📅 3. 2025-11-27 이후 날짜 데이터 확인:');
    const targetDates = ['2025-11-27', '2025-11-28', '2025-11-29', '2025-11-30', '2025-12-01', '2025-12-02', '2025-12-03', '2025-12-04', '2025-12-05', '2025-12-06'];
    for (const date of targetDates) {
        const { count, error } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        if (error) {
            console.log(`  ${date}: ❌ 에러 - ${error.message}`);
        } else {
            console.log(`  ${date}: ${count || 0}개 레코드`);
        }
    }

    // 4. data_source 별 분포
    console.log('\n📊 4. data_source 분포 (최신 날짜):');
    if (uniqueDates.length > 0) {
        const latestDate = uniqueDates[0];
        const { data: sourceData } = await supabase
            .from('financial_data_extended')
            .select('data_source')
            .eq('scrape_date', latestDate);

        if (sourceData) {
            const sourceCounts: Record<string, number> = {};
            sourceData.forEach(row => {
                sourceCounts[row.data_source] = (sourceCounts[row.data_source] || 0) + 1;
            });
            console.log(`  최신 날짜 (${latestDate}) 데이터:`, sourceCounts);
        }
    }

    console.log('\n✅ 확인 완료!');
}

checkFinancialDataExtended().catch(console.error);
