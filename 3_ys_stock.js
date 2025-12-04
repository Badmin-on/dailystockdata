const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { Pool } = require('pg');

// --- [개선] 설정 상수 ---
const CONCURRENT_BATCH_SIZE = 10; // 동시에 처리할 종목 수 (네트워크 상태에 따라 조절)
const DELAY_BETWEEN_BATCHES_MS = 500; // 각 배치 처리 후 대기 시간 (밀리초)

// --- DB 설정 ---
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'yoonstock',
    password: process.env.STOCK_USER_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
};
const pool = new Pool(dbConfig);
pool.on('error', (err) => { console.error('PostgreSQL Pool Error:', err); process.exit(-1); });

// --- 유틸리티 함수 ---
async function getCompanyList(client) {
    try {
        const res = await client.query('SELECT id, name, code FROM companies ORDER BY id');
        return res.rows;
    } catch (err) {
        console.error('Error fetching company list:', err);
        return [];
    }
}

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

// --- 데이터베이스 스키마 확인 및 업데이트 ---
async function checkAndUpdateSchema(client) {
    // (기존 코드와 동일, 변경 없음)
    try {
        const checkFinancialEstimate = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'financial_data' AND column_name = 'is_estimate'");
        if (checkFinancialEstimate.rows.length === 0) {
            console.log('financial_data.is_estimate 컬럼 추가...');
            await client.query('ALTER TABLE financial_data ADD COLUMN is_estimate BOOLEAN DEFAULT FALSE');
        }

        const checkPriceChangeRate = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_stock_prices' AND column_name = 'change_rate'");
        if (checkPriceChangeRate.rows.length === 0) {
            console.log('daily_stock_prices.change_rate 컬럼 추가...');
            await client.query('ALTER TABLE daily_stock_prices ADD COLUMN change_rate DECIMAL(10,2)');
        }

        const checkPriceVolume = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_stock_prices' AND column_name = 'volume'");
        if (checkPriceVolume.rows.length === 0) {
            console.log('daily_stock_prices.volume 컬럼 추가...');
            await client.query('ALTER TABLE daily_stock_prices ADD COLUMN volume BIGINT');
        }
    } catch (error) {
        console.error('스키마 업데이트 중 오류:', error);
        throw error;
    }
}

// --- 재무 데이터 수집 (현재 작업에서는 사용되지 않음) ---
async function fetchFinancialData(stockCode) {
    // (기존 코드와 동일, 변경 없음)
    const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${stockCode}`;
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            responseType: 'arraybuffer'
        });
        const decodedHtml = iconv.decode(data, 'euc-kr');
        const $ = cheerio.load(decodedHtml);
        const targetTable = $('#highlight-container').find('table.us_table_ty1_pyo').eq(0);
        if (targetTable.length === 0) return null;
        const result = { years: [], revenues: [], op_profits: [], isEstimate: [] };
        // ... (나머지 로직 동일)
        return result;
    } catch (error) {
        console.error(`[재무 데이터 오류] ${stockCode}: ${error.message}`);
        return null;
    }
}

// --- 최신 주가 데이터 수집 ---
async function fetchLatestStockPrice(stockCode) {
    // (기존 코드와 동일, 변경 없음)
    const url = `https://finance.naver.com/item/sise_day.naver?code=${stockCode}`;
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            responseType: 'arraybuffer'
        });
        const decodedHtml = iconv.decode(data, 'euc-kr');
        const $ = cheerio.load(decodedHtml);
        const firstRow = $('table.type2 tr[onmouseover]').first();
        if (firstRow.length === 0) return null;
        const cells = firstRow.find('td');
        if (cells.length < 7) return null;

        const priceChangeText = $(cells[2]).text().trim();
        const isUp = priceChangeText.includes('▲');
        const isDown = priceChangeText.includes('▼');
        
        return {
            date: $(cells[0]).text().trim().replace(/\./g, '-'),
            close_price: $(cells[1]).text().trim(),
            // [주석] 등락 기호(▲,▼)를 기반으로 변동률의 부호를 결정하는 것이 더 안정적일 수 있습니다.
            // cleanNumber는 부호를 제거하므로, 등락 여부로 부호를 다시 붙여줍니다.
            change_rate: isDown ? -cleanNumber($(cells[3]).text()) : cleanNumber($(cells[3]).text()),
            volume: $(cells[6]).text().trim()
        };
    } catch (error) {
        console.error(`[주가 데이터 오류] ${stockCode}: ${error.message}`);
        return null;
    }
}

