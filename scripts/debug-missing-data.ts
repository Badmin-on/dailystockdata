
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    const date = '2025-11-21';

    console.log(`Checking data for date: ${date}`);

    // 1. Check total records for the date
    const { count: totalCount, error: countError } = await supabase
        .from('consensus_metric_daily')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_date', date);

    if (countError) {
        console.error('Error checking total count:', countError);
        return;
    }
    console.log(`Total records for ${date}: ${totalCount}`);

    // 2. Check distinct target years
    const { data: distinctYears, error: distinctError } = await supabase
        .from('consensus_metric_daily')
        .select('target_y1, target_y2')
        .eq('snapshot_date', date);

    if (distinctError) {
        console.error('Error checking distinct years:', distinctError);
        return;
    }

    // Group by pair
    const pairs = new Set();
    const pairCounts: Record<string, number> = {};

    distinctYears?.forEach(row => {
        const key = `${row.target_y1}-${row.target_y2}`;
        pairs.add(key);
        pairCounts[key] = (pairCounts[key] || 0) + 1;
    });

    console.log('Available Year Pairs:', Array.from(pairs));
    console.log('Counts per pair:', pairCounts);

    // 3. Check specifically for 2025-2026
    const { count: targetCount, error: targetError } = await supabase
        .from('consensus_metric_daily')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_date', date)
        .eq('target_y1', 2025)
        .eq('target_y2', 2026);

    if (targetError) {
        console.error('Error checking specific target:', targetError);
        return;
    }
    console.log(`Records for 2025-2026: ${targetCount}`);
}

checkData();
