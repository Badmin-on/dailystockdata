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

async function comprehensiveDBCheck() {
    console.log('🔍 COMPREHENSIVE DATABASE CHECK\n');
    console.log('='.repeat(80) + '\n');

    // 1. Check total records
    const { count: totalCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Total Records: ${totalCount?.toLocaleString()}\n`);

    // 2. Check all unique dates (with pagination)
    console.log('📅 Fetching all unique dates...\n');

    let allRecords: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('financial_data_extended')
            .select('scrape_date, revenue, operating_profit, company_id')
            .order('scrape_date', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error:', error);
            break;
        }

        if (!data || data.length === 0) break;

        allRecords = allRecords.concat(data);
        console.log(`  Fetched page ${page + 1}: ${data.length} records (total: ${allRecords.length})`);

        if (data.length < pageSize) break;
        if (allRecords.length >= 30000) break; // Safety limit

        page++;
    }

    const uniqueDates = [...new Set(allRecords.map(r => r.scrape_date))].sort();

    console.log(`\n✅ Found ${uniqueDates.length} unique dates\n`);
    console.log('Date Range:');
    console.log(`  Earliest: ${uniqueDates[0]}`);
    console.log(`  Latest: ${uniqueDates[uniqueDates.length - 1]}\n`);

    // 3. Count records per date
    console.log('📊 Records per date:\n');
    const dateCounts: Record<string, number> = {};
    allRecords.forEach(r => {
        dateCounts[r.scrape_date] = (dateCounts[r.scrape_date] || 0) + 1;
    });

    uniqueDates.forEach(date => {
        console.log(`  ${date}: ${dateCounts[date]?.toLocaleString()} records`);
    });

    // 4. Check data quality for each date
    console.log('\n🔬 Data Quality Check:\n');

    for (const date of uniqueDates.slice(0, 10)) {
        const { data: sample } = await supabase
            .from('financial_data_extended')
            .select('*')
            .eq('scrape_date', date)
            .limit(3);

        if (sample && sample.length > 0) {
            const record = sample[0];
            console.log(`\n${date}:`);
            console.log(`  Company ID: ${record.company_id}`);
            console.log(`  Revenue: ${record.revenue ? (record.revenue / 100000000).toFixed(0) + '억원' : 'NULL'}`);
            console.log(`  Operating Profit: ${record.operating_profit ? (record.operating_profit / 100000000).toFixed(0) + '억원' : 'NULL'}`);
            console.log(`  EPS: ${record.eps || 'NULL'}`);
            console.log(`  PER: ${record.per || 'NULL'}`);
            console.log(`  Data Source: ${record.data_source || 'NULL'}`);
        }
    }

    // 5. Check for NULL values
    console.log('\n\n⚠️  NULL Value Analysis:\n');

    const { count: nullRevenue } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .is('revenue', null);

    const { count: nullOpProfit } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .is('operating_profit', null);

    const { count: zeroRevenue } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('revenue', 0);

    console.log(`  NULL Revenue: ${nullRevenue} records (${((nullRevenue || 0) / (totalCount || 1) * 100).toFixed(1)}%)`);
    console.log(`  NULL Operating Profit: ${nullOpProfit} records (${((nullOpProfit || 0) / (totalCount || 1) * 100).toFixed(1)}%)`);
    console.log(`  ZERO Revenue: ${zeroRevenue} records (${((zeroRevenue || 0) / (totalCount || 1) * 100).toFixed(1)}%)`);

    // 6. Check specific date comparison (11-25 vs 11-29)
    console.log('\n\n🔍 Specific Date Comparison (11-25 vs 11-29):\n');

    const { data: nov25Data } = await supabase
        .from('financial_data_extended')
        .select('company_id, year, revenue, operating_profit')
        .eq('scrape_date', '2025-11-25')
        .limit(5);

    const { data: nov29Data } = await supabase
        .from('financial_data_extended')
        .select('company_id, year, revenue, operating_profit')
        .eq('scrape_date', '2025-11-29')
        .limit(5);

    console.log('Nov 25 Sample:');
    nov25Data?.forEach(r => {
        console.log(`  Company ${r.company_id}, Year ${r.year}: Revenue=${r.revenue}, OpProfit=${r.operating_profit}`);
    });

    console.log('\nNov 29 Sample:');
    nov29Data?.forEach(r => {
        console.log(`  Company ${r.company_id}, Year ${r.year}: Revenue=${r.revenue}, OpProfit=${r.operating_profit}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Database check complete!\n');
}

comprehensiveDBCheck().catch(console.error);
