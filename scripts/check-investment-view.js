/**
 * v_investment_opportunities View 확인
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkView() {
    console.log('\n🔍 v_investment_opportunities 확인...\n');

    try {
        // View 데이터 조회 시도
        const { data, error } = await supabase
            .from('v_investment_opportunities')
            .select('*')
            .limit(1);

        if (error) {
            console.log('❌ View 조회 실패:', error.message);
            console.log('Error details:', error);
        } else {
            console.log('✅ View 조회 성공');
            if (data && data.length > 0) {
                console.log('\n컬럼 목록:');
                console.log(Object.keys(data[0]));
                console.log('\n샘플 데이터:');
                console.log(data[0]);
            } else {
                console.log('⚠️ 데이터 없음 (빈 결과)');
            }
        }

        // 전체 카운트 확인
        const { count, error: countError } = await supabase
            .from('v_investment_opportunities')
            .select('*', { count: 'exact', head: true });

        if (!countError) {
            console.log(`\n📊 전체 레코드 수: ${count} 건`);
        }

    } catch (err) {
        console.error('❌ 오류:', err.message);
    }
}

checkView().then(() => process.exit(0));
