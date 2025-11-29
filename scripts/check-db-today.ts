
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const targetDate = '2025-11-27';
    console.log(`Checking data for ${targetDate} (KST)...`);

    // 1. Check Financial Data
    const { count: finCount, error: finError } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('scrape_date', targetDate);

    if (finError) console.error('Financial Data Error:', finError);
    console.log(`📊 financial_data_extended count: ${finCount}`);

    // 2. Check Consensus Metrics
    const { count: conCount, error: conError } = await supabase
        .from('consensus_metric_daily')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_date', targetDate);

    if (conError) console.error('Consensus Metrics Error:', conError);
    console.log(`📊 consensus_metric_daily count: ${conCount}`);
}

check();
