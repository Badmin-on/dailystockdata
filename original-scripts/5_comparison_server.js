// ========== comparison_server.js ==========
// 기존 yoonstock 데이터베이스를 활용하는 독립적인 주식 비교 분석 서버

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const http = require('http').Server(app);
const port = 3002; // 기존 서버(3001)와 충돌하지 않는 새로운 포트

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // 현재 폴더의 모든 파일 제공

// 데이터베이스 설정 (기존 yoonstock DB 활용)
const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'yoonstock',
    password: process.env.STOCK_USER_PASSWORD || '513600',
    port: 5432,
};

console.log('DB Config:', {
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password ? '***설정됨***' : '❌없음',
    port: dbConfig.port
});

const pool = new Pool(dbConfig);
pool.on('error', (err) => {
    console.error('PostgreSQL Pool Error:', err);
    process.exit(-1);
});

// 공통 변환 유틸리티 함수
const toEok = (v, digits = 2) =>
    (v === null || v === undefined) ? null : Number((v / 1e8).toFixed(digits));

// ========== API 엔드포인트들 ==========

// 1. 날짜별 비교 분석 API
app.get('/api/date-comparison', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        
        let { 
            startDate, 
            endDate, 
            metric = 'operating_profit',
            minGrowth = -1000,
            year,
            sortOrder = 'DESC',
            limit = 100
        } = req.query;

        // 입력값 검증
        if (!startDate || !endDate) {
            return res.status(400).json({ error: '시작 날짜와 종료 날짜를 모두 입력해주세요.' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' });
        }

        if (start >= end) {
            return res.status(400).json({ error: '시작 날짜는 종료 날짜보다 이전이어야 합니다.' });
        }

        // 실제 데이터가 있는 가장 가까운 날짜 찾기
        const findClosestDate = async (targetDate, direction = 'before') => {
            const operator = direction === 'before' ? '<=' : '>=';
            const order = direction === 'before' ? 'DESC' : 'ASC';
            const result = await client.query(
                `SELECT DISTINCT scrape_date FROM financial_data 
                 WHERE scrape_date ${operator} $1 
                 ORDER BY scrape_date ${order} LIMIT 1`, 
                [targetDate]
            );
            return result.rows[0]?.scrape_date || null;
        };

        const actualStartDate = await findClosestDate(start, 'after');
        const actualEndDate = await findClosestDate(end, 'before');

        if (!actualStartDate || !actualEndDate) {
            return res.status(404).json({ error: '해당 기간에 데이터가 없습니다.' });
        }

        // 메트릭 설정
        const metricColumn = metric === 'revenue' ? 'revenue' : 'operating_profit';
        const metricDisplayName = metric === 'revenue' ? '매출액' : '영업이익';

        let yearFilterCondition = year ? ` AND fd1.year = ${parseInt(year)} AND fd2.year = ${parseInt(year)}` : '';

        const query = `
            WITH comparison_data AS (
                SELECT 
                    c.id,
                    c.name,
                    c.code,
                    c.market,
                    fd1.year,
                    fd1.${metricColumn} AS start_value,
                    fd2.${metricColumn} AS end_value,
                    fd1.is_estimate AS start_is_estimate,
                    fd2.is_estimate AS end_is_estimate,
                    $1 AS actual_start_date,
                    $2 AS actual_end_date
                FROM companies c
                JOIN financial_data fd1 ON c.id = fd1.company_id AND fd1.scrape_date = $1
                JOIN financial_data fd2 ON c.id = fd2.company_id AND fd2.scrape_date = $2
                WHERE fd1.${metricColumn} IS NOT NULL 
                  AND fd2.${metricColumn} IS NOT NULL
                  AND fd1.${metricColumn} != 0
                  ${yearFilterCondition}
            )
            SELECT 
                *,
                CASE 
                    WHEN start_value > 0 THEN 
                        ROUND(((end_value - start_value) / start_value * 100)::numeric, 2)
                    WHEN start_value < 0 THEN
                        ROUND(((end_value - start_value) / ABS(start_value) * 100)::numeric, 2)
                    ELSE NULL
                END AS growth_rate,
                (end_value - start_value) AS absolute_change
            FROM comparison_data
            WHERE 
                CASE 
                    WHEN start_value > 0 THEN 
                        ((end_value - start_value) / start_value * 100) >= $3
                    WHEN start_value < 0 THEN
                        ((end_value - start_value) / ABS(start_value) * 100) >= $3
                    ELSE FALSE
                END
            ORDER BY growth_rate ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}
            LIMIT $4
        `;

        const result = await client.query(query, [actualStartDate, actualEndDate, parseFloat(minGrowth), parseInt(limit)]);

        const responseData = {
            actualStartDate: actualStartDate.toISOString().split('T')[0],
            actualEndDate: actualEndDate.toISOString().split('T')[0],
            requestedStartDate: startDate,
            requestedEndDate: endDate,
            metric: metricDisplayName,
            minGrowth: parseFloat(minGrowth),
            totalCompanies: result.rows.length,
            companies: result.rows.map(row => ({
                id: row.id,
                name: row.name,
                code: row.code,
                market: row.market,
                year: row.year,
                startValue: toEok(row.start_value, 2),
                endValue: toEok(row.end_value, 2),
                growthRate: parseFloat(row.growth_rate),
                absoluteChange: toEok(row.absolute_change, 2),
                valueUnit: "억원",
                isLossToProfit: row.start_value < 0 && row.end_value > 0,
                startIsEstimate: row.start_is_estimate || false,
                endIsEstimate: row.end_is_estimate || false
            }))
        };

        res.json(responseData);

    } catch (error) {
        console.error('Error in date comparison API:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) client.release();
    }
});

// 2. 사용 가능한 연도 목록 API
app.get('/api/available-years', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(`SELECT DISTINCT year FROM financial_data ORDER BY year DESC;`);
        res.json(result.rows.map(row => row.year));
    } catch (error) {
        res.status(500).json({ error: '사용 가능한 연도 목록을 가져오는 중 오류가 발생했습니다.' });
    } finally {
        if (client) client.release();
    }
});

