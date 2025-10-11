import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 재무 컨센서스 변화 API
 * 전일/1개월/3개월/1년 대비 매출액 및 영업이익 변화율
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '1m'; // 1d, 1m, 3m, 1y
    const type = searchParams.get('type') || 'revenue'; // revenue, op_profit
    const minChange = parseFloat(searchParams.get('minChange') || '5');
    const market = searchParams.get('market');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 변화율 컬럼 매핑
    const changeColumnMap: { [key: string]: string } = {
      '1d_revenue': 'revenue_change_1d',
      '1d_op_profit': 'op_profit_change_1d',
      '1m_revenue': 'revenue_change_1m',
      '1m_op_profit': 'op_profit_change_1m',
      '3m_revenue': 'revenue_change_3m',
      '3m_op_profit': 'op_profit_change_3m',
      '1y_revenue': 'revenue_change_1y',
      '1y_op_profit': 'op_profit_change_1y'
    };

    const sortColumn = changeColumnMap[`${period}_${type}`] || 'revenue_change_1m';

    // 쿼리 구성
    let query = supabase
      .from('mv_consensus_changes')
      .select('*')
      .not(sortColumn, 'is', null)
      .gte(sortColumn, minChange);

    if (market) {
      query = query.eq('market', market);
    }

    query = query
      .order(sortColumn, { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      period,
      type,
      count: data?.length || 0,
      data: data || []
    });
  } catch (error: any) {
    console.error('Error in consensus-changes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
