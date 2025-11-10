/**
 * Diagnose why 1D calculation returns 0
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function diagnose() {
    console.log('\n🔍 Diagnosing 1D calculation issue...\n');

    try {
        // 1. Get unique scrape dates
        const { data: dates, error: datesError } = await supabase
            .from('financial_data')
            .select('scrape_date')
            .order('scrape_date', { ascending: false })
            .limit(10);

        if (datesError) throw datesError;

        const uniqueDates = [...new Set(dates.map(d => d.scrape_date))];
        console.log('📅 Recent scrape dates:');
        uniqueDates.forEach((date, i) => {
            console.log(`   ${i}: ${date}`);
        });

        const latestDate = uniqueDates[0];
        const prevDate = uniqueDates[1];

        console.log(`\n✅ Latest: ${latestDate}`);
        console.log(`✅ Previous: ${prevDate}`);

        // 2. Check 클리오 (code: 237880) specifically
        console.log('\n🔍 Checking 클리오 (237880) data:\n');

        const { data: companies } = await supabase
            .from('companies')
            .select('id, name, code')
            .eq('code', '237880')
            .single();

        if (companies) {
            console.log(`   Company ID: ${companies.id}`);
            console.log(`   Name: ${companies.name}`);

            // Get latest data
            const { data: latestData } = await supabase
                .from('financial_data')
                .select('*')
                .eq('company_id', companies.id)
                .eq('scrape_date', latestDate)
                .eq('year', 2025);

            // Get previous day data
            const { data: prevData } = await supabase
                .from('financial_data')
                .select('*')
                .eq('company_id', companies.id)
                .eq('scrape_date', prevDate)
                .eq('year', 2025);

            console.log('\n📊 Latest data (2025):');
            if (latestData && latestData.length > 0) {
                console.log('   Revenue:', latestData[0].revenue);
                console.log('   Op Profit:', latestData[0].operating_profit);
                console.log('   Scrape Date:', latestData[0].scrape_date);
            } else {
                console.log('   ❌ No data found');
            }

            console.log('\n📊 Previous day data (2025):');
            if (prevData && prevData.length > 0) {
                console.log('   Revenue:', prevData[0].revenue);
                console.log('   Op Profit:', prevData[0].operating_profit);
                console.log('   Scrape Date:', prevData[0].scrape_date);
            } else {
                console.log('   ❌ No data found');
            }

            // Calculate manually
            if (latestData && latestData.length > 0 && prevData && prevData.length > 0) {
                const latest = latestData[0];
                const prev = prevData[0];

                const revChange = prev.revenue !== 0
                    ? ((latest.revenue - prev.revenue) / Math.abs(prev.revenue) * 100).toFixed(2)
                    : null;

                const opChange = prev.operating_profit !== 0
                    ? ((latest.operating_profit - prev.operating_profit) / Math.abs(prev.operating_profit) * 100).toFixed(2)
                    : null;

                console.log('\n🧮 Manual 1D calculation:');
                console.log(`   Revenue change: ${revChange}%`);
                console.log(`   Op profit change: ${opChange}%`);
            }
        }

        // 3. Check mv_consensus_changes for same company
        console.log('\n🔍 Checking mv_consensus_changes:\n');

        const { data: mvData } = await supabase
            .from('mv_consensus_changes')
            .select('*')
            .eq('code', '237880')
            .eq('year', 2025);

        if (mvData && mvData.length > 0) {
            console.log('   Found in MV:');
            console.table(mvData.map(d => ({
                name: d.name,
                year: d.year,
                current_revenue: d.current_revenue,
                prev_day_revenue: d.prev_day_revenue,
                revenue_1d: d.revenue_change_1d,
                revenue_1m: d.revenue_change_1m,
                current_op: d.current_op_profit,
                prev_day_op: d.prev_day_op_profit,
                op_1d: d.op_profit_change_1d,
                op_1m: d.op_profit_change_1m
            })));

            // Check if prev_day data is missing
            const mv = mvData[0];
            if (mv.prev_day_revenue === null) {
                console.log('\n❌ PROBLEM FOUND: prev_day_revenue is NULL!');
                console.log('   This explains why 1D change is 0.');
            }
        } else {
            console.log('   ❌ Not found in MV');
        }

        // 4. Check how many companies have prev_day data
        console.log('\n📊 Overall MV statistics:\n');

        const { data: allMV } = await supabase
            .from('mv_consensus_changes')
            .select('prev_day_revenue, revenue_change_1d')
            .eq('year', 2025);

        if (allMV) {
            const total = allMV.length;
            const hasPrevDay = allMV.filter(d => d.prev_day_revenue !== null).length;
            const has1DValue = allMV.filter(d => d.revenue_change_1d !== null && d.revenue_change_1d !== 0).length;

            console.log(`   Total records: ${total}`);
            console.log(`   Has prev_day_revenue: ${hasPrevDay} (${(hasPrevDay/total*100).toFixed(1)}%)`);
            console.log(`   Has non-zero 1D change: ${has1DValue} (${(has1DValue/total*100).toFixed(1)}%)`);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

diagnose()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
