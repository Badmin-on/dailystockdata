
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Checking consensus tables for 2025-11-25...');

  // 1. Check consensus_metric_daily (API uses this)
  const { count: countDaily, error: errorDaily } = await supabase
    .from('consensus_metric_daily')
    .select('*', { count: 'exact', head: true })
    .eq('snapshot_date', '2025-11-25');

  console.log(`consensus_metric_daily (API target): ${countDaily} rows (Error: ${errorDaily?.message})`);

  // 2. Check consensus_metrics (Script writes to this)
  const { count: countMetrics, error: errorMetrics } = await supabase
    .from('consensus_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('snapshot_date', '2025-11-25');

  console.log(`consensus_metrics (Script target): ${countMetrics} rows (Error: ${errorMetrics?.message})`);

  if (countDaily === 0 && countMetrics === 0) {
    console.log('❌ No consensus data in EITHER table for today.');
  } else if ((countMetrics || 0) > 0 && countDaily === 0) {
    console.log('⚠️ Data exists in consensus_metrics but NOT in consensus_metric_daily. API is reading wrong table or view not updated.');
  } else {
    console.log('✅ Data exists.');
  }
}

checkData();
