import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 🔥 성능 최적화: 페이지네이션 루프 제거 (60초 → 5초)
    // 단일 쿼리로 충분한 데이터 조회 후 클라이언트에서 중복 제거
    const { data, error } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(1000);  // 충분한 여유분 확보

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    // 중복 제거 (Set 사용)
    const uniqueDates = [...new Set(data.map(d => d.scrape_date))];

    console.log(`[available-dates] Found ${uniqueDates.length} unique dates from ${data.length} records`);

    // 내림차순 정렬 후 상위 100개 반환
    const sortedDates = uniqueDates.sort().reverse();
    return NextResponse.json(sortedDates.slice(0, 100));
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
