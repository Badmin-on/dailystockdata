/**
 * Test Consensus Calculator
 *
 * Tests calculation engine with 10 selected test stocks
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdmin } from '../lib/supabase';
import { calculateConsensusResult } from '../lib/consensus/calculator';
import { generateTags, generateAlertFlags } from '../lib/consensus/tag-generator';
import type { YearPair } from '../lib/types/consensus';

interface TestStockData {
  id: number;
  code: string;
  name: string;
  test_category: string;
  data_2024: {
    eps: number;
    per: number;
  };
  data_2025: {
    eps: number;
    per: number;
  };
}

async function testConsensusCalculator() {
  console.log('🧪 Testing Consensus Calculator with 10 test stocks\n');
  console.log('═'.repeat(80));

  // Load test stocks
  const testStocksFile = resolve(__dirname, 'test-stocks-selected.json');
  const fs = require('fs');
  const testStocks = JSON.parse(fs.readFileSync(testStocksFile, 'utf8'));

  console.log(`\n📊 Loading financial data for ${testStocks.length} test stocks...\n`);

  // Get financial data for test stocks
  const stockCodes = testStocks.map((s: any) => s.code);

  // Get company IDs first
  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select('id, name, code')
    .in('code', stockCodes);

  if (!companies) {
    console.error('❌ Failed to load companies');
    return false;
  }

  const companyIds = companies.map(c => c.id);

  const { data: financialData, error } = await supabaseAdmin
    .from('financial_data_extended')
    .select('company_id, year, eps, per')
    .in('year', [2024, 2025])
    .in('company_id', companyIds);

  if (error || !financialData) {
    console.error('❌ Failed to load financial data:', error);
    return false;
  }

  // Create company lookup
  const companyLookup = new Map<number, { id: number; name: string; code: string }>();
  companies.forEach(c => companyLookup.set(c.id, c));

  // Group by company
  const companyData = new Map<string, TestStockData>();

  financialData.forEach((row: any) => {
    const company = companyLookup.get(row.company_id);
    if (!company) return;

    const code = company.code;
    const year = row.year;

    if (!companyData.has(code)) {
      const testStock = testStocks.find((s: any) => s.code === code);
      companyData.set(code, {
        id: company.id,
        code: company.code,
        name: company.name,
        test_category: testStock?.test_category || 'UNKNOWN',
        data_2024: { eps: 0, per: 0 },
        data_2025: { eps: 0, per: 0 },
      });
    }

    const companyEntry = companyData.get(code)!;
    if (year === 2024) {
      companyEntry.data_2024 = { eps: row.eps, per: row.per };
    } else if (year === 2025) {
      companyEntry.data_2025 = { eps: row.eps, per: row.per };
    }
  });

  console.log(`✅ Loaded data for ${companyData.size} stocks\n`);
  console.log('═'.repeat(80));

  // Test each stock
  let testsPassed = 0;
  let testsFailed = 0;

  for (const [code, stock] of companyData.entries()) {
    console.log(`\n📈 ${stock.name} (${code}) - ${stock.test_category}`);
    console.log('─'.repeat(80));

    // Prepare year pair
    const pair: YearPair = {
      target_y1: 2024,
      target_y2: 2025,
      eps_y1: stock.data_2024.eps,
      eps_y2: stock.data_2025.eps,
      per_y1: stock.data_2024.per,
      per_y2: stock.data_2025.per,
    };

    console.log(`Input Data:`);
    console.log(`  2024: EPS ${pair.eps_y1?.toLocaleString() || 'N/A'}원, PER ${pair.per_y1?.toFixed(2) || 'N/A'}배`);
    console.log(`  2025: EPS ${pair.eps_y2?.toLocaleString() || 'N/A'}원, PER ${pair.per_y2?.toFixed(2) || 'N/A'}배`);

    try {
      // Calculate consensus result
      const result = calculateConsensusResult(pair);

      console.log(`\nCalculation Status: ${result.calc_status}`);

      if (result.calc_error) {
        console.log(`  Error: ${result.calc_error}`);
      }

      if (result.calc_status === 'NORMAL') {
        console.log(`\nGrowth Rates:`);
        console.log(`  EPS Growth: ${result.eps_growth_pct?.toFixed(2)}%`);
        console.log(`  PER Change: ${result.per_growth_pct?.toFixed(2)}%`);

        console.log(`\nCore Metrics:`);
        console.log(`  FVB Score: ${result.fvb_score?.toFixed(4)}`);
        console.log(`  HGS Score: ${result.hgs_score?.toFixed(2)}`);
        console.log(`  RRS Score: ${result.rrs_score?.toFixed(2)}`);

        console.log(`\nQuadrant:`);
        console.log(`  Position: ${result.quad_position}`);
        console.log(`  Coordinates: (${result.quad_x}, ${result.quad_y})`);

        // Generate tags (without diff data for this test)
        const metricForTag: ConsensusMetricDaily = {
          ...result,
          snapshot_date: '2024-11-19',
          ticker: code,
          company_id: stock.id,
          target_y1: 2024,
          target_y2: 2025,
        };

        const tags = generateTags(metricForTag);
        const flags = generateAlertFlags(metricForTag);

        console.log(`\nGenerated Tags: ${tags.length > 0 ? tags.join(', ') : 'None'}`);
        console.log(`Alert Flags:`);
        console.log(`  Target Zone: ${flags.is_target_zone ? '✅' : '❌'}`);
        console.log(`  High Growth: ${flags.is_high_growth ? '✅' : '❌'}`);
        console.log(`  Overheat: ${flags.is_overheat ? '⚠️' : '✅'}`);
        console.log(`  Healthy: ${flags.is_healthy ? '✅' : '❌'}`);
      }

      testsPassed++;
      console.log(`\n✅ Test passed`);
    } catch (error) {
      console.error(`\n❌ Test failed:`, error);
      testsFailed++;
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 Test Summary\n');
  console.log(`Total Tests: ${companyData.size}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / companyData.size) * 100).toFixed(1)}%`);

  if (testsPassed === companyData.size) {
    console.log('\n🎉 All tests passed! Calculation engine is working correctly.\n');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    return false;
  }
}

// Run tests
testConsensusCalculator()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
