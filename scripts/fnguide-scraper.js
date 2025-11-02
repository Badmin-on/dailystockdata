/**
 * FnGuide 재무 데이터 수집 스크립트 (Standalone 버전)
 *
 * GitHub Actions 자동 실행용
 * Express 서버 없이 독립 실행 가능
 *
 * 실행 방법:
 * node scripts/fnguide-scraper.js
 *
 * 특징:
 * - Supabase에 직접 저장
 * - 1000개 기업 처리 (16-17분 소요)
 * - 콘솔 로그로 진행률 표시
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 환경변수 누락: SUPABASE_URL과 SUPABASE_SERVICE_KEY를 설정하세요.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 네이버 금융에서 상위 500개 종목 가져오기
const fetchTopStocks = async (market) => {
    const stocks = [];
    const seenCodes = new Set(); // 중복 code 추적

    for (let page = 1; page <= 10; page++) {
        const url = `https://finance.naver.com/sise/sise_market_sum.nhn?sosok=${market === 'KOSPI' ? 0 : 1}&page=${page}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const decodedResponse = iconv.decode(Buffer.from(response.data), 'EUC-KR');
        const $ = cheerio.load(decodedResponse);

        $('table.type_2 tbody tr').each((index, element) => {
            const $tds = $(element).find('td');
            const name = $($tds[1]).text().trim();
            const $anchor = $($tds[1]).find('a');
            if ($anchor.length > 0) {
                const href = $anchor.attr('href');
                if (href) {
                    const code = href.split('=')[1];
                    // 중복 code 체크
                    if (code && !seenCodes.has(code)) {
                        seenCodes.add(code);
                        stocks.push({ name, code, market });
                    }
                }
            }
        });

        if (stocks.length >= 500) break;
    }

    console.log(`📋 ${market} 수집: ${stocks.length}개 (중복 제거됨)`);
    return stocks.slice(0, 500);
};

// FnGuide에서 재무 데이터 가져오기
const fetchStockData = async (stockCode) => {
    const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${stockCode}`;

    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const table = $('table').eq(11);
        const headers = [];
        table.find('thead th').each((i, elem) => {
            headers.push($(elem).text().trim());
        });

        headers.shift();

        const recentFourYears = headers.slice(-4);
        const rows = table.find('tbody tr');
        const data = {};
        const neededRows = ['매출액', '영업이익'];

        rows.each((i, row) => {
            const cells = $(row).find('td, th');
            let rowName = $(cells[0]).text().trim();
            if (neededRows.includes(rowName)) {
                rowName = rowName.split(' ')[0];
                data[rowName] = cells.slice(-4).map((j, cell) => $(cell).text().trim()).get();
            }
        });

        return { headers: recentFourYears, data };
    } catch (error) {
        console.error(error);
        return { headers: [], data: {} };
    }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Supabase에 데이터 저장
 */
const saveToSupabase = async (allStockData, scrapeDate) => {
    if (allStockData.length === 0) {
        console.log("⚠️  저장할 데이터가 없습니다.");
        return { saved_companies: 0, saved_financial_records: 0 };
    }

    let savedCompanies = 0;
    let savedFinancialRecords = 0;

    try {
        // 🔍 Supabase 연결 테스트
        console.log('\n🔍 Supabase 연결 상태 확인...');
        const actualUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const actualKey = process.env.SUPABASE_SERVICE_KEY;

        console.log('  - SUPABASE_URL 존재:', !!actualUrl);
        console.log('  - SUPABASE_SERVICE_KEY 존재:', !!actualKey);
        console.log('  - URL 길이:', (actualUrl || '').length);
        console.log('  - KEY 길이:', (actualKey || '').length);
        console.log('  - URL 값 (마지막 20자):', actualUrl ? '...' + actualUrl.slice(-20) : 'null');
        console.log('  - URL에 slash 포함:', actualUrl ? actualUrl.includes('/dashboard') || actualUrl.endsWith('/') : false);

        // 간단한 SELECT 쿼리로 연결 테스트
        console.log('  - 연결 테스트 중...');
        const { data: testData, error: testError } = await supabase
            .from('companies')
            .select('id')
            .limit(1);

        if (testError) {
            console.error('❌ Supabase 연결 테스트 실패:', JSON.stringify(testError, null, 2));
            throw new Error(`Supabase 연결 실패: ${testError.message || 'Unknown error'}`);
        }

        console.log('✅ Supabase 연결 성공!');
        console.log('');

        // 1. companies 테이블에 기업 정보 저장 (upsert로 중복 방지)
        const companyRecords = allStockData.map(stock => ({
            name: stock.name,
            code: stock.code,
            market: stock.market,
            is_etf: false  // FnGuide는 일반 주식만 수집
        }));

        // 중복 code 체크
        const uniqueCodes = new Set(companyRecords.map(c => c.code));
        if (uniqueCodes.size !== companyRecords.length) {
            console.warn(`⚠️  경고: allStockData에 중복 code 발견! (${companyRecords.length - uniqueCodes.size}개 중복)`);
        }

        const { data: companiesData, error: companiesError } = await supabase
            .from('companies')
            .upsert(companyRecords, {
                onConflict: 'code',
                ignoreDuplicates: false
            })
            .select('id, code');

        console.log('🔍 Supabase 응답 확인:');
        console.log('  - companiesData:', companiesData ? `${companiesData.length}개` : 'null');
        console.log('  - companiesError:', companiesError ? 'Error 있음' : 'null');

        if (companiesError) {
            console.error('❌ Companies 저장 상세 오류:', JSON.stringify(companiesError, null, 2));
            throw new Error(`Companies 저장 실패: ${companiesError.message || 'Unknown error'} | Code: ${companiesError.code} | Details: ${companiesError.details || 'No details'}`);
        }

        if (!companiesData || companiesData.length === 0) {
            throw new Error('Companies 저장 실패: 반환된 데이터가 없습니다 (companiesData is null or empty)');
        }

        savedCompanies = companiesData.length;
        console.log(`✅ ${savedCompanies}개 기업 정보 저장 완료`);

        // code → company_id 매핑 생성
        const codeToIdMap = {};
        companiesData.forEach(company => {
            codeToIdMap[company.code] = company.id;
        });

        // 2. financial_data 테이블에 재무 데이터 저장
        const financialRecords = [];
        const financialRecordKeys = new Set(); // 중복 방지용
        let skippedCompanies = 0;
        let duplicateRecords = 0;

        allStockData.forEach(stock => {
            const companyId = codeToIdMap[stock.code];
            if (!companyId) {
                console.warn(`⚠️  ${stock.name} (${stock.code})의 company_id를 찾을 수 없습니다.`);
                skippedCompanies++;
                return;
            }

            // 연도 추출 (정규표현식으로 YYYY 형식)
            const years = stock.stockData.headers.map(h => {
                const match = h.match(/\d{4}/);
                return match ? parseInt(match[0]) : null;
            }).filter(y => y !== null);

            // 각 연도별 재무 데이터 생성
            years.forEach((year, yearIndex) => {
                // 중복 체크용 키 생성
                const recordKey = `${companyId}-${year}-${scrapeDate}`;

                if (financialRecordKeys.has(recordKey)) {
                    duplicateRecords++;
                    return; // 이미 추가된 레코드는 스킵
                }

                financialRecordKeys.add(recordKey);

                const revenueStr = stock.stockData.data['매출액'] ? stock.stockData.data['매출액'][yearIndex] : null;
                const opProfitStr = stock.stockData.data['영업이익'] ? stock.stockData.data['영업이익'][yearIndex] : null;

                const revenue = revenueStr ? parseFloat(revenueStr.replace(/,/g, '')) : null;
                const operatingProfit = opProfitStr ? parseFloat(opProfitStr.replace(/,/g, '')) : null;

                financialRecords.push({
                    company_id: companyId,
                    year: year,
                    scrape_date: scrapeDate,
                    revenue: revenue,
                    operating_profit: operatingProfit,
                    is_estimate: false  // FnGuide 실적 데이터는 실제 값
                });
            });
        });

        // 문제 발견 시 로깅
        if (skippedCompanies > 0) {
            console.warn(`⚠️  총 ${skippedCompanies}개 기업의 재무 데이터 생성 실패 (company_id 매핑 오류)`);
        }
        if (duplicateRecords > 0) {
            console.warn(`⚠️  ${duplicateRecords}개 중복 레코드 방지 (배열 내부 중복)`);
        }

        console.log(`📊 재무 레코드 생성: ${financialRecords.length}개 (고유 레코드)`);

        // Batch insert (1000개씩)
        const batchSize = 1000;
        const totalBatches = Math.ceil(financialRecords.length / batchSize);
        console.log(`\n📦 총 ${totalBatches}개 배치로 삽입 시작...`);

        for (let i = 0; i < financialRecords.length; i += batchSize) {
            const batch = financialRecords.slice(i, i + batchSize);
            const batchNum = i / batchSize + 1;

            const { error: financialError } = await supabase
                .from('financial_data')
                .insert(batch);

            if (financialError) {
                console.error(`❌ Batch ${batchNum}/${totalBatches} 저장 실패: ${financialError.message}`);
                console.error(`   레코드 범위: ${i + 1} ~ ${i + batch.length}`);

                // 중복 키 오류인 경우 추가 정보 제공
                if (financialError.message.includes('duplicate key')) {
                    console.error(`   ⚠️  이 배치에 이미 DB에 존재하는 레코드가 포함되어 있습니다.`);
                    console.error(`   💡 원인: 오늘 날짜 데이터가 이미 존재하거나, 배열에 중복이 있을 수 있습니다.`);
                }
            } else {
                savedFinancialRecords += batch.length;
                console.log(`✅ Batch ${batchNum}/${totalBatches} 저장 완료 (${batch.length}개 레코드)`);
            }
        }

        console.log(`\n💾 Supabase 저장 완료!`);
        console.log(`   - 기업: ${savedCompanies}개`);
        console.log(`   - 재무 레코드: ${savedFinancialRecords}개`);

        return {
            saved_companies: savedCompanies,
            saved_financial_records: savedFinancialRecords
        };

    } catch (error) {
        console.error('❌ Supabase 저장 중 오류:', error);
        throw error;
    }
};

