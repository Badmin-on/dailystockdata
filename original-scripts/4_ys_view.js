// [stockview.js]

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const http = require('http').Server(app);

const port = 3001;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'yoonstock',
    password: process.env.STOCK_USER_PASSWORD,
    port: 5432,
};

const pool = new Pool(dbConfig);

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client:', err);
    process.exit(-1);
});

async function checkColumnExists(client, tableName, columnName) {
    const query = `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`;
    const result = await client.query(query, [tableName, columnName]);
    return result.rows.length > 0;
}

async function calculatePriceDeviations(client, companyIds, referenceDate) {
    const priceDeviations = {};
    for (const companyId of companyIds) {
        try {
            const priceResult = await client.query(
                `SELECT close_price FROM daily_stock_prices WHERE company_id = $1 AND date <= $2 ORDER BY date DESC LIMIT 120`,
                [companyId, referenceDate]
            );
            if (priceResult.rows.length >= 120) {
                const prices = priceResult.rows.map(row => parseFloat(row.close_price));
                const ma120 = prices.reduce((sum, price) => sum + price, 0) / 120;
                const currentPrice = prices[0];
                const deviation = ((currentPrice / ma120) * 100 - 100).toFixed(2);
                priceDeviations[companyId] = { current_price: currentPrice, ma120: ma120.toFixed(2), deviation: deviation };
            } else {
                priceDeviations[companyId] = { current_price: null, ma120: null, deviation: null };
            }
        } catch (error) {
            priceDeviations[companyId] = { current_price: null, ma120: null, deviation: null };
        }
    }
    return priceDeviations;
}

app.get('/api/stock-comparison', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        let { date: requestedDate, year: requestedYear, sortBy, sortOrder = 'DESC' } = req.query;

        let latestScrapeDate;
        if (requestedDate) {
            latestScrapeDate = new Date(requestedDate);
        } else {
            const latestDateResult = await client.query(`SELECT MAX(scrape_date) AS latest_date FROM financial_data;`);
            latestScrapeDate = latestDateResult.rows[0]?.latest_date;
        }

        if (!latestScrapeDate) return res.json([]);

        const findClosestDate = async (targetDate) => {
            const result = await client.query(`SELECT DISTINCT scrape_date FROM financial_data WHERE scrape_date <= $1 ORDER BY scrape_date DESC LIMIT 1`, [targetDate]);
            return result.rows[0]?.scrape_date || null;
        };

        const today = new Date(latestScrapeDate);
        const prevDayDate = await findClosestDate(new Date(new Date(today).setDate(today.getDate() - 1)));
        const oneMonthAgoDate = await findClosestDate(new Date(new Date(today).setMonth(today.getMonth() - 1)));
        const threeMonthsAgoDate = await findClosestDate(new Date(new Date(today).setMonth(today.getMonth() - 3)));
        const oneYearAgoDate = await findClosestDate(new Date(new Date(today).setFullYear(today.getFullYear() - 1)));

        const hasEstimateColumn = await checkColumnExists(client, 'financial_data', 'is_estimate');
        const estimateSelect = hasEstimateColumn ? 'fd_today.is_estimate,' : 'false AS is_estimate,';
        let yearFilterCondition = requestedYear ? ` AND fd_today.year = ${parseInt(requestedYear)}` : '';

        const query = `
            WITH today_data AS (SELECT * FROM financial_data WHERE scrape_date = $1)
            SELECT
                c.id, c.name, c.code, c.market, fd_today.year, ${estimateSelect}
                fd_today.revenue AS current_revenue, fd_today.operating_profit AS current_op_profit,
                (SELECT revenue FROM financial_data WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $2) AS prev_day_revenue,
                (SELECT operating_profit FROM financial_data WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $2) AS prev_day_op_profit,
                $2 AS prev_day_date,
                (SELECT revenue FROM financial_data WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $3) AS onemonth_ago_revenue,
                (SELECT operating_profit FROM financial_data WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $3) AS onemonth_ago_op_profit,
                $3 AS onemonth_ago_date,
                (SELECT revenue FROM financial_data WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $4) AS threemonth_ago_revenue,
                (SELECT operating_profit FROM financial_data WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $4) AS threemonth_ago_op_profit,
                $4 AS threemonth_ago_date,
                (SELECT revenue FROM financial_data WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $5) AS oneyear_ago_revenue,
                (SELECT operating_profit FROM financial_data WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $5) AS oneyear_ago_op_profit,
                $5 AS oneyear_ago_date
            FROM companies c
            JOIN today_data fd_today ON c.id = fd_today.company_id
            WHERE 1=1 ${yearFilterCondition};
        `;
        
        const queryParams = [latestScrapeDate, prevDayDate, oneMonthAgoDate, threeMonthsAgoDate, oneYearAgoDate];
        const result = await client.query(query, queryParams);
        
        if (result.rows.length === 0) return res.json([]);
        
        const companyIds = result.rows.map(row => row.id);
        const priceDeviations = await calculatePriceDeviations(client, companyIds, latestScrapeDate);
        
        let comparisonData = result.rows.map(row => {
            const calculateGrowth = (current, prev) => {
                if (current == null || prev == null || prev === 0) return null;
                if (prev < 0 && current > 0) return 'Infinity';
                return ((current - prev) / Math.abs(prev) * 100).toFixed(2);
            };

            const priceInfo = priceDeviations[row.id] || {};
            
            const revenueGrowthPrevDay = calculateGrowth(row.current_revenue, row.prev_day_revenue);
            const opProfitGrowthPrevDay = calculateGrowth(row.current_op_profit, row.prev_day_op_profit);
            const revenueGrowth1Month = calculateGrowth(row.current_revenue, row.onemonth_ago_revenue);
            const opProfitGrowth1Month = calculateGrowth(row.current_op_profit, row.onemonth_ago_op_profit);
            const revenueGrowth3Month = calculateGrowth(row.current_revenue, row.threemonth_ago_revenue);
            const opProfitGrowth3Month = calculateGrowth(row.current_op_profit, row.threemonth_ago_op_profit);
            const revenueGrowth1Year = calculateGrowth(row.current_revenue, row.oneyear_ago_revenue);
            const opProfitGrowth1Year = calculateGrowth(row.current_op_profit, row.oneyear_ago_op_profit);

            const isHighlighted = !!(
                row.is_estimate &&
                (parseFloat(revenueGrowth1Year) > 0 || revenueGrowth1Year === 'Infinity') &&
                (parseFloat(opProfitGrowth1Year) > 0 || opProfitGrowth1Year === 'Infinity')
            );

            // [추가] 전일 대비 +5% 이상 변동 기업 플래그 계산
            const hasDailySurge = !!(
                (parseFloat(revenueGrowthPrevDay) >= 5 || revenueGrowthPrevDay === 'Infinity') ||
                (parseFloat(opProfitGrowthPrevDay) >= 5 || opProfitGrowthPrevDay === 'Infinity')
            );

            return {
                name: row.name, code: row.code, market: row.market, year: row.year,
                is_estimate: row.is_estimate || false,
                is_highlighted: isHighlighted,
                has_daily_surge: hasDailySurge, // [추가] 새로운 플래그
                current_revenue: row.current_revenue, current_op_profit: row.current_op_profit,
                price_deviation: priceInfo.deviation, current_price: priceInfo.current_price, ma120: priceInfo.ma120,
                
                prev_day_revenue: row.prev_day_revenue, prev_day_op_profit: row.prev_day_op_profit,
                revenue_growth_prev_day: revenueGrowthPrevDay, op_profit_growth_prev_day: opProfitGrowthPrevDay,
                prev_day_date: row.prev_day_date,
                
                onemonth_ago_revenue: row.onemonth_ago_revenue, onemonth_ago_op_profit: row.onemonth_ago_op_profit,
                revenue_growth_1month: revenueGrowth1Month, op_profit_growth_1month: opProfitGrowth1Month,
                onemonth_ago_date: row.onemonth_ago_date,

                threemonth_ago_revenue: row.threemonth_ago_revenue, threemonth_ago_op_profit: row.threemonth_ago_op_profit,
                revenue_growth_3month: revenueGrowth3Month, op_profit_growth_3month: opProfitGrowth3Month,
                threemonth_ago_date: row.threemonth_ago_date,

                oneyear_ago_revenue: row.oneyear_ago_revenue, oneyear_ago_op_profit: row.oneyear_ago_op_profit,
                revenue_growth_1year: revenueGrowth1Year, op_profit_growth_1year: opProfitGrowth1Year,
                oneyear_ago_date: row.oneyear_ago_date,
            };
        });

        if (sortBy) {
            comparisonData.sort((a, b) => {
                const parseValue = (val) => val === 'Infinity' ? Infinity : parseFloat(val);
                const valA = parseValue(a[sortBy]);
                const valB = parseValue(b[sortBy]);
                if (isNaN(valA)) return 1; 
                if (isNaN(valB)) return -1;
                return sortOrder === 'ASC' ? valA - valB : valB - valA;
            });
        }
        
        res.json(comparisonData);

    } catch (error) {
        console.error('Error fetching stock comparison data:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) client.release();
    }
});

