import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 주가 분석 API
 * 120일 이평선, 이격도, 52주 최고/최저 분석
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const minDivergence = parseFloat(searchParams.get('minDivergence') || '-999');
    const maxDivergence = parseFloat(searchParams.get('maxDivergence') || '999');
    const market = searchParams.get('market');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (code) {
      // 특정 종목 조회
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('code', code)
        .single();

      if (!company) {
        return NextResponse.json(
          { success: false, error: '종목을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const { data, error } = await supabase
        .from('mv_stock_analysis')
        .select('*')
        .eq('company_id', company.id)
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data
      });
    }

    // 이격도 범위로 필터링
    let query = supabase
      .from('mv_stock_analysis')
      .select('*')
      .not('divergence_120', 'is', null)
      .gte('divergence_120', minDivergence)
      .lte('divergence_120', maxDivergence);

    if (market) {
      query = query.eq('market', market);
    }

    query = query
      .order('divergence_120', { ascending: true })
      .limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });
  } catch (error: any) {
    console.error('Error in stock-analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
