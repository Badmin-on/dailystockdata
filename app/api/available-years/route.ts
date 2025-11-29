import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Supabase에서 직접 SQL로 DISTINCT 사용
    const { data, error } = await supabaseAdmin
      .rpc('get_distinct_years');

    if (error) {
      // RPC 함수가 없으면 fallback
      const { data: allData, error: fallbackError } = await supabaseAdmin
        .from('financial_data_extended')
        .select('year');

      if (fallbackError) throw fallbackError;

      // JavaScript에서 중복 제거 및 정렬
      const uniqueYears = [...new Set(allData?.map(d => d.year) || [])].sort((a, b) => b - a);

      return NextResponse.json(uniqueYears);
    }

    return NextResponse.json(data?.map((row: any) => row.year) || []);
  } catch (error: any) {
    console.error('Error fetching years:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
