import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fixSKHynixData() {
    console.log('SK하이닉스 데이터 수정\n');

    // 1. SK하이닉스 ID
    const { data: company } = await supabase
        .from('companies')
        .select('id, code, name')
        .eq('code', '000660')
        .single();

    if (!company) {
        console.log('SK하이닉스를 찾을 수 없습니다.');
        return;
    }

    console.log(`${company.name} (${company.code}), ID: ${company.id}\n`);

    // 2. 문제가 있는 naver 데이터 삭제 (revenue < 1000억원인 경우)
    console.log('잘못된 naver 데이터 삭제 중...');

    const { data: badData, error: selectError } = await supabase
        .from('financial_data_extended')
        .select('id, scrape_date, revenue, operating_profit, data_source')
        .eq('company_id', company.id)
        .eq('data_source', 'naver')
        .eq('year', 2025)
        .lt('revenue', 100_000_000_000); // 1000억원 미만

    if (selectError) {
        console.error('Error:', selectError);
        return;
    }

    console.log(`발견된 잘못된 데이터: ${badData?.length}개`);
    badData?.slice(0, 10).forEach(row => {
        const rev = row.revenue / 100_000_000;
        console.log(`  ${row.scrape_date}: ${rev.toFixed(0)}억원`);
    });

    if (badData && badData.length > 0) {
        const ids = badData.map(row => row.id);

        console.log(`\n${ids.length}개 레코드 삭제 중...`);

        const { error: deleteError } = await supabase
            .from('financial_data_extended')
            .delete()
            .in('id', ids);

        if (deleteError) {
            console.error('삭제 실패:', deleteError);
        } else {
            console.log(`✅ ${ids.length}개 레코드 삭제 완료`);
        }
    }

    // 3. financial_data에서 정상 데이터 확인
    console.log('\n\nfinancial_data에서 정상 데이터 확인...');

    const { data: goodData } = await supabase
        .from('financial_data')
        .select('scrape_date, year, revenue, operating_profit')
        .eq('company_id', company.id)
        .eq('year', 2025)
        .order('scrape_date', { ascending: false })
        .limit(10);

    console.log('\nfinancial_data의 SK하이닉스 데이터:');
    goodData?.forEach(row => {
        const rev = row.revenue / 100_000_000;
        const op = row.operating_profit / 100_000_000;
        console.log(`  ${row.scrape_date}: 매출=${rev.toFixed(0)}억, 영익=${op.toFixed(0)}억`);
    });
}

fixSKHynixData().catch(console.error);
