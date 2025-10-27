import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // SQL로 직접 DISTINCT 쿼리 실행
    // Supabase JS limit 제한 우회
    const { data, error } = await supabaseAdmin.rpc('get_unique_scrape_dates');

    if (error) {
      // RPC 함수가 없으면 폴백: 원본 방식
      console.error('RPC error, using fallback:', error);

      // 페이지네이션으로 여러 번 가져오기
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
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
