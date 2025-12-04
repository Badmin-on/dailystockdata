import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkClioData() {
    console.log('클리오 (237880) 데이터 확인\n');

    // 회사 정보
    const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('code', '237880')
        .single();

    if (!company) {
        console.log('클리오를 찾을 수 없습니다.');
        return;
    }

    console.log(`Company ID: ${company.id}\n`);

    // 최근 30일 데이터
    const { data: recentData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, year, revenue, operating_profit, data_source')
        .eq('company_id', company.id)
        .eq('year', 2025)
        .order('scrape_date', { ascending: true })
        .limit(30);

    console.log('최근 데이터 (처음 10개):');
    recentData?.slice(0, 10).forEach((row, i) => {
        const rev = row.revenue / 100_000_000;
        console.log(`  ${i + 1}. ${row.scrape_date}: 매출=${rev.toFixed(0)}억 (${row.data_source})`);
    });

    console.log('\n최근 데이터 (마지막 5개):');
    recentData?.slice(-5).forEach((row, i) => {
        const rev = row.revenue / 100_000_000;
        console.log(`  ${row.scrape_date}: 매출=${rev.toFixed(0)}억 (${row.data_source})`);
    });

    // 첫 번째와 마지막 매출 비교
    if (recentData && recentData.length >= 2) {
        const first = recentData[0];
        const last = recentData[recentData.length - 1];

        console.log(`\n첫 번째: ${first.scrape_date}, 매출=${first.revenue}`);
        console.log(`마지막: ${last.scrape_date}, 매출=${last.revenue}`);

        if (first.revenue && last.revenue) {
            const change = ((last.revenue - first.revenue) / first.revenue * 100).toFixed(2);
            console.log(`변화율: ${change}%`);
        }
    }
}

checkClioData().catch(console.error);