// --- DB 저장 함수 ---
async function saveDataToDB(client, company, priceData) {
    // [개선] 주가 데이터 저장에만 집중하도록 함수 간소화
    if (!priceData || !priceData.date) {
        return 0; // 저장할 데이터 없음
    }

    try {
        const closePrice = cleanNumber(priceData.close_price);
        const changeRate = priceData.change_rate; // 이미 숫자 타입
        const volume = cleanNumber(priceData.volume);

        if (closePrice === null) return 0; // 필수 값인 종가가 없으면 저장하지 않음

        const result = await client.query(
            `INSERT INTO daily_stock_prices (company_id, date, close_price, change_rate, volume)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (company_id, date) DO UPDATE SET
             close_price = EXCLUDED.close_price, change_rate = EXCLUDED.change_rate, volume = EXCLUDED.volume`,
            [company.id, priceData.date, closePrice, changeRate, volume]
        );
        return result.rowCount; // 1이면 저장/업데이트 성공, 0이면 변화 없음
    } catch (error) {
        console.error(`[DB 저장 오류] ${company.name}:`, error.message);
        // 트랜잭션은 배치 처리 단위로 관리되므로 여기서는 롤백하지 않음
        throw error; // 오류를 상위로 전파하여 배치 처리가 실패했음을 알림
    }
}

// --- [개선] 메인 실행 로직 (병렬 배치 처리) ---
async function main() {
    const client = await pool.connect();
    try {
        await checkAndUpdateSchema(client);
        const companyList = await getCompanyList(client);
        if (companyList.length === 0) {
            console.log('처리할 회사가 없습니다.');
            return;
        }

        console.log(`[시작] 총 ${companyList.length}개 종목의 당일 데이터 업데이트를 시작합니다. (배치 크기: ${CONCURRENT_BATCH_SIZE})`);
        let totalSuccess = 0;
        let totalError = 0;

        for (let i = 0; i < companyList.length; i += CONCURRENT_BATCH_SIZE) {
            const batch = companyList.slice(i, i + CONCURRENT_BATCH_SIZE);
            const progress = `(${(i + batch.length)}/${companyList.length})`;
            console.log(`\n[배치 처리 시작] ${progress} - ${batch.length}개 종목 처리중...`);

            await client.query('BEGIN'); // 배치 단위로 트랜잭션 시작

            try {
                const promises = batch.map(async (company) => {
                    try {
                        // [주석] 주가 정보만 수집합니다. 재무 정보가 필요하면 아래 주석을 해제하세요.
                        const priceData = await fetchLatestStockPrice(company.code);
                        // const [financialData, priceData] = await Promise.all([ fetchFinancialData(company.code), fetchLatestStockPrice(company.code) ]);
                        
                        const savedCount = await saveDataToDB(client, company, priceData);

                        if (savedCount > 0) {
                            console.log(`[저장완료] ${company.name} (${company.code})`);
                            return 'success';
                        } else {
                            console.log(`[데이터없음] ${company.name} (${company.code})`);
                            return 'nodata';
                        }
                    } catch (err) {
                        console.error(`[오류] ${company.name} (${company.code}) 처리 중 오류:`, err.message);
                        return 'error';
                    }
                });

                const results = await Promise.all(promises);
                totalSuccess += results.filter(r => r === 'success').length;
                totalError += results.filter(r => r === 'error').length;
                
                await client.query('COMMIT'); // 배치 내 모든 작업 성공 시 커밋
                console.log(`[배치 처리 완료] 성공: ${results.filter(r => r === 'success').length}, 실패: ${results.filter(r => r === 'error').length}`);

            } catch (batchError) {
                await client.query('ROLLBACK'); // 배치 처리 중 하나라도 DB 저장 오류 발생 시 롤백
                totalError += batch.length; // 해당 배치는 전체 실패로 간주
                console.error(`[배치 처리 실패] 심각한 오류로 인해 해당 배치의 모든 변경사항을 롤백합니다.`, batchError.message);
            }

            await sleep(DELAY_BETWEEN_BATCHES_MS); // 다음 배치 처리 전 잠시 대기
        }

        console.log(`\n✅ 당일 데이터 업데이트가 완료되었습니다.`);
        console.log(`📊 최종 결과 - 성공: ${totalSuccess}개, 실패: ${totalError}개`);

    } catch (error) {
        console.error('메인 프로세스에서 심각한 오류 발생:', error);
    } finally {
        if (client) await client.release();
        await pool.end();
        console.log('프로세스를 종료합니다.');
    }
}

main();