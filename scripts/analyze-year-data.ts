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

async function analyzeYearData() {
    console.log('🔍 연도별/날짜별 데이터 분석\n');

    // 1. 11-27에 있었던 연도 조합 확인
    console.log('📊 1. 2025-11-27 날짜의 financial_data_extended 연도 분포:');
    const { data: data1127 } = await supabase
        .from('financial_data_extended')
        .select('year, company_id')
        .eq('scrape_date', '2025-11-27');

    if (data1127) {
        const yearCounts: Record<number, number> = {};
        data1127.forEach(row => {
            yearCounts[row.year] = (yearCounts[row.year] || 0) + 1;
        });
        console.log('  11-27 연도 분포:', yearCounts);
    }

    // 2. 12-06에 있는 연도 조합 확인  
    console.log('\n📊 2. 2025-12-06 날짜의 financial_data_extended 연도 분포:');
    const { data: data1206 } = await supabase
        .from('financial_data_extended')
        .select('year, company_id, data_source')
        .eq('scrape_date', '2025-12-06');

    if (data1206) {
        const yearCounts: Record<number, number> = {};
        const sourceYearCounts: Record<string, Record<number, number>> = {};
        data1206.forEach(row => {
            yearCounts[row.year] = (yearCounts[row.year] || 0) + 1;
            if (!sourceYearCounts[row.data_source]) {
                sourceYearCounts[row.data_source] = {};
            }
            sourceYearCounts[row.data_source][row.year] = (sourceYearCounts[row.data_source][row.year] || 0) + 1;
        });
        console.log('  12-06 연도 분포:', yearCounts);
        console.log('  소스별 연도 분포:', sourceYearCounts);
    }

    // 3. data_source별 최신 데이터 확인
    console.log('\n📊 3. 최근 날짜별 data_source 분포:');
    const dates = ['2025-12-06', '2025-12-05', '2025-12-04', '2025-12-03', '2025-11-30', '2025-11-28', '2025-11-27'];
    for (const date of dates) {
        const { data } = await supabase
            .from('financial_data_extended')
            .select('data_source')
            .eq('scrape_date', date);

        if (data && data.length > 0) {
            const sourceCounts: Record<string, number> = {};
            data.forEach(row => {
                sourceCounts[row.data_source] = (sourceCounts[row.data_source] || 0) + 1;
            });
            console.log(`  ${date}:`, sourceCounts);
        } else {
            console.log(`  ${date}: 데이터 없음`);
        }
    }

    // 4. 2024, 2025, 2026 연도 데이터가 모두 있는 회사 수
    console.log('\n📊 4. 연도별 페어 가진 회사 수 (최신 날짜):');

    const { data: allCompanyData } = await supabase
        .from('financial_data_extended')
        .select('company_id, year, eps, per')
        .in('year', [2024, 2025, 2026])
        .order('scrape_date', { ascending: false });

    if (allCompanyData) {
        const companyYears = new Map<number, Set<number>>();
        const companyEpsPerStatus = new Map<number, { hasEps: Record<number, boolean>, hasPer: Record<number, boolean> }>();

        allCompanyData.forEach(row => {
            if (!companyYears.has(row.company_id)) {
                companyYears.set(row.company_id, new Set());
                companyEpsPerStatus.set(row.company_id, { hasEps: {}, hasPer: {} });
            }
            companyYears.get(row.company_id)!.add(row.year);
            const status = companyEpsPerStatus.get(row.company_id)!;
            if (row.eps !== null) status.hasEps[row.year] = true;
            if (row.per !== null) status.hasPer[row.year] = true;
        });

        let has2024_2025 = 0;
        let has2025_2026 = 0;
        let has2024_2025_withEps = 0;
        let has2025_2026_withEps = 0;

        for (const [companyId, years] of companyYears) {
            if (years.has(2024) && years.has(2025)) has2024_2025++;
            if (years.has(2025) && years.has(2026)) has2025_2026++;

            const status = companyEpsPerStatus.get(companyId)!;
            if (status.hasEps[2024] && status.hasEps[2025]) has2024_2025_withEps++;
            if (status.hasEps[2025] && status.hasEps[2026]) has2025_2026_withEps++;
        }

        console.log(`  2024-2025 페어 가진 회사: ${has2024_2025}개`);
        console.log(`  2024-2025 페어 + EPS 있음: ${has2024_2025_withEps}개`);
        console.log(`  2025-2026 페어 가진 회사: ${has2025_2026}개`);
        console.log(`  2025-2026 페어 + EPS 있음: ${has2025_2026_withEps}개`);
    }

    console.log('\n✅ 분석 완료!');
}

analyzeYearData().catch(console.error);
