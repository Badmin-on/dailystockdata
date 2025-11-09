/**
 * Smart Money Flow View 데이터 검증
 *
 * 목적: v_smart_money_flow View가 올바르게 생성되었는지 확인
 * 검증 항목:
 * 1. View 존재 여부
 * 2. 데이터 개수 확인
 * 3. RVOL 계산 정확성
 * 4. 점수 범위 검증 (0-100)
 * 5. 등급 분포 확인
 * 6. 거래량 패턴 확인
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function verifySmartMoneyFlow() {
    console.log('\n🔍 Smart Money Flow View 검증 시작...\n');

    try {
        // 1. View 존재 여부 확인
        console.log('📋 Step 1: View 존재 여부 확인');
        const { data: viewExists, error: err1 } = await supabase
            .from('v_smart_money_flow')
            .select('*')
            .limit(1);

        if (err1) {
            console.error('❌ View가 존재하지 않습니다:', err1.message);
            return;
        }

        console.log('✅ v_smart_money_flow View 존재 확인\n');

        // 2. 전체 데이터 개수
        console.log('📊 Step 2: 전체 데이터 개수 확인');
        const { count: totalCount, error: err2 } = await supabase
            .from('v_smart_money_flow')
            .select('*', { count: 'exact', head: true });

        if (err2) {
            console.error('❌ 카운트 오류:', err2.message);
        } else {
            console.log(`✅ 전체 발굴 기업: ${totalCount || 0}개\n`);
        }

        // 3. 등급별 분포
        console.log('🏆 Step 3: 등급별 분포 확인');
        const { data: gradeData, error: err3 } = await supabase
            .from('v_smart_money_flow')
            .select('grade, smart_money_score, rvol');

        if (err3) {
            console.error('❌ 등급 조회 오류:', err3.message);
        } else if (gradeData) {
            const gradeCounts = {
                'S': gradeData.filter(d => d.grade === 'S').length,
                'A': gradeData.filter(d => d.grade === 'A').length,
                'B': gradeData.filter(d => d.grade === 'B').length,
                'C': gradeData.filter(d => d.grade === 'C').length,
            };

            console.log('등급별 분포:');
            Object.entries(gradeCounts).forEach(([grade, count]) => {
                console.log(`  ${grade}급: ${count}개`);
            });
            console.log('');
        }

        // 4. 점수 범위 검증 (0-100)
        console.log('📈 Step 4: 점수 범위 검증');
        const { data: scoreData, error: err4 } = await supabase
            .from('v_smart_money_flow')
            .select('name, code, smart_money_score, consensus_score, divergence_score, volume_score');

        if (err4) {
            console.error('❌ 점수 조회 오류:', err4.message);
        } else if (scoreData) {
            const invalidScores = scoreData.filter(d =>
                d.smart_money_score < 0 || d.smart_money_score > 100 ||
                d.consensus_score < 0 || d.consensus_score > 100 ||
                d.divergence_score < 0 || d.divergence_score > 100 ||
                d.volume_score < 0 || d.volume_score > 100
            );

            if (invalidScores.length > 0) {
                console.error('❌ 범위 초과 점수 발견:');
                invalidScores.forEach(d => {
                    console.error(`  - ${d.name} (${d.code}):`, {
                        smart_money: d.smart_money_score,
                        consensus: d.consensus_score,
                        divergence: d.divergence_score,
                        volume: d.volume_score
                    });
                });
            } else {
                console.log('✅ 모든 점수가 0-100 범위 내에 있습니다\n');
            }
        }

        // 5. RVOL 최소값 확인 (>= 1.2)
        console.log('📊 Step 5: RVOL 필터링 확인');
        const { data: rvolData, error: err5 } = await supabase
            .from('v_smart_money_flow')
            .select('name, code, rvol')
            .order('rvol', { ascending: true })
            .limit(10);

        if (err5) {
            console.error('❌ RVOL 조회 오류:', err5.message);
        } else if (rvolData && rvolData.length > 0) {
            const minRvol = Math.min(...rvolData.map(d => d.rvol));
            console.log(`최소 RVOL: ${minRvol}`);

            if (minRvol < 1.2) {
                console.error(`❌ RVOL 필터링 실패: ${minRvol} < 1.2`);
                console.error('RVOL < 1.2인 종목들:');
                rvolData.filter(d => d.rvol < 1.2).forEach(d => {
                    console.error(`  - ${d.name} (${d.code}): ${d.rvol}`);
                });
            } else {
                console.log('✅ 모든 종목이 RVOL >= 1.2 조건 충족\n');
            }
        }

        // 6. 거래량 패턴 분포
        console.log('📈 Step 6: 거래량 패턴 분포');
        const { data: patternData, error: err6 } = await supabase
            .from('v_smart_money_flow')
            .select('volume_pattern, acc_days_10d, rvol');

        if (err6) {
            console.error('❌ 패턴 조회 오류:', err6.message);
        } else if (patternData) {
            const patternCounts = {};
            patternData.forEach(d => {
                if (!patternCounts[d.volume_pattern]) {
                    patternCounts[d.volume_pattern] = 0;
                }
                patternCounts[d.volume_pattern]++;
            });

            console.log('패턴별 분포:');
            Object.entries(patternCounts).forEach(([pattern, count]) => {
                console.log(`  ${pattern}: ${count}개`);
            });
            console.log('');
        }

        // 7. Top 10 기업 확인
        console.log('🏆 Step 7: Smart Money Flow Top 10');
        const { data: topData, error: err7 } = await supabase
            .from('v_smart_money_flow')
            .select('name, code, grade, smart_money_score, rvol, volume_pattern, divergence_120, consensus_score')
            .order('smart_money_score', { ascending: false })
            .limit(10);

        if (err7) {
            console.error('❌ Top 10 조회 오류:', err7.message);
        } else if (topData) {
            console.log('\n순위 | 기업명 | 종목코드 | 등급 | 점수 | RVOL | 패턴 | 이격도 | 컨센서스');
            console.log('-----|--------|----------|------|------|------|------|--------|----------');
            topData.forEach((d, idx) => {
                console.log(
                    `${(idx + 1).toString().padStart(4)} | ` +
                    `${d.name.padEnd(8)} | ` +
                    `${d.code.padEnd(8)} | ` +
                    `${d.grade.padEnd(4)} | ` +
                    `${d.smart_money_score.toString().padStart(4)} | ` +
                    `${d.rvol.toFixed(2).padStart(4)} | ` +
                    `${d.volume_pattern.padEnd(6)} | ` +
                    `${d.divergence_120.toFixed(2).padStart(6)} | ` +
                    `${d.consensus_score.toString().padStart(8)}`
                );
            });
        }

        console.log('\n========================================');
        console.log('✅ Smart Money Flow View 검증 완료!');
        console.log('========================================\n');

        console.log('💡 다음 단계:');
        console.log('  1. 프론트엔드 페이지 구현 시작');
        console.log('  2. 거래량 차트 컴포넌트 개발');
        console.log('  3. 다크 테마 UI 적용\n');

    } catch (error) {
        console.error('❌ 검증 오류 발생:', error.message);
    }
}

verifySmartMoneyFlow().then(() => process.exit(0));
