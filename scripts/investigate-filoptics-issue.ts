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

async function investigateDateComparison() {
    console.log('🔍 Investigating Date Comparison Issue\n');
    console.log('Company: 필옵틱스 (FilOptics)\n');
    console.log('='.repeat(80) + '\n');

    // Find 필옵틱스 company
    const { data: company } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', '%필옵틱스%')
        .single();

    if (!company) {
        console.log('❌ Company not found');
        return;
    }

    console.log(`Company: ${company.name} (ID: ${company.id}, Code: ${company.code})\n`);

    // Check data for 11-25 and 11-29
    const dates = ['2025-11-25', '2025-11-29'];

    for (const date of dates) {
        console.log(`📅 Date: ${date}\n`);

        const { data: records } = await supabase
            .from('financial_data_extended')
            .select('*')
            .eq('company_id', company.id)
            .eq('scrape_date', date)
            .order('year', { ascending: true });

        if (!records || records.length === 0) {
            console.log('  ⚠️  No data\n');
            continue;
        }

        console.log('  Year'.padEnd(10) + 'Revenue'.padEnd(15) + 'OpProfit'.padEnd(15) + 'Data Source'.padEnd(15) + 'Is Estimate');
        console.log('  ' + '-'.repeat(70));

        records.forEach(r => {
            const revenue = r.revenue ?
                (r.data_source === 'fnguide' ? (r.revenue / 100000000).toFixed(0) : r.revenue) :
                'NULL';
            const opProfit = r.operating_profit ?
                (r.data_source === 'fnguide' ? (r.operating_profit / 100000000).toFixed(0) : r.operating_profit) :
                'NULL';

            console.log(
                `  ${r.year}`.padEnd(10) +
                `${revenue}억`.padEnd(15) +
                `${opProfit}억`.padEnd(15) +
                `${r.data_source}`.padEnd(15) +
                `${r.is_estimate ? 'Yes' : 'No'}`
            );
        });

        console.log();
    }

    // Now check what the API would return
    console.log('🔍 What API would return for year=2025:\n');

    const { data: nov25 } = await supabase
        .from('financial_data_extended')
        .select('*')
        .eq('company_id', company.id)
        .eq('scrape_date', '2025-11-25')
        .eq('year', 2025)
        .single();

    const { data: nov29 } = await supabase
        .from('financial_data_extended')
        .select('*')
        .eq('company_id', company.id)
        .eq('scrape_date', '2025-11-29')
        .eq('year', 2025)
        .single();

    console.log('Nov 25, 2025 data:');
    if (nov25) {
        const rev25 = nov25.data_source === 'fnguide' ? (nov25.revenue / 100000000) : nov25.revenue;
        console.log(`  Revenue: ${rev25}억 (source: ${nov25.data_source}, is_estimate: ${nov25.is_estimate})`);
    } else {
        console.log('  ❌ No data for year 2025');
    }

    console.log('\nNov 29, 2025 data:');
    if (nov29) {
        const rev29 = nov29.data_source === 'fnguide' ? (nov29.revenue / 100000000) : nov29.revenue;
        console.log(`  Revenue: ${rev29}억 (source: ${nov29.data_source}, is_estimate: ${nov29.is_estimate})`);
    } else {
        console.log('  ❌ No data for year 2025');
    }

    console.log('\n' + '='.repeat(80));
}

investigateDateComparison().catch(console.error);
