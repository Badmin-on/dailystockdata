import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkOtherTables() {
    console.log('다른 테이블 확인\n');

    // 1. financial_data 테이블 확인
    const { data: fd, count: fdCount } = await supabase
        .from('financial_data')
        .select('scrape_date', { count: 'exact' })
        .limit(1);

    console.log('financial_data 테이블:');
    console.log(`  총 레코드: ${fdCount}개`);

    if (fdCount && fdCount > 0) {
        const { data: fdDates } = await supabase
            .from('financial_data')
            .select('scrape_date')
            .order('scrape_date', { ascending: false })
            .limit(10);

        const uniqueFdDates = [...new Set(fdDates?.map(d => d.scrape_date))];
        console.log(`  고유 날짜: ${uniqueFdDates.length}개`);
        console.log(`  최근 날짜: ${uniqueFdDates.slice(0, 5).join(', ')}`);
    }

    // 2. consensus_data 테이블 확인
    const { count: cdCount } = await supabase
        .from('consensus_data')
        .select('*', { count: 'exact', head: true });

    console.log('\nconsensus_data 테이블:');
    console.log(`  총 레코드: ${cdCount}개`);

    // 3. financial_data_extended 상세 확인
    const { data: fde } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, data_source, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\nfinancial_data_extended 최근 생성:');
    fde?.forEach(row => {
        console.log(`  ${row.created_at}: ${row.scrape_date} (${row.data_source})`);
    });
}

checkOtherTables().catch(console.error);
