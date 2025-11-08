import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 🔥 PostgreSQL Function 사용: DB에서 DISTINCT 처리 (60초 → 1~2초)
    // 분석 결과: 고유 날짜 83개만 존재 (총 171,602 레코드)
    // 전략: PostgreSQL get_unique_scrape_dates() 함수 호출
    // 장점: 인덱스 활용, 메모리 효율적, 타임아웃 없음

    const { data, error } = await supabaseAdmin
      .rpc('get_unique_scrape_dates', { limit_count: 100 });

    if (error) throw error;

    console.log(`[available-dates] Found ${data?.length || 0} unique dates using PostgreSQL function`);

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
