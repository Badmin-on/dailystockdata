/**
 * ETF 데이터 개수 및 상태 확인
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkETFCount() {
    console.log('\n🔍 ETF 데이터 상태 확인...\n');

    try {
        // 1. companies 테이블에서 is_etf = TRUE인 종목 개수
        const { data: etfCompanies, error: err1 } = await supabase
            .from('companies')
            .select('id, code, name, etf_provider, is_etf, etf_sector')
            .eq('is_etf', true);

        if (err1) {
            console.error('❌ companies 조회 오류:', err1.message);
        } else {
            console.log(`📊 companies 테이블에서 is_etf=TRUE 종목: ${etfCompanies?.length || 0}개\n`);

            if (etfCompanies && etfCompanies.length > 0) {
                // 섹터 할당 여부 확인
                const withSector = etfCompanies.filter(e => e.etf_sector !== null).length;
                const withoutSector = etfCompanies.filter(e => e.etf_sector === null).length;

                console.log(`  ✅ 섹터 할당됨: ${withSector}개`);
                console.log(`  ⚠️ 섹터 미할당: ${withoutSector}개\n`);

                if (withoutSector > 0) {
                    console.log('섹터 미할당 ETF 목록 (처음 10개):');
                    etfCompanies
                        .filter(e => e.etf_sector === null)
                        .slice(0, 10)
                        .forEach(e => {
                            console.log(`  - ${e.etf_provider} | ${e.name} (${e.code})`);
                        });
                    console.log('');
                }
            }
        }

        // 2. ETF로 추정되는 종목 (etf_provider가 있는 종목)
        const { data: providerCompanies, error: err2 } = await supabase
            .from('companies')
            .select('id, code, name, etf_provider, is_etf')
            .not('etf_provider', 'is', null);

        if (err2) {
            console.error('❌ provider 조회 오류:', err2.message);
        } else {
            console.log(`📋 provider가 있는 종목 (ETF 추정): ${providerCompanies?.length || 0}개\n`);

            if (providerCompanies && providerCompanies.length > 0) {
                const isEtfTrue = providerCompanies.filter(c => c.is_etf === true).length;
                const isEtfFalse = providerCompanies.filter(c => c.is_etf === false || c.is_etf === null).length;

                console.log(`  ✅ is_etf=TRUE: ${isEtfTrue}개`);
                console.log(`  ⚠️ is_etf=FALSE or NULL: ${isEtfFalse}개\n`);

                if (isEtfFalse > 0) {
                    console.log('is_etf가 FALSE/NULL인 ETF (처음 10개):');
                    providerCompanies
                        .filter(c => c.is_etf === false || c.is_etf === null)
                        .slice(0, 10)
                        .forEach(c => {
                            console.log(`  - ${c.etf_provider} | ${c.name} (${c.code})`);
                        });
                    console.log('');
                }
            }
        }

        // 3. v_etf_details View 확인
        const { data: viewData, error: err3 } = await supabase
            .from('v_etf_details')
            .select('*');

        if (err3) {
            console.error('❌ v_etf_details 조회 오류:', err3.message);
        } else {
            console.log(`🔍 v_etf_details View: ${viewData?.length || 0}개\n`);
        }

        // 4. 섹터별 통계
        const { data: sectorStats, error: err4 } = await supabase
            .from('v_etf_sector_stats')
            .select('*');

        if (err4) {
            console.error('❌ v_etf_sector_stats 조회 오류:', err4.message);
        } else {
            console.log(`📊 섹터별 통계:\n`);
            if (sectorStats && sectorStats.length > 0) {
                sectorStats.forEach(s => {
                    console.log(`  ${s.sector_name}: ${s.etf_count}개 ETF`);
                });
            }
        }

        console.log('\n========================================');
        console.log('💡 결론:');
        console.log('========================================\n');

        if (providerCompanies && etfCompanies) {
            const potentialETFs = providerCompanies.length;
            const markedETFs = etfCompanies.length;

            if (potentialETFs > markedETFs) {
                console.log(`⚠️ ETF로 추정되는 종목(${potentialETFs}개) 중 ${markedETFs}개만 is_etf=TRUE로 표시됨`);
                console.log(`\n해결 방법:`);
                console.log(`1. provider가 있는 모든 종목에 is_etf=TRUE 설정`);
                console.log(`2. 각 ETF를 적절한 섹터에 할당\n`);
            } else {
                console.log(`✅ ETF 마킹이 올바르게 되어 있습니다.`);
            }
        }

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

checkETFCount().then(() => process.exit(0));
