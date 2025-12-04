import axios from 'axios';

async function compareTwoAPIs() {
    console.log('두 API 비교 분석\n');
    console.log('='.repeat(80) + '\n');

    // 1. 날짜별 비교 API (정상 작동)
    console.log('1. 날짜별 비교 API (정상 작동):');
    const dateComparisonUrl = 'https://dailystockdata.vercel.app/api/date-comparison?startDate=2025-11-24&endDate=2025-12-04&year=2025';

    try {
        const response = await axios.get(dateComparisonUrl);
        const data = response.data;

        // SK하이닉스 찾기
        const skhynix = data.find((c: any) => c.code === '000660');

        if (skhynix) {
            console.log('\nSK하이닉스 (날짜별 비교):');
            console.log(`  시작 매출: ${skhynix.start_revenue}억원`);
            console.log(`  종료 매출: ${skhynix.end_revenue}억원`);
            console.log(`  증감률: ${skhynix.revenue_growth}%`);
        } else {
            console.log('\nSK하이닉스를 찾을 수 없습니다.');
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 2. 종목 비교 API (문제)
    console.log('2. 종목 비교 API (문제):');
    const stockComparisonUrl = 'https://dailystockdata.vercel.app/api/stock-comparison?year=2025';

    try {
        const response = await axios.get(stockComparisonUrl);
        const data = response.data;

        // SK하이닉스 찾기
        const skhynix = data.find((c: any) => c.code === '000660');

        if (skhynix) {
            console.log('\nSK하이닉스 (종목 비교):');
            console.log(`  현재 매출: ${skhynix.current_revenue}억원`);
            console.log(`  전일 매출: ${skhynix.prev_day_revenue}억원`);
            console.log(`  전일 증감률: ${skhynix.revenue_growth_prev_day}%`);
            console.log(`  전일 날짜: ${skhynix.prev_day_date}`);
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 3. 디버그 모드로 날짜 확인
    console.log('3. 종목 비교 API 디버그:');
    const debugUrl = 'https://dailystockdata.vercel.app/api/stock-comparison?year=2025&debug=true';

    try {
        const response = await axios.get(debugUrl);
        const debug = response.data.debug;

        console.log('\n날짜 정보:');
        console.log(`  최신 날짜: ${debug.latestScrapeDate}`);
        console.log(`  고유 날짜 수: ${debug.uniqueDatesCount}개`);
        console.log(`  비교 날짜:`);
        console.log(`    전일: ${debug.comparisonDates.prevDayDate}`);
        console.log(`    1개월: ${debug.comparisonDates.oneMonthAgoDate}`);
        console.log(`    3개월: ${debug.comparisonDates.threeMonthsAgoDate}`);
        console.log(`    1년: ${debug.comparisonDates.oneYearAgoDate}`);
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

compareTwoAPIs();
