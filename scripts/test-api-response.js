/**
 * Test API response directly
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function testAPI() {
    console.log('\n🔍 Testing investment-opportunities API response...\n');

    try {
        // Simulate the same query as the API
        const { data, error } = await supabase
            .from('v_investment_opportunities')
            .select('*')
            .gte('investment_score', 50)
            .eq('year', 2025)
            .order('investment_score', { ascending: false })
            .limit(100);

        if (error) {
            console.error('❌ Query error:', error);
            return;
        }

        console.log(`📊 Total records returned: ${data.length}`);

        // Count by grade
        const gradeCount = {
            S: data.filter(d => d.investment_grade === 'S').length,
            A: data.filter(d => d.investment_grade === 'A').length,
            B: data.filter(d => d.investment_grade === 'B').length,
            C: data.filter(d => d.investment_grade === 'C').length,
        };

        console.log('\n📈 Grade distribution:');
        console.log(`   S급: ${gradeCount.S}개`);
        console.log(`   A급: ${gradeCount.A}개`);
        console.log(`   B급: ${gradeCount.B}개`);
        console.log(`   C급: ${gradeCount.C}개`);

        // Show top 10 with detailed data
        console.log('\n🏆 Top 10 opportunities:');
        console.table(data.slice(0, 10).map(d => ({
            name: d.name,
            code: d.code,
            grade: d.investment_grade,
            score: d.investment_score,
            '1D_매출': d.revenue_change_1d,
            '1D_영익': d.op_profit_change_1d,
            '1M_매출': d.revenue_change_1m,
            '1M_영익': d.op_profit_change_1m,
            '3M_매출': d.revenue_change_3m,
            '3M_영익': d.op_profit_change_3m,
            '1Y_매출': d.revenue_change_1y,
            '1Y_영익': d.op_profit_change_1y
        })));

        // Check for S grade specifically
        const sGrade = data.filter(d => d.investment_grade === 'S');
        if (sGrade.length > 0) {
            console.log('\n⭐ S급 종목 상세:');
            console.table(sGrade.map(d => ({
                name: d.name,
                code: d.code,
                score: d.investment_score,
                consensus: d.consensus_score,
                divergence: d.divergence_score,
                '1D_매출': d.revenue_change_1d,
                '1D_영익': d.op_profit_change_1d,
                '1M_매출': d.revenue_change_1m,
                '3M_매출': d.revenue_change_3m,
                '1Y_매출': d.revenue_change_1y
            })));
        }

        // Check if any record has non-zero 1D data
        const has1D = data.filter(d =>
            d.revenue_change_1d !== null &&
            d.revenue_change_1d !== 0
        );
        console.log(`\n✅ Records with non-zero 1D revenue: ${has1D.length}/${data.length}`);

        if (has1D.length > 0) {
            console.log('\n📋 Sample with 1D data:');
            console.table(has1D.slice(0, 5).map(d => ({
                name: d.name,
                '1D_매출': d.revenue_change_1d,
                '1D_영익': d.op_profit_change_1d,
                '1M_매출': d.revenue_change_1m
            })));
        }

        // Check 3M data
        const has3M = data.filter(d =>
            d.revenue_change_3m !== null &&
            d.revenue_change_3m !== 0
        );
        console.log(`\n✅ Records with 3M data: ${has3M.length}/${data.length}`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testAPI()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
