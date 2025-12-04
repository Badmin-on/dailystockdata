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

async function checkDateRange() {
    console.log('📅 Checking complete date range in financial_data_extended\n');

    // Get all unique dates
    const { data: allDates } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false });

    const uniqueDates = [...new Set(allDates?.map(d => d.scrape_date))];

    console.log(`Total unique dates: ${uniqueDates.length}\n`);

    if (uniqueDates.length > 0) {
        console.log(`Earliest date: ${uniqueDates[uniqueDates.length - 1]}`);
        console.log(`Latest date: ${uniqueDates[0]}\n`);

        console.log('All available dates:');
        uniqueDates.forEach((date, index) => {
            console.log(`  ${index + 1}. ${date}`);
        });

        // Check record count for each date
        console.log('\n📊 Record count by date:\n');
        for (const date of uniqueDates.slice(0, 20)) {
            const { count } = await supabase
                .from('financial_data_extended')
                .select('*', { count: 'exact', head: true })
                .eq('scrape_date', date);

            console.log(`  ${date}: ${count?.toLocaleString()} records`);
        }
    }
}

checkDateRange().catch(console.error);
