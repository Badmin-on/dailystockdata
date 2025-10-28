import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 최적화된 방식: 충분한 데이터를 한 번에 조회
    // 각 날짜당 ~1,500개 레코드 × 100개 날짜 = 150,000개
    // 안전하게 30,000개 조회하면 약 20개 날짜 확보
    // 하지만 최근 데이터를 먼저 가져오므로 충분함
    const { data, error } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(50000);  // 50,000개면 충분히 많은 고유 날짜 확보

    if (error) throw error;

    // 고유한 날짜만 추출
    const uniqueDates = [...new Set(data?.map(d => d.scrape_date) || [])];

    // 최대 100개 반환 (이미 내림차순 정렬됨)
    return NextResponse.json(uniqueDates.slice(0, 100));
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
