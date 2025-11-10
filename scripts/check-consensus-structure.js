/**
 * mv_consensus_changes 테이블 구조 확인
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkStructure() {
    console.log('\n🔍 mv_consensus_changes 구조 확인...\n');

    try {
        const { data, error } = await supabase
            .from('mv_consensus_changes')
            .select('*')
            .limit(1);

        if (error) {
            console.log('❌ 조회 실패:', error.message);
            return;
        }

        if (data && data.length > 0) {
            console.log('📊 컬럼 목록:');
            console.log(Object.keys(data[0]));
            console.log('\n샘플 데이터:');
            console.log(data[0]);
        } else {
            console.log('⚠️ 데이터 없음');
        }

    } catch (err) {
        console.error('❌ 오류:', err.message);
    }
}

checkStructure().then(() => process.exit(0));