// 주가 차트 API (변경 없음)
app.get('/api/stock-chart/:code', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const { code } = req.params;
        const { days = 240 } = req.query;
        const result = await client.query(
            `SELECT dsp.date, dsp.close_price, dsp.change_rate, dsp.volume
             FROM daily_stock_prices dsp JOIN companies c ON dsp.company_id = c.id
             WHERE c.code = $1 ORDER BY dsp.date DESC LIMIT $2`, [code, parseInt(days)]
        );
        if (result.rows.length === 0) return res.json({ error: '해당 종목의 주가 데이터를 찾을 수 없습니다.' });
        
        const chartData = result.rows.reverse().map(row => ({
            date: row.date.toISOString().split('T')[0],
            price: parseFloat(row.close_price)
        }));
        
        const ma120Data = [];
        if(chartData.length >= 120) {
            for (let i = 119; i < chartData.length; i++) {
                const prices = chartData.slice(i - 119, i + 1).map(d => d.price);
                ma120Data.push({
                    date: chartData[i].date,
                    ma120: (prices.reduce((sum, p) => sum + p, 0) / 120).toFixed(2)
                });
            }
        }
        res.json({ chart_data: chartData, ma120_data: ma120Data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (client) client.release();
    }
});

// 사용 가능한 연도 목록 API (변경 없음)
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

http.listen(port, async () => {
    const url = `http://localhost:${port}/monitor.html`;
    console.log(`Analysis server listening at ${url}`);
    try {
        const open = (await import('open')).default;
        await open(url);
    } catch (err) {
        console.error('Could not open browser. Please open it manually.', err);
    }
});