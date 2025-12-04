import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Delete all FnGuide data to prepare for re-scraping with fixed script
 */
async function deleteFnGuideData() {
    console.log('🗑️  Deleting FnGuide Data for Re-scraping\n');
    console.log('='.repeat(80) + '\n');

    // Get count before
    const { count: beforeCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('data_source', 'fnguide');

    console.log(`Records to delete: ${beforeCount?.toLocaleString()}\n`);

    // Delete in batches to avoid timeout
    let totalDeleted = 0;
    const batchSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('financial_data_extended')
            .delete()
            .eq('data_source', 'fnguide')
            .limit(batchSize);

        if (error) {
            console.error(`❌ Error: ${error.message}`);
            break;
        }

        console.log(`Deleted batch of ${batchSize} records...`);
        totalDeleted += batchSize;

        // Check if there's more
        const { count } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('data_source', 'fnguide');

        if (!count || count === 0) {
            console.log('\n✅ All FnGuide data deleted');
            break;
        }

        console.log(`Remaining: ${count.toLocaleString()}`);
    }

    // Verify
    const { count: afterCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('data_source', 'fnguide');

    const { count: totalCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true });

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Final Status:');
    console.log(`  FnGuide records: ${afterCount?.toLocaleString()}`);
    console.log(`  Total records: ${totalCount?.toLocaleString()}`);
    console.log('\n✅ Ready for re-scraping with fixed script\n');
    console.log('='.repeat(80));
}

deleteFnGuideData().catch(console.error);
