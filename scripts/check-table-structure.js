/**
 * 테이블 구조 확인 스크립트
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkStructure() {
    console.log('\n🔍 테이블 구조 확인...\n');

    try {
        // daily_stock_prices 샘플 데이터 확인
        const { data, error } = await supabase
            .from('daily_stock_prices')
            .select('*')
            .limit(1);

        if (error) {
            console.log('❌ 조회 실패:', error.message);
            return;
        }

        if (data && data.length > 0) {
            console.log('📊 daily_stock_prices 컬럼 목록:');
            console.log(Object.keys(data[0]));
            console.log('\n샘플 데이터:');
            console.log(data[0]);
        }

        // 기존 MV 구조 확인
        const { data: mvData, error: mvError } = await supabase
            .from('mv_stock_analysis')
            .select('*')
            .limit(1);

        if (!mvError && mvData && mvData.length > 0) {
            console.log('\n📊 mv_stock_analysis 컬럼 목록:');
            console.log(Object.keys(mvData[0]));
        }

    } catch (err) {
        console.error('❌ 오류:', err.message);
    }
}

checkStructure().then(() => process.exit(0));
