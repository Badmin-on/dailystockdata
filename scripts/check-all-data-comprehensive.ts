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

async function checkAllData() {
    console.log('🔍 Comprehensive Data Check\n');

    // Method 1: Get total count
    const { count: totalCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true });

    console.log(`Total records: ${totalCount?.toLocaleString()}\n`);

    // Method 2: Get all data with limit
    const { data: allData, error } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(30000);  // Increase limit

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Fetched ${allData?.length} records\n`);

    // Get unique dates
    const uniqueDates = [...new Set(allData?.map(d => d.scrape_date))].sort().reverse();

    console.log(`Unique dates found: ${uniqueDates.length}\n`);

    // Show all dates
    console.log('All dates:');
    for (const date of uniqueDates) {
        const count = allData?.filter(d => d.scrape_date === date).length;
        console.log(`  ${date}: ${count} records`);
    }

    // Check specific date range
    console.log('\n📅 Checking July to November range:\n');
    const julyToNov = uniqueDates.filter(d => d >= '2025-07-01' && d <= '2025-11-30');
    console.log(`Dates in July-November: ${julyToNov.length}`);
    julyToNov.forEach(date => console.log(`  - ${date}`));
}

checkAllData().catch(console.error);
