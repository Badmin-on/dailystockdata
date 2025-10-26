import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 투자 기회 발굴 API
 * 컨센서스 변화율 + 120일 이평선 이격도 기반 투자 점수 제공
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const minScore = parseInt(searchParams.get('minScore') || '50');
    const grade = searchParams.get('grade'); // S급, A급, B급, C급
    const market = searchParams.get('market'); // KOSPI, KOSDAQ
    const year = searchParams.get('year'); // 년도 필터
    const sortBy = searchParams.get('sortBy') || 'investment_score';
    const limit = parseInt(searchParams.get('limit') || '100');

    // 기본 쿼리
    let query = supabase
      .from('v_investment_opportunities')
      .select('*')
      .gte('investment_score', minScore);

    // 필터 적용
    if (grade) {
      query = query.eq('investment_grade', grade);
    }
    if (market) {
      query = query.eq('market', market);
    }
    if (year) {
      query = query.eq('year', parseInt(year));
    }

    // 정렬
    const validSortColumns = [
      'investment_score',
      'consensus_score',
      'divergence_score',
      'revenue_change_1m',
      'op_profit_change_1m',
      'divergence_120'
    ];

    if (validSortColumns.includes(sortBy)) {
      query = query.order(sortBy, { ascending: false });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });
  } catch (error: any) {
    console.error('Error in investment-opportunities:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
