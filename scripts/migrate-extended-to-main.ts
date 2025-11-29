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
 * Migrate data from financial_data_extended to financial_data
 * For specific dates (Nov 26, 27, 28, or any specified dates)
 */
async function migrateData(dates: string[]) {
    console.log('🚀 Starting data migration...\n');
    console.log(`📅 Target dates: ${dates.join(', ')}\n`);

    let totalMigrated = 0;
    let totalErrors = 0;

    for (const date of dates) {
        console.log(`\n📊 Processing ${date}...`);

        // 1. Fetch data from extended table
        const { data: extendedData, error: fetchError } = await supabase
            .from('financial_data_extended')
            .select('*')
            .eq('scrape_date', date);

        if (fetchError) {
            console.error(`❌ Error fetching data for ${date}:`, fetchError.message);
            totalErrors++;
            continue;
        }

        if (!extendedData || extendedData.length === 0) {
            console.log(`⚠️  No data found in financial_data_extended for ${date}`);
            continue;
        }

        console.log(`✅ Found ${extendedData.length} records`);

        // 2. Check if data already exists in main table
        const { count: existingCount } = await supabase
            .from('financial_data')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        if (existingCount && existingCount > 0) {
            console.log(`⚠️  ${existingCount} records already exist in financial_data for ${date}`);
            console.log(`   Skipping to avoid duplicates. Delete existing data first if you want to re-migrate.`);
            continue;
        }

        // 3. Transform data to match financial_data schema (if needed)
        // Remove any fields that don't exist in financial_data table
        const dataToInsert = extendedData.map(record => {
            const { id, created_at, ...rest } = record; // Remove id and created_at to let DB generate new ones
            return rest;
        });

        // 4. Insert into financial_data
        console.log(`🔄 Inserting ${dataToInsert.length} records into financial_data...`);

        const { data: insertedData, error: insertError } = await supabase
            .from('financial_data')
            .insert(dataToInsert)
            .select();

        if (insertError) {
            console.error(`❌ Error inserting data for ${date}:`, insertError.message);
            console.error(`   Details:`, insertError);
            totalErrors++;
            continue;
        }

        console.log(`✅ Successfully migrated ${insertedData?.length || 0} records for ${date}`);
        totalMigrated += insertedData?.length || 0;
    }

    // 5. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Total migrated: ${totalMigrated} records`);
    console.log(`   ❌ Errors: ${totalErrors}`);
    console.log('='.repeat(50) + '\n');

    // 6. Verification
    console.log('🔍 Verification - checking financial_data table:\n');
    for (const date of dates) {
        const { count } = await supabase
            .from('financial_data')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        console.log(`   ${date}: ${count || 0} records`);
    }

    console.log('\n✅ Migration complete!');
}

// Default: migrate Nov 26, 27, 28
const datesToMigrate = process.argv.slice(2);
if (datesToMigrate.length === 0) {
    datesToMigrate.push('2025-11-26', '2025-11-27', '2025-11-28');
}

migrateData(datesToMigrate).catch(console.error);
