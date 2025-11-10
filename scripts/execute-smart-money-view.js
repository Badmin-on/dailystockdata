/**
 * Execute Smart Money Flow View Creation
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function executeSQL() {
    console.log('\n🚀 Smart Money Flow View 생성 시작...\n');

    try {
        // SQL 파일 읽기
        const sqlPath = path.join(__dirname, 'create-smart-money-flow-view.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // SQL을 개별 명령어로 분리 (DO $$ 블록 제외)
        const createViewSQL = sqlContent
            .split('-- Step 2: View 생성')[1]
            .split('-- Step 3: View 생성 확인')[0]
            .trim()
            .replace(/SELECT '.*?' as step;/g, ''); // step 메시지 제거

        console.log('📝 View 생성 SQL 실행 중...');

        // Supabase에서 raw SQL 실행
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: createViewSQL
        });

        if (error) {
            // RPC 함수가 없을 경우 대안 시도
            if (error.code === '42883') {
                console.log('\n⚠️  exec_sql RPC 함수가 없습니다.');
                console.log('📋 Supabase 대시보드에서 직접 실행해주세요:\n');
                console.log('1. https://supabase.com/dashboard 접속');
                console.log('2. SQL Editor 열기');
                console.log('3. 다음 파일 내용 복사/붙여넣기:');
                console.log('   scripts/create-smart-money-flow-view.sql\n');
                console.log('4. Run 버튼 클릭\n');

                // 또는 간단한 검증 쿼리 시도
                console.log('🔍 View 존재 여부 확인 중...');
                const { data: viewCheck } = await supabase
                    .from('v_smart_money_flow')
                    .select('count')
                    .limit(1);

                if (viewCheck) {
                    console.log('✅ View가 이미 존재합니다!');
                } else {
                    console.log('❌ View가 존재하지 않습니다. 위의 안내대로 생성해주세요.');
                }
                return;
            }

            throw error;
        }

        console.log('✅ View 생성 완료!');

        // View 확인
        const { data: viewData, error: viewError } = await supabase
            .from('v_smart_money_flow')
            .select('*')
            .limit(10);

        if (viewError) {
            console.error('❌ View 조회 실패:', viewError.message);
            return;
        }

        console.log(`\n📊 Smart Money Flow 발굴 기업: ${viewData?.length || 0}개`);

        if (viewData && viewData.length > 0) {
            console.log('\n🏆 Top 5:');
            viewData.slice(0, 5).forEach((item, i) => {
                console.log(`${i + 1}. ${item.name} (${item.code})`);
                console.log(`   등급: ${item.grade} | 점수: ${item.smart_money_score} | RVOL: ${item.rvol}`);
            });
        }

        console.log('\n✨ 완료! Smart Money Flow 페이지를 확인해보세요.\n');

    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);
        console.log('\n📋 대안: Supabase 대시보드에서 직접 실행');
        console.log('파일: scripts/create-smart-money-flow-view.sql\n');
    }
}

executeSQL()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
