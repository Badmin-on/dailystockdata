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

async function migrateAllHistoricalData() {
    console.log('🚀 Starting Full Historical Data Migration\n');
    console.log('From: financial_data → financial_data_extended\n');
    console.log('='.repeat(80) + '\n');

    // 1. Get all unique dates from financial_data
    console.log('📅 Step 1: Finding all dates in financial_data...\n');

    let allDates: Set<string> = new Set();
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('financial_data')
            .select('scrape_date')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) break;

        data.forEach(record => allDates.add(record.scrape_date));

        if (page % 50 === 0) {
            console.log(`  Scanned ${(page + 1) * pageSize} records, found ${allDates.size} unique dates`);
        }

        if (data.length < pageSize) break;
        page++;
    }

    const sortedDates = Array.from(allDates).sort();
    console.log(`\n✅ Found ${sortedDates.length} unique dates (${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]})\n`);

    // 2. Check which dates already exist in extended table
    console.log('🔍 Step 2: Checking existing dates in financial_data_extended...\n');

    const existingDates: Set<string> = new Set();
    page = 0;

    while (true) {
        const { data, error } = await supabase
            .from('financial_data_extended')
            .select('scrape_date')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) break;

        data.forEach(record => existingDates.add(record.scrape_date));

        if (data.length < pageSize) break;
        page++;
    }

    console.log(`✅ Found ${existingDates.size} dates already in extended table\n`);

    // 3. Determine dates to migrate
    const datesToMigrate = sortedDates.filter(date => !existingDates.has(date));

    console.log(`📊 Migration Plan:`);
    console.log(`  Total dates in source: ${sortedDates.length}`);
    console.log(`  Already migrated: ${existingDates.size}`);
    console.log(`  To migrate: ${datesToMigrate.length}\n`);

    if (datesToMigrate.length === 0) {
        console.log('✅ All dates already migrated!\n');
        return;
    }

    console.log('Dates to migrate:');
    datesToMigrate.slice(0, 10).forEach(date => console.log(`  - ${date}`));
    if (datesToMigrate.length > 10) {
        console.log(`  ... and ${datesToMigrate.length - 10} more dates\n`);
    }

    // 4. Migrate date by date
    console.log('\n🔄 Step 3: Starting migration...\n');

    let totalMigrated = 0;
    let errors = 0;

    for (let i = 0; i < datesToMigrate.length; i++) {
        const date = datesToMigrate[i];

        console.log(`[${i + 1}/${datesToMigrate.length}] Migrating ${date}...`);

        // Fetch all records for this date
        const { data: records, error: fetchError } = await supabase
            .from('financial_data')
            .select('*')
            .eq('scrape_date', date);

        if (fetchError) {
            console.error(`  ❌ Error fetching: ${fetchError.message}`);
            errors++;
            continue;
        }

        if (!records || records.length === 0) {
            console.log(`  ⚠️  No records found`);
            continue;
        }

        console.log(`  📥 Fetched ${records.length} records`);

        // Transform records (remove id, created_at, updated_at)
        const transformedRecords = records.map(record => {
            const { id, created_at, updated_at, ...rest } = record;
            return {
                ...rest,
                // Ensure data_source is set (financial_data is from naver)
                data_source: record.data_source || 'naver'
            };
        });

        // Insert in batches of 500 to avoid timeout
        const batchSize = 500;
        let batchErrors = 0;

        for (let j = 0; j < transformedRecords.length; j += batchSize) {
            const batch = transformedRecords.slice(j, j + batchSize);

            const { error: insertError } = await supabase
                .from('financial_data_extended')
                .insert(batch);

            if (insertError) {
                console.error(`  ❌ Batch ${Math.floor(j / batchSize) + 1} error: ${insertError.message}`);
                batchErrors++;
            }
        }

        if (batchErrors === 0) {
            console.log(`  ✅ Migrated ${records.length} records`);
            totalMigrated += records.length;
        } else {
            console.log(`  ⚠️  Completed with ${batchErrors} batch errors`);
            errors++;
        }

        // Progress update every 10 dates
        if ((i + 1) % 10 === 0) {
            console.log(`\n📈 Progress: ${i + 1}/${datesToMigrate.length} dates, ${totalMigrated.toLocaleString()} records migrated\n`);
        }
    }

    // 5. Final summary
    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 Migration Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`  Dates migrated: ${datesToMigrate.length}`);
    console.log(`  Records migrated: ${totalMigrated.toLocaleString()}`);
    console.log(`  Errors: ${errors}\n`);

    // 6. Verify
    console.log('🔍 Verification:\n');

    const { count: finalCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true });

    console.log(`  Total records in financial_data_extended: ${finalCount?.toLocaleString()}\n`);

    console.log('='.repeat(80) + '\n');
}

migrateAllHistoricalData().catch(console.error);
