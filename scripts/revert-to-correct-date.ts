/**
 * Revert snapshot_date from 2024-11-19 back to 2025-11-19
 * (Fixing previous incorrect migration)
 */

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

async function revertToCorrectDate() {
  console.log('🔧 Reverting snapshot_date to correct 2025-11-19...\n');

  // 1. Fix consensus_metric_daily
  const { data: metricBefore, count: metricCountBefore } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('snapshot_date', { count: 'exact' })
    .eq('snapshot_date', '2024-11-19');

  console.log(`📊 consensus_metric_daily: ${metricCountBefore || 0} records with 2024-11-19`);

  if (metricCountBefore && metricCountBefore > 0) {
    const { data: metricUpdated, error: metricError } = await supabaseAdmin
      .from('consensus_metric_daily')
      .update({ snapshot_date: '2025-11-19' })
      .eq('snapshot_date', '2024-11-19')
      .select();

    if (metricError) {
      console.error('❌ consensus_metric_daily update failed:', metricError);
      process.exit(1);
    }

    console.log(`✅ Updated ${metricUpdated?.length || 0} consensus_metric_daily records\n`);
  }

  // 2. Fix consensus_diff_log
  const { data: diffBefore, count: diffCountBefore } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('snapshot_date', { count: 'exact' })
    .eq('snapshot_date', '2024-11-19');

  console.log(`📈 consensus_diff_log: ${diffCountBefore || 0} records with 2024-11-19`);

  if (diffCountBefore && diffCountBefore > 0) {
    const { data: diffUpdated, error: diffError } = await supabaseAdmin
      .from('consensus_diff_log')
      .update({ snapshot_date: '2025-11-19' })
      .eq('snapshot_date', '2024-11-19')
      .select();

    if (diffError) {
      console.error('❌ consensus_diff_log update failed:', diffError);
      process.exit(1);
    }

    console.log(`✅ Updated ${diffUpdated?.length || 0} consensus_diff_log records\n`);
  }

  // 3. Verify
  const { count: metric2024 } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('*', { count: 'exact' })
    .eq('snapshot_date', '2024-11-19');

  const { count: metric2025 } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('*', { count: 'exact' })
    .eq('snapshot_date', '2025-11-19');

  const { count: diff2024 } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('*', { count: 'exact' })
    .eq('snapshot_date', '2024-11-19');

  const { count: diff2025 } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('*', { count: 'exact' })
    .eq('snapshot_date', '2025-11-19');

  console.log('📊 Verification:');
  console.log(`  consensus_metric_daily:`);
  console.log(`    2024-11-19: ${metric2024 || 0} records (should be 0)`);
  console.log(`    2025-11-19: ${metric2025 || 0} records`);
  console.log(`  consensus_diff_log:`);
  console.log(`    2024-11-19: ${diff2024 || 0} records (should be 0)`);
  console.log(`    2025-11-19: ${diff2025 || 0} records`);

  if (metric2024 === 0 && diff2024 === 0 && metric2025 && metric2025 > 0) {
    console.log('\n✅ Successfully reverted to correct date 2025-11-19!');
  } else {
    console.log('\n⚠️  Some records may not have been updated. Please verify manually.');
  }
}

revertToCorrectDate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
