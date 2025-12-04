import axios from 'axios';

async function testLocalAPI() {
    console.log('로컬 stock-comparison API 테스트\n');

    const url = 'http://localhost:3000/api/stock-comparison?year=2025&debug=true';

    try {
        const response = await axios.get(url);
        const result = response.data;

        console.log('디버그 정보:');
        console.log(JSON.stringify(result.debug, null, 2));

        console.log('\n샘플 데이터 (처음 3개):');
        result.data?.slice(0, 3).forEach((c: any) => {
            console.log(`\n${c.name} (${c.code}):`);
            console.log(`  현재 매출: ${c.current_revenue}억원`);
            console.log(`  1M 매출 변화: ${c.revenue_growth_1m}%`);
            console.log(`  1M 영업이익 변화: ${c.operating_profit_growth_1m}%`);
            console.log(`  3M 매출 변화: ${c.revenue_growth_3m}%`);
        });
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

testLocalAPI();
