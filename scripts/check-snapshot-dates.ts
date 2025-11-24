/**
 * Check available snapshot dates in consensus_metric_daily
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdmin } from '../lib/supabase';

async function checkSnapshotDates() {
  console.log('📅 Checking available snapshot dates...\n');

  const { data, error } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Get unique dates
  const uniqueDates = [...new Set(data?.map(d => d.snapshot_date) || [])];

  console.log(`✅ Found ${uniqueDates.length} unique snapshot dates:\n`);
  uniqueDates.forEach((date, idx) => {
    console.log(`${idx + 1}. ${date}`);
  });

  if (uniqueDates.length > 1) {
    const latest = uniqueDates[0];
    const oldest = uniqueDates[uniqueDates.length - 1];
    const daysDiff = Math.floor(
      (new Date(latest).getTime() - new Date(oldest).getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`\n📊 Date Range:`);
    console.log(`   Latest: ${latest}`);
    console.log(`   Oldest: ${oldest}`);
    console.log(`   Span: ${daysDiff} days`);
  }
}

checkSnapshotDates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
