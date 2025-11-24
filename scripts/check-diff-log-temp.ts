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

async function checkDiffLog() {
  const { data: diffLogs, count } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log(`📊 consensus_diff_log records: ${count || 0}`);
  if (diffLogs && diffLogs.length > 0) {
    console.log('Sample ticker:', diffLogs[0].ticker);
    console.log('Sample date:', diffLogs[0].snapshot_date);
  }

  const { data: metrics, count: metricCount } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('ticker, snapshot_date, calc_status', { count: 'exact' })
    .eq('calc_status', 'NORMAL')
    .eq('snapshot_date', '2024-11-19')
    .limit(5);

  console.log(`\n📈 consensus_metric_daily (NORMAL, 2024-11-19): ${metricCount || 0}`);
  if (metrics && metrics.length > 0) {
    console.log('Sample tickers:', metrics.map(m => m.ticker).join(', '));
  }
}

checkDiffLog().catch(console.error);
