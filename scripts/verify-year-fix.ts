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

async function verifyFinal() {
    console.log('🔍 Final Verification\n');

    // Get 필옵틱스
    const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('code', '161580')
        .single();

    console.log(`Company: ${company.name}\n`);

    // Check latest FnGuide data
    const { data: fnData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, operating_profit, data_source, is_estimate')
        .eq('company_id', company.id)
        .eq('data_source', 'fnguide')
        .order('scrape_date', { ascending: false })
        .order('year', { ascending: true })
        .limit(10);

    console.log('FnGuide Data (Latest):');
    console.log('Date\t\tYear\tRevenue\t\tEstimate');
    console.log('-'.repeat(60));
    fnData?.forEach(r => {
        const rev = (r.revenue / 100000000).toFixed(0);
        console.log(`${r.scrape_date}\t${r.year}\t${rev}억\t\t${r.is_estimate ? 'Yes' : 'No'}`);
    });

    // Check Naver data
    const { data: naverData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, operating_profit, data_source')
        .eq('company_id', company.id)
        .eq('data_source', 'naver')
        .eq('scrape_date', '2025-11-25')
        .order('year');

    console.log('\nNaver Data (2025-11-25):');
    console.log('Year\tRevenue');
    console.log('-'.repeat(30));
    naverData?.forEach(r => {
        console.log(`${r.year}\t${r.revenue}억`);
    });

    console.log('\n✅ Comparison:');
    console.log('Expected: FnGuide 2024 = Naver 2024 (4109억)');
    const fnGuide2024 = fnData?.find(r => r.year === 2024);
    const naver2024 = naverData?.find(r => r.year === 2024);

    if (fnGuide2024 && naver2024) {
        const fnRev = (fnGuide2024.revenue / 100000000).toFixed(0);
        const match = fnRev === naver2024.revenue.toString();
        console.log(`Actual: FnGuide 2024 = ${fnRev}억, Naver 2024 = ${naver2024.revenue}억`);
        console.log(match ? '✅ MATCH!' : '❌ MISMATCH!');
    }
}

verifyFinal().catch(console.error);
