import axios from 'axios';

async function testConsensusTrend() {
    console.log('로컬 consensus-trend API 테스트\n');

    const url = 'http://localhost:3000/api/consensus-trend?code=237880'; // 클리오

    try {
        const response = await axios.get(url);
        const result = response.data;

        console.log(`회사: ${result.company?.name}`);
        console.log(`데이터 포인트: ${result.timeSeriesData?.length}개`);

        if (result.stats?.recent30Days) {
            console.log('\n최근 30일 통계:');
            console.log(`  2025년 매출 변화: ${result.stats.recent30Days[2025]?.revenue_change}%`);
            console.log(`  주가 변화: ${result.stats.recent30Days?.price_change}%`);
            console.log(`  괴리율: ${result.stats.recent30Days?.divergence}%p`);
        }
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testConsensusTrend();
