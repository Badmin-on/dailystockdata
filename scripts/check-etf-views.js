/**
 * ETF 관련 View 존재 여부 확인
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkETFViews() {
    console.log('\n🔍 ETF 관련 View 확인...\n');

    const views = [
        'v_etf_sector_stats',
        'v_etf_details',
        'v_etf_monitoring'
    ];

    for (const viewName of views) {
        try {
            const { data, error } = await supabase
                .from(viewName)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`❌ ${viewName}: 존재하지 않음`);
                console.log(`   에러: ${error.message}\n`);
            } else {
                console.log(`✅ ${viewName}: 존재함 (${data?.length || 0}건)`);
                if (data && data.length > 0) {
                    console.log(`   컬럼:`, Object.keys(data[0]));
                }
                console.log('');
            }
        } catch (err) {
            console.error(`❌ ${viewName}: 오류 -`, err.message);
        }
    }
}

checkETFViews().then(() => process.exit(0));
