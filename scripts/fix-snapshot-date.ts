/**
 * Fix snapshot_date from 2025 to 2024
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

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function fixSnapshotDate() {
  console.log('🔧 Fixing snapshot_date...\n');

  // Check current data
  const { data: before, error: beforeError } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('snapshot_date')
    .eq('snapshot_date', '2025-11-19');

  if (beforeError) {
    console.error('❌ Error checking data:', beforeError);
    return;
  }

  console.log(`📊 Found ${before?.length || 0} records with date 2025-11-19`);

  if (!before || before.length === 0) {
    console.log('✅ No records to fix');
    return;
  }

  // Update to correct date
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('consensus_metric_daily')
    .update({ snapshot_date: '2024-11-19' })
    .eq('snapshot_date', '2025-11-19')
    .select();

  if (updateError) {
    console.error('❌ Error updating:', updateError);
    return;
  }

  console.log(`✅ Updated ${updated?.length || 0} records`);
  console.log('   2025-11-19 → 2024-11-19');

  // Verify
  const { data: after } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('snapshot_date')
    .eq('snapshot_date', '2024-11-19');

  console.log(`\n📊 Now ${after?.length || 0} records with date 2024-11-19`);
}

fixSnapshotDate()
  .then(() => {
    console.log('\n✅ Fix complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
