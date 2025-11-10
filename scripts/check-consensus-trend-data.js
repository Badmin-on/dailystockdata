/**
 * 컨센서스 추이 데이터 구조 확인
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkConsensusTrendData() {
    console.log('\n📊 컨센서스 추이 데이터 구조 확인...\n');

    try {
        // 1. 삼성전자 company_id 찾기
        const { data: company, error: companyErr } = await supabase
            .from('companies')
            .select('id, name, code')
            .eq('code', '005930')
            .single();

        if (companyErr) throw companyErr;

        console.log(`✅ 기업 정보: ${company.name} (${company.code})\n`);

        // 2. 해당 기업의 시계열 컨센서스 데이터 조회
        const { data: consensusData, error: dataErr } = await supabase
            .from('financial_data')
            .select('scrape_date, year, revenue, operating_profit')
            .eq('company_id', company.id)
            .order('scrape_date', { ascending: false })
            .order('year', { ascending: true })
            .limit(20);

        if (dataErr) throw dataErr;

        console.log(`📈 최근 20개 컨센서스 데이터:\n`);

        // scrape_date별로 그룹화
        const byDate = {};
        consensusData.forEach(row => {
            const date = row.scrape_date;
            if (!byDate[date]) byDate[date] = [];
            byDate[date].push(row);
        });

        Object.keys(byDate).slice(0, 5).forEach(date => {
            console.log(`\n날짜: ${date}`);
            byDate[date].forEach(row => {
                console.log(`  ${row.year}년: 매출 ${(row.revenue / 1000000).toFixed(0)}억, 영업이익 ${(row.operating_profit / 1000000).toFixed(0)}억`);
            });
        });

        // 3. scrape_date 개수 확인
        const { data: dateCount, error: dateErr } = await supabase
            .from('financial_data')
            .select('scrape_date')
            .eq('company_id', company.id)
            .order('scrape_date', { ascending: false });

        if (dateErr) throw dateErr;

        const uniqueDates = [...new Set(dateCount.map(d => d.scrape_date))];

        console.log(`\n📅 총 ${uniqueDates.length}개의 scrape_date 존재`);
        console.log(`   최신: ${uniqueDates[0]}`);
        console.log(`   가장 오래된: ${uniqueDates[uniqueDates.length - 1]}`);

        // 4. 년도별 분포 확인
        const { data: yearData, error: yearErr } = await supabase
            .from('financial_data')
            .select('year')
            .eq('company_id', company.id)
            .eq('scrape_date', uniqueDates[0]);

        if (yearErr) throw yearErr;

        const years = [...new Set(yearData.map(d => d.year))].sort();
        console.log(`\n📊 최신 데이터 년도: ${years.join(', ')}`);

        // 5. 구현 가능성 판단
        console.log('\n' + '='.repeat(60));
        console.log('✅ 컨센서스 추이 시각화 구현 가능!');
        console.log('='.repeat(60));
        console.log('\n📋 구현 계획:');
        console.log('  1. API: /api/consensus-trend/[code]');
        console.log('  2. 페이지: /consensus-trend');
        console.log('  3. 차트 라이브러리: recharts (이미 사용 중)');
        console.log('  4. 기능:');
        console.log('     - 기업 검색 (이름/코드)');
        console.log('     - 시계열 라인 차트 (매출/영업이익)');
        console.log('     - 년도별 컨센서스 변화');
        console.log('     - 증감 추세 표시');
        console.log('\n💡 예상 차트 구조:');
        console.log('  X축: scrape_date (시간)');
        console.log('  Y축: 금액');
        console.log('  라인: 2025년 매출, 2026년 매출, 2025년 영업이익, ...');
        console.log('');

    } catch (error) {
        console.error('\n❌ 오류 발생:', error.message);
    }
}

checkConsensusTrendData()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
