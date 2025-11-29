import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Supabase는 최대 1000개까지만 반환하므로 페이지네이션 필요
    // 하지만 100개 날짜를 확보하려면 충분한 데이터가 필요
    // 최적화: 고유 날짜 100개를 찾을 때까지만 조회

    let allDates: string[] = [];
    let page = 0;
    const pageSize = 1000;
    const targetUniqueDates = 100;

    while (allDates.length < targetUniqueDates && page < 200) {
      const { data, error } = await supabaseAdmin
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      // 중복 제거하면서 추가
      const uniqueSet = new Set(allDates);
      data.forEach(d => uniqueSet.add(d.scrape_date));
      allDates = Array.from(uniqueSet);

      console.log(`[available-dates] Page ${page + 1}: ${data.length} records, ${allDates.length} unique dates`);

      // 목표 달성하면 종료
      if (allDates.length >= targetUniqueDates) break;

      page++;
    }

    console.log(`[available-dates] Total unique dates found: ${allDates.length}`);

    // 내림차순 정렬 후 반환
    const sortedDates = allDates.sort().reverse();
    return NextResponse.json(sortedDates.slice(0, 100));
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
