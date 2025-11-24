/**
 * Fix consensus_diff_log snapshot_date from 2025-11-19 to 2024-11-19
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

async function fixDiffLogDate() {
  console.log('🔧 Fixing consensus_diff_log snapshot_date...\n');

  // Check before
  const { data: before, count: beforeCount } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('snapshot_date', { count: 'exact' })
    .eq('snapshot_date', '2025-11-19');

  console.log(`📊 Found ${beforeCount || 0} records with date 2025-11-19`);

  if (beforeCount && beforeCount > 0) {
    // Update to correct date
    const { data: updated, error } = await supabaseAdmin
      .from('consensus_diff_log')
      .update({ snapshot_date: '2024-11-19' })
      .eq('snapshot_date', '2025-11-19')
      .select();

    if (error) {
      console.error('❌ Update failed:', error);
      process.exit(1);
    }

    console.log(`✅ Updated ${updated?.length || 0} records to 2024-11-19`);
  } else {
    console.log('ℹ️  No records to update');
  }

  // Verify after
  const { count: afterCount2025 } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('*', { count: 'exact' })
    .eq('snapshot_date', '2025-11-19');

  const { count: afterCount2024 } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('*', { count: 'exact' })
    .eq('snapshot_date', '2024-11-19');

  console.log(`\n📈 Verification:`);
  console.log(`  2025-11-19: ${afterCount2025 || 0} records (should be 0)`);
  console.log(`  2024-11-19: ${afterCount2024 || 0} records`);

  if (afterCount2025 === 0 && afterCount2024 && afterCount2024 > 0) {
    console.log('\n✅ Migration successful!');
  } else {
    console.log('\n⚠️  Migration may have issues. Please verify manually.');
  }
}

fixDiffLogDate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
