/**
 * Consensus Calculation Batch Script
 *
 * Calculates FVB/HGS/RRS metrics for all stocks and saves to DB
 * Run daily to update consensus metrics
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdmin } from '../lib/supabase';
import { calculateConsensusResult } from '../lib/consensus/calculator';
import { generateTags, generateAlertFlags, determineTrend } from '../lib/consensus/tag-generator';
import type { YearPair } from '../lib/types/consensus';

interface CompanyFinancialData {
  company_id: number;
  ticker: string;
  company_name: string;
  data: Array<{
    year: number;
    eps: number | null;
    per: number | null;
  }>;
}

async function calculateConsensusBatch() {
  const startTime = Date.now();
  const snapshotDate = new Date().toISOString().split('T')[0];

  console.log('🚀 Consensus Calculation Batch Started');
  console.log(`📅 Snapshot Date: ${snapshotDate}`);
  console.log('═'.repeat(80));

  // 1. Fetch all companies with financial data
  console.log('\n📊 Step 1: Fetching financial data...');

  const { data: financialData, error: fetchError } = await supabaseAdmin
    .from('financial_data_extended')
    .select(`
      company_id,
      year,
      eps,
      per,
      companies:company_id (
        id,
        name,
        code
      )
    `)
    .in('year', [2024, 2025]);

  if (fetchError || !financialData) {
    console.error('❌ Failed to fetch financial data:', fetchError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${financialData.length} financial records`);

  // 2. Group by company
  console.log('\n📊 Step 2: Grouping by company...');

  const companyMap = new Map<number, CompanyFinancialData>();

  financialData.forEach((row: any) => {
    const companyId = row.company_id;
    const company = row.companies;

    if (!company) return;

    if (!companyMap.has(companyId)) {
      companyMap.set(companyId, {
        company_id: company.id,
        ticker: company.code,
        company_name: company.name,
        data: [],
      });
    }

    companyMap.get(companyId)!.data.push({
      year: row.year,
      eps: row.eps,
      per: row.per,
    });
  });

  console.log(`✅ Grouped into ${companyMap.size} companies`);

  // 3. Calculate metrics for each company
  console.log('\n📊 Step 3: Calculating consensus metrics...\n');

  const metricsToInsert: any[] = [];
  const diffLogsToInsert: any[] = [];

  let successCount = 0;
  let errorCount = 0;
  let turnaroundCount = 0;
  let deficitCount = 0;

  for (const [companyId, company] of companyMap.entries()) {
    // Find 2024 and 2025 data
    const data2024 = company.data.find(d => d.year === 2024);
    const data2025 = company.data.find(d => d.year === 2025);

    if (!data2024 || !data2025) continue;
    if (!data2024.eps || !data2024.per || !data2025.eps || !data2025.per) continue;

    // Prepare year pair
    const pair: YearPair = {
      target_y1: 2024,
      target_y2: 2025,
      eps_y1: data2024.eps,
      eps_y2: data2025.eps,
      per_y1: data2024.per,
      per_y2: data2025.per,
    };

    // Calculate
    const result = calculateConsensusResult(pair);

    // Track status
    if (result.calc_status === 'NORMAL') successCount++;
    else if (result.calc_status === 'TURNAROUND') turnaroundCount++;
    else if (result.calc_status === 'DEFICIT') deficitCount++;
    else errorCount++;

    // Prepare metric record
    const metricRecord = {
      snapshot_date: snapshotDate,
      ticker: company.ticker,
      company_id: company.company_id,
      target_y1: 2024,
      target_y2: 2025,
      calc_status: result.calc_status,
      calc_error: result.calc_error || null,
      eps_y1: result.eps_y1,
      eps_y2: result.eps_y2,
      per_y1: result.per_y1,
      per_y2: result.per_y2,
      eps_growth_pct: result.eps_growth_pct,
      per_growth_pct: result.per_growth_pct,
      fvb_score: result.fvb_score,
      hgs_score: result.hgs_score,
      rrs_score: result.rrs_score,
      quad_position: result.quad_position,
      quad_x: result.quad_x,
      quad_y: result.quad_y,
    };

    metricsToInsert.push(metricRecord);

    // Generate tags and flags (only for NORMAL and TURNAROUND)
    if (result.calc_status === 'NORMAL' || result.calc_status === 'TURNAROUND') {
      const tags = generateTags(metricRecord as any);
      const flags = generateAlertFlags(metricRecord as any);

      const diffLog = {
        snapshot_date: snapshotDate,
        ticker: company.ticker,
        company_id: company.company_id,
        target_y1: 2024,
        target_y2: 2025,
        // No historical data for first run, so diffs are null
        fvb_diff_d1: null,
        hgs_diff_d1: null,
        rrs_diff_d1: null,
        quad_shift_d1: null,
        fvb_diff_w1: null,
        hgs_diff_w1: null,
        rrs_diff_w1: null,
        quad_shift_w1: null,
        fvb_diff_m1: null,
        hgs_diff_m1: null,
        rrs_diff_m1: null,
        quad_shift_m1: null,
        signal_tags: tags,
        tag_count: tags.length,
        fvb_trend: null,
        hgs_trend: null,
        rrs_trend: null,
        ...flags,
      };

      diffLogsToInsert.push(diffLog);
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('📈 Calculation Summary:');
  console.log(`  Total Processed: ${companyMap.size}`);
  console.log(`  ✅ NORMAL: ${successCount}`);
  console.log(`  🔄 TURNAROUND: ${turnaroundCount}`);
  console.log(`  ⚠️  DEFICIT: ${deficitCount}`);
  console.log(`  ❌ ERROR: ${errorCount}`);
  console.log('─'.repeat(80));

  // 4. Save to database
  console.log('\n📊 Step 4: Saving to database...\n');

  // Insert metrics
  console.log(`💾 Inserting ${metricsToInsert.length} metric records...`);

  const { error: metricsError } = await supabaseAdmin
    .from('consensus_metric_daily')
    .upsert(metricsToInsert, {
      onConflict: 'snapshot_date,ticker,target_y1,target_y2',
    });

  if (metricsError) {
    console.error('❌ Failed to insert metrics:', metricsError);
    process.exit(1);
  }

  console.log('✅ Metrics saved successfully');

  // Insert diff logs
  console.log(`💾 Inserting ${diffLogsToInsert.length} diff log records...`);

  const { error: diffError } = await supabaseAdmin
    .from('consensus_diff_log')
    .upsert(diffLogsToInsert, {
      onConflict: 'snapshot_date,ticker,target_y1,target_y2',
    });

  if (diffError) {
    console.error('❌ Failed to insert diff logs:', diffError);
    process.exit(1);
  }

  console.log('✅ Diff logs saved successfully');

  // 5. Final summary
  const endTime = Date.now();
  const elapsedSeconds = Math.round((endTime - startTime) / 1000);

  console.log('\n' + '═'.repeat(80));
  console.log('🎉 Consensus Calculation Batch Completed!\n');
  console.log(`📅 Snapshot Date: ${snapshotDate}`);
  console.log(`⏱️  Execution Time: ${elapsedSeconds}s`);
  console.log(`📊 Total Records: ${metricsToInsert.length} metrics, ${diffLogsToInsert.length} diff logs`);
  console.log('\n✅ Data ready for API queries and UI visualization');
  console.log('═'.repeat(80) + '\n');

  return true;
}

// Run batch
calculateConsensusBatch()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
