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

async function findAllDates() {
    console.log('🔍 Searching for ALL dates in financial_data table\n');
    console.log('This may take a while...\n');

    // Get total count first
    const { count: totalCount } = await supabase
        .from('financial_data')
        .select('*', { count: 'exact', head: true });

    console.log(`Total records: ${totalCount?.toLocaleString()}\n`);

    // Fetch ALL records to find all dates
    let allDates: Set<string> = new Set();
    let page = 0;
    const pageSize = 1000;
    let fetchedCount = 0;

    while (true) {
        const { data, error } = await supabase
            .from('financial_data')
            .select('scrape_date')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error:', error);
            break;
        }

        if (!data || data.length === 0) break;

        data.forEach(record => allDates.add(record.scrape_date));
        fetchedCount += data.length;

        if (page % 10 === 0) {
            console.log(`Progress: ${fetchedCount.toLocaleString()} / ${totalCount?.toLocaleString()} records scanned, ${allDates.size} unique dates found`);
        }

        if (data.length < pageSize) break;
        page++;
    }

    const sortedDates = Array.from(allDates).sort();

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Found ${sortedDates.length} unique dates\n`);

    if (sortedDates.length > 0) {
        console.log(`Earliest: ${sortedDates[0]}`);
        console.log(`Latest: ${sortedDates[sortedDates.length - 1]}\n`);

        console.log('All dates:');
        for (const date of sortedDates) {
            const { count } = await supabase
                .from('financial_data')
                .select('*', { count: 'exact', head: true })
                .eq('scrape_date', date);

            console.log(`  ${date}: ${count?.toLocaleString()} records`);
        }
    }

    console.log('\n' + '='.repeat(80));
}

findAllDates().catch(console.error);
