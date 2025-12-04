const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDates() {
    console.log('=== 비교 날짜 확인 ===\n');

    // 최근 날짜들 가져오기
    const { data } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(2000);

    const uniqueDates = [...new Set(data.map(d => d.scrape_date))];
    console.log(`총 ${uniqueDates.length}개의 고유 날짜 발견`);
    console.log('\n최근 20개 날짜:');
    uniqueDates.slice(0, 20).forEach((d, i) => console.log(`  ${i + 1}. ${d}`));

    // 날짜 간격 확인
    if (uniqueDates.length >= 2) {
        const latest = new Date(uniqueDates[0]);
        const second = new Date(uniqueDates[1]);
        const daysDiff = (latest - second) / (1000 * 60 * 60 * 24);
        console.log(`\n최신 날짜와 두 번째 날짜 간격: ${daysDiff.toFixed(1)}일`);
    }

    // 1개월, 3개월, 1년 전 날짜 계산
    const latest = new Date(uniqueDates[0]);
    const oneMonthAgo = new Date(latest.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(latest.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(latest.getTime() - 365 * 24 * 60 * 60 * 1000);

    console.log(`\n목표 비교 날짜:`);
    console.log(`  1개월 전: ${oneMonthAgo.toISOString().split('T')[0]}`);
    console.log(`  3개월 전: ${threeMonthsAgo.toISOString().split('T')[0]}`);
    console.log(`  1년 전: ${oneYearAgo.toISOString().split('T')[0]}`);

    // 가장 오래된 날짜
    console.log(`\n가장 오래된 데이터: ${uniqueDates[uniqueDates.length - 1]}`);

    const oldestDate = new Date(uniqueDates[uniqueDates.length - 1]);
    const dataRangeDays = (latest - oldestDate) / (1000 * 60 * 60 * 24);
    console.log(`데이터 범위: ${dataRangeDays.toFixed(0)}일 (약 ${(dataRangeDays / 30).toFixed(1)}개월)`);
}

checkDates().catch(console.error).finally(() => process.exit());