// 3. 사용 가능한 날짜 목록 API
app.get('/api/available-dates', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(`
            SELECT DISTINCT scrape_date 
            FROM financial_data 
            ORDER BY scrape_date DESC 
            LIMIT 50
        `);
        res.json(result.rows.map(row => row.scrape_date.toISOString().split('T')[0]));
    } catch (error) {
        res.status(500).json({ error: '사용 가능한 날짜 목록을 가져오는 중 오류가 발생했습니다.' });
    } finally {
        if (client) client.release();
    }
});

// 4. 특정 기업의 상세 정보 API
app.get('/api/company/:code', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const { code } = req.params;
        
        // 기업 기본 정보
        const companyResult = await client.query(
            'SELECT * FROM companies WHERE code = $1', [code]
        );
        
        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: '해당 기업을 찾을 수 없습니다.' });
        }
        
        const company = companyResult.rows[0];
        
        // 최근 재무 데이터 (최근 5개 날짜)
        const financialResult = await client.query(`
            SELECT fd.*, fd.scrape_date
            FROM financial_data fd
            WHERE fd.company_id = $1
            ORDER BY fd.scrape_date DESC, fd.year DESC
            LIMIT 20
        `, [company.id]);
        
        // 최근 주가 데이터 (최근 30일)
        const priceResult = await client.query(`
            SELECT dsp.*
            FROM daily_stock_prices dsp
            WHERE dsp.company_id = $1
            ORDER BY dsp.date DESC
            LIMIT 30
        `, [company.id]);
        
        res.json({
            company: company,
            financial_data: financialResult.rows.map(row => ({
                ...row,
                // 원본(원) 값은 raw_*로 유지
                raw_revenue: row.revenue,
                raw_operating_profit: row.operating_profit,
                // 표시용 억원 값
                revenue: toEok(row.revenue, 2),
                operating_profit: toEok(row.operating_profit, 2),
                valueUnit: "억원"
            })),
            price_data: priceResult.rows
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (client) client.release();
    }
});

// 5. 통계 요약 API
app.get('/api/stats', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM companies) AS total_companies,
                (SELECT COUNT(DISTINCT scrape_date) FROM financial_data) AS total_dates,
                (SELECT MAX(scrape_date) FROM financial_data) AS latest_date,
                (SELECT MIN(scrape_date) FROM financial_data) AS earliest_date,
                (SELECT COUNT(*) FROM companies WHERE market = 'KOSPI') AS kospi_count,
                (SELECT COUNT(*) FROM companies WHERE market = 'KOSDAQ') AS kosdaq_count
        `);
        
        res.json(stats.rows[0]);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (client) client.release();
    }
});

// ========== 정적 파일 라우트 ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== 서버 시작 ==========
http.listen(port, async () => {
    const url = `http://localhost:${port}`;
    console.log(`\n🚀 주식 비교 분석 서버가 시작되었습니다!`);
    console.log(`📊 URL: ${url}`);
    console.log(`🔗 포트: ${port} (기존 분석 서버: 3001)`);
    console.log(`\n📂 활용 중인 데이터베이스: yoonstock`);
    console.log(`🔄 데이터 수집 프로세스:`);
    console.log(`   1️⃣ node 1_seoul_ys_fnguide.js (FnGuide 데이터 수집)`);
    console.log(`   2️⃣ node 2_ys_DB.js (DB 저장)`);
    console.log(`   3️⃣ node 3_ys_stock.js (주가 데이터 수집)`);
    console.log(`   4️⃣ 이 서버로 비교 분석!`);
    
    try {
        const open = (await import('open')).default;
        await open(url);
    } catch (err) {
        console.log('브라우저를 수동으로 열어주세요.');
    }
});

// ========== 종료 메시지 ==========
console.log('\n✅ 주식 비교 분석 서버 준비 완료!');

