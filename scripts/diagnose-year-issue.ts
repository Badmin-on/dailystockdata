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

async function diagnoseYearIssue() {
    console.log('🔍 Diagnosing Year Filter Issue\n');
    console.log('='.repeat(80) + '\n');

    // Get 필옵틱스
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

    // Check what data exists for year 2025 on each date
    const dates = ['2025-11-25', '2025-11-30'];

    for (const date of dates) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📅 Date: ${date}, Year Filter: 2025\n`);

        // Query with year filter
        const { data: records } = await supabase
            .from('financial_data_extended')
            .select('*')
            .eq('company_id', company.id)
            .eq('scrape_date', date)
            .eq('year', 2025)
            .order('data_source');

        if (!records || records.length === 0) {
            console.log('  ⚠️  NO DATA for year 2025\n');

            // Check what years ARE available
            const { data: allYears } = await supabase
                .from('financial_data_extended')
                .select('year, revenue, operating_profit, data_source')
                .eq('company_id', company.id)
                .eq('scrape_date', date)
                .order('year');

            console.log('  Available years on this date:');
            allYears?.forEach(r => {
                const rev = r.revenue ? (r.data_source === 'fnguide' ? (r.revenue / 100000000).toFixed(0) : r.revenue) : 'NULL';
                console.log(`    Year ${r.year}: Revenue ${rev}억 (${r.data_source})`);
            });
        } else {
            console.log(`  ✅ Found ${records.length} record(s) for year 2025:\n`);

            records.forEach(r => {
                const revenue = r.revenue ?
                    (r.data_source === 'fnguide' ? (r.revenue / 100000000).toFixed(0) : r.revenue) :
                    'NULL';
                const opProfit = r.operating_profit ?
                    (r.data_source === 'fnguide' ? (r.operating_profit / 100000000).toFixed(0) : r.operating_profit) :
                    'NULL';

                console.log(`    Source: ${r.data_source}`);
                console.log(`    Revenue: ${revenue}억`);
                console.log(`    Operating Profit: ${opProfit}억`);
                console.log(`    Is Estimate: ${r.is_estimate}`);
            });
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Summary:\n');
    console.log('Expected behavior:');
    console.log('  - Filter by Year 2025');
    console.log('  - Start Date (11-25): Get 2025 revenue estimate');
    console.log('  - End Date (11-30): Get 2025 revenue estimate');
    console.log('  - Compare the two values\n');

    console.log('Current issue from screenshot:');
    console.log('  - Start Value: 1300.00 (appears to be 2026 data!)');
    console.log('  - End Value: 4109.00 (appears to be 2025 data!)');
    console.log('\n' + '='.repeat(80));
}

diagnoseYearIssue().catch(console.error);
