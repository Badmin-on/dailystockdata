import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 충분히 많은 레코드를 가져와서 고유 날짜 추출
    // 하루당 ~1,500개 레코드 × 100일 = 150,000개 필요
    const { data, error } = await supabase
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(200000);

    if (error) throw error;

    // 중복 제거 후 최신순으로 정렬된 날짜 목록
    const uniqueDates = [...new Set(data?.map(d => d.scrape_date) || [])];

    // 최근 100개 날짜만 반환
    return NextResponse.json(uniqueDates.slice(0, 100));
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
