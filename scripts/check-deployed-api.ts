import axios from 'axios';

async function checkDeployedAPI() {
    try {
        console.log('Checking deployed API...\n');

        const response = await axios.get('https://dailystockdata.vercel.app/api/stock-comparison?year=2025');
        const data = response.data;

        console.log('Total companies:', data.length);

        if (data.length > 0) {
            // SK하이닉스 찾기
            const skhynix = data.find((c: any) => c.code === '000660');

            if (skhynix) {
                console.log('\nSK하이닉스 (000660) 데이터:');
                console.log('  Current Revenue:', skhynix.current_revenue);
                console.log('  Current Op Profit:', skhynix.current_op_profit);
                console.log('\n비교 데이터:');
                console.log('  Prev Day Revenue:', skhynix.prev_day_revenue);
                console.log('  Prev Day Op Profit:', skhynix.prev_day_op_profit);
                console.log('  Revenue Growth (Prev Day):', skhynix.revenue_growth_prev_day);
                console.log('  Op Profit Growth (Prev Day):', skhynix.op_profit_growth_prev_day);
                console.log('  Prev Day Date:', skhynix.prev_day_date);
                console.log('\n1개월:');
                console.log('  1M Revenue:', skhynix.onemonth_ago_revenue);
                console.log('  Revenue Growth (1M):', skhynix.revenue_growth_1month);
                console.log('  1M Date:', skhynix.onemonth_ago_date);
                console.log('\n3개월:');
                console.log('  3M Revenue:', skhynix.threemonth_ago_revenue);
                console.log('  Revenue Growth (3M):', skhynix.revenue_growth_3month);
                console.log('  3M Date:', skhynix.threemonth_ago_date);
                console.log('\n1년:');
                console.log('  1Y Revenue:', skhynix.oneyear_ago_revenue);
                console.log('  Revenue Growth (1Y):', skhynix.revenue_growth_1year);
                console.log('  1Y Date:', skhynix.oneyear_ago_date);
            } else {
                console.log('SK하이닉스를 찾을 수 없습니다.');
            }

            // 첫 번째 회사도 확인
            console.log('\n\n첫 번째 회사:', data[0].name);
            console.log('  Prev Day Revenue:', data[0].prev_day_revenue);
            console.log('  Revenue Growth (Prev Day):', data[0].revenue_growth_prev_day);
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

checkDeployedAPI();
