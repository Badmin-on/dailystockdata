import axios from 'axios';

async function testDateComparison() {
    console.log('날짜별 비교 API 테스트\n');

    // 2025-11-21 vs 2025-12-04 비교 (SK하이닉스 데이터가 있는 날짜)
    const url = 'https://dailystockdata.vercel.app/api/date-comparison?startDate=2025-11-21&endDate=2025-12-04&year=2025';

    try {
        const response = await axios.get(url);
        const data = response.data;

        console.log(`총 ${data.length}개 회사`);

        // SK하이닉스 찾기
        const skhynix = data.find((c: any) => c.code === '000660');

        if (skhynix) {
            console.log('\n✅ SK하이닉스 발견!');
            console.log(`  회사명: ${skhynix.name}`);
            console.log(`  시작 매출 (2025-11-21): ${skhynix.start_revenue}억원`);
            console.log(`  종료 매출 (2025-12-04): ${skhynix.end_revenue}억원`);
            console.log(`  매출 증감률: ${skhynix.revenue_growth}%`);
            console.log(`  영업이익 증감률: ${skhynix.operating_profit_growth}%`);
        } else {
            console.log('\n❌ SK하이닉스를 찾을 수 없습니다.');
        }

        // 삼성전자도 확인
        const samsung = data.find((c: any) => c.code === '005930');
        if (samsung) {
            console.log('\n삼성전자:');
            console.log(`  시작 매출: ${samsung.start_revenue}억원`);
            console.log(`  종료 매출: ${samsung.end_revenue}억원`);
            console.log(`  매출 증감률: ${samsung.revenue_growth}%`);
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

testDateComparison();
