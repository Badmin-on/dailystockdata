/**
 * ETF View 재생성 스크립트 실행
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function executeSQLFile() {
    console.log('\n🚀 ETF View 재생성 시작...\n');

    try {
        // SQL 파일 읽기
        const sqlPath = path.join(__dirname, 'recreate-etf-views.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // SQL을 개별 문장으로 분리 (주석과 SELECT 문 제외)
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => {
                return s.length > 0 &&
                       !s.startsWith('--') &&
                       !s.startsWith('/*') &&
                       !s.match(/^SELECT\s+'[^']+'\s+as\s+step/i); // Step 메시지 제외
            });

        console.log(`📋 총 ${statements.length}개 SQL 문장 실행 예정\n`);

        // 각 SQL 문장 실행
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            // 빈 문장 건너뛰기
            if (!stmt || stmt.trim().length === 0) continue;

            console.log(`\n[${ i + 1}/${statements.length}] 실행 중...`);

            try {
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: stmt + ';'
                });

                if (error) {
                    // RPC 함수가 없으면 직접 실행 시도
                    if (error.message.includes('exec_sql')) {
                        console.log('  ⚠️ RPC 함수 없음, 직접 실행 시도 불가');
                        console.log('  → Supabase SQL Editor에서 수동 실행 필요');
                        break;
                    } else {
                        throw error;
                    }
                } else {
                    console.log('  ✅ 성공');
                }
            } catch (err) {
                console.error(`  ❌ 오류: ${err.message}`);
                // DROP VIEW는 실패해도 계속 진행
                if (!stmt.includes('DROP VIEW')) {
                    throw err;
                }
            }
        }

        console.log('\n\n🎯 최종 확인 중...\n');

        // View 존재 확인
        const { data: sectorStats, error: err1 } = await supabase
            .from('v_etf_sector_stats')
            .select('*')
            .limit(1);

        const { data: etfDetails, error: err2 } = await supabase
            .from('v_etf_details')
            .select('*')
            .limit(1);

        if (!err1 && sectorStats) {
            console.log('✅ v_etf_sector_stats 생성 확인');
        } else {
            console.log('❌ v_etf_sector_stats 생성 실패:', err1?.message);
        }

        if (!err2 && etfDetails) {
            console.log('✅ v_etf_details 생성 확인');
        } else {
            console.log('❌ v_etf_details 생성 실패:', err2?.message);
        }

        console.log('\n========================================');
        console.log('✅ ETF View 재생성 완료!');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);
        console.log('\n📝 수동 실행 방법:');
        console.log('1. Supabase Dashboard → SQL Editor 접속');
        console.log('2. scripts/recreate-etf-views.sql 파일 내용 복사');
        console.log('3. SQL Editor에 붙여넣기 후 실행\n');
        process.exit(1);
    }
}

executeSQLFile().then(() => process.exit(0));
