import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function deleteAllBadNaverData() {
    console.log('잘못된 naver 데이터 대량 삭제\n');

    // 1. 먼저 확인
    const { count: badCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('data_source', 'naver')
        .lt('revenue', 100_000_000_000);  // 1000억원 미만

    console.log(`삭제 대상: ${badCount}개 레코드 (naver, 매출 < 1000억)`);

    if (!badCount || badCount === 0) {
        console.log('삭제할 데이터가 없습니다.');
        return;
    }

    // 2. 삭제 실행 (배치로)
    console.log('\n삭제 시작...');

    const batchSize = 1000;
    let totalDeleted = 0;
    let iteration = 0;

    while (iteration < 100) {  // 최대 100,000개
        // 삭제할 ID 조회
        const { data: toDelete } = await supabase
            .from('financial_data_extended')
            .select('id')
            .eq('data_source', 'naver')
            .lt('revenue', 100_000_000_000)
            .limit(batchSize);

        if (!toDelete || toDelete.length === 0) {
            break;
        }

        const ids = toDelete.map(r => r.id);

        // 삭제
        const { error } = await supabase
            .from('financial_data_extended')
            .delete()
            .in('id', ids);

        if (error) {
            console.error(`삭제 오류:`, error);
            break;
        }

        totalDeleted += ids.length;
        iteration++;
        console.log(`  ${iteration}번째 배치: ${ids.length}개 삭제 (총 ${totalDeleted}개)`);
    }

    console.log(`\n✅ 총 ${totalDeleted}개 삭제 완료`);

    // 3. 확인
    const { count: remainingCount } = await supabase
        .from('financial_data_extended')
        .select('*', { count: 'exact', head: true })
        .eq('data_source', 'naver')
        .lt('revenue', 100_000_000_000);

    console.log(`남은 잘못된 데이터: ${remainingCount}개`);
}

deleteAllBadNaverData().catch(console.error);
