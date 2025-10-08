require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkYears() {
  console.log('🔍 데이터베이스 연도 분석 중...\n');

  // 1. 모든 연도 가져오기
  const { data: allData, error } = await supabase
    .from('financial_data')
    .select('year, scrape_date')
    .order('year', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ 오류:', error);
    return;
  }

  console.log('첫 100개 레코드:');
  const yearCounts = {};
  allData.forEach(row => {
    yearCounts[row.year] = (yearCounts[row.year] || 0) + 1;
  });
  console.log(yearCounts);

  // 2. 연도별 카운트
  const { data: years } = await supabase
    .from('financial_data')
    .select('year', { count: 'exact' });

  const uniqueYears = [...new Set(years?.map(d => d.year) || [])].sort((a, b) => b - a);

  console.log('\n📊 고유 연도:', uniqueYears);

  // 3. 각 연도별 데이터 개수
  for (const year of uniqueYears) {
    const { count } = await supabase
      .from('financial_data')
      .select('*', { count: 'exact', head: true })
      .eq('year', year);

    console.log(`  ${year}년: ${count?.toLocaleString()}개`);
  }

  // 4. 샘플 데이터
  console.log('\n📋 샘플 데이터 (각 연도별 1개):');
  for (const year of uniqueYears) {
    const { data } = await supabase
      .from('financial_data')
      .select('year, scrape_date, companies(name)')
      .eq('year', year)
      .limit(1)
      .single();

    if (data) {
      console.log(`  ${year}년: ${data.companies?.name} (${data.scrape_date})`);
    }
  }
}

checkYears();
