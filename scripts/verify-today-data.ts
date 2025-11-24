/**
 * Verify data collection and calculation for today (2025-11-21)
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

async function verifyTodayData() {
  console.log('🔍 Verifying data collection for 2025-11-21...\n');

  // 1. Check financial_data_extended
  console.log('📊 1. Financial Data (financial_data_extended)');
  console.log('─'.repeat(60));

  const { data: latestFinancial } = await supabaseAdmin
    .from('financial_data_extended')
    .select('year, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (latestFinancial && latestFinancial.length > 0) {
    console.log('Latest updates:');
    latestFinancial.forEach(row => {
      const updateDate = new Date(row.updated_at);
      const kstDate = new Date(updateDate.getTime() + (9 * 60 * 60 * 1000));
      console.log(`  - Year ${row.year}: ${kstDate.toISOString().replace('T', ' ').substring(0, 19)} KST`);
    });
  }

  // Check if today's data exists (updated today)
  const today = '2025-11-21';
  const { count: todayFinancialCount } = await supabaseAdmin
    .from('financial_data_extended')
    .select('*', { count: 'exact' })
    .gte('updated_at', `${today}T00:00:00`)
    .lt('updated_at', `${today}T23:59:59`);

  console.log(`\n✓ Records updated on ${today}: ${todayFinancialCount || 0}`);

  // Total records
  const { count: totalFinancial } = await supabaseAdmin
    .from('financial_data_extended')
    .select('*', { count: 'exact' });
  console.log(`✓ Total financial records: ${totalFinancial || 0}\n`);

  // 2. Check consensus_metric_daily
  console.log('📈 2. Consensus Metrics (consensus_metric_daily)');
  console.log('─'.repeat(60));

  const { data: allDates } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(10);

  const uniqueDates = [...new Set(allDates?.map(d => d.snapshot_date) || [])];
  console.log('Available snapshot dates:');
  uniqueDates.forEach(date => console.log(`  - ${date}`));

  // Check today's consensus calculation
  const { count: todayConsensusCount } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('*', { count: 'exact' })
    .eq('snapshot_date', today);

  console.log(`\n✓ Consensus records for ${today}: ${todayConsensusCount || 0}`);

  // 3. Check consensus_diff_log
  console.log('\n📊 3. Consensus Diff Log');
  console.log('─'.repeat(60));

  const { count: todayDiffCount } = await supabaseAdmin
    .from('consensus_diff_log')
    .select('*', { count: 'exact' })
    .eq('snapshot_date', today);

  console.log(`✓ Diff log records for ${today}: ${todayDiffCount || 0}`);

  // 4. Check calculation status breakdown
  if (todayConsensusCount && todayConsensusCount > 0) {
    console.log('\n📋 4. Calculation Status Breakdown');
    console.log('─'.repeat(60));

    const { data: statusBreakdown } = await supabaseAdmin
      .from('consensus_metric_daily')
      .select('calc_status')
      .eq('snapshot_date', today);

    const statusCounts: Record<string, number> = {};
    statusBreakdown?.forEach(row => {
      statusCounts[row.calc_status] = (statusCounts[row.calc_status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} companies`);
    });
  }

  // 5. Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📝 Summary');
  console.log('═'.repeat(60));

  const hasFinancialData = (todayFinancialCount || 0) > 0;
  const hasConsensusData = (todayConsensusCount || 0) > 0;
  const hasDiffLog = (todayDiffCount || 0) > 0;

  console.log(`\n${today} Data Status:`);
  console.log(`  Financial Data (7:00 AM): ${hasFinancialData ? '✅ COLLECTED' : '❌ NOT FOUND'}`);
  console.log(`  Consensus Calculation (8:30 AM): ${hasConsensusData ? '✅ CALCULATED' : '❌ NOT CALCULATED'}`);
  console.log(`  Diff Log: ${hasDiffLog ? '✅ GENERATED' : '❌ NOT GENERATED'}`);

  if (!hasFinancialData) {
    console.log('\n⚠️  Warning: No financial data collected for today');
    console.log('   Check GitHub Actions: FnGuide scraper (7:00 AM KST)');
  }

  if (!hasConsensusData) {
    console.log('\n⚠️  Warning: No consensus calculation for today');
    console.log('   Check GitHub Actions: Consensus calculator (8:30 AM KST)');
  }

  console.log();
}

verifyTodayData().catch(console.error);
