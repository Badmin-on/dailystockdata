
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

const { supabaseAdmin } = require('../lib/supabase');

async function diagnose() {
    console.log('🔍 Verifying Samsung Financial Data in financial_data_extended...');

    // 1. Get Company ID for Samsung
    const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('code', '005930')
        .single();

    if (!company) {
        console.error('❌ Samsung not found!');
        return;
    }

    console.log(`Samsung Company ID: ${company.id}`);

    // 2. Check financial_data_extended for naver_wise OR fnguide
    const { data: financials, error: finError } = await supabaseAdmin
        .from('financial_data_extended')
        .select('*')
        .eq('company_id', company.id)
        .gte('year', 2024)
        .in('data_source', ['naver_wise', 'fnguide'])
        .order('year');

    if (finError) {
        console.error('❌ Error fetching financials:', finError);
        return;
    }

    console.log('📊 Samsung Financials (2024+):');
    console.table(financials);
}

diagnose();
