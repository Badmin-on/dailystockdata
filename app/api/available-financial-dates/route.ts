import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * 특정 년월에 재무 데이터가 있는 날짜 목록을 반환하는 API
 *
 * @param year - 조회할 년도 (예: 2024)
 * @param month - 조회할 월 (예: 10)
 * @returns 해당 년월에 데이터가 있는 날짜 배열
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');
    const month = parseInt(searchParams.get('month') || '');

    // 입력값 검증
    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json(
        { error: 'year와 month 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: '월은 1-12 사이여야 합니다.' },
        { status: 400 }
      );
    }

    // 해당 년월의 시작일과 종료일 계산
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // 다음 달 0일 = 현재 달 마지막 날
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    // Supabase에서 해당 기간의 distinct scrape_date 조회
    const { data, error } = await supabaseAdmin
      .from('financial_data_extended')
      .select('scrape_date')
      .gte('scrape_date', startDate)
      .lte('scrape_date', endDateStr)
      .order('scrape_date', { ascending: true });

    if (error) {
      console.error('Error fetching financial dates:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // distinct한 날짜만 추출
    const uniqueDates = [...new Set(data?.map(item => item.scrape_date) || [])];

    return NextResponse.json({
      success: true,
      year,
      month,
      dates: uniqueDates,
      count: uniqueDates.length
    });

  } catch (error: any) {
    console.error('Error in available-financial-dates API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
