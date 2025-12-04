import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkFinancialDataTable() {
    console.log('🔍 Checking financial_data table\n');
    console.log('='.repeat(80) + '\n');

    // 1. Total count
    const { count: totalCount } = await supabase
        .from('financial_data')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Total Records: ${totalCount?.toLocaleString()}\n`);

    if (!totalCount || totalCount === 0) {
        console.log('❌ No data in financial_data table\n');
        return;
    }

    // 2. Get all dates with pagination
    console.log('📅 Fetching all dates...\n');

    let allRecords: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (allRecords.length < 30000) {
        const { data, error } = await supabase
            .from('financial_data')
            .select('scrape_date, revenue, operating_profit')
            .order('scrape_date', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) break;

        allRecords = allRecords.concat(data);
        console.log(`  Page ${page + 1}: ${data.length} records (total: ${allRecords.length})`);

        if (data.length < pageSize) break;
        page++;
    }

    const uniqueDates = [...new Set(allRecords.map(r => r.scrape_date))].sort();

    console.log(`\n✅ Found ${uniqueDates.length} unique dates\n`);

    if (uniqueDates.length > 0) {
        console.log('Date Range:');
        console.log(`  Earliest: ${uniqueDates[0]}`);
        console.log(`  Latest: ${uniqueDates[uniqueDates.length - 1]}\n`);

        // Show all dates
        console.log('All dates in financial_data:');
        const dateCounts: Record<string, number> = {};
        allRecords.forEach(r => {
            dateCounts[r.scrape_date] = (dateCounts[r.scrape_date] || 0) + 1;
        });

        uniqueDates.forEach(date => {
            console.log(`  ${date}: ${dateCounts[date]?.toLocaleString()} records`);
        });

        // Sample data
        console.log('\n📋 Sample data from earliest date:');
        const { data: sample } = await supabase
            .from('financial_data')
            .select('*')
            .eq('scrape_date', uniqueDates[0])
            .limit(3);

        if (sample && sample.length > 0) {
            const record = sample[0];
            console.log(`  Company ID: ${record.company_id}`);
            console.log(`  Revenue: ${record.revenue}`);
            console.log(`  Operating Profit: ${record.operating_profit}`);
            console.log(`  Year: ${record.year}`);
        }
    }

    console.log('\n' + '='.repeat(80));
}

checkFinancialDataTable().catch(console.error);
