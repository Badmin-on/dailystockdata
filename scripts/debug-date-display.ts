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

async function debugDateIssue() {
    console.log('🔍 Debugging Date Display Issue\n');

    // 1. Check what the available-dates API would return
    console.log('📅 1. Testing /api/available-dates endpoint logic:\n');

    const { data: dates } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(50);

    const uniqueDates = [...new Set(dates?.map(d => d.scrape_date))];
    console.log('Unique dates (first 10):');
    uniqueDates.slice(0, 10).forEach(date => console.log(`  ${date}`));

    // 2. Check consensus_metrics dates
    console.log('\n📊 2. Checking consensus_metrics dates:\n');

    const { data: consensusDates } = await supabase
        .from('consensus_metrics')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(10);

    const uniqueConsensusDates = [...new Set(consensusDates?.map(d => d.scrape_date))];
    console.log('Consensus dates:');
    uniqueConsensusDates.forEach(date => console.log(`  ${date}`));

    // 3. Check what date-comparison would see
    console.log('\n📅 3. Checking date range for date-comparison:\n');

    // Get latest and earliest
    const { data: latest } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(1);

    const { data: earliest } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: true })
        .limit(1);

    console.log(`Latest: ${latest?.[0]?.scrape_date}`);
    console.log(`Earliest: ${earliest?.[0]?.scrape_date}`);

    // 4. Count by date
    console.log('\n📊 4. Record count by date:\n');

    const targetDates = ['2025-11-29', '2025-11-28', '2025-11-27', '2025-11-26', '2025-11-25', '2025-11-24'];

    for (const date of targetDates) {
        const { count } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        console.log(`  ${date}: ${count || 0} records`);
    }
}

debugDateIssue().catch(console.error);
