import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // 쿼리 파라미터
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const market = searchParams.get('market'); // 'KOSPI', 'KOSDAQ', null (전체)
    const minRvol = parseFloat(searchParams.get('minRvol') || '1.2');
    const maxRvol = parseFloat(searchParams.get('maxRvol') || '999');
    const grade = searchParams.get('grade'); // 'S', 'A', 'B', 'C', null (전체)
    const pattern = searchParams.get('pattern'); // 'Strong Accumulation', etc.
    const sortBy = searchParams.get('sortBy') || 'smart_money_score'; // smart_money_score, rvol, consensus_score
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc, desc
    const limit = parseInt(searchParams.get('limit') || '100');

    // 기본 쿼리
    let query = supabase
      .from('v_smart_money_flow')
      .select('*');

    // 필터 적용
    if (minScore > 0) {
      query = query.gte('smart_money_score', minScore);
    }

    if (market) {
      query = query.eq('market', market);
    }

    if (minRvol > 0) {
      query = query.gte('rvol', minRvol);
    }

    if (maxRvol < 999) {
      query = query.lte('rvol', maxRvol);
    }

    if (grade) {
      query = query.eq('grade', grade);
    }

    if (pattern) {
      query = query.eq('volume_pattern', pattern);
    }

    // 정렬
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // 제한
    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase 쿼리 오류:', error);
      return NextResponse.json(
        { error: 'Failed to fetch smart money flow data', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No data returned from database' },
        { status: 500 }
      );
    }

    // 통계 계산
    const stats = {
      total: data.length,
      s_grade: data.filter(d => d.grade === 'S').length,
      a_grade: data.filter(d => d.grade === 'A').length,
      b_grade: data.filter(d => d.grade === 'B').length,
      c_grade: data.filter(d => d.grade === 'C').length,
      avg_rvol: data.length > 0
        ? (data.reduce((sum, d) => sum + (d.rvol || 0), 0) / data.length).toFixed(2)
        : 0,
      avg_score: data.length > 0
        ? (data.reduce((sum, d) => sum + (d.smart_money_score || 0), 0) / data.length).toFixed(2)
        : 0,
      strong_accumulation: data.filter(d => d.volume_pattern === 'Strong Accumulation').length,
      moderate_flow: data.filter(d => d.volume_pattern === 'Moderate Flow').length,
      increasing_interest: data.filter(d => d.volume_pattern === 'Increasing Interest').length,
    };

    return NextResponse.json({
      success: true,
      data,
      stats,
      filters: {
        minScore,
        market,
        minRvol,
        maxRvol,
        grade,
        pattern,
        sortBy,
        sortOrder,
        limit,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ API 오류:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
