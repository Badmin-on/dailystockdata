import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkBothTables() {
    const output: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        output.push(msg);
    };

    log('=== 두 테이블 비교 ===\n');

    // 1. financial_data 테이블 확인
    log('1. financial_data 테이블:');
    const { data: fdDates, count: fdCount } = await supabase
        .from('financial_data')
        .select('scrape_date', { count: 'exact' })
        .order('scrape_date', { ascending: false })
        .limit(2000);

    const fdUniqueDates = [...new Set(fdDates?.map(d => d.scrape_date) || [])];
    log(`   총 레코드: ${fdCount}개`);
    log(`   고유 날짜: ${fdUniqueDates.length}개`);
    if (fdUniqueDates.length > 0) {
        log(`   최신: ${fdUniqueDates[0]}`);
        log(`   가장 오래된: ${fdUniqueDates[fdUniqueDates.length - 1]}`);
    }

    // 2. financial_data_extended 테이블 확인
    log('\n2. financial_data_extended 테이블:');
    const { data: fdeDates, count: fdeCount } = await supabase
        .from('financial_data_extended')
        .select('scrape_date', { count: 'exact' })
        .order('scrape_date', { ascending: false })
        .limit(2000);

    const fdeUniqueDates = [...new Set(fdeDates?.map(d => d.scrape_date) || [])];
    log(`   총 레코드: ${fdeCount}개`);
    log(`   고유 날짜: ${fdeUniqueDates.length}개`);
    if (fdeUniqueDates.length > 0) {
        log(`   최신: ${fdeUniqueDates[0]}`);
        log(`   가장 오래된: ${fdeUniqueDates[fdeUniqueDates.length - 1]}`);
    }

    // 3. 비교
    log('\n3. 결론:');
    if (fdUniqueDates.length > fdeUniqueDates.length) {
        log(`   ❌ 마이그레이션 불완전!`);
        log(`   financial_data: ${fdUniqueDates.length}개 날짜`);
        log(`   financial_data_extended: ${fdeUniqueDates.length}개 날짜`);
        log(`   누락: ${fdUniqueDates.length - fdeUniqueDates.length}개 날짜`);
    } else if (fdeUniqueDates.length > fdUniqueDates.length) {
        log(`   ✅ extended 테이블에 더 많은 데이터`);
    } else if (fdUniqueDates.length === 0 && fdeUniqueDates.length === 0) {
        log(`   ❌ 두 테이블 모두 비어있음!`);
    } else {
        log(`   ✅ 날짜 수 동일: ${fdUniqueDates.length}개`);
    }

    fs.writeFileSync('table-comparison-result.txt', output.join('\n'));
    log('\n결과가 table-comparison-result.txt에 저장되었습니다.');
}

checkBothTables().catch(console.error);
