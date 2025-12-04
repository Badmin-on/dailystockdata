import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAllZeroValues() {
    console.log('모든 0 값 데이터 확인\n');

    // 모든 0 값 데이터
    const { data: zeroData, count } = await supabase
        .from('financial_data_extended')
        .select('id, scrape_date, data_source, created_at, companies!inner(code, name)', { count: 'exact' })
        .eq('revenue', 0)
        .eq('operating_profit', 0)
        .eq('data_source', 'naver')
        .limit(20);

    console.log(`총 0 값 데이터 (naver): ${count}개`);
    console.log('\n샘플 (최대 20개):');
    zeroData?.forEach(row => {
        console.log(`  ${row.companies.name} (${row.companies.code}): ${row.scrape_date}, 생성: ${row.created_at}`);
    });

    // SK하이닉스만 확인
    const { data: skhynix } = await supabase
        .from('companies')
        .select('id')
        .eq('code', '000660')
        .single();

    if (skhynix) {
        const { data: skZero, count: skCount } = await supabase
            .from('financial_data_extended')
            .select('scrape_date, created_at', { count: 'exact' })
            .eq('company_id', skhynix.id)
            .eq('revenue', 0)
            .eq('operating_profit', 0)
            .eq('data_source', 'naver');

        console.log(`\nSK하이닉스 0 값 데이터: ${skCount}개`);
        skZero?.forEach(row => {
            console.log(`  ${row.scrape_date}: ${row.created_at}`);
        });
    }
}

checkAllZeroValues().catch(console.error);
