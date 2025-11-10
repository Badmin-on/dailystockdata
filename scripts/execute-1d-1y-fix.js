/**
 * Execute 1D/1Y fix directly to Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function executeFix() {
    console.log('\n🚀 Executing 1D/1Y fix...\n');

    try {
        // Read the SQL file
        const sql = fs.readFileSync('./add-1d-1y-support.sql', 'utf8');

        // Split into major sections and execute
        console.log('📋 Executing SQL updates...\n');

        // For Supabase, we need to use REST API to execute raw SQL
        // Let's try using RPC or direct query

        // First, let's check current state
        console.log('1️⃣ Checking current mv_consensus_changes columns...');

        const { data: currentData, error: currentError } = await supabase
            .from('mv_consensus_changes')
            .select('*')
            .limit(1);

        if (currentError) {
            console.error('❌ Error checking current state:', currentError.message);
        } else if (currentData && currentData.length > 0) {
            const columns = Object.keys(currentData[0]);
            console.log('   Current columns:', columns.join(', '));

            const has1d = columns.includes('revenue_change_1d');
            const has1y = columns.includes('revenue_change_1y');

            console.log(`   Has 1D columns: ${has1d ? '✅' : '❌'}`);
            console.log(`   Has 1Y columns: ${has1y ? '✅' : '❌'}`);

            if (has1d && has1y) {
                console.log('\n✅ Columns already exist! Checking v_investment_opportunities...\n');

                const { data: viewData, error: viewError } = await supabase
                    .from('v_investment_opportunities')
                    .select('*')
                    .limit(1);

                if (!viewError && viewData && viewData.length > 0) {
                    const viewCols = Object.keys(viewData[0]);
                    console.log('   View columns:', viewCols.join(', '));

                    const viewHas1d = viewCols.includes('revenue_change_1d');
                    const viewHas1y = viewCols.includes('revenue_change_1y');

                    console.log(`   View has 1D columns: ${viewHas1d ? '✅' : '❌'}`);
                    console.log(`   View has 1Y columns: ${viewHas1y ? '✅' : '❌'}`);

                    if (viewHas1d && viewHas1y) {
                        console.log('\n🎉 Everything is already set up correctly!');
                        console.log('\n🔍 Checking if data is populated...\n');

                        const { data: sampleData } = await supabase
                            .from('v_investment_opportunities')
                            .select('name, code, revenue_change_1d, op_profit_change_1d, revenue_change_1m, revenue_change_1y')
                            .order('revenue_change_1d', { ascending: false, nullsFirst: false })
                            .limit(5);

                        if (sampleData && sampleData.length > 0) {
                            console.log('Sample data:');
                            console.table(sampleData);

                            const hasValues = sampleData.some(d =>
                                d.revenue_change_1d !== null || d.revenue_change_1y !== null
                            );

                            if (hasValues) {
                                console.log('\n✅ Data is populated correctly!');
                                console.log('\n💡 Try hard refreshing the browser (Ctrl+Shift+R or Cmd+Shift+R)');
                            } else {
                                console.log('\n⚠️  Columns exist but no data. This might be normal if:');
                                console.log('   - Financial data scraping is still in progress');
                                console.log('   - Not enough historical data exists yet (need 2+ dates for 1D, 360+ days for 1Y)');
                            }
                        }
                    }
                }
            } else {
                console.log('\n⚠️  Need to run SQL to add columns.');
                console.log('\n📝 Please run this in Supabase SQL Editor:');
                console.log('   File: scripts/add-1d-1y-support.sql\n');
                console.log('Or copy-paste the SQL from the file.\n');
            }
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\n💡 Alternative: Run SQL manually in Supabase Dashboard > SQL Editor');
        console.log('   File: scripts/add-1d-1y-support.sql\n');
    }
}

executeFix()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
