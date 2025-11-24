
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

const { supabaseAdmin } = require('../lib/supabase');

async function debugQuadrant() {
    console.log('🔍 Debugging Quadrant API Query for 2025-11-19...\n');

    let query = supabaseAdmin
        .from('consensus_metric_daily')
        .select(`
      ticker,
      quad_x,
      quad_y,
      quad_position,
      fvb_score,
      hgs_score,
      rrs_score,
      companies:company_id (
        name
      ),
      consensus_diff_log!inner (
        signal_tags,
        is_target_zone,
        is_high_growth
      )
    `)
        .eq('calc_status', 'NORMAL')
        .not('quad_x', 'is', null)
        .not('quad_y', 'is', null);

    // Apply date filter
    query = query.eq('snapshot_date', '2025-11-19');

    const { data, error } = await query;

    if (error) {
        console.error('❌ Query Error:', error);
        return;
    }

    console.log(`✅ Query Success!`);
    console.log(`📄 Returned Data Length: ${data?.length}`);

    if (data && data.length > 0) {
        console.log('\n📝 First Record Sample:');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('\n⚠️ No data returned. This might be due to the !inner join if diff_log is missing.');
    }
}

debugQuadrant();
