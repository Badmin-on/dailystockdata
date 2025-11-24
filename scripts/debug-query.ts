
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

const { supabaseAdmin } = require('../lib/supabase');

async function debugQuery() {
    console.log('🔍 Debugging API Query for 2026 Outlook...\n');

    const today = new Date().toISOString().split('T')[0];
    console.log(`Snapshot Date: ${today}`);

    const { data, error, count } = await supabaseAdmin
        .from('consensus_metric_daily')
        .select(`
            *,
            companies:company_id (
                id,
                name,
                code
            )
        `, { count: 'exact' })
        .eq('target_y2', 2026)
        .eq('snapshot_date', today)
        .limit(50);

    if (error) {
        console.error('❌ Query Error:', error);
        return;
    }

    console.log(`✅ Query Success!`);
    console.log(`📊 Total Count: ${count}`);
    console.log(`📄 Returned Data Length: ${data?.length}`);

    if (data && data.length > 0) {
        console.log('\n📝 First Record Sample:');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('\n⚠️ No data returned.');
    }
}

debugQuery();
