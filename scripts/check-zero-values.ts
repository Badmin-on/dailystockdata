import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function deleteZeroValues() {
    console.log('0 값 데이터 삭제 시작\n');

    // 2025-11-29에 생성된 0 값 데이터 확인
    const { data: zeroData, count } = await supabase
        .from('financial_data_extended')
        .select('id, scrape_date, data_source, companies!inner(code, name)', { count: 'exact' })
        .eq('revenue', 0)
        .eq('operating_profit', 0)
        .gte('created_at', '2025-11-29T00:00:00')
        .lte('created_at', '2025-11-30T00:00:00')
        .limit(10);

    console.log(`2025-11-29에 생성된 0 값 데이터: ${count}개`);
    console.log('\n샘플 (최대 10개):');
    zeroData?.forEach(row => {
        console.log(`  ${row.companies.name} (${row.companies.code}): ${row.scrape_date} (${row.data_source})`);
    });

    console.log('\n삭제를 진행하시겠습니까?');
    console.log('이 스크립트는 확인만 합니다. 실제 삭제는 별도 스크립트로 진행하세요.');
}

deleteZeroValues().catch(console.error);
