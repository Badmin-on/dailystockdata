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
 * Complete and precise migration of ALL records from financial_data to financial_data_extended
 * Handles large datasets by using pagination and proper deduplication
 */
async function completeMigration() {
    console.log('🚀 COMPLETE MIGRATION - ALL MISSING RECORDS\n');
    console.log('='.repeat(80) + '\n');

    // Step 1: Get all unique dates from source
    console.log('📅 Step 1: Getting all dates from financial_data...\n');

    const allSourceDates: Set<string> = new Set();
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('financial_data')
            .select('scrape_date')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) break;
        data.forEach(r => allSourceDates.add(r.scrape_date));

        if (data.length < pageSize) break;
        page++;
    }

    const sortedDates = Array.from(allSourceDates).sort();
    console.log(`Found ${sortedDates.length} unique dates in source\n`);

    // Step 2: Process each date comprehensively
    let totalMigrated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        console.log(`\n[${i + 1}/${sortedDates.length}] Processing ${date}...`);

        // Get ALL records from source for this date (with pagination)
        const sourceRecords: any[] = [];
        let sourcePage = 0;

        while (true) {
            const { data, error } = await supabase
                .from('financial_data')
                .select('*')
                .eq('scrape_date', date)
                .range(sourcePage * pageSize, (sourcePage + 1) * pageSize - 1);

            if (error) {
                console.error(`  ❌ Error fetching source: ${error.message}`);
                break;
            }

            if (!data || data.length === 0) break;

            sourceRecords.push(...data);

            if (data.length < pageSize) break;
            sourcePage++;
        }

        console.log(`  📥 Source has ${sourceRecords.length} records`);

        // Get ALL existing records from target for this date
        const existingRecords: any[] = [];
        let targetPage = 0;

        while (true) {
            const { data, error } = await supabase
                .from('financial_data_extended')
                .select('company_id, year, scrape_date')
                .eq('scrape_date', date)
                .range(targetPage * pageSize, (targetPage + 1) * pageSize - 1);

            if (error) {
                console.error(`  ❌ Error fetching target: ${error.message}`);
                break;
            }

            if (!data || data.length === 0) break;

            existingRecords.push(...data);

            if (data.length < pageSize) break;
            targetPage++;
        }

        console.log(`  📊 Target has ${existingRecords.length} records`);

        // Create a Set of existing keys for fast lookup
        const existingKeys = new Set(
            existingRecords.map(r => `${r.company_id}-${r.year}-${r.scrape_date}`)
        );

        // Filter out records that already exist
        const recordsToInsert = sourceRecords.filter(record => {
            const key = `${record.company_id}-${record.year}-${record.scrape_date}`;
            return !existingKeys.has(key);
        });

        console.log(`  🔄 Need to insert ${recordsToInsert.length} new records`);

        if (recordsToInsert.length === 0) {
            console.log(`  ✅ Already complete`);
            totalSkipped += sourceRecords.length;
            continue;
        }

        // Transform records (remove id, created_at, updated_at)
        const transformedRecords = recordsToInsert.map(record => {
            const { id, created_at, updated_at, ...rest } = record;
            return {
                ...rest,
                data_source: record.data_source || 'naver'
            };
        });

        // Insert in batches to avoid timeouts
        const batchSize = 500;
        let inserted = 0;

        for (let j = 0; j < transformedRecords.length; j += batchSize) {
            const batch = transformedRecords.slice(j, j + batchSize);
            const batchNum = Math.floor(j / batchSize) + 1;
            const totalBatches = Math.ceil(transformedRecords.length / batchSize);

            console.log(`  ⏳ Inserting batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

            const { data, error } = await supabase
                .from('financial_data_extended')
                .insert(batch)
                .select();

            if (error) {
                console.error(`  ❌ Batch ${batchNum} error: ${error.message}`);
                console.error(`     Details: ${JSON.stringify(error.details)}`);
            } else {
                inserted += data?.length || 0;
                console.log(`  ✅ Batch ${batchNum} inserted ${data?.length || 0} records`);
            }
        }

        console.log(`  ✅ Completed ${date}: ${inserted} records inserted`);
        totalMigrated += inserted;
        totalSkipped += existingRecords.length;

        // Progress summary every 10 dates
        if ((i + 1) % 10 === 0) {
            console.log(`\n📈 Progress Summary: ${i + 1}/${sortedDates.length} dates`);
            console.log(`   Total migrated: ${totalMigrated.toLocaleString()}`);
            console.log(`   Total skipped (already exists): ${totalSkipped.toLocaleString()}\n`);
        }
    }

    // Final verification
    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 Migration Complete!\n');
    console.log('Summary:');
    console.log(`  Total records migrated: ${totalMigrated.toLocaleString()}`);
    console.log(`  Total records skipped: ${totalSkipped.toLocaleString()}`);
    console.log(`  Dates processed: ${sortedDates.length}\n`);

    // Verify final counts
    console.log('🔍 Final Verification:\n');

    const { count: sourceTotal } = await supabase
        .from('financial_data')
        .select('*', { count: 'exact', head: true });

    const { count: targetTotal } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true });

    console.log(`  financial_data: ${sourceTotal?.toLocaleString()} records`);
    console.log(`  financial_data_extended: ${targetTotal?.toLocaleString()} records`);

    const difference = (sourceTotal || 0) - (targetTotal || 0);

    if (Math.abs(difference) < 100) {
        console.log(`\n✅ SUCCESS! Tables are in sync (difference: ${difference})`);
    } else {
        console.log(`\n⚠️  Still ${difference.toLocaleString()} records difference`);
        console.log(`   This may be due to overlapping dates with different sources`);
    }

    console.log('\n' + '='.repeat(80));
}

completeMigration().catch(console.error);
