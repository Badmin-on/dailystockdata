
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

// 1. Load Environment Variables
const envPath = resolve(__dirname, '../.env.local');
console.log('DEBUG: Loading env from', envPath);

if (existsSync(envPath)) {
    // Debug content (first 100 chars)
    const content = readFileSync(envPath, 'utf-8');
    console.log('DEBUG: File start:', content.substring(0, 50));
    console.log('DEBUG: Contains DATABASE_URL? :', content.includes('DATABASE_URL='));

    const result = config({ path: envPath });
    if (result.error) {
        console.error('DEBUG: Dotenv error:', result.error);
    }
} else {
    console.log('DEBUG: .env.local not found, trying scripts/.env');
    config({ path: resolve(__dirname, '.env') });
}

console.log('DEBUG: DATABASE_URL is', process.env.DATABASE_URL ? 'SET' : 'UNSET');

// 2. Import DB (after env is loaded)
// Use require to avoid hoisting
const { query } = require('../lib/db');

async function testDashboardQuery() {
    console.log('🧪 Testing Dashboard SQL Query...');

    try {
        // 1. Get Latest Date
        const latestDateResult = await query(`SELECT MAX(scrape_date) AS latest_date FROM financial_data_extended`);
        const latestScrapeDate = latestDateResult.rows[0]?.latest_date;
        console.log(`📅 Latest Date: ${latestScrapeDate}`);

        if (!latestScrapeDate) throw new Error('No data found');

        // 2. Find Comparison Dates
        const findClosestDate = async (targetDate: Date) => {
            const dateStr = targetDate.toISOString().split('T')[0];
            const result = await query(
                `SELECT DISTINCT scrape_date FROM financial_data_extended WHERE scrape_date <= $1 ORDER BY scrape_date DESC LIMIT 1`,
                [dateStr]
            );
            return result.rows[0]?.scrape_date || null;
        };

        const today = new Date(latestScrapeDate);
        const prevDayTarget = new Date(today);
        prevDayTarget.setDate(today.getDate() - 1);
        const prevDayDate = await findClosestDate(prevDayTarget);

        const oneYearTarget = new Date(today);
        oneYearTarget.setFullYear(today.getFullYear() - 1);
        const oneYearAgoDate = await findClosestDate(oneYearTarget);

        console.log(`📅 Comparison Dates: Prev=${prevDayDate}, 1Year=${oneYearAgoDate}`);

        // 3. Run Main Query (Sample)
        const sql = `
      WITH today_data AS (SELECT * FROM financial_data_extended WHERE scrape_date = $1)
      SELECT
        c.id, c.name, c.code, c.market, fd_today.year, fd_today.is_estimate,
        fd_today.revenue AS current_revenue, fd_today.operating_profit AS current_op_profit,
        
        (SELECT revenue FROM financial_data_extended WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $2) AS prev_day_revenue,
        (SELECT operating_profit FROM financial_data_extended WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $2) AS prev_day_op_profit,
        
        (SELECT revenue FROM financial_data_extended WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $3) AS oneyear_ago_revenue,
        (SELECT operating_profit FROM financial_data_extended WHERE company_id = c.id AND year = fd_today.year AND scrape_date = $3) AS oneyear_ago_op_profit
      FROM companies c
      JOIN today_data fd_today ON c.id = fd_today.company_id
      LIMIT 5
    `;

        const result = await query(sql, [latestScrapeDate, prevDayDate, oneYearAgoDate]);
        console.log(`✅ Query Successful! Returned ${result.rows.length} rows.`);
        console.log('Sample Row:', result.rows[0]);

    } catch (error) {
        console.error('❌ Query Failed:', error);
        process.exit(1);
    }
}

testDashboardQuery();