/**
 * 메인 실행 함수
 */
async function main() {
    const startTime = Date.now();
    // 로컬 시간 기준으로 날짜 생성 (한국 시간대)
    const now = new Date();
    const scrapeDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 FnGuide 재무 데이터 수집 시작`);
        console.log(`📅 날짜: ${scrapeDate}`);
        console.log(`⏰ 시작 시간: ${now.toLocaleString('ko-KR')}`);
        console.log(`${'='.repeat(60)}\n`);

        const kospiStocks = await fetchTopStocks('KOSPI');
        const kosdaqStocks = await fetchTopStocks('KOSDAQ');
        const allStocks = [...kospiStocks, ...kosdaqStocks];

        console.log(`📊 총 ${allStocks.length}개 기업 수집 예정 (KOSPI: ${kospiStocks.length}, KOSDAQ: ${kosdaqStocks.length})\n`);

        let allStockData = [];
        let successCount = 0;
        let errorCount = 0;

        for (let index = 0; index < allStocks.length; index++) {
            const { name, code, market } = allStocks[index];
            try {
                const stockData = await fetchStockData(code);
                allStockData.push({ name, code, stockData, market, index: index + 1 });
                successCount++;

                // 콘솔 로그
                if ((index + 1) % 50 === 0) {
                    console.log(`📈 진행률: ${index + 1}/${allStocks.length} (${((index + 1) / allStocks.length * 100).toFixed(1)}%)`);
                }

                await delay(1000);  // 1초 지연
            } catch (error) {
                console.error(`❌ ${name} (${code}) 데이터 수집 실패:`, error.message);
                errorCount++;
            }
        }

        console.log(`\n✅ 크롤링 완료! 성공: ${successCount}, 실패: ${errorCount}`);
        console.log('💾 Supabase에 저장 중...\n');

        // Supabase에 저장
        const saveResult = await saveToSupabase(allStockData, scrapeDate);

        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎉 모든 작업 완료!`);
        console.log(`⏱️  총 소요 시간: ${Math.floor(duration / 60)}분 ${duration % 60}초`);
        console.log(`📊 저장 결과: ${saveResult.saved_companies}개 기업, ${saveResult.saved_financial_records}개 재무 레코드`);
        console.log(`${'='.repeat(60)}\n`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ 치명적 오류:', error);
        process.exit(1);
    }
}

// 실행
main();
