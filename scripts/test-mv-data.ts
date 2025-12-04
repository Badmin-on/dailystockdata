import axios from 'axios';

async function testMVData() {
    console.log('mv_consensus_changes 데이터 확인\n');

    // 투자 기회 API 호출 (이것은 mv_consensus_changes 사용)
    const url = 'https://dailystockdata.vercel.app/api/investment-opportunities?year=2025&limit=500';

    try {
        const response = await axios.get(url);
        const result = response.data;

        console.log(`총 ${result.count}개 회사`);

        // SK하이닉스 찾기
        const skhynix = result.data?.find((c: any) => c.code === '000660');

        if (skhynix) {
            console.log('\n✅ SK하이닉스 발견!');
            console.log(`  매출 1M 변화: ${skhynix.revenue_change_1m}%`);
            console.log(`  영업이익 1M 변화: ${skhynix.op_profit_change_1m}%`);
            console.log(`  매출 3M 변화: ${skhynix.revenue_change_3m}%`);
            console.log(`  영업이익 3M 변화: ${skhynix.op_profit_change_3m}%`);
            console.log(`  투자 등급: ${skhynix.investment_grade}`);
            console.log(`  투자 점수: ${skhynix.investment_score}`);
        } else {
            console.log('\n❌ SK하이닉스를 찾을 수 없습니다.');
        }

        // 삼성전자도 확인
        const samsung = result.data?.find((c: any) => c.code === '005930');
        if (samsung) {
            console.log('\n삼성전자:');
            console.log(`  매출 1M 변화: ${samsung.revenue_change_1m}%`);
            console.log(`  영업이익 1M 변화: ${samsung.op_profit_change_1m}%`);
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

testMVData();
