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
 * Step 1: Structure Verification
 */
async function verifyStructure() {
    console.log('📋 Step 1: Structure Verification\n');

    // Check both tables exist
    const { data: mainData, error: mainError } = await supabase
        .from('financial_data')
        .select('*')
        .limit(1);

    const { data: extData, error: extError } = await supabase
        .from('financial_data_extended')
        .select('*')
        .limit(1);

    if (mainError) {
        console.error('❌ financial_data error:', mainError.message);
        return false;
    }

    if (extError) {
        console.error('❌ financial_data_extended error:', extError.message);
        return false;
    }

    console.log('✅ Both tables accessible\n');

    // Get current data distribution
    console.log('📊 Current Data Distribution:\n');

    const dates = ['2025-11-29', '2025-11-28', '2025-11-27', '2025-11-26', '2025-11-25', '2025-11-24'];

    console.log('Date'.padEnd(15) + 'financial_data'.padEnd(20) + 'financial_data_extended');
    console.log('-'.repeat(55));

    for (const date of dates) {
        const { count: mainCount } = await supabase
            .from('financial_data')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        const { count: extCount } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        console.log(
            date.padEnd(15) +
            (mainCount || 0).toString().padEnd(20) +
            (extCount || 0)
        );
    }

    return true;
}

/**
 * Step 2: Migrate Data
 */
async function migrateData() {
    console.log('\n\n📦 Step 2: Data Migration\n');

    // Find all dates in financial_data
    const { data: allDates } = await supabase
        .from('financial_data')
        .select('scrape_date')
        .order('scrape_date', { ascending: false });

    if (!allDates || allDates.length === 0) {
        console.log('✅ No data to migrate from financial_data');
        return;
    }

    const uniqueDates = [...new Set(allDates.map(d => d.scrape_date))];
    console.log(`Found ${uniqueDates.length} unique dates to migrate:\n`, uniqueDates.slice(0, 10));

    let totalMigrated = 0;

    for (const date of uniqueDates) {
        console.log(`\n📅 Processing ${date}...`);

        // Check if already exists in extended
        const { count: existingCount } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        if (existingCount && existingCount > 0) {
            console.log(`  ⏭️  Already exists in extended table (${existingCount} records), skipping`);
            continue;
        }

        // Fetch data from main table
        const { data: records, error: fetchError } = await supabase
            .from('financial_data')
            .select('*')
            .eq('scrape_date', date);

        if (fetchError) {
            console.error(`  ❌ Error fetching: ${fetchError.message}`);
            continue;
        }

        if (!records || records.length === 0) {
            console.log(`  ⚠️  No records found`);
            continue;
        }

        console.log(`  📥 Fetched ${records.length} records`);

        // Transform: remove id, created_at, add missing columns as null
        const transformedRecords = records.map(record => {
            const { id, created_at, updated_at, ...rest } = record;
            return {
                ...rest,
                // Add columns that exist in extended but not in main (will be NULL)
                eps: null,
                per: null,
                roe: null,
                pbr: null,
                bps: null,
                net_income: null
            };
        });

        // Insert into extended table
        const { data: inserted, error: insertError } = await supabase
            .from('financial_data_extended')
            .insert(transformedRecords)
            .select();

        if (insertError) {
            console.error(`  ❌ Error inserting: ${insertError.message}`);
            continue;
        }

        console.log(`  ✅ Migrated ${inserted?.length || 0} records`);
        totalMigrated += inserted?.length || 0;
    }

    console.log(`\n🎉 Migration Complete! Total migrated: ${totalMigrated} records`);
}

/**
 * Step 3: Verification
 */
async function verifyMigration() {
    console.log('\n\n🔍 Step 3: Migration Verification\n');

    const dates = ['2025-11-29', '2025-11-28', '2025-11-27', '2025-11-26', '2025-11-25', '2025-11-24', '2025-11-23'];

    console.log('Date'.padEnd(15) + 'Records in Extended'.padEnd(25) + 'Has EPS Data');
    console.log('-'.repeat(55));

    let totalRecords = 0;

    for (const date of dates) {
        const { count } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        // Check if has EPS data (from FnGuide, 26+ should have it)
        const { count: epsCount } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date)
            .not('eps', 'is', null);

        if (count && count > 0) {
            console.log(
                date.padEnd(15) +
                count.toString().padEnd(25) +
                (epsCount ? `✅ ${epsCount} records` : '❌ None')
            );
            totalRecords += count;
        }
    }

    console.log('\n' + '='.repeat(55));
    console.log(`Total records in financial_data_extended: ${totalRecords}`);
    console.log('='.repeat(55));
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 financial_data_extended Migration Tool\n');
    console.log('='.repeat(60) + '\n');

    // Step 1: Verify structure
    const structureOk = await verifyStructure();
    if (!structureOk) {
        console.error('❌ Structure verification failed. Aborting.');
        return;
    }

    // Step 2: Migrate data
    await migrateData();

    // Step 3: Verify
    await verifyMigration();

    console.log('\n✅ All steps completed!\n');
    console.log('Next steps:');
    console.log('1. Update API routes to use financial_data_extended');
    console.log('2. Test all pages');
    console.log('3. Verify date dropdowns show all dates');
}

main().catch(console.error);
