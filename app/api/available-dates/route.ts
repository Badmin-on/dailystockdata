import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 페이지네이션으로 여러 번 가져오기
    // Supabase는 한 번에 최대 1000개만 반환
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data: pageData, error: pageError } = await supabaseAdmin
        .from('financial_data')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (pageError) throw pageError;
      if (!pageData || pageData.length === 0) break;

      allData = allData.concat(pageData);

      // 충분한 고유 날짜를 찾으면 중단
      const uniqueDates = [...new Set(allData.map(d => d.scrape_date))];
      if (uniqueDates.length >= 100 || pageData.length < pageSize) break;

      page++;
      if (page >= 200) break; // 최대 200,000개
    }

    const uniqueDates = [...new Set(allData.map(d => d.scrape_date))];
    return NextResponse.json(uniqueDates.slice(0, 100));
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
