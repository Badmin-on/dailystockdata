/**
 * Manual data collection and consensus calculation for today
 * Run this when GitHub Actions hasn't executed
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

async function manualCollectToday() {
  console.log('🚀 Starting manual data collection for 2025-11-21...\n');

  // Get current KST date
  const now = new Date();
  const kstOffset = 9 * 60;
  const kstTime = new Date(now.getTime() + (kstOffset - now.getTimezoneOffset()) * 60000);
  const kstDate = kstTime.toISOString().split('T')[0];

  console.log(`📅 Current KST Date: ${kstDate}`);
  console.log(`🕐 Current KST Time: ${kstTime.toISOString().substring(11, 19)}\n`);

  // Step 1: Collect Naver consensus data
  console.log('=' .repeat(60));
  console.log('Step 1: Collecting Naver Consensus Data');
  console.log('='.repeat(60));

  const { execSync } = require('child_process');

  try {
    console.log('Running: scrape-all-companies.ts...');
    const output = execSync('npx tsx scripts/scrape-all-companies.ts', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    console.log(output);
    console.log('✅ Naver consensus data collection complete\n');
  } catch (error: any) {
    console.error('❌ Failed to collect Naver data:', error.message);
    console.error('Continuing to next step...\n');
  }

  // Step 2: Calculate consensus metrics
  console.log('='.repeat(60));
  console.log('Step 2: Calculating Consensus Metrics');
  console.log('='.repeat(60));

  try {
    console.log('Running: calculate-consensus-batch.ts...');
    const output = execSync('npx tsx scripts/calculate-consensus-batch.ts', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log(output);
    console.log('✅ Consensus calculation complete\n');
  } catch (error: any) {
    console.error('❌ Failed to calculate consensus:', error.message);
  }

  console.log('='.repeat(60));
  console.log('🎉 Manual data collection complete!');
  console.log('='.repeat(60));
  console.log('\n💡 Next steps:');
  console.log('   1. Verify data with: npx tsx scripts/verify-today-data.ts');
  console.log('   2. Check consensus analysis page: http://localhost:3002/consensus-analysis');
  console.log();
}

manualCollectToday().catch(error => {
  console.error('🚨 Fatal error:', error);
  process.exit(1);
});
