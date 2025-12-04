import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkSpecificDate() {
    console.log('2025-11-24 데이터 확인\n');

    // SK하이닉스 ID
    const { data: company } = await supabase
        .from('companies')
        .select('id, code, name')
        .eq('code', '000660')
        .single();

    if (!company) return;

    console.log(`${company.name} (${company.code}), ID: ${company.id}\n`);

    // 2025-11-24의 모든 데이터 확인
    const { data: nov24Data } = await supabase
        .from('financial_data_extended')
        .select('*')
        .eq('company_id', company.id)
        .eq('scrape_date', '2025-11-24')
        .eq('year', 2025);

    console.log('2025-11-24 데이터:');
    if (!nov24Data || nov24Data.length === 0) {
        console.log('  ❌ 데이터 없음!');
    } else {
        console.log(`  총 ${nov24Data.length}개 레코드`);
        nov24Data.forEach(row => {
            const rev = row.revenue / 100_000_000;
            const op = row.operating_profit / 100_000_000;
            console.log(`  ${row.data_source}: 매출=${rev.toFixed(0)}억, 영익=${op.toFixed(0)}억`);
        });
    }

    // 2025-11-24 전후 날짜 확인
    console.log('\n\n2025-11-24 전후 날짜:');
    const { data: nearbyDates } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, data_source, revenue, operating_profit')
        .eq('company_id', company.id)
        .eq('year', 2025)
        .gte('scrape_date', '2025-11-20')
        .lte('scrape_date', '2025-11-28')
        .order('scrape_date', { ascending: true });

    nearbyDates?.forEach(row => {
        const rev = row.revenue / 100_000_000;
        const op = row.operating_profit / 100_000_000;
        console.log(`  ${row.scrape_date} (${row.data_source}): 매출=${rev.toFixed(0)}억, 영익=${op.toFixed(0)}억`);
    });

    // 삼성전자와 비교
    console.log('\n\n삼성전자 2025-11-24 데이터:');
    const { data: samsungCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('code', '005930')
        .single();

    if (samsungCompany) {
        const { data: samsungData } = await supabase
            .from('financial_data_extended')
            .select('data_source, revenue, operating_profit')
            .eq('company_id', samsungCompany.id)
            .eq('scrape_date', '2025-11-24')
            .eq('year', 2025);

        if (samsungData && samsungData.length > 0) {
            samsungData.forEach(row => {
                const rev = row.revenue / 100_000_000;
                const op = row.operating_profit / 100_000_000;
                console.log(`  ${row.data_source}: 매출=${rev.toFixed(0)}억, 영익=${op.toFixed(0)}억`);
            });
        } else {
            console.log('  데이터 없음');
        }
    }
}

checkSpecificDate().catch(console.error);
