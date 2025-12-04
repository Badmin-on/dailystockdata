import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkCompanyData() {
    console.log('SK하이닉스 (000660) 데이터 확인\n');

    // SK하이닉스 company_id 찾기
    const { data: company } = await supabase
        .from('companies')
        .select('id, code, name')
        .eq('code', '000660')
        .single();

    if (!company) {
        console.log('SK하이닉스를 찾을 수 없습니다.');
        return;
    }

    console.log(`Company ID: ${company.id}, Name: ${company.name}\n`);

    // 2025년 데이터 확인
    const { data: data2025 } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, operating_profit, data_source')
        .eq('company_id', company.id)
        .eq('year', 2025)
        .order('scrape_date', { ascending: false });

    console.log('2025년 데이터:');
    console.log(`총 ${data2025?.length}개 레코드\n`);

    data2025?.forEach(row => {
        console.log(`${row.scrape_date} (${row.data_source}): 매출=${(row.revenue / 100_000_000).toFixed(0)}억, 영익=${(row.operating_profit / 100_000_000).toFixed(0)}억`);
    });

    // 비교 날짜들 확인
    const comparisonDates = ['2025-12-03', '2025-11-24', '2025-11-04', '2025-09-05', '2025-07-09'];

    console.log('\n\n비교 날짜별 데이터:');
    for (const date of comparisonDates) {
        const { data } = await supabase
            .from('financial_data_extended')
            .select('scrape_date, year, revenue, operating_profit, data_source')
            .eq('company_id', company.id)
            .eq('year', 2025)
            .eq('scrape_date', date);

        console.log(`\n${date}:`);
        if (data && data.length > 0) {
            data.forEach(row => {
                console.log(`  ${row.data_source}: 매출=${(row.revenue / 100_000_000).toFixed(0)}억, 영익=${(row.operating_profit / 100_000_000).toFixed(0)}억`);
            });
        } else {
            console.log('  ❌ 데이터 없음');
        }
    }

    // 삼성전자와 비교
    console.log('\n\n삼성전자 (005930) 비교:');
    const { data: samsungCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('code', '005930')
        .single();

    if (samsungCompany) {
        const { data: samsungData } = await supabase
            .from('financial_data_extended')
            .select('scrape_date, year, revenue, data_source')
            .eq('company_id', samsungCompany.id)
            .eq('year', 2025)
            .in('scrape_date', comparisonDates)
            .order('scrape_date', { ascending: false });

        samsungData?.forEach(row => {
            console.log(`${row.scrape_date} (${row.data_source}): 매출=${(row.revenue / 100_000_000).toFixed(0)}억`);
        });
    }
}

checkCompanyData().catch(console.error);
