import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 충분히 많은 데이터를 가져와서 JavaScript로 중복 제거
    // 이 방법이 가장 안정적이고 확실함
    const { data: allData, error } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(200000);  // 넉넉하게 200,000개 조회

    if (error) throw error;

    console.log('[available-dates] Total records fetched:', allData?.length);

    // 고유한 날짜만 추출
    const uniqueDates = [...new Set(allData?.map(d => d.scrape_date) || [])];

    console.log('[available-dates] Unique dates found:', uniqueDates.length);

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
