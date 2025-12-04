import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAllDatesDetailed() {
    console.log('모든 날짜 상세 확인\n');

    // LIMIT 없이 모든 고유 날짜 조회
    let allDates: string[] = [];
    let page = 0;
    const pageSize = 1000;

    while (page < 200) {
        const { data, error } = await supabase
            .from('financial_data_extended')
            .select('scrape_date')
            .order('scrape_date', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error:', error);
            break;
        }
        if (!data || data.length === 0) break;

        // 중복 제거하면서 추가
        const uniqueSet = new Set(allDates);
        data.forEach(d => uniqueSet.add(d.scrape_date));
        allDates = Array.from(uniqueSet);

        console.log(`Page ${page + 1}: ${data.length}개 레코드, 누적 고유 날짜: ${allDates.length}개`);

        if (data.length < pageSize) break;
        page++;
    }

    const uniqueDates = allDates.sort().reverse();

    console.log(`\n최종 결과:`);
    console.log(`  총 고유 날짜: ${uniqueDates.length}개`);
    console.log(`\n날짜 목록 (최근 20개):`);
    uniqueDates.slice(0, 20).forEach((date, i) => {
        console.log(`  ${i + 1}. ${date}`);
    });

    if (uniqueDates.length > 20) {
        console.log(`\n  ... (총 ${uniqueDates.length}개)`);
        console.log(`\n가장 오래된 날짜: ${uniqueDates[uniqueDates.length - 1]}`);
    }
}

checkAllDatesDetailed().catch(console.error);
