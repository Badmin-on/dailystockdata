import axios from 'axios';

async function testStockComparisonAPI() {
    try {
        console.log('Testing stock-comparison API...\n');

        const response = await axios.get('https://dailystockdata.vercel.app/api/stock-comparison?year=2025');
        const data = response.data;

        console.log('Response type:', Array.isArray(data) ? 'Array' : 'Object');
        console.log('Total companies:', data.length);

        if (data.length > 0) {
            const first = data[0];
            console.log('\nFirst company:');
            console.log('  Name:', first.name);
            console.log('  Code:', first.code);
            console.log('  Year:', first.year);
            console.log('  Current Revenue:', first.current_revenue);
            console.log('  Current Op Profit:', first.current_op_profit);
            console.log('\nComparison data:');
            console.log('  Prev Day Revenue:', first.prev_day_revenue);
            console.log('  Prev Day Op Profit:', first.prev_day_op_profit);
            console.log('  Revenue Growth (Prev Day):', first.revenue_growth_prev_day);
            console.log('  Op Profit Growth (Prev Day):', first.op_profit_growth_prev_day);
            console.log('  Prev Day Date:', first.prev_day_date);
            console.log('\n1 Month:');
            console.log('  Revenue Growth (1M):', first.revenue_growth_1month);
            console.log('  Op Profit Growth (1M):', first.op_profit_growth_1month);
            console.log('  1 Month Date:', first.onemonth_ago_date);
            console.log('\n3 Months:');
            console.log('  Revenue Growth (3M):', first.revenue_growth_3month);
            console.log('  3 Months Date:', first.threemonth_ago_date);
            console.log('\n1 Year:');
            console.log('  Revenue Growth (1Y):', first.revenue_growth_1year);
            console.log('  1 Year Date:', first.oneyear_ago_date);
        }
    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testStockComparisonAPI();
