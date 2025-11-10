/**
 * companies 테이블 구조 및 ETF 데이터 확인
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkCompaniesStructure() {
    console.log('\n🔍 companies 테이블 구조 확인...\n');

    try {
        // 1. 전체 종목 중 랜덤 1개 조회하여 컬럼 구조 확인
        const { data: sample, error: err1 } = await supabase
            .from('companies')
            .select('*')
            .limit(1);

        if (err1) {
            console.error('❌ companies 조회 오류:', err1.message);
        } else if (sample && sample.length > 0) {
            console.log('📋 companies 테이블 컬럼:');
            console.log(Object.keys(sample[0]));
            console.log('\n샘플 데이터:');
            console.log(sample[0]);
            console.log('\n');
        }

        // 2. is_etf = TRUE인 종목 조회
        const { data: etfData, error: err2 } = await supabase
            .from('companies')
            .select('*')
            .eq('is_etf', true)
            .limit(5);

        if (err2) {
            console.error('❌ ETF 조회 오류:', err2.message);
        } else {
            console.log(`✅ is_etf=TRUE 종목: ${etfData?.length || 0}개\n`);
            if (etfData && etfData.length > 0) {
                console.log('샘플 ETF 데이터:');
                etfData.forEach((etf, idx) => {
                    console.log(`\n[${idx + 1}] ${etf.name} (${etf.code})`);
                    console.log(`    market: ${etf.market}`);
                    console.log(`    sector_id: ${etf.sector_id}`);
                    console.log(`    growth_score: ${etf.growth_score}`);
                });
            }
        }

        // 3. 전체 is_etf 개수 확인
        const { count: totalETFs, error: err3 } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
            .eq('is_etf', true);

        if (err3) {
            console.error('❌ 카운트 오류:', err3.message);
        } else {
            console.log(`\n\n📊 전체 is_etf=TRUE 종목 개수: ${totalETFs || 0}개\n`);
        }

        // 4. ETF 이름 패턴 검색 (KODEX, TIGER, ACE 등)
        const etfPatterns = ['KODEX', 'TIGER', 'ACE', 'RISE', 'SOL', 'HANARO', 'KBSTAR'];

        console.log('🔍 ETF 패턴으로 검색:\n');

        for (const pattern of etfPatterns) {
            const { count, error } = await supabase
                .from('companies')
                .select('*', { count: 'exact', head: true })
                .ilike('name', `${pattern}%`);

            if (!error) {
                console.log(`  ${pattern}: ${count || 0}개`);
            }
        }

        // 5. is_etf=NULL인 ETF 패턴 종목 찾기
        console.log('\n\n⚠️ is_etf가 NULL/FALSE인데 ETF로 보이는 종목:\n');

        for (const pattern of etfPatterns.slice(0, 3)) { // 처음 3개만 확인
            const { data, error } = await supabase
                .from('companies')
                .select('id, code, name, is_etf, sector_id')
                .ilike('name', `${pattern}%`)
                .or('is_etf.is.null,is_etf.eq.false')
                .limit(5);

            if (!error && data && data.length > 0) {
                console.log(`\n${pattern} 패턴 (is_etf=NULL/FALSE):`);
                data.forEach(c => {
                    console.log(`  - ${c.name} (${c.code}) | is_etf: ${c.is_etf} | sector_id: ${c.sector_id}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

checkCompaniesStructure().then(() => process.exit(0));
