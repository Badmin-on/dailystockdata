import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAllDates() {
  console.log('financial_data_extended 테이블의 모든 날짜 확인\n');

  // 모든 고유 날짜 조회
  const { data } = await supabase
    .from('financial_data_extended')
    .select('scrape_date, data_source')
    .order('scrape_date', { ascending: false });

  if (!data || data.length === 0) {
    console.log('데이터가 없습니다!');
    return;
  }

  // 날짜별 그룹화
  const dateMap = new Map<string, { fnguide: number, naver: number }>();

  data.forEach(row => {
    if (!dateMap.has(row.scrape_date)) {
      dateMap.set(row.scrape_date, { fnguide: 0, naver: 0 });
    }
    const stats = dateMap.get(row.scrape_date)!;
    if (row.data_source === 'fnguide') {
      stats.fnguide++;
    } else if (row.data_source === 'naver') {
      stats.naver++;
    }
  });

  const uniqueDates = Array.from(dateMap.keys()).sort().reverse();

  console.log(`총 고유 날짜: ${uniqueDates.length}개`);
  console.log(`총 레코드: ${data.length}개\n`);

  console.log('날짜별 데이터 (최근 20개):');
  uniqueDates.slice(0, 20).forEach((date, i) => {
    const stats = dateMap.get(date)!;
    console.log(`  ${i + 1}. ${date}: fnguide=${stats.fnguide}, naver=${stats.naver}, 합계=${stats.fnguide + stats.naver}`);
  });

  if (uniqueDates.length > 20) {
    console.log(`\n  ... (총 ${uniqueDates.length}개 날짜)`);
  }
}

checkAllDates().catch(console.error);
