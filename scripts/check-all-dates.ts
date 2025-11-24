import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAllDates() {
  console.log('📅 Checking all snapshot dates in database...\n');

  // Check consensus_metric_daily
  const { data: metricDates } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(10);

  console.log('📊 consensus_metric_daily - Recent dates:');
  metricDates?.forEach(d => console.log(`  - ${d.snapshot_date}`));

  const { count: metricCount } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('*', { count: 'exact' });
  console.log(`  Total: ${metricCount} records\n`);

  // Check consensus_diff_log
  const { data: diffDates } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(10);

  console.log('📈 consensus_diff_log - Recent dates:');
  diffDates?.forEach(d => console.log(`  - ${d.snapshot_date}`));

  const { count: diffCount } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('*', { count: 'exact' });
  console.log(`  Total: ${diffCount} records\n`);

  // Check financial_data_extended latest update
  const { data: finData } = await supabaseAdmin
    .from('financial_data_extended')
    .select('year, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (finData && finData.length > 0) {
    console.log('💰 financial_data_extended:');
    console.log(`  Latest update: ${finData[0].updated_at}`);
    console.log(`  Latest year: ${finData[0].year}\n`);
  }

  // Current KST date
  const now = new Date();
  const kstOffset = 9 * 60;
  const kstTime = new Date(now.getTime() + (kstOffset - now.getTimezoneOffset()) * 60000);
  const kstDate = kstTime.toISOString().split('T')[0];
  console.log(`🕐 Current KST date: ${kstDate}`);
}

checkAllDates().catch(console.error);
