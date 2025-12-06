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

async function checkConsensusMetricDaily() {
    console.log('🔍 consensus_metric_daily 테이블 데이터 확인\n');

    // 1. 최근 날짜 및 데이터 개수 확인
    console.log('📊 1. 최근 snapshot_date 목록:');
    const { data: recentDates, error: dateError } = await supabase
        .from('consensus_metric_daily')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(100);

    if (dateError) {
        console.error('❌ 에러:', dateError);
        return;
    }

    const uniqueDates = [...new Set(recentDates?.map(d => d.snapshot_date))];
    console.log('최근 10개 날짜:', uniqueDates.slice(0, 10));

    // 2. 각 날짜별 데이터 개수 상세 확인
    console.log('\n📈 2. 날짜별 데이터 분포:');
    for (const date of uniqueDates.slice(0, 10)) {
        const { count } = await supabase
            .from('consensus_metric_daily')
            .select('*', { count: 'exact', head: true })
            .eq('snapshot_date', date);
        console.log(`  ${date}: ${count}개 레코드`);
    }

    // 3. target_y1, target_y2 조합 확인
    console.log('\n🎯 3. target_y1, target_y2 조합 확인 (최신 날짜 기준):');
    const latestDate = uniqueDates[0];
    const { data: yearCombos } = await supabase
        .from('consensus_metric_daily')
        .select('target_y1, target_y2')
        .eq('snapshot_date', latestDate);

    if (yearCombos) {
        const comboCounts: Record<string, number> = {};
        yearCombos.forEach(row => {
            const key = `${row.target_y1}-${row.target_y2}`;
            comboCounts[key] = (comboCounts[key] || 0) + 1;
        });
        console.log(`  최신 날짜 (${latestDate}) 데이터:`, comboCounts);
    }

    // 4. 11-27 이후 날짜 확인
    console.log('\n📅 4. 2025-11-27 이후 날짜 데이터 확인:');
    const targetDates = ['2025-11-27', '2025-11-28', '2025-11-29', '2025-11-30', '2025-12-01', '2025-12-02', '2025-12-03', '2025-12-04', '2025-12-05', '2025-12-06'];
    for (const date of targetDates) {
        const { count, error } = await supabase
            .from('consensus_metric_daily')
            .select('*', { count: 'exact', head: true })
            .eq('snapshot_date', date);

        if (error) {
            console.log(`  ${date}: ❌ 에러 - ${error.message}`);
        } else {
            console.log(`  ${date}: ${count || 0}개 레코드`);
        }
    }

    // 5. calc_status 확인
    console.log('\n🔎 5. calc_status 분포 (최신 날짜):');
    const { data: statusData } = await supabase
        .from('consensus_metric_daily')
        .select('calc_status')
        .eq('snapshot_date', latestDate);

    if (statusData) {
        const statusCounts: Record<string, number> = {};
        statusData.forEach(row => {
            statusCounts[row.calc_status] = (statusCounts[row.calc_status] || 0) + 1;
        });
        console.log(`  calc_status 분포:`, statusCounts);
    }

    // 6. 2025년 데이터가 포함된 조합 확인 (2024-2025, 2025-2026)
    console.log('\n📊 6. 연도 조합별 데이터 확인 (최신 10개 날짜):');
    for (const date of uniqueDates.slice(0, 5)) {
        const { count: count2024_2025 } = await supabase
            .from('consensus_metric_daily')
            .select('*', { count: 'exact', head: true })
            .eq('snapshot_date', date)
            .eq('target_y1', 2024)
            .eq('target_y2', 2025);

        const { count: count2025_2026 } = await supabase
            .from('consensus_metric_daily')
            .select('*', { count: 'exact', head: true })
            .eq('snapshot_date', date)
            .eq('target_y1', 2025)
            .eq('target_y2', 2026);

        console.log(`  ${date}: 2024-2025=${count2024_2025}개, 2025-2026=${count2025_2026}개`);
    }

    console.log('\n✅ 확인 완료!');
}

checkConsensusMetricDaily().catch(console.error);
