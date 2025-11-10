/**
 * Materialized View 간단 갱신 스크립트
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function refreshMaterializedView() {
    console.log('\n🔄 Materialized View 갱신 시작...\n');

    try {
        // Step 1: 갱신 전 현황
        console.log('📊 Step 1: 갱신 전 현황');
        const { count: beforeCount } = await supabase
            .from('mv_stock_analysis')
            .select('*', { count: 'exact', head: true });

        const { data: beforeDate } = await supabase
            .from('mv_stock_analysis')
            .select('latest_date')
            .order('latest_date', { ascending: false })
            .limit(1);

        console.log(`   레코드 수: ${beforeCount}`);
        console.log(`   최신 날짜: ${beforeDate?.[0]?.latest_date}\n`);

        // Step 2: Materialized View 갱신
        console.log('🔄 Step 2: Materialized View 갱신 중...');

        const { error: refreshError } = await supabase.rpc('refresh_mv_stock_analysis');

        if (refreshError) {
            console.log('⚠️ RPC 함수 사용 불가, SQL 직접 실행 시도...\n');

            // SQL 직접 실행 시도
            const { error: sqlError } = await supabase.rpc('exec_sql', {
                query: 'REFRESH MATERIALIZED VIEW mv_stock_analysis'
            });

            if (sqlError) {
                throw new Error(`MV 갱신 실패: ${sqlError.message}`);
            }
        }

        console.log('✅ 갱신 완료!\n');

        // Step 3: 갱신 후 확인
        console.log('📊 Step 3: 갱신 후 확인');
        const { count: afterCount } = await supabase
            .from('mv_stock_analysis')
            .select('*', { count: 'exact', head: true });

        const { data: afterDate } = await supabase
            .from('mv_stock_analysis')
            .select('latest_date')
            .order('latest_date', { ascending: false })
            .limit(1);

        console.log(`   레코드 수: ${afterCount}`);
        console.log(`   최신 날짜: ${afterDate?.[0]?.latest_date}\n`);

        // Step 4: ETF 샘플 확인 (change_rate 정상화 확인)
        console.log('📋 Step 4: ETF 샘플 확인 (change_rate 수정 반영 여부)');
        const { data: etfSamples, error: sampleError } = await supabase
            .from('mv_stock_analysis')
            .select(`
                name,
                current_price,
                change_rate,
                divergence_120,
                latest_date
            `)
            .eq('is_etf', true)
            .order('code')
            .limit(10);

        if (sampleError) {
            console.log('❌ 샘플 조회 실패:', sampleError.message);
        } else {
            console.table(etfSamples);
        }

        console.log('\n========================================');
        console.log('✅ MV 갱신 완료!');
        console.log('========================================\n');
        console.log('결과:');
        console.log('  - change_rate가 정상 범위(±30% 내외)로 표시되면 성공');
        console.log('  - 여전히 큰 값(-530%, -1560% 등)이면 추가 확인 필요\n');

    } catch (error) {
        console.error('❌ 갱신 중 오류:', error.message);
        console.log('\n💡 대안: SQL 파일 직접 실행');
        console.log('   → scripts/refresh-mv-simple.sql을 데이터베이스에서 직접 실행하세요.\n');
    }
}

refreshMaterializedView().then(() => {
    process.exit(0);
});
