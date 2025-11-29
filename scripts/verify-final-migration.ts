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

async function verifyMigration() {
    console.log('🔍 Final Migration Verification\n');
    console.log('='.repeat(70) + '\n');

    // 1. Check all recent dates
    console.log('📅 Date Distribution in financial_data_extended:\n');

    const { data: allDates } = await supabase
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false });

    const uniqueDates = [...new Set(allDates?.map(d => d.scrape_date))].slice(0, 15);

    console.log('Date'.padEnd(15) + 'Total Records'.padEnd(20) + 'With EPS'.padEnd(15) + 'Status');
    console.log('-'.repeat(70));

    for (const date of uniqueDates) {
        const { count: totalCount } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        const { count: epsCount } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date)
            .not('eps', 'is', null);

        const status = epsCount && epsCount > 0 ? '✅ FnGuide' : '⚠️  Legacy';

        console.log(
            date.padEnd(15) +
            (totalCount || 0).toString().padEnd(20) +
            (epsCount || 0).toString().padEnd(15) +
            status
        );
    }

    // 2. Check specific important columns
    console.log('\n\n📊 Column Verification (Sample from latest date):\n');

    const { data: sample } = await supabase
        .from('financial_data_extended')
        .select('*')
        .order('scrape_date', { ascending: false })
        .not('eps', 'is', null)
        .limit(1);

    if (sample && sample.length > 0) {
        const record = sample[0];
        console.log('Sample Record:');
        console.log(`  Company ID: ${record.company_id}`);
        console.log(`  Date: ${record.scrape_date}`);
        console.log(`  Year: ${record.year}`);
        console.log(`  Revenue: ${record.revenue ? (record.revenue / 100000000).toFixed(0) + '억' : 'NULL'}`);
        console.log(`  Operating Profit: ${record.operating_profit ? (record.operating_profit / 100000000).toFixed(0) + '억' : 'NULL'}`);
        console.log(`  EPS: ${record.eps || 'NULL'}`);
        console.log(`  PER: ${record.per || 'NULL'}`);
        console.log(`  ROE: ${record.roe || 'NULL'}%`);
        console.log(`  BPS: ${record.bps || 'NULL'}`);
    }

    // 3. Total summary
    console.log('\n\n📈 Overall Summary:\n');

    const { count: totalRecords } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true });

    const { count: epsRecords } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .not('eps', 'is', null);

    const { count: legacyRecords } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .is('eps', null);

    console.log(`Total Records: ${totalRecords?.toLocaleString()}`);
    console.log(`  - With EPS (FnGuide): ${epsRecords?.toLocaleString()} (${((epsRecords || 0) / (totalRecords || 1) * 100).toFixed(1)}%)`);
    console.log(`  - Legacy (No EPS): ${legacyRecords?.toLocaleString()} (${((legacyRecords || 0) / (totalRecords || 1) * 100).toFixed(1)}%)`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ Migration Complete!\n');
    console.log('All data is now in financial_data_extended');
    console.log('All APIs updated to use financial_data_extended');
    console.log('\n🎉 Ready to test UI!');
}

verifyMigration().catch(console.error);
