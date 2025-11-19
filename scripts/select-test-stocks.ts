/**
 * Phase 0: Select 10 test stocks for consensus calculation development
 *
 * Selects diverse stocks with:
 * - Complete 4-year data (2023-2026E)
 * - Various growth scenarios
 * - Mix of company sizes
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdmin } from '../lib/supabase';

interface TestStock {
  id: number;
  code: string;
  name: string;
  scenario_type: string;
  company_size: string;
  eps_2024: number;
  eps_2025: number;
  eps_growth_pct: number;
  per_2024: number;
  per_2025: number;
  per_growth_pct: number;
  test_category: string;
  test_reason: string;
}

interface CompanyData {
  id: number;
  name: string;
  code: string;
  data: Array<{
    year: number;
    eps: number | null;
    per: number | null;
  }>;
}

async function selectTestStocks() {
  console.log('🔍 Phase 0: Selecting test stocks for consensus calculation\n');

  // Step 1: Get all companies with their financial data
  // Note: We need both actual (2024) and estimate (2025) data
  const { data: allData, error: fetchError } = await supabaseAdmin
    .from('financial_data_extended')
    .select(`
      company_id,
      year,
      is_estimate,
      eps,
      per,
      companies:company_id (id, name, code)
    `)
    .in('year', [2024, 2025]);

  if (fetchError || !allData) {
    console.error('❌ Data fetch failed:', fetchError);
    return false;
  }

  // Step 2: Group by company and filter for complete data
  const companyMap = new Map<number, CompanyData>();

  allData.forEach((row: any) => {
    const companyId = row.company_id;
    const company = row.companies;

    if (!companyMap.has(companyId)) {
      companyMap.set(companyId, {
        id: company.id,
        name: company.name,
        code: company.code,
        data: []
      });
    }

    companyMap.get(companyId)!.data.push({
      year: row.year,
      eps: row.eps,
      per: row.per
    });
  });

  // Step 3: Process and categorize stocks
  const categorizedStocks: TestStock[] = [];

  companyMap.forEach(company => {
    // Must have both 2024 and 2025
    if (company.data.length !== 2) return;

    const data2024 = company.data.find(y => y.year === 2024);
    const data2025 = company.data.find(y => y.year === 2025);

    if (!data2024 || !data2025) return;
    if (!data2024.eps || !data2024.per || !data2025.eps || !data2025.per) return;
    if (data2024.per <= 0 || data2025.per <= 0) return;
    if (data2024.per >= 1000 || data2025.per >= 1000) return;

    const eps_2024 = data2024.eps;
    const eps_2025 = data2025.eps;
    const per_2024 = data2024.per;
    const per_2025 = data2025.per;

    const eps_growth_pct = eps_2024 > 0 && eps_2025 > 0
      ? Number((((eps_2025 - eps_2024) / eps_2024) * 100).toFixed(2))
      : null;

    const per_growth_pct = Number((((per_2025 - per_2024) / per_2024) * 100).toFixed(2));

    let scenario_type: string;
    if (eps_2024 <= 0 && eps_2025 > 0) scenario_type = 'TURNAROUND';
    else if (eps_2024 <= 0 || eps_2025 <= 0) scenario_type = 'DEFICIT';
    else if (eps_2025 > eps_2024) scenario_type = 'GROWTH';
    else scenario_type = 'DECLINE';

    const marketCap = eps_2025 * per_2025;
    const company_size = marketCap > 10000000000 ? 'LARGE'
      : marketCap > 1000000000 ? 'MID' : 'SMALL';

    if (eps_growth_pct !== null) {
      categorizedStocks.push({
        id: company.id,
        code: company.code,
        name: company.name,
        scenario_type,
        company_size,
        eps_2024,
        eps_2025,
        eps_growth_pct,
        per_2024,
        per_2025,
        per_growth_pct,
        test_category: '',
        test_reason: ''
      });
    }
  });

  // Step 4: Select diverse test stocks
  const selectedStocks: TestStock[] = [];

  // A. High-growth stocks (2)
  const highGrowth = categorizedStocks
    .filter(s => s.scenario_type === 'GROWTH' && s.eps_growth_pct > 50)
    .sort((a, b) => b.eps_growth_pct - a.eps_growth_pct)
    .slice(0, 2)
    .map(s => ({ ...s, test_category: 'HIGH_GROWTH', test_reason: 'EPS growth > 50%' }));

  selectedStocks.push(...highGrowth);

  // B. Normal growth stocks (4)
  const normalGrowth = categorizedStocks
    .filter(s => s.scenario_type === 'GROWTH' && s.eps_growth_pct >= 10 && s.eps_growth_pct <= 50)
    .sort((a, b) => b.eps_growth_pct - a.eps_growth_pct)
    .slice(0, 4)
    .map(s => ({ ...s, test_category: 'NORMAL_GROWTH', test_reason: 'Steady growth 10-50%' }));

  selectedStocks.push(...normalGrowth);

  // C. Declining stocks (2)
  const decline = categorizedStocks
    .filter(s => s.scenario_type === 'DECLINE')
    .sort((a, b) => a.eps_growth_pct - b.eps_growth_pct)
    .slice(0, 2)
    .map(s => ({ ...s, test_category: 'DECLINE', test_reason: 'Negative EPS growth' }));

  selectedStocks.push(...decline);

  // D. Turnaround (1)
  const turnaround = categorizedStocks
    .filter(s => s.scenario_type === 'TURNAROUND')
    .sort((a, b) => b.eps_2025 - a.eps_2025)
    .slice(0, 1)
    .map(s => ({ ...s, test_category: 'TURNAROUND', test_reason: 'Deficit to profit' }));

  selectedStocks.push(...turnaround);

  // E. Deficit (1)
  const deficit = categorizedStocks
    .filter(s => s.scenario_type === 'DEFICIT')
    .slice(0, 1)
    .map(s => ({ ...s, test_category: 'DEFICIT', test_reason: 'Both years deficit' }));

  selectedStocks.push(...deficit);

  const stocks = selectedStocks;

  console.log('📊 Selected Test Stocks:\n');
  console.log('═'.repeat(80));

  stocks.forEach((stock, i) => {
    console.log(`\n${i + 1}. ${stock.name} (${stock.code})`);
    console.log(`   Category: ${stock.test_category}`);
    console.log(`   Scenario: ${stock.scenario_type} | Size: ${stock.company_size}`);
    console.log(`   EPS 2024: ${stock.eps_2024?.toLocaleString()}원 → 2025: ${stock.eps_2025?.toLocaleString()}원 (${stock.eps_growth_pct >= 0 ? '+' : ''}${stock.eps_growth_pct}%)`);
    console.log(`   PER 2024: ${stock.per_2024?.toFixed(2)}배 → 2025: ${stock.per_2025?.toFixed(2)}배 (${stock.per_growth_pct >= 0 ? '+' : ''}${stock.per_growth_pct}%)`);
    console.log(`   Reason: ${stock.test_reason}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('\n📝 Test Stock Distribution:');

  const distribution = stocks.reduce((acc, stock) => {
    acc[stock.test_category] = (acc[stock.test_category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(distribution).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} stocks`);
  });

  console.log(`\n✅ Total: ${stocks.length} stocks selected`);

  // Save to file for reference
  const fs = require('fs');
  const outputPath = resolve(__dirname, 'test-stocks-selected.json');
  fs.writeFileSync(outputPath, JSON.stringify(stocks, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}\n`);

  return true;
}

// Run
selectTestStocks()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
