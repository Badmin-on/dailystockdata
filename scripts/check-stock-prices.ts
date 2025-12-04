import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkStockPrices() {
    console.log('🔍 주가 데이터 확인\n');

    // daily_stock_prices 테이블 확인
    const { count } = await supabase
        .from('daily_stock_prices')
        .select('*', { count: 'exact', head: true });

    console.log(`daily_stock_prices 테이블: ${count?.toLocaleString() || 0}개 레코드\n`);

    if (count && count > 0) {
        // 날짜 범위 확인
        const { data: dates } = await supabase
            .from('daily_stock_prices')
            .select('date')
            .order('date', { ascending: false })
            .limit(1000);

        const uniqueDates = [...new Set(dates?.map(d => d.date) || [])].sort();
        console.log(`고유 날짜: ${uniqueDates.length}개`);
        console.log(`최신 날짜: ${uniqueDates[uniqueDates.length - 1]}`);
        console.log(`가장 오래된 날짜: ${uniqueDates[0]}\n`);

        // 샘플 데이터 (삼성전자)
        const { data: samsung } = await supabase
            .from('daily_stock_prices')
            .select('date, close_price, volume, companies!inner(code, name)')
            .eq('companies.code', '005930')
            .order('date', { ascending: false })
            .limit(5);

        console.log('삼성전자 최근 5일 주가:');
        samsung?.forEach(row => {
            console.log(`  ${row.date}: ${row.close_price?.toLocaleString()}원 (거래량: ${row.volume?.toLocaleString()})`);
        });
    } else {
        console.log('❌ 주가 데이터가 없습니다.');
    }
}

checkStockPrices().catch(console.error);
