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

async function quickVerify() {
    console.log('🔍 Quick Verification of Fixed Data\n');

    // Get 필옵틱스 data
    const { data: company } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', '%필옵틱스%')
        .single();

    if (!company) {
        console.log('❌ Company not found');
        return;
    }

    console.log(`Company: ${company.name} (Code: ${company.code})\n`);

    // Check latest FnGuide data
    const { data: fnguideData } = await supabase
        .from('financial_data_extended')
        .select('*')
        .eq('company_id', company.id)
        .eq('data_source', 'fnguide')
        .order('scrape_date', { ascending: false })
        .limit(10);

    if (!fnguideData || fnguideData.length === 0) {
        console.log('❌ No FnGuide data');
        return;
    }

    console.log('Latest FnGuide Data:\n');
    console.log('Date'.padEnd(15) + 'Year'.padEnd(10) + 'Revenue'.padEnd(15) + 'OpProfit'.padEnd(15) + 'Estimate');
    console.log('-'.repeat(70));

    fnguideData.forEach(r => {
        const revenue = r.revenue ? (r.revenue / 100000000).toFixed(0) : 'NULL';
        const opProfit = r.operating_profit ? (r.operating_profit / 100000000).toFixed(0) : 'NULL';

        console.log(
            r.scrape_date.padEnd(15) +
            r.year.toString().padEnd(10) +
            `${revenue}억`.padEnd(15) +
            `${opProfit}억`.padEnd(15) +
            (r.is_estimate ? 'Yes' : 'No')
        );
    });

    // Check Naver data for comparison
    const { data: naverData } = await supabase
        .from('financial_data_extended')
        .select('*')
        .eq('company_id', company.id)
        .eq('data_source', 'naver')
        .eq('scrape_date', '2025-11-25')
        .order('year');

    console.log('\n\nNaver Data (2025-11-25) for comparison:\n');
    console.log('Year'.padEnd(10) + 'Revenue'.padEnd(15) + 'OpProfit');
    console.log('-'.repeat(40));

    naverData?.forEach(r => {
        const revenue = r.revenue ? r.revenue.toFixed(0) : 'NULL';
        const opProfit = r.operating_profit ? r.operating_profit.toFixed(0) : 'NULL';

        console.log(
            r.year.toString().padEnd(10) +
            `${revenue}억`.padEnd(15) +
            `${opProfit}억`
        );
    });

    console.log('\n✅ Verification complete!');

    // Final check
    const { count: totalFnguide } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('data_source', 'fnguide');

    console.log(`\nTotal FnGuide records: ${totalFnguide?.toLocaleString()}`);
}

quickVerify().catch(console.error);
