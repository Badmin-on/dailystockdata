import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function investigateDataLoss() {
    console.log('데이터 손실 원인 조사\n');

    // 1. financial_data_extended의 created_at 확인
    const { data: fdeData } = await supabase
        .from('financial_data_extended')
        .select('scrape_date, data_source, created_at')
        .order('created_at', { ascending: true })
        .limit(10);

    console.log('financial_data_extended 가장 오래된 데이터:');
    fdeData?.forEach(row => {
        console.log(`  ${row.created_at}: ${row.scrape_date} (${row.data_source})`);
    });

    // 2. 테이블 생성 시간 추정
    const { data: oldest } = await supabase
        .from('financial_data_extended')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

    console.log(`\n테이블 데이터 최초 생성: ${oldest?.created_at}`);

    // 3. GitHub Actions 로그 확인을 위한 스크립트 실행 시간
    const now = new Date();
    console.log(`현재 시간: ${now.toISOString()}`);

    // 4. 자동 수집 스크립트가 TRUNCATE를 하는지 확인
    console.log('\n자동 수집 스크립트 확인 필요:');
    console.log('  - scripts/scrape-all-fnguide.ts');
    console.log('  - .github/workflows/stock-data-cron.yml');
}

investigateDataLoss().catch(console.error);
