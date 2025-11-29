
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll() {
    console.log('Checking ALL tables for 2025-11-25...');

    const date = '2025-11-25';

    // 1. stock_prices (base_date)
    const { count: priceCount } = await supabase
        .from('stock_prices')
        .select('*', { count: 'exact', head: true })
        .eq('base_date', date);
    console.log(`stock_prices: ${priceCount}`);

    // 2. financial_info (date)
    const { count: finInfoCount } = await supabase
        .from('financial_info')
        .select('*', { count: 'exact', head: true })
        .eq('date', date);
    console.log(`financial_info: ${finInfoCount}`);

    // 3. financial_data_extended (scrape_date)
    const { count: finExtCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('scrape_date', date);
    console.log(`financial_data_extended: ${finExtCount}`);

    // 4. consensus_metric_daily (snapshot_date)
    const { count: conDailyCount } = await supabase
        .from('consensus_metric_daily')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_date', date);
    console.log(`consensus_metric_daily: ${conDailyCount}`);
}

checkAll();
