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

async function compareSchemas() {
    console.log('🔍 Comparing table schemas...\n');

    // Get sample records from both tables
    const { data: mainData } = await supabase
        .from('financial_data')
        .select('*')
        .limit(1);

    const { data: extendedData } = await supabase
        .from('financial_data_extended')
        .select('*')
        .limit(1);

    if (!mainData || mainData.length === 0) {
        console.log('❌ No data in financial_data table');
        return;
    }

    if (!extendedData || extendedData.length === 0) {
        console.log('❌ No data in financial_data_extended table');
        return;
    }

    const mainColumns = Object.keys(mainData[0]).sort();
    const extendedColumns = Object.keys(extendedData[0]).sort();

    console.log('📊 financial_data columns:');
    console.log(mainColumns.join(', '));
    console.log(`\nTotal: ${mainColumns.length} columns\n`);

    console.log('📊 financial_data_extended columns:');
    console.log(extendedColumns.join(', '));
    console.log(`\nTotal: ${extendedColumns.length} columns\n`);

    // Find differences
    const onlyInMain = mainColumns.filter(col => !extendedColumns.includes(col));
    const onlyInExtended = extendedColumns.filter(col => !mainColumns.includes(col));
    const common = mainColumns.filter(col => extendedColumns.includes(col));

    console.log('✅ Common columns:', common.length);
    console.log(common.join(', '));

    console.log('\n❌ Only in financial_data:', onlyInMain.length);
    if (onlyInMain.length > 0) {
        console.log(onlyInMain.join(', '));
    }

    console.log('\n❌ Only in financial_data_extended:', onlyInExtended.length);
    if (onlyInExtended.length > 0) {
        console.log(onlyInExtended.join(', '));
    }

    console.log('\n💡 Migration Strategy:');
    console.log('Only migrate columns that exist in BOTH tables:');
    console.log(common.join(', '));
}

compareSchemas().catch(console.error);
