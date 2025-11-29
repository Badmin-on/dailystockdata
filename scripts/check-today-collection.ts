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

async function checkTodayCollection() {
    console.log('🔍 오늘 데이터 수집 상태 확인...\n');

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    console.log(`오늘 날짜: ${today}`);
    console.log(`어제 날짜: ${yesterday}\n`);

    // 1. 오늘 financial_data 확인
    const { data: todayFinData, count: todayFinCount } = await supabase
        .from('financial_data')
        .select('*', { count: 'exact' })
        .eq('scrape_date', today);

    console.log(`📊 오늘(${today}) financial_data: ${todayFinCount || 0}개`);

    if (todayFinCount && todayFinCount > 0) {
        console.log('✅ 오늘 데이터 수집 완료!');
        console.log('샘플 데이터:', todayFinData?.slice(0, 3));
    } else {
        console.log('❌ 오늘 데이터 없음');
    }

    // 2. 어제 데이터 확인
    const { count: yesterdayFinCount } = await supabase
        .from('financial_data')
        .select('*', { count: 'exact', head: true })
        .eq('scrape_date', yesterday);

    console.log(`\n📊 어제(${yesterday}) financial_data: ${yesterdayFinCount || 0}개`);

    // 3. 최근 5일간 데이터 확인
    console.log('\n📅 최근 5일간 데이터:');
    for (let i = 0; i < 5; i++) {
        const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        const { count } = await supabase
            .from('financial_data')
            .select('*', { count: 'exact', head: true })
            .eq('scrape_date', date);
        console.log(`  ${date}: ${count || 0}개`);
    }

    // 4. 현재 실행 중인 수집 작업 확인 (로그 테이블이 있다면)
    console.log('\n🔄 수집 작업 실행 이력 확인...');
    const { data: logs } = await supabase
        .from('collection_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logs && logs.length > 0) {
        console.log('최근 수집 로그:');
        logs.forEach(log => {
            console.log(`  ${log.created_at}: ${log.status} - ${log.message}`);
        });
    } else {
        console.log('  (collection_logs 테이블 없음 또는 데이터 없음)');
    }

    console.log('\n✅ 확인 완료!');
}

checkTodayCollection().catch(console.error);
