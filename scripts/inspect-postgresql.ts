import { Client } from 'pg';
import * as fs from 'fs';

const configFile = fs.readFileSync('postgreSQLID.txt', 'utf-8');
const config: any = {};
configFile.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        config[key.trim()] = value.trim();
    }
});

const pgClient = new Client({
    host: config.DB_HOST,
    port: parseInt(config.DB_PORT),
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.STOCK_USER_PASSWORD,
});

async function inspectPostgreSQL() {
    const output: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        output.push(msg);
    };

    try {
        await pgClient.connect();
        log('PostgreSQL connected\n');

        // daily_stock_prices structure
        log('daily_stock_prices columns:');
        const columnsResult = await pgClient.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'daily_stock_prices'
            ORDER BY ordinal_position;
        `);

        columnsResult.rows.forEach(row => {
            log(`  ${row.column_name}: ${row.data_type}`);
        });

        // Stats
        log('\nData stats:');
        const statsResult = await pgClient.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT date) as dates,
                MIN(date) as min_date,
                MAX(date) as max_date
            FROM daily_stock_prices;
        `);

        const stats = statsResult.rows[0];
        log(`  Total: ${stats.total}`);
        log(`  Dates: ${stats.dates}`);
        log(`  Range: ${stats.min_date} to ${stats.max_date}`);

        // Sample
        log('\nSample row:');
        const sampleResult = await pgClient.query(`
            SELECT * FROM daily_stock_prices LIMIT 1;
        `);

        if (sampleResult.rows.length > 0) {
            const row = sampleResult.rows[0];
            Object.entries(row).forEach(([key, value]) => {
                log(`  ${key} = ${value}`);
            });
        }

        // companies table
        log('\n\ncompanies columns:');
        const companyColumnsResult = await pgClient.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'companies'
            ORDER BY ordinal_position;
        `);

        companyColumnsResult.rows.forEach(row => {
            log(`  ${row.column_name}: ${row.data_type}`);
        });

        // Save to file
        fs.writeFileSync('postgresql-inspection.txt', output.join('\n'));
        log('\nSaved to postgresql-inspection.txt');

    } catch (error: any) {
        log(`Error: ${error.message}`);
    } finally {
        await pgClient.end();
    }
}

inspectPostgreSQL().catch(console.error);
