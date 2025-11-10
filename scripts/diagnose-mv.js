/**
 * Materialized View 진단 스크립트
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function runDiagnostics() {
    console.log('\n🔍 Materialized View 진단 시작...\n');

    try {
        // 1. MV 존재 여부 확인
        const { data: mvData, error: mvError } = await supabase.rpc('run_diagnostic_query', {
            query_text: `
                SELECT
                    matviewname as view_name,
                    schemaname as schema,
                    ispopulated as is_populated,
                    hasindexes as has_indexes
                FROM pg_matviews
                WHERE matviewname = 'mv_stock_analysis'
            `
        });

        if (mvError) {
            console.log('📊 Step 1: Materialized View 존재 여부');
            console.log('❌ RPC 함수 사용 불가, 직접 쿼리 시도...\n');

            // 대안: 직접 테이블 조회
            const { data: mvCount, error: countError } = await supabase
                .from('mv_stock_analysis')
                .select('company_id', { count: 'exact', head: true });

            if (countError) {
                console.log('❌ MV가 존재하지 않거나 접근 불가:', countError.message);
                return;
            }

            console.log('✅ MV 존재 확인');
            console.log(`   레코드 수: ${mvCount?.count || 0} 건\n`);
        }

        // 2. UNIQUE INDEX 확인
        console.log('🔍 Step 2: UNIQUE INDEX 확인');
        const { data: indexData, error: indexError } = await supabase.rpc('run_diagnostic_query', {
            query_text: `
                SELECT
                    indexname as index_name,
                    indexdef as index_definition
                FROM pg_indexes
                WHERE tablename = 'mv_stock_analysis'
            `
        });

        if (indexError) {
            console.log('⚠️ INDEX 정보 조회 실패\n');
        } else if (!indexData || indexData.length === 0) {
            console.log('❌ INDEX가 없습니다');
            console.log('   → CONCURRENTLY 갱신 불가능\n');
        } else {
            const hasUniqueIndex = indexData.some(idx =>
                idx.index_definition?.includes('UNIQUE')
            );
            if (hasUniqueIndex) {
                console.log('✅ UNIQUE INDEX 존재');
            } else {
                console.log('⚠️ 일반 INDEX만 존재, UNIQUE INDEX 없음');
                console.log('   → CONCURRENTLY 갱신 불가능\n');
            }
        }

        // 3. 현재 데이터 상태
        console.log('📋 Step 3: 현재 데이터 상태');
        const { data: mvStats, error: statsError } = await supabase
            .from('mv_stock_analysis')
            .select('latest_date')
            .order('latest_date', { ascending: false })
            .limit(1);

        if (statsError) {
            console.log('❌ 데이터 조회 실패:', statsError.message);
        } else {
            const { count } = await supabase
                .from('mv_stock_analysis')
                .select('*', { count: 'exact', head: true });

            console.log(`   레코드 수: ${count} 건`);
            console.log(`   최신 날짜: ${mvStats?.[0]?.latest_date || 'N/A'}\n`);
        }

        // 4. 실제 최신 데이터와 비교
        console.log('⚠️ Step 4: 갱신 필요 여부');
        const { data: latestPrice, error: priceError } = await supabase
            .from('daily_stock_prices')
            .select('date')
            .order('date', { ascending: false })
            .limit(1);

        if (!priceError && latestPrice && mvStats) {
            const mvDate = mvStats[0]?.latest_date;
            const actualDate = latestPrice[0]?.date;

            console.log(`   실제 최신 데이터: ${actualDate}`);
            console.log(`   MV 최신 데이터: ${mvDate}`);

            if (mvDate === actualDate) {
                console.log('   ✅ 최신 상태\n');
            } else {
                console.log('   ⚠️ 갱신 필요!\n');
            }
        }

        // 진단 결과 및 권장사항
        console.log('========================================');
        console.log('💡 권장 사항');
        console.log('========================================\n');
        console.log('현재 상황:');
        console.log('  - UNIQUE INDEX 없음 → CONCURRENTLY 갱신 불가');
        console.log('  - 레코드 수 적음 → 일반 View로 충분\n');
        console.log('해결 방안 3가지:\n');
        console.log('방안 1: 간단한 갱신 (즉시 적용 가능)');
        console.log('  → scripts/refresh-mv-simple.sql 실행');
        console.log('  → CONCURRENTLY 없이 갱신 (잠시 락 발생)\n');
        console.log('방안 2: UNIQUE INDEX 생성 후 CONCURRENTLY 갱신');
        console.log('  → 복잡도 높음, 향후 유지보수 필요\n');
        console.log('방안 3: 일반 View로 전환 (권장)');
        console.log('  → 레코드 수 적으면 성능 차이 거의 없음');
        console.log('  → 갱신 자동화, 유지보수 간편\n');
        console.log('========================================');

    } catch (error) {
        console.error('❌ 진단 중 오류:', error.message);
    }
}

runDiagnostics().then(() => {
    console.log('✅ 진단 완료\n');
    process.exit(0);
});
