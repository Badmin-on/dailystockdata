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

async function quickCheck() {
    console.log('🔍 Quick Migration Status Check\n');

    // Check both tables
    const { count: sourceCount } = await supabase
        .from('financial_data')
        .select('*', { count: 'exact', head: true });

    const { count: targetCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true });

    console.log(`Source (financial_data): ${sourceCount?.toLocaleString()} records`);
    console.log(`Target (financial_data_extended): ${targetCount?.toLocaleString()} records\n`);

    // Get date ranges
    const { data: sourceDates } = await supabase
        .from('financial_data')
        .select('scrape_date')
        .order('scrape_date', { ascending: true })
        .limit(1);

    const { data: sourceLatest } = await supabase
        .from('financial_data')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(1);

    const { data: targetDates } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: true })
        .limit(1);

    const { data: targetLatest } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(1);

    console.log('Date Ranges:');
    console.log(`  financial_data: ${sourceDates?.[0]?.scrape_date} to ${sourceLatest?.[0]?.scrape_date}`);
    console.log(`  financial_data_extended: ${targetDates?.[0]?.scrape_date} to ${targetLatest?.[0]?.scrape_date}\n`);

    // Check if migration is still needed
    const difference = (sourceCount || 0) - (targetCount || 0);
    console.log(`Difference: ${difference.toLocaleString()} records`);

    if (difference > 0) {
        console.log(`\n⚠️  Migration incomplete! ${difference.toLocaleString()} records still need to be migrated.\n`);
    } else {
        console.log('\n✅ All records migrated!\n');
    }
}

quickCheck().catch(console.error);
