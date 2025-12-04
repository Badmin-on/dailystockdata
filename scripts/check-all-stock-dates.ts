import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAllDates() {
    console.log('Checking all dates in daily_stock_prices...\n');

    let allDates: string[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data } = await supabase
            .from('daily_stock_prices')
            .select('date')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (!data || data.length === 0) break;

        data.forEach(d => allDates.push(d.date));

        if (data.length < pageSize) break;
        page++;

        if (page % 100 === 0) {
            console.log(`Processed ${page * pageSize} records...`);
        }
    }

    const uniqueDates = [...new Set(allDates)].sort();

    console.log(`\nTotal records scanned: ${allDates.length}`);
    console.log(`Unique dates: ${uniqueDates.length}`);

    if (uniqueDates.length > 0) {
        console.log(`Oldest: ${uniqueDates[0]}`);
        console.log(`Newest: ${uniqueDates[uniqueDates.length - 1]}`);

        const oldest = new Date(uniqueDates[0]);
        const newest = new Date(uniqueDates[uniqueDates.length - 1]);
        const days = (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24);
        console.log(`Range: ${days.toFixed(0)} days`);

        console.log(`\nFirst 10 dates:`);
        uniqueDates.slice(0, 10).forEach(d => console.log(`  ${d}`));

        console.log(`\nLast 10 dates:`);
        uniqueDates.slice(-10).forEach(d => console.log(`  ${d}`));
    }
}

checkAllDates().catch(console.error);
