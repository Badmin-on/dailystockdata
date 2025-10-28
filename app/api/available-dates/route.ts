import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // PostgreSQL의 DISTINCT ON을 사용하여 고유 날짜만 직접 조회
    // 이 방법이 가장 효율적: DB 레벨에서 중복 제거
    const { data, error } = await supabaseAdmin.rpc('get_unique_scrape_dates');

    if (error || !data) {
      // RPC 함수가 없으면 대체 방법 사용
      console.log('RPC not available, using alternative method');

      // 대체 방법: 충분히 많은 데이터를 가져와서 JavaScript로 중복 제거
      const { data: allData, error: queryError } = await supabaseAdmin
        .from('financial_data')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(100000);  // 대량 조회

      if (queryError) throw queryError;

      console.log('Total records fetched:', allData?.length);

      // 고유한 날짜만 추출
      const uniqueDates = [...new Set(allData?.map(d => d.scrape_date) || [])];

      console.log('Unique dates found:', uniqueDates.length);

      return NextResponse.json(uniqueDates.slice(0, 100));
    }

    // RPC 함수가 있으면 그 결과 사용
    return NextResponse.json(data.slice(0, 100));
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
