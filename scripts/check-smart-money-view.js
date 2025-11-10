/**
 * Check if v_smart_money_flow view exists and has data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkView() {
    console.log('\n🔍 Checking v_smart_money_flow view...\n');

    try {
        // Try to query the view
        const { data, error } = await supabase
            .from('v_smart_money_flow')
            .select('*')
            .limit(5);

        if (error) {
            console.error('❌ View error:', error.message);
            console.error('   Code:', error.code);
            console.error('   Details:', error.details);
            console.error('   Hint:', error.hint);

            if (error.code === '42P01') {
                console.log('\n💡 View does not exist!');
                console.log('   Need to create v_smart_money_flow view');
                console.log('\n📝 Run: scripts/create-smart-money-flow-view.sql');
            }
            return;
        }

        if (data) {
            console.log('✅ View exists!');
            console.log(`   Records found: ${data.length}`);

            if (data.length > 0) {
                console.log('\n📊 Sample data:');
                console.table(data.map(d => ({
                    name: d.name,
                    code: d.code,
                    grade: d.grade,
                    score: d.smart_money_score,
                    rvol: d.rvol,
                    pattern: d.volume_pattern
                })));
            } else {
                console.log('\n⚠️  View exists but has no data');
                console.log('   This might be normal if:');
                console.log('   - No stocks meet the criteria');
                console.log('   - Source tables are empty');
            }
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

checkView()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
