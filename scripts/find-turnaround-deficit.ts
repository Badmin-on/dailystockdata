/**
 * Find TURNAROUND and DEFICIT stocks
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdmin } from '../lib/supabase';

async function findEdgeCaseStocks() {
  console.log('🔍 Looking for TURNAROUND and DEFICIT stocks\n');

  // Get all 2024-2025 pairs
  const { data: allData } = await supabaseAdmin
    .from('financial_data_extended')
    .select(`
      company_id,
      year,
      eps,
      companies:company_id (name, code)
    `)
    .in('year', [2024, 2025])
    .not('eps', 'is', null);

  // Group by company
  const companyMap = new Map<number, any>();
  allData?.forEach((row: any) => {
    if (!companyMap.has(row.company_id)) {
      companyMap.set(row.company_id, {
        name: row.companies.name,
        code: row.companies.code,
        data: []
      });
    }
    companyMap.get(row.company_id)!.data.push({
      year: row.year,
      eps: row.eps
    });
  });

  // Find TURNAROUND (deficit → profit)
  const turnarounds: any[] = [];
  const deficits: any[] = [];

  companyMap.forEach((company, id) => {
    if (company.data.length !== 2) return;

    const eps2024 = company.data.find((d: any) => d.year === 2024)?.eps;
    const eps2025 = company.data.find((d: any) => d.year === 2025)?.eps;

    if (!eps2024 || !eps2025) return;

    // TURNAROUND: 2024 deficit, 2025 profit
    if (eps2024 <= 0 && eps2025 > 0) {
      turnarounds.push({
        code: company.code,
        name: company.name,
        eps2024,
        eps2025
      });
    }

    // DEFICIT: Both years deficit
    if (eps2024 <= 0 && eps2025 <= 0) {
      deficits.push({
        code: company.code,
        name: company.name,
        eps2024,
        eps2025
      });
    }
  });

  console.log(`Found ${turnarounds.length} TURNAROUND stocks:`);
  turnarounds.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.code}): EPS ${s.eps2024} → ${s.eps2025}`);
  });

  console.log(`\nFound ${deficits.length} DEFICIT stocks:`);
  deficits.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.code}): EPS ${s.eps2024} → ${s.eps2025}`);
  });

  console.log('\n✅ Search complete\n');
}

findEdgeCaseStocks()
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
