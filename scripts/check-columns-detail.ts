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

async function checkColumnsDetail() {
    console.log('🔍 Detailed Column Check\n');

    // Get sample records
    const { data: mainData } = await supabase
        .from('financial_data')
        .select('*')
        .limit(1);

    const { data: extendedData } = await supabase
        .from('financial_data_extended')
        .select('*')
        .limit(1);

    if (!mainData?.[0] || !extendedData?.[0]) {
        console.log('❌ No data available');
        return;
    }

    const mainCols = Object.keys(mainData[0]).sort();
    const extCols = Object.keys(extendedData[0]).sort();

    console.log('📊 financial_data columns:');
    console.log(mainCols.join(', '));

    console.log('\n📊 financial_data_extended columns:');
    console.log(extCols.join(', '));

    // Check important columns
    const importantCols = ['eps', 'per', 'roe', 'pbr', 'bps', 'revenue', 'operating_profit', 'net_income'];

    console.log('\n🎯 Important Columns Check:\n');
    console.log('Column'.padEnd(20) + 'financial_data'.padEnd(20) + 'financial_data_extended');
    console.log('-'.repeat(60));

    importantCols.forEach(col => {
        const inMain = mainCols.includes(col) ? '✅' : '❌';
        const inExt = extCols.includes(col) ? '✅' : '❌';
        console.log(col.padEnd(20) + inMain.padEnd(20) + inExt);
    });

    // Sample data values
    console.log('\n📈 Sample Data Values (financial_data):');
    const sample = mainData[0];
    console.log(`  EPS: ${sample.eps}`);
    console.log(`  PER: ${sample.per}`);
    console.log(`  ROE: ${sample.roe}`);
    console.log(`  Revenue: ${sample.revenue}`);
    console.log(`  Operating Profit: ${sample.operating_profit}`);

    console.log('\n📈 Sample Data Values (financial_data_extended):');
    const extSample = extendedData[0];
    console.log(`  EPS: ${extSample.eps}`);
    console.log(`  PER: ${extSample.per}`);
    console.log(`  ROE: ${extSample.roe}`);
    console.log(`  BPS: ${extSample.bps || 'NULL'}`);
    console.log(`  Revenue: ${extSample.revenue}`);
    console.log(`  Operating Profit: ${extSample.operating_profit}`);
}

checkColumnsDetail().catch(console.error);
