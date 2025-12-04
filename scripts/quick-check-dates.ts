import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
    // 전체 데이터에서 고유 날짜 가져오기 (limit 없이)
    let allDates: string[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data } = await supabase
            .from('financial_data_extended')
            .select('scrape_date')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (!data || data.length === 0) break;

        data.forEach(d => allDates.push(d.scrape_date));

        if (data.length < pageSize) break;
        page++;
    }

    const uniqueDates = [...new Set(allDates)].sort();

    console.log('총 날짜 수:', uniqueDates.length);
    console.log('최신 날짜:', uniqueDates[uniqueDates.length - 1]);
    console.log('가장 오래된 날짜:', uniqueDates[0]);

    const latest = new Date(uniqueDates[uniqueDates.length - 1]);
    const oldest = new Date(uniqueDates[0]);
    const rangeDays = (latest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24);

    console.log(`\n데이터 범위: ${rangeDays.toFixed(0)}일 (${(rangeDays / 30).toFixed(1)}개월)`);
    console.log('\n비교 가능 여부:');
    console.log('- 전일:', uniqueDates.length >= 2 ? '✅' : '❌');
    console.log('- 1개월:', rangeDays >= 30 ? '✅' : '❌');
    console.log('- 3개월:', rangeDays >= 90 ? '✅' : '❌');
    console.log('- 1년:', rangeDays >= 365 ? '✅' : '❌');

    console.log('\n최근 10개 날짜:');
    uniqueDates.slice(-10).forEach(d => console.log(`  - ${d}`));
}

main().catch(console.error);
