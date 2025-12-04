import axios from 'axios';

async function testDeployedAPI() {
    console.log('배포된 API 테스트 (캐시 우회)\n');

    // 캐시를 우회하기 위해 timestamp 추가
    const timestamp = Date.now();
    const url = `https://dailystockdata.vercel.app/api/stock-comparison?year=2025&debug=true&_=${timestamp}`;

    try {
        const response = await axios.get(url);
        const result = response.data;

        console.log('디버그 정보:');
        console.log(JSON.stringify(result.debug, null, 2));

        if (result.data) {
            console.log('\n샘플 데이터 (처음 3개):');
            result.data.slice(0, 3).forEach((c: any) => {
                console.log(`\n${c.name} (${c.code}):`);
                console.log(`  현재 매출: ${c.current_revenue}억원`);
                console.log(`  1D 매출 변화: ${c.revenue_growth_prev_day}%`);
                console.log(`  1M 매출 변화: ${c.revenue_growth_1m}%`);
                console.log(`  3M 매출 변화: ${c.revenue_growth_3m}%`);
            });
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

testDeployedAPI();
