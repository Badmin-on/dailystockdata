import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

/**
 * 종목 비교 API - v2
 * mv_consensus_changes Materialized View 사용
 * 투자 기회 발굴 페이지와 동일한 데이터 소스 (일관성 보장)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') || '2025';
    const sortBy = searchParams.get('sortBy') || 'revenue_change_1m';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const search = searchParams.get('search') || '';
    const market = searchParams.get('market') || '';
    const onlyWithData = searchParams.get('onlyWithData') === 'true';
    const debug = searchParams.get('debug') === 'true';

    console.log(`📊 Stock Comparison API v2 - Using mv_consensus_changes`);
    console.log(`   Year: ${year}, Sort: ${sortBy} ${sortOrder}`);

    // mv_consensus_changes에서 데이터 조회
    let query = supabaseAdmin
      .from('mv_consensus_changes')
      .select(`
        company_id,
        code,
        name,
        year,
        market,
        current_revenue,
        current_op_profit,
        prev_day_revenue,
        prev_day_op_profit,
        prev_day_date,
        one_month_revenue,
        one_month_op_profit,
        one_month_date,
        three_months_revenue,
        three_months_op_profit,
        three_months_date,
        one_year_revenue,
        one_year_op_profit,
        one_year_date,
        revenue_change_1d,
        op_profit_change_1d,
        revenue_change_1m,
        op_profit_change_1m,
        revenue_change_3m,
        op_profit_change_3m,
        revenue_change_1y,
        op_profit_change_1y,
        current_date
      `)
      .eq('year', parseInt(year));

    // 검색 필터
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    // 시장 필터
    if (market && market !== '전체') {
      query = query.eq('market', market);
    }

    // 프론트엔드 정렬 키 -> DB 컬럼명 매핑
    const sortColumnMap: Record<string, string> = {
      'op_profit_growth_1year': 'op_profit_change_1y',
      'revenue_growth_1year': 'revenue_change_1y',
      'op_profit_growth_3month': 'op_profit_change_3m',
      'revenue_growth_3month': 'revenue_change_3m',
      'op_profit_growth_1month': 'op_profit_change_1m',
      'revenue_growth_1month': 'revenue_change_1m',
      'op_profit_growth_prev_day': 'op_profit_change_1d',
      'revenue_growth_prev_day': 'revenue_change_1d',
    };
    const actualSortColumn = sortColumnMap[sortBy] || sortBy;

    // 정렬
    const ascending = sortOrder.toUpperCase() === 'ASC';
    query = query.order(actualSortColumn, { ascending, nullsFirst: false });

    const { data: consensusData, error } = await query;

    if (error) {
      console.error('❌ Error fetching mv_consensus_changes:', error);
      throw error;
    }

    console.log(`✅ Fetched ${consensusData?.length || 0} records from mv_consensus_changes`);

    // mv_stock_analysis에서 주가 데이터 조회
    const companyIds = consensusData?.map((c: any) => c.company_id) || [];

    let stockData: any[] = [];
    if (companyIds.length > 0) {
      const { data: stockResult, error: stockError } = await supabaseAdmin
        .from('mv_stock_analysis')
        .select('company_id, current_price, ma_120, divergence_120')
        .in('company_id', companyIds);

      if (!stockError && stockResult) {
        stockData = stockResult;
      }
    }

    // 주가 데이터를 Map으로 변환
    const stockMap = new Map(
      stockData.map((s: any) => [s.company_id, s])
    );

    // 결과 조합
    const result = consensusData?.map((c: any) => {
      const stock = stockMap.get(c.company_id);

      return {
        company_id: c.company_id,
        code: c.code,
        name: c.name,
        year: c.year,
        market: c.market,

        // 현재 데이터
        current_revenue: c.current_revenue,
        current_op_profit: c.current_op_profit,

        // 프론트엔드 호환성을 위한 플래그
        is_estimate: false,
        is_highlighted: false,
        has_daily_surge: c.op_profit_change_1d != null && Number(c.op_profit_change_1d) >= 5,

        // 전일 비교
        prev_day_revenue: c.prev_day_revenue,
        prev_day_operating_profit: c.prev_day_op_profit,
        revenue_growth_prev_day: c.revenue_change_1d,
        operating_profit_growth_prev_day: c.op_profit_change_1d,
        prev_day_date: c.prev_day_date,

        // 1개월 비교
        one_month_revenue: c.one_month_revenue,
        one_month_operating_profit: c.one_month_op_profit,
        revenue_growth_1month: c.revenue_change_1m,
        op_profit_growth_1month: c.op_profit_change_1m,
        onemonth_ago_date: c.one_month_date,

        // 3개월 비교
        three_month_revenue: c.three_months_revenue,
        three_month_operating_profit: c.three_months_op_profit,
        revenue_growth_3month: c.revenue_change_3m,
        op_profit_growth_3month: c.op_profit_change_3m,
        threemonth_ago_date: c.three_months_date,

        // 1년 비교
        one_year_revenue: c.one_year_revenue,
        one_year_operating_profit: c.one_year_op_profit,
        revenue_growth_1year: c.revenue_change_1y,
        op_profit_growth_1year: c.op_profit_change_1y,
        oneyear_ago_date: c.one_year_date,

        // 주가 데이터
        current_price: stock?.current_price || null,
        ma120: stock?.ma_120 || null,
        price_deviation: stock?.divergence_120 || null,

        // 메타데이터
        last_updated: c.current_date,
      };
    }) || [];

    // 데이터 있는 것만 필터링
    const filteredResult = onlyWithData
      ? result.filter((r: any) =>
        r.revenue_growth_1month !== null || r.revenue_growth_3month !== null
      )
      : result;

    if (debug) {
      return NextResponse.json({
        debug: {
          source: 'mv_consensus_changes',
          year,
          totalRecords: consensusData?.length || 0,
          stockRecords: stockData.length,
          filteredRecords: filteredResult.length,
        },
        data: filteredResult.slice(0, 10)
      });
    }

    return NextResponse.json(filteredResult);
  } catch (error: any) {
    console.error('❌ Stock Comparison API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
