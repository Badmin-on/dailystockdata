/**
 * Debug: Check what consensus data exists in database
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdmin } from '../lib/supabase';

async function debugConsensusData() {
  console.log('🔍 Checking consensus data in database\n');

  // 1. Check total records
  const { count: totalCount } = await supabaseAdmin
    .from('financial_data_extended')
    .select('*', { count: 'exact', head: true });

  console.log(`Total records: ${totalCount}`);

  // 2. Check is_estimate distribution
  const { data: estimateData } = await supabaseAdmin
    .from('financial_data_extended')
    .select('is_estimate')
    .limit(10);

  console.log('\nFirst 10 records is_estimate values:');
  estimateData?.forEach((row, i) => {
    console.log(`  ${i + 1}. is_estimate: ${row.is_estimate}`);
  });

  // 3. Check year distribution
  const { data: yearData } = await supabaseAdmin
    .from('financial_data_extended')
    .select('year, is_estimate')
    .order('year');

  const yearDistribution = yearData?.reduce((acc: any, row: any) => {
    const key = `${row.year}_${row.is_estimate ? 'E' : 'A'}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log('\nYear distribution:');
  Object.entries(yearDistribution || {}).forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
  });

  // 4. Sample a few stocks with complete data
  const { data: sampleData } = await supabaseAdmin
    .from('financial_data_extended')
    .select(`
      company_id,
      year,
      is_estimate,
      eps,
      per,
      companies:company_id (name, code)
    `)
    .eq('is_estimate', true)
    .in('year', [2024, 2025])
    .not('eps', 'is', null)
    .not('per', 'is', null)
    .limit(5);

  console.log('\nSample stocks with 2024/2025 consensus data:');
  sampleData?.forEach((row: any, i: number) => {
    console.log(`  ${i + 1}. ${row.companies.name} (${row.companies.code})`);
    console.log(`     Year: ${row.year}, EPS: ${row.eps}, PER: ${row.per}`);
  });

  console.log('\n✅ Debug complete\n');
}

debugConsensusData()
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
