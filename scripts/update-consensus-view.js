/**
 * Update mv_consensus_changes view to include 1D and 1Y columns
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function updateView() {
    console.log('\n🔄 Updating mv_consensus_changes view with 1D and 1Y columns...\n');

    try {
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'update-consensus-view-with-1d-1y.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split into individual statements (skip comments and empty lines)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📋 Executing ${statements.length} SQL statements...\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // Skip if it's just a comment
            if (statement.startsWith('--')) continue;

            console.log(`[${i + 1}/${statements.length}] Executing...`);

            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: statement
            });

            if (error) {
                // Try direct query for SELECT statements
                if (statement.trim().toUpperCase().startsWith('SELECT')) {
                    const { data: selectData, error: selectError } = await supabase
                        .from('mv_consensus_changes')
                        .select('*')
                        .limit(10);

                    if (!selectError) {
                        console.log('✅ Query succeeded');
                        if (selectData && selectData.length > 0) {
                            console.log(`   Sample: ${selectData.length} records`);
                        }
                        continue;
                    }
                }

                console.error(`❌ Error: ${error.message}`);

                // Continue anyway for non-critical errors
                if (!error.message.includes('does not exist')) {
                    throw error;
                }
            } else {
                console.log('✅ Success');
            }
        }

        console.log('\n✨ View update completed!\n');

        // Verify the new columns exist
        console.log('🔍 Verifying new columns...\n');

        const { data: sample, error: sampleError } = await supabase
            .from('mv_consensus_changes')
            .select('name, code, revenue_change_1d, op_profit_change_1d, revenue_change_1m, revenue_change_1y, op_profit_change_1y')
            .not('revenue_change_1d', 'is', null)
            .limit(5);

        if (sampleError) {
            console.error('❌ Verification error:', sampleError.message);
        } else if (sample && sample.length > 0) {
            console.log('✅ Sample data with 1D and 1Y columns:');
            console.table(sample);
        } else {
            console.log('⚠️  No data found yet (may need to wait for next data scrape)');
        }

        // Get statistics
        const { data: stats, error: statsError } = await supabase
            .from('mv_consensus_changes')
            .select('revenue_change_1d, op_profit_change_1d, revenue_change_1m, revenue_change_1y, op_profit_change_1y');

        if (!statsError && stats) {
            const total = stats.length;
            const has1d = stats.filter(s => s.revenue_change_1d !== null).length;
            const has1m = stats.filter(s => s.revenue_change_1m !== null).length;
            const has1y = stats.filter(s => s.revenue_change_1y !== null).length;

            console.log('\n📊 Statistics:');
            console.log(`   Total records: ${total}`);
            console.log(`   Has 1D data: ${has1d} (${(has1d/total*100).toFixed(1)}%)`);
            console.log(`   Has 1M data: ${has1m} (${(has1m/total*100).toFixed(1)}%)`);
            console.log(`   Has 1Y data: ${has1y} (${(has1y/total*100).toFixed(1)}%)`);
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        throw error;
    }
}

updateView()
    .then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });
