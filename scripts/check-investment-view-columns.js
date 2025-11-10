/**
 * v_investment_opportunities View 컬럼 구조 확인
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkColumns() {
    console.log('\n🔍 v_investment_opportunities 컬럼 확인...\n');

    const { data, error } = await supabase
        .from('v_investment_opportunities')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ 오류:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('📋 컬럼 목록:');
        console.log(Object.keys(data[0]));
        console.log('\n샘플 데이터:');
        console.log(data[0]);
    }
}

checkColumns().then(() => process.exit(0));
