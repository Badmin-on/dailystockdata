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

async function checkDates() {
    console.log('=== 비교 날짜 데이터 확인 ===\n');

    // 최근 날짜들 가져오기
    const { data } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(3000);

    const uniqueDates = [...new Set(data?.map(d => d.scrape_date) || [])];
    console.log(`총 ${uniqueDates.length}개의 고유 날짜 발견`);
    console.log('\n최근 20개 날짜:');
    uniqueDates.slice(0, 20).forEach((d, i) => console.log(`  ${i + 1}. ${d}`));

    // 날짜 간격 확인
    if (uniqueDates.length >= 2) {
        const latest = new Date(uniqueDates[0]);
        const second = new Date(uniqueDates[1]);
        const daysDiff = (latest.getTime() - second.getTime()) / (1000 * 60 * 60 * 24);
        console.log(`\n최신 날짜와 두 번째 날짜 간격: ${daysDiff.toFixed(1)}일`);
    }

    // 1개월, 3개월, 1년 전 날짜 계산
    const latest = new Date(uniqueDates[0]);
    const oneMonthAgo = new Date(latest.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(latest.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(latest.getTime() - 365 * 24 * 60 * 60 * 1000);

    console.log(`\n목표 비교 날짜:`);
    console.log(`  최신: ${uniqueDates[0]}`);
    console.log(`  전일: ${uniqueDates[1] || 'N/A'}`);
    console.log(`  1개월 전 목표: ${oneMonthAgo.toISOString().split('T')[0]}`);
    console.log(`  3개월 전 목표: ${threeMonthsAgo.toISOString().split('T')[0]}`);
    console.log(`  1년 전 목표: ${oneYearAgo.toISOString().split('T')[0]}`);

    // 가장 오래된 날짜
    console.log(`\n가장 오래된 데이터: ${uniqueDates[uniqueDates.length - 1]}`);

    const oldestDate = new Date(uniqueDates[uniqueDates.length - 1]);
    const dataRangeDays = (latest.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24);
    console.log(`데이터 범위: ${dataRangeDays.toFixed(0)}일 (약 ${(dataRangeDays / 30).toFixed(1)}개월)`);

    // 각 비교 기간에 데이터가 있는지 확인
    console.log('\n비교 가능 여부:');
    console.log(`  전일 비교: ${uniqueDates.length >= 2 ? '✅ 가능' : '❌ 불가능'}`);
    console.log(`  1개월 비교: ${dataRangeDays >= 30 ? '✅ 가능' : '❌ 불가능 (데이터 부족)'}`);
    console.log(`  3개월 비교: ${dataRangeDays >= 90 ? '✅ 가능' : '❌ 불가능 (데이터 부족)'}`);
    console.log(`  1년 비교: ${dataRangeDays >= 365 ? '✅ 가능' : '❌ 불가능 (데이터 부족)'}`);
}

checkDates().catch(console.error);
