/**
 * Smart Money Flow 중복 체크
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkDuplicates() {
    console.log('\n🔍 Smart Money Flow 중복 확인...\n');

    try {
        // v_smart_money_flow 조회
        const { data, error } = await supabase
            .from('v_smart_money_flow')
            .select('*')
            .order('smart_money_score', { ascending: false });

        if (error) {
            console.error('❌ 오류:', error.message);
            return;
        }

        console.log(`📊 총 레코드: ${data.length}개\n`);

        // 회사별 개수 확인
        const companyCount = {};
        data.forEach(row => {
            const key = row.code;
            companyCount[key] = (companyCount[key] || 0) + 1;
        });

        // 중복된 회사 찾기
        const duplicates = Object.entries(companyCount).filter(([code, count]) => count > 1);

        if (duplicates.length > 0) {
            console.log(`⚠️  중복된 회사: ${duplicates.length}개\n`);
            console.log('중복 예시 (처음 5개):');

            duplicates.slice(0, 5).forEach(([code, count]) => {
                const rows = data.filter(r => r.code === code);
                console.log(`\n${rows[0].name} (${code}): ${count}개 중복`);
                rows.forEach((r, i) => {
                    console.log(`  ${i + 1}. year: ${r.year || 'N/A'}, score: ${r.smart_money_score}`);
                });
            });

            console.log(`\n... 외 ${duplicates.length - 5}개\n`);
        } else {
            console.log('✅ 중복 없음\n');
        }

        // v_investment_opportunities 확인
        console.log('🔍 v_investment_opportunities 확인...');
        const { data: ioData, error: ioErr } = await supabase
            .from('v_investment_opportunities')
            .select('code, name, year, investment_score')
            .order('investment_score', { ascending: false })
            .limit(200);

        if (ioErr) {
            console.error('❌ v_investment_opportunities 오류:', ioErr.message);
        } else {
            const ioCompanyCount = {};
            ioData.forEach(row => {
                ioCompanyCount[row.code] = (ioCompanyCount[row.code] || 0) + 1;
            });

            const ioDuplicates = Object.entries(ioCompanyCount).filter(([code, count]) => count > 1);

            console.log(`\nv_investment_opportunities 중복: ${ioDuplicates.length}개`);

            if (ioDuplicates.length > 0) {
                console.log('\n예시 (처음 3개):');
                ioDuplicates.slice(0, 3).forEach(([code, count]) => {
                    const rows = ioData.filter(r => r.code === code);
                    console.log(`\n${rows[0].name} (${code}): ${count}개`);
                    rows.forEach(r => console.log(`  - year: ${r.year}, score: ${r.investment_score}`));
                });
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('💡 원인 분석:');
        if (duplicates.length > 0) {
            console.log('   v_investment_opportunities가 연도별로');
            console.log('   여러 행을 반환하여 중복 발생');
            console.log('\n해결책:');
            console.log('   1. 회사당 최신 연도만 선택 (year 기준)');
            console.log('   2. 또는 DISTINCT ON (company_id) 사용');
        } else {
            console.log('   중복 없음 - 정상 작동 중');
        }
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);
    }
}

checkDuplicates()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
