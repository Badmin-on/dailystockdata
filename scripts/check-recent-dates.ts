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

async function checkRecentDates() {
    console.log('🔍 최근 날짜 데이터 확인 중...\n');

    // 1. financial_data 테이블의 최근 날짜 확인
    console.log('📊 1. financial_data 테이블:');
    const { data: financialDates, error: financialError } = await supabase
        .from('financial_data')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(10);

    if (financialError) {
        console.error('❌ 에러:', financialError);
    } else {
        const uniqueDates = [...new Set(financialDates?.map(d => d.scrape_date))];
        console.log('최근 10개 날짜:', uniqueDates.slice(0, 10));

        // 각 날짜별 데이터 개수 확인
        for (const date of uniqueDates.slice(0, 5)) {
            const { count } = await supabase
                .from('financial_data')
                .select('*', { count: 'exact', head: true })
                .eq('scrape_date', date);
            console.log(`  ${date}: ${count}개 레코드`);
        }
    }

    // 2. consensus_metrics 테이블의 최근 날짜 확인
    console.log('\n📈 2. consensus_metrics 테이블:');
    const { data: consensusDates, error: consensusError } = await supabase
        .from('consensus_metrics')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(10);

    if (consensusError) {
        console.error('❌ 에러:', consensusError);
    } else {
        const uniqueDates = [...new Set(consensusDates?.map(d => d.scrape_date))];
        console.log('최근 10개 날짜:', uniqueDates.slice(0, 10));

        // 각 날짜별 데이터 개수 확인
        for (const date of uniqueDates.slice(0, 5)) {
            const { count } = await supabase
                .from('consensus_metrics')
                .select('*', { count: 'exact', head: true })
                .eq('scrape_date', date);
            console.log(`  ${date}: ${count}개 레코드`);
        }
    }

    // 3. 특정 날짜(26, 27, 28일) 데이터 확인
    console.log('\n🎯 3. 특정 날짜(11/26-28) 데이터 확인:');
    const targetDates = ['2025-11-26', '2025-11-27', '2025-11-28'];

    for (const date of targetDates) {
        const { count: finCount } = await supabase
            .from('financial_data')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        const { count: consCount } = await supabase
            .from('consensus_metrics')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        console.log(`${date}:`);
        console.log(`  - financial_data: ${finCount || 0}개`);
        console.log(`  - consensus_metrics: ${consCount || 0}개`);
    }

    // 4. 날짜별 데이터 분포 확인 (최근 30일)
    console.log('\n📅 4. 날짜별 데이터 분포 (최근 날짜부터):');
    const { data: dateDistribution } = await supabase
        .rpc('get_date_distribution')
        .limit(30);

    if (dateDistribution) {
        console.log(dateDistribution);
    } else {
        // RPC가 없으면 직접 쿼리
        const { data: allDates } = await supabase
            .from('financial_data')
            .select('scrape_date')
            .order('scrape_date', { ascending: false });

        const dateCounts = allDates?.reduce((acc: any, item) => {
            acc[item.scrape_date] = (acc[item.scrape_date] || 0) + 1;
            return acc;
        }, {});

        console.log('날짜별 레코드 수:');
        Object.entries(dateCounts || {})
            .slice(0, 15)
            .forEach(([date, count]) => {
                console.log(`  ${date}: ${count}개`);
            });
    }

    console.log('\n✅ 확인 완료!');
}

checkRecentDates().catch(console.error);
