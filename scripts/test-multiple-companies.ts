import axios from 'axios';

async function testMultipleCompanies() {
    console.log('여러 회사 consensus-trend 테스트\n');

    const companies = [
        { code: '005930', name: '삼성전자' },
        { code: '000660', name: 'SK하이닉스' },
        { code: '237880', name: '클리오' },
    ];

    for (const company of companies) {
        const url = `http://localhost:3000/api/consensus-trend?code=${company.code}`;

        try {
            const response = await axios.get(url);
            const result = response.data;

            console.log(`\n${company.name} (${company.code}):`);
            console.log(`  데이터 포인트: ${result.timeSeriesData?.length}개`);

            if (result.stats?.recent30Days) {
                const s = result.stats.recent30Days;
                console.log(`  2025년 매출 변화: ${s[2025]?.revenue_change ?? 'N/A'}%`);
                console.log(`  주가 변화: ${s.price_change ?? 'N/A'}%`);
                console.log(`  괴리율: ${s.divergence ?? 'N/A'}%p`);
            }
        } catch (error: any) {
            console.error(`  Error: ${error.message}`);
        }
    }
}

testMultipleCompanies();
