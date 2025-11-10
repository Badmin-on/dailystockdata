/**
 * Check how many unique scrape_dates exist in financial_data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkDates() {
    console.log('\n📅 Checking scrape_date distribution...\n');

    try {
        // Get all unique dates
        const { data, error } = await supabase
            .rpc('get_unique_scrape_dates');

        if (error) {
            // Fallback: manual query
            const { data: allData, error: err2 } = await supabase
                .from('financial_data')
                .select('scrape_date')
                .order('scrape_date', { ascending: false });

            if (err2) throw err2;

            const uniqueDates = [...new Set(allData.map(d => d.scrape_date))];

            console.log(`✅ Total unique scrape dates: ${uniqueDates.length}\n`);
            console.log('📊 All unique dates:');
            uniqueDates.forEach((date, i) => {
                console.log(`   ${i + 1}. ${date}`);
            });

            if (uniqueDates.length < 2) {
                console.log('\n❌ CRITICAL ISSUE:');
                console.log('   Only 1 scrape_date exists!');
                console.log('   1D calculation requires at least 2 dates.');
                console.log('\n💡 Solution:');
                console.log('   Wait for next data scraping run to get a second date.');
            } else if (uniqueDates.length < 30) {
                console.log('\n⚠️  WARNING:');
                console.log('   Limited historical data.');
                console.log(`   1D: OK (${uniqueDates.length} dates)`);
                console.log(`   1M: ${uniqueDates.length >= 5 ? 'OK' : 'Limited'}`);
                console.log(`   1Y: Not enough data (need ~365 days)`);
            } else {
                console.log('\n✅ Sufficient data for all calculations');
            }

            // Check records per date
            console.log('\n📊 Records per date:');
            for (const date of uniqueDates.slice(0, 5)) {
                const { count } = await supabase
                    .from('financial_data')
                    .select('*', { count: 'exact', head: true })
                    .eq('scrape_date', date);

                console.log(`   ${date}: ${count} records`);
            }

        } else {
            console.log('Using RPC result:', data);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

checkDates()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
