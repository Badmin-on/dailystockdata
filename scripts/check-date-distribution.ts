
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

console.log('Current directory:', process.cwd());
console.log('Env file path:', resolve(process.cwd(), '.env.local'));
console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);

const { supabaseAdmin } = require('../lib/supabase');

async function checkDateDistribution() {
  console.log('📅 Checking available dates in consensus_metric_daily...\n');

  const { data, error } = await supabaseAdmin
    .from('consensus_metric_daily')
    .select('snapshot_date, calc_status')
    .order('snapshot_date', { ascending: false });

  if (error) {
    console.error('❌ Error fetching dates:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No data found in consensus_metric_daily table.');
    return;
  }

  // Count occurrences of each date and status
  const stats: Record<string, Record<string, number>> = {};

  data.forEach((row: any) => {
    const date = row.snapshot_date;
    const status = row.calc_status;

    if (!stats[date]) {
      stats[date] = {};
    }
    stats[date][status] = (stats[date][status] || 0) + 1;
  });

  console.log('📊 Date & Status Distribution:');
  Object.entries(stats).forEach(([date, statusCounts]) => {
    console.log(`  - ${date}:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    • ${status}: ${count} records`);
    });
  });
}

checkDateDistribution();
