import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 🔥 성능 최적화: 페이지네이션 루프 제거 (60초 → 5초)
    // 분석 결과: 고유 날짜 83개만 존재 (총 171,602 레코드)
    // 전략: 전체 scrape_date 조회 후 클라이언트에서 고유 날짜 추출
    // 이유: limit()을 쓰면 첫 날짜만 여러 번 반환되어 실패했음

    const { data, error } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    // Set을 사용한 고유 날짜 추출 (O(n) 성능)
    const uniqueDates = [...new Set(data.map(d => d.scrape_date))];

    console.log(`[available-dates] Found ${uniqueDates.length} unique dates from ${data.length} records`);

    // 이미 정렬되어 있으므로 상위 100개만 반환
    return NextResponse.json(uniqueDates.slice(0, 100));
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
