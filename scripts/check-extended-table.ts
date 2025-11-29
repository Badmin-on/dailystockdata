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

async function checkExtendedTable() {
    console.log('🔍 financial_data_extended 테이블 확인...\n');

    // Check if table exists and has data
    const { data: extendedData, error: extError, count } = await supabase
        .from('financial_data_extended')
        .select('scrape_date', { count: 'exact' })
        .order('scrape_date', { ascending: false })
        .limit(10);

    if (extError) {
        console.error('❌ 에러:', extError.message);
        console.log('테이블이 존재하지 않거나 접근 불가');
        return;
    }

    console.log(`📊 총 레코드: ${count}개\n`);

    const uniqueDates = [...new Set(extendedData?.map(d => d.scrape_date))];
    console.log('최근 날짜들:', uniqueDates);

    // 26-28일 데이터 확인
    console.log('\n🎯 11월 26-28일 데이터:');
    const targetDates = ['2025-11-26', '2025-11-27', '2025-11-28'];

    for (const date of targetDates) {
        const { count: dateCount } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        console.log(`  ${date}: ${dateCount || 0}개`);
    }

    // financial_data와 비교
    console.log('\n📊 financial_data vs financial_data_extended:');
    for (const date of ['2025-11-25', '2025-11-26', '2025-11-27', '2025-11-28']) {
        const { count: normalCount } = await supabase
            .from('financial_data')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        const { count: extCount } = await supabase
            .from('financial_data_extended')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);

        console.log(`  ${date}:`);
        console.log(`    - financial_data: ${normalCount || 0}개`);
        console.log(`    - financial_data_extended: ${extCount || 0}개`);
    }
}

checkExtendedTable().catch(console.error);
