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

async function investigateMismatch() {
    console.log('🔍 Investigating Record Count Mismatch\n');
    console.log('='.repeat(80) + '\n');

    // Get counts by date from both tables
    console.log('Comparing record counts by date...\n');

    // Get all dates from financial_data
    const { data: sourceDates } = await supabase
        .from('financial_data')
        .select('scrape_date')
        .order('scrape_date');

    const sourceUniqueDates = [...new Set(sourceDates?.map(d => d.scrape_date))].sort();

    console.log(`Dates in financial_data: ${sourceUniqueDates.length}\n`);

    // Compare counts for each date
    console.log('Date'.padEnd(15) + 'financial_data'.padEnd(20) + 'financial_data_extended'.padEnd(25) + 'Difference');
    console.log('-'.repeat(80));

    let totalSourceCount = 0;
    let totalTargetCount = 0;
    let mismatchDates: string[] = [];

    for (const date of sourceUniqueDates) {
        const { count: sourceCount } = await supabase
            .from('financial_data')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        const { count: targetCount } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        totalSourceCount += sourceCount || 0;
        totalTargetCount += targetCount || 0;

        const diff = (sourceCount || 0) - (targetCount || 0);
        const status = diff === 0 ? '✅' : '❌';

        console.log(
            date.padEnd(15) +
            (sourceCount || 0).toString().padEnd(20) +
            (targetCount || 0).toString().padEnd(25) +
            diff.toString().padEnd(10) +
            status
        );

        if (diff !== 0) {
            mismatchDates.push(date);
        }
    }

    console.log('-'.repeat(80));
    console.log(
        'TOTAL'.padEnd(15) +
        totalSourceCount.toLocaleString().padEnd(20) +
        totalTargetCount.toLocaleString().padEnd(25) +
        (totalSourceCount - totalTargetCount).toLocaleString()
    );

    console.log('\n' + '='.repeat(80));
    console.log(`\nMismatch Summary:`);
    console.log(`  Dates with mismatches: ${mismatchDates.length}`);
    console.log(`  Total missing records: ${(totalSourceCount - totalTargetCount).toLocaleString()}\n`);

    if (mismatchDates.length > 0) {
        console.log('Dates needing migration:');
        mismatchDates.forEach(date => console.log(`  - ${date}`));
    }

    console.log('\n' + '='.repeat(80));
}

investigateMismatch().catch(console.error);
