import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function analyzeStockComparisonLogic() {
    console.log('종목 비교 API 로직 분석\n');

    // 1. 최신 scrape_date 확인
    const { data: latestData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(1)
        .single();

    const latestScrapeDate = latestData?.scrape_date;
    console.log('최신 scrape_date:', latestScrapeDate);

    // 2. 고유 날짜 목록 (API와 동일한 방식)
    const { data: allDatesData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(100);

    const uniqueSet = new Set<string>();
    allDatesData?.forEach(d => uniqueSet.add(d.scrape_date));
    const uniqueDates = Array.from(uniqueSet).sort().reverse();

    console.log('\n고유 날짜 (상위 10개):');
    uniqueDates.slice(0, 10).forEach((date, i) => {
        console.log(`  ${i}: ${date}`);
    });

    // 3. 비교 날짜 계산 (API와 동일한 방식)
    const prevDayDate = uniqueDates[1];
    console.log('\n계산된 prevDayDate:', prevDayDate);

    // 4. 해당 날짜에 실제 데이터가 있는지 확인
    const { data: prevDayData, count } = await supabase
        .from('financial_data_extended')
        .select('company_id, year, revenue, operating_profit, data_source', { count: 'exact' })
        .eq('scrape_date', prevDayDate)
        .eq('year', 2025);

    console.log(`\n${prevDayDate}의 2025년 데이터:`);
    console.log(`  총 레코드: ${count}개`);

    // data_source별 분포
    const fnguideCount = prevDayData?.filter(d => d.data_source === 'fnguide').length || 0;
    const naverCount = prevDayData?.filter(d => d.data_source === 'naver').length || 0;
    const zeroCount = prevDayData?.filter(d => d.revenue === 0 && d.operating_profit === 0).length || 0;

    console.log(`  fnguide: ${fnguideCount}개`);
    console.log(`  naver: ${naverCount}개`);
    console.log(`  0값: ${zeroCount}개`);

    // 5. 최신 날짜와 비교
    const { data: todayData, count: todayCount } = await supabase
        .from('financial_data_extended')
        .select('company_id, year, revenue, operating_profit, data_source', { count: 'exact' })
        .eq('scrape_date', latestScrapeDate)
        .eq('year', 2025);

    console.log(`\n${latestScrapeDate}의 2025년 데이터:`);
    console.log(`  총 레코드: ${todayCount}개`);

    const todayFnguide = todayData?.filter(d => d.data_source === 'fnguide').length || 0;
    const todayNaver = todayData?.filter(d => d.data_source === 'naver').length || 0;

    console.log(`  fnguide: ${todayFnguide}개`);
    console.log(`  naver: ${todayNaver}개`);

    // 6. 매칭 가능한 회사 수 확인
    const todayCompanyIds = new Set(todayData?.map(d => `${d.company_id}-${d.year}`));
    const prevCompanyIds = new Set(prevDayData?.map(d => `${d.company_id}-${d.year}`));

    let matchCount = 0;
    todayCompanyIds.forEach(id => {
        if (prevCompanyIds.has(id)) matchCount++;
    });

    console.log(`\n매칭 분석:`);
    console.log(`  오늘 회사 수: ${todayCompanyIds.size}개`);
    console.log(`  전일 회사 수: ${prevCompanyIds.size}개`);
    console.log(`  매칭 가능: ${matchCount}개`);
    console.log(`  매칭 불가: ${todayCompanyIds.size - matchCount}개`);
}

analyzeStockComparisonLogic().catch(console.error);
