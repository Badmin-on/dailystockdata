/**
 * Check which years have is_estimate=true data
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdmin } from '../lib/supabase';

async function checkEstimateYears() {
  console.log('🔍 Checking estimate years\n');

  const { data } = await supabaseAdmin
    .from('financial_data_extended')
    .select('year, is_estimate')
    .eq('is_estimate', true);

  const yearCounts = data?.reduce((acc: any, row: any) => {
    acc[row.year] = (acc[row.year] || 0) + 1;
    return acc;
  }, {});

  console.log('Years with is_estimate=true:');
  Object.entries(yearCounts || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([year, count]) => {
      console.log(`  ${year}: ${count} records`);
    });

  // Check a specific company to see their year range
  const { data: sampleCompany } = await supabaseAdmin
    .from('financial_data_extended')
    .select(`
      year,
      is_estimate,
      eps,
      per,
      companies:company_id (name, code)
    `)
    .eq('company_id', 872)  // Samsung Electronics
    .order('year');

  console.log('\nSample company (company_id 872):');
  sampleCompany?.forEach((row: any) => {
    console.log(`  ${row.year} [${row.is_estimate ? 'E' : 'A'}]: EPS=${row.eps}, PER=${row.per}`);
  });

  console.log('\n✅ Check complete\n');
}

checkEstimateYears()
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
