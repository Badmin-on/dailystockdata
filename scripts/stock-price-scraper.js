/**
 * 주가 데이터 수집 스크립트 (Supabase 버전)
 *
 * 실행 방법:
 * node 3_ys_stock_supabase.js
 *
 * 특징:
 * - 네이버 금융에서 최신 주가 데이터 수집
 * - Supabase에 직접 저장
 * - 배치 처리로 빠른 속도 (10개씩 동시 처리)
 * - 실시간 진행률 표시
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { createClient } = require('@supabase/supabase-js');

// --- 설정 ---
const CONCURRENT_BATCH_SIZE = 10; // 동시에 처리할 종목 수
const DELAY_BETWEEN_BATCHES_MS = 500; // 배치 간 대기 시간 (ms)

// --- Supabase 클라이언트 초기화 ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 환경변수 누락: SUPABASE_URL과 SUPABASE_SERVICE_KEY를 .env 파일에 설정하세요.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- 유틸리티 함수 ---
function cleanNumber(str) {
    if (str === undefined || str === null || typeof str !== 'string' || str.trim() === '') {
        return null;
    }
    const cleaned = str.replace(/[^0-9.-]/g, '');
    if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
        return parseFloat(cleaned);
    }
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- 기업 목록 가져오기 ---
async function getCompanyList() {
    try {
        const { data, error } = await supabase
            .from('companies')
            .select('id, name, code')
            .order('id');

        if (error) {
            throw new Error(`Companies 조회 실패: ${error.message}`);
        }

        return data || [];
    } catch (err) {
        console.error('❌ 기업 목록 조회 오류:', err.message);
        return [];
    }
}

// --- 최신 주가 데이터 수집 (네이버 금융) ---
async function fetchLatestStockPrice(stockCode) {
    const url = `https://finance.naver.com/item/sise_day.naver?code=${stockCode}`;
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            responseType: 'arraybuffer'
        });

        const decodedHtml = iconv.decode(data, 'euc-kr');
        const $ = cheerio.load(decodedHtml);
        const firstRow = $('table.type2 tr[onmouseover]').first();

        if (firstRow.length === 0) return null;

        const cells = firstRow.find('td');
        if (cells.length < 7) return null;

        const priceChangeText = $(cells[2]).text().trim();
        const isUp = priceChangeText.includes('상승');
        const isDown = priceChangeText.includes('하락');

        // Extract numeric change amount from cells[2] (remove Korean text)
        const changeAmount = cleanNumber(priceChangeText.replace('하락', '').replace('상승', ''));

        return {
            date: $(cells[0]).text().trim().replace(/\./g, '-'),
            close_price: $(cells[1]).text().trim(),
            change_rate: isDown ? -changeAmount : changeAmount,
            volume: $(cells[6]).text().trim()
        };
    } catch (error) {
        console.error(`[주가 데이터 오류] ${stockCode}: ${error.message}`);
        return null;
    }
}

// --- Supabase에 주가 데이터 저장 ---
async function savePriceToSupabase(company, priceData) {
    if (!priceData || !priceData.date) {
        return 0; // 저장할 데이터 없음
    }

    try {
        const closePrice = cleanNumber(priceData.close_price);
        const changeRate = priceData.change_rate; // 이미 숫자 타입
        const volume = cleanNumber(priceData.volume);

        if (closePrice === null) return 0; // 필수 값인 종가가 없으면 저장하지 않음

        const { error } = await supabase
            .from('daily_stock_prices')
            .upsert({
                company_id: company.id,
                date: priceData.date,
                close_price: closePrice,
                change_rate: changeRate,
                volume: volume
            }, {
                onConflict: 'company_id,date'
            });

        if (error) {
            throw new Error(error.message);
        }

        return 1; // 성공
    } catch (error) {
        console.error(`[DB 저장 오류] ${company.name}:`, error.message);
        throw error;
    }
}

// --- 메인 실행 로직 ---
async function main() {
    const startTime = Date.now();
    // 한국 시간 기준으로 날짜 생성 (UTC+9)
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = `${koreaTime.getFullYear()}-${String(koreaTime.getMonth() + 1).padStart(2, '0')}-${String(koreaTime.getDate()).padStart(2, '0')}`;

    console.log(`\n🚀 주가 데이터 수집 시작: ${today}`);
    console.log(`📊 배치 크기: ${CONCURRENT_BATCH_SIZE}개씩 동시 처리\n`);

    try {
        // 1. 기업 목록 가져오기
        const companyList = await getCompanyList();

        if (companyList.length === 0) {
            console.log('⚠️  처리할 기업이 없습니다.');
            return;
        }

        console.log(`📋 총 ${companyList.length}개 기업의 주가 데이터 수집 시작...\n`);

        let totalSuccess = 0;
        let totalError = 0;
        let totalNoData = 0;

        // 2. 배치 처리
        for (let i = 0; i < companyList.length; i += CONCURRENT_BATCH_SIZE) {
            const batch = companyList.slice(i, i + CONCURRENT_BATCH_SIZE);
            const progress = `${i + batch.length}/${companyList.length}`;
            const percent = ((i + batch.length) / companyList.length * 100).toFixed(1);

            console.log(`📈 진행률: ${progress} (${percent}%) - ${batch.length}개 종목 처리 중...`);

            try {
                const promises = batch.map(async (company) => {
                    try {
                        const priceData = await fetchLatestStockPrice(company.code);
                        const savedCount = await savePriceToSupabase(company, priceData);

                        if (savedCount > 0) {
                            return 'success';
                        } else {
                            return 'nodata';
                        }
                    } catch (err) {
                        console.error(`  ❌ ${company.name} (${company.code}) 처리 실패:`, err.message);
                        return 'error';
                    }
                });

                const results = await Promise.all(promises);
                const successCount = results.filter(r => r === 'success').length;
                const errorCount = results.filter(r => r === 'error').length;
                const noDataCount = results.filter(r => r === 'nodata').length;

                totalSuccess += successCount;
                totalError += errorCount;
                totalNoData += noDataCount;

                console.log(`  ✅ 배치 완료 - 성공: ${successCount}, 실패: ${errorCount}, 데이터없음: ${noDataCount}\n`);

            } catch (batchError) {
                console.error(`  ❌ 배치 처리 오류:`, batchError.message);
                totalError += batch.length;
            }

            // 배치 간 대기
            await sleep(DELAY_BETWEEN_BATCHES_MS);
        }

        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);

        console.log(`\n🎉 주가 데이터 수집 완료!`);
        console.log(`📊 최종 결과:`);
        console.log(`   - 성공: ${totalSuccess}개`);
        console.log(`   - 실패: ${totalError}개`);
        console.log(`   - 데이터없음: ${totalNoData}개`);
        console.log(`⏱️  총 소요 시간: ${Math.floor(duration / 60)}분 ${duration % 60}초\n`);

    } catch (error) {
        console.error('❌ 메인 프로세스 오류:', error);
    }
}

// 실행
main().then(() => {
    console.log('✅ 프로세스를 종료합니다.\n');
    process.exit(0);
}).catch((error) => {
    console.error('❌ 치명적 오류:', error);
    process.exit(1);
});
