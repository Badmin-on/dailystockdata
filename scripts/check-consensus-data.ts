/**
 * Check consensus data in database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkConsensusData() {
  console.log('🔍 Checking consensus data in database...\n');

  // 1. Check consensus_metric_daily
  const { data: metrics, error: metricsError } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('snapshot_date, ticker, calc_status')
    .order('snapshot_date', { ascending: false })
    .limit(10);

  if (metricsError) {
    console.error('❌ Error checking metrics:', metricsError);
  } else {
    console.log('📊 consensus_metric_daily:');
    console.log(`   Total records checked: ${metrics?.length || 0}`);
    if (metrics && metrics.length > 0) {
      console.log('   Recent records:');
      const uniqueDates = [...new Set(metrics.map(m => m.snapshot_date))];
      console.log(`   Unique dates: ${uniqueDates.join(', ')}`);
      console.log(`   Sample tickers: ${metrics.slice(0, 5).map(m => m.ticker).join(', ')}`);
    }
  }

  // 2. Count total records
  const { count, error: countError } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n📈 Total consensus_metric_daily records: ${count || 0}`);
  }

  // 3. Check for SK케미칼 (285130)
  const { data: skData, error: skError } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('*')
    .eq('ticker', '285130')
    .order('snapshot_date', { ascending: false })
    .limit(5);

  console.log('\n🔬 SK케미칼 (285130) data:');
  if (skError) {
    console.error('   Error:', skError);
  } else if (!skData || skData.length === 0) {
    console.log('   ❌ No data found for 285130');
  } else {
    console.log(`   ✅ Found ${skData.length} records`);
    skData.forEach(record => {
      console.log(`   - ${record.snapshot_date}: FVB=${record.fvb_score}, HGS=${record.hgs_score}, Status=${record.calc_status}`);
    });
  }

  // 4. Check financial_data_extended for 285130
  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select('id, name, code')
    .eq('code', '285130')
    .single();

  if (companies) {
    console.log(`\n🏢 Company info: ${companies.name} (${companies.code}), ID: ${companies.id}`);

    const { data: financialData } = await supabaseAdmin
      .from('financial_data_extended')
      .select('*')
      .eq('company_id', companies.id)
      .in('year', [2024, 2025]);

    console.log('\n💰 Financial data for 285130:');
    if (!financialData || financialData.length === 0) {
      console.log('   ❌ No financial data found');
    } else {
      console.log(`   ✅ Found ${financialData.length} records`);
      financialData.forEach(record => {
        console.log(`   - Year ${record.year}: EPS=${record.eps}, PER=${record.per}`);
      });
    }
  }
}

checkConsensusData()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
