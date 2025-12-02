import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

/**
 * 주가 이격도 계산 - mv_stock_analysis Materialized View 활용
 * 성능 개선: 40초 배치 쿼리 → <1초 단일 SELECT
 * 일관성: /opportunities API와 동일한 데이터 소스 사용
 */
async function calculatePriceDeviations(
  companyIds: number[],
  referenceDate: string
): Promise<Map<number, { current_price: number | null; ma120: number | null; deviation: number | null }>> {
  const { data: stockAnalysisData, error } = await supabaseAdmin
    .from('mv_stock_analysis')
    .select('company_id, current_price, ma_120, divergence_120')
    .in('company_id', companyIds);

  if (error) {
    console.error('❌ Error fetching from mv_stock_analysis:', error);
    return new Map();
  }

  console.log(`✅ Fetched ${stockAnalysisData?.length || 0} price records from mv_stock_analysis`);

  const deviations = new Map();

  // mv_stock_analysis 데이터를 Map에 저장
  stockAnalysisData?.forEach((row: any) => {
    deviations.set(row.company_id, {
      current_price: row.current_price,
      ma120: row.ma_120,
      deviation: row.divergence_120
    });
  });

  // companyIds에 있지만 stockAnalysisData에 없는 회사들은 null 처리
  companyIds.forEach(id => {
    if (!deviations.has(id)) {
      deviations.set(id, { current_price: null, ma120: null, deviation: null });
    }
  });

  return deviations;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const year = searchParams.get('year');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const debug = searchParams.get('debug') === 'true';

    let latestScrapeDate: string;
    if (date) {
      latestScrapeDate = date;
    } else {
      // 전체 데이터의 최신 수집 날짜 조회 (year 필터 없음)
      // 이유: 하나의 scrape_date에 여러 연도 데이터가 모두 존재하므로
      //       최신 날짜는 year와 무관하게 동일함
      const { data: latestData } = await supabaseAdmin
        .from('financial_data_extended')
        .select('scrape_date')
        .order('scrape_date', { ascending: false })
        .limit(1)
        .single();

      if (!latestData) {
        return NextResponse.json([]);
      }
      latestScrapeDate = latestData.scrape_date;
    }

    // 주가 데이터 날짜 확인 및 fallback
    // 해당 날짜의 주가 데이터가 없으면 가장 최근 주가 날짜 사용
    let priceReferenceDate = latestScrapeDate;

    const { count: priceCount } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('*', { count: 'exact', head: true })
      .eq('date', latestScrapeDate);

    if (!priceCount || priceCount === 0) {
      // 주가 데이터가 없으면 가장 최근 주가 날짜 사용
      const { data: latestPriceData } = await supabaseAdmin
        .from('daily_stock_prices')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (latestPriceData) {
        priceReferenceDate = latestPriceData.date;
        console.log(`주가 데이터 fallback: ${latestScrapeDate} → ${priceReferenceDate}`);
      }
    }

    // 개선된 날짜 비교 로직
    // 1D: 가장 최근 2개 스크랩 날짜
    // 1M/3M/1Y: 약 30/90/360일 전의 가장 가까운 실제 스크랩 날짜

    // IMPORTANT: year 필터는 비교 데이터 조회 시에만 적용!
    // 날짜 리스트는 전체 scrape_date에서 가져와야 함
    // 이유: 하나의 scrape_date에 여러 연도(2024,2025,2026,2027) 데이터가 모두 존재

    // ============================================
    // 성능 개선: Database Function 사용 (100+ 쿼리 → 1 쿼리)
    // 롤백 방법: 이 try-catch 블록을 삭제하고 아래 주석 코드 복원
    // Database Function 롤백: DROP FUNCTION IF EXISTS get_unique_scrape_dates(INT);
    // ============================================
    let allDates: string[] = [];
    const targetUniqueDates = 100;

    try {
      console.log('🚀 Attempting fast method: get_unique_scrape_dates()');

      const { data: uniqueDatesResult, error } = await supabaseAdmin
        .rpc('get_unique_scrape_dates', { limit_count: targetUniqueDates });

      if (error) throw error;

      if (uniqueDatesResult && uniqueDatesResult.length > 0) {
        allDates = uniqueDatesResult.map((d: any) => d.scrape_date);
        console.log(`✅ Fast method succeeded: ${allDates.length} dates in 1 query`);
      } else {
        throw new Error('No dates returned from function');
      }
    } catch (err) {
      console.warn('⚠️  Fast method failed, using fallback pagination:', err);

      // ============================================
      // 기존 방법 (Fallback) - 항상 작동 보장
      // Supabase는 한 번에 최대 1000개만 반환하므로 페이지네이션 사용
      // ============================================
      let page = 0;
      const pageSize = 1000;

      while (allDates.length < targetUniqueDates && page < 200) {
        const { data, error } = await supabaseAdmin
          .from('financial_data_extended')
          .select('scrape_date')
          .order('scrape_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        // 중복 제거하면서 추가
        const uniqueSet = new Set(allDates);
        data.forEach(d => uniqueSet.add(d.scrape_date));
        allDates = Array.from(uniqueSet);

        // 목표 달성하면 종료
        if (allDates.length >= targetUniqueDates) break;

        page++;
      }

      console.log(`✅ Fallback method completed: ${allDates.length} dates`);
    }


    const uniqueDates = allDates.sort().reverse();

    console.log(`📅 Year ${year || 'all'}: ${uniqueDates.length} unique dates found`);
    console.log(`   First 5 dates: ${uniqueDates.slice(0, 5).join(', ')}`);

    const debugInfo: any = {
      latestScrapeDate,
      year,
      uniqueDatesCount: uniqueDates.length,
      uniqueDatesFirst10: uniqueDates.slice(0, 10),
    };

    let prevDayDate = null;
    let oneMonthAgoDate = null;
    let threeMonthsAgoDate = null;
    let oneYearAgoDate = null;

    if (uniqueDates.length >= 2) {
      console.log(`✅ Finding comparison dates (latest: ${latestScrapeDate})...`);
      // 1D: 가장 최근 날짜와 바로 이전 날짜
      prevDayDate = uniqueDates[1];

      const latestDate = new Date(latestScrapeDate);

      // 1M: 약 30일 전
      const target1M = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      oneMonthAgoDate = findClosestDateFromList(uniqueDates, target1M);

      // 3M: 약 90일 전
      const target3M = new Date(latestDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      threeMonthsAgoDate = findClosestDateFromList(uniqueDates, target3M);

      // 1Y: 약 360일 전
      const target1Y = new Date(latestDate.getTime() - 360 * 24 * 60 * 60 * 1000);
      oneYearAgoDate = findClosestDateFromList(uniqueDates, target1Y);

      debugInfo.comparisonDates = {
        prevDayDate,
        oneMonthAgoDate,
        threeMonthsAgoDate,
        oneYearAgoDate
      };

      console.log(`   Comparison dates found:`);
      console.log(`   - Prev day: ${prevDayDate}`);
      console.log(`   - 1 month: ${oneMonthAgoDate}`);
      console.log(`   - 3 months: ${threeMonthsAgoDate}`);
      console.log(`   - 1 year: ${oneYearAgoDate}`);
    } else {
      debugInfo.warning = `Not enough dates (${uniqueDates.length}) for comparison`;
      console.log(`⚠️  Not enough dates (${uniqueDates.length}) for comparison`);
    }

    // Debug mode: return debug info only
    if (debug) {
      return NextResponse.json({ debug: debugInfo });
    }

    // 목표 날짜에 가장 가까운 실제 스크랩 날짜 찾기
    function findClosestDateFromList(dates: string[], targetDate: Date): string | null {
      if (dates.length === 0) return null;

      const targetTime = targetDate.getTime();
      let closest = dates[0];
      let minDiff = Math.abs(new Date(dates[0]).getTime() - targetTime);

      for (const date of dates) {
        const diff = Math.abs(new Date(date).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = date;
        }
      }

      return closest;
    }

    let query = supabaseAdmin
      .from('financial_data_extended')
      .select(`
        company_id,
        year,
        revenue,
        operating_profit,
        is_estimate,
        companies!inner(id, name, code, market)
      `)
      .eq('scrape_date', latestScrapeDate);

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    const { data: todayData, error } = await query;

    if (error) throw error;
    if (!todayData || todayData.length === 0) {
      return NextResponse.json([]);
    }

    const companyIds = todayData.map((d: any) => d.company_id);

    // 비교 데이터 쿼리 생성 헬퍼 (year 필터 포함)
    const createComparisonQuery = (date: string | null) => {
      if (!date) return Promise.resolve({ data: [] });

      let query = supabaseAdmin
        .from('financial_data_extended')
        .select('company_id,year,revenue,operating_profit')
        .eq('scrape_date', date)
        .in('company_id', companyIds);

      if (year) {
        query = query.eq('year', parseInt(year));
      }

      return query;
    };

    const [prevDayData, oneMonthData, threeMonthData, oneYearData] = await Promise.all([
      createComparisonQuery(prevDayDate),
      createComparisonQuery(oneMonthAgoDate),
      createComparisonQuery(threeMonthsAgoDate),
      createComparisonQuery(oneYearAgoDate),
    ]);

    const createMap = (data: any[]) => {
      const map: any = {};
      data?.forEach((item: any) => {
        const key = `${item.company_id}-${item.year}`;
        map[key] = item;
      });
      return map;
    };

    const prevMap = createMap(prevDayData.data || []);
    const oneMonthMap = createMap(oneMonthData.data || []);
    const threeMonthMap = createMap(threeMonthData.data || []);
    const oneYearMap = createMap(oneYearData.data || []);

    const priceDeviations = await calculatePriceDeviations(companyIds, priceReferenceDate);

    const calculateGrowth = (current: number | null, previous: number | null) => {
      // null 체크
      if (current == null || previous == null) return null;

      // 0으로 나누기 방지
      if (previous === 0) {
        if (current === 0) return '0.00';
        return current > 0 ? 'Infinity' : '-Infinity';
      }

      // 정상적인 증감률 계산
      // 주의: previous가 음수일 때도 올바르게 계산하기 위해 previous를 그대로 사용
      const growthRate = ((current - previous) / previous * 100);

      // 비정상적으로 큰 값 방지 (±10000% 이상은 Infinity로 처리)
      if (Math.abs(growthRate) > 10000) {
        return growthRate > 0 ? 'Infinity' : '-Infinity';
      }

      return growthRate.toFixed(2);
    };

    const comparisonData = todayData.map((row: any) => {
      const key = `${row.company_id}-${row.year}`;
      const company = row.companies;

      const prevDayRecord = prevMap[key];
      const oneMonthRecord = oneMonthMap[key];
      const threeMonthRecord = threeMonthMap[key];
      const oneYearRecord = oneYearMap[key];

      const revenueGrowthPrevDay = calculateGrowth(row.revenue, prevDayRecord?.revenue);
      const opProfitGrowthPrevDay = calculateGrowth(row.operating_profit, prevDayRecord?.operating_profit);
      const revenueGrowth1Month = calculateGrowth(row.revenue, oneMonthRecord?.revenue);
      const opProfitGrowth1Month = calculateGrowth(row.operating_profit, oneMonthRecord?.operating_profit);
      const revenueGrowth3Month = calculateGrowth(row.revenue, threeMonthRecord?.revenue);
      const opProfitGrowth3Month = calculateGrowth(row.operating_profit, threeMonthRecord?.operating_profit);
      const revenueGrowth1Year = calculateGrowth(row.revenue, oneYearRecord?.revenue);
      const opProfitGrowth1Year = calculateGrowth(row.operating_profit, oneYearRecord?.operating_profit);

      const isHighlighted = !!(
        row.is_estimate &&
        (parseFloat(revenueGrowth1Year || '0') > 0 || revenueGrowth1Year === 'Infinity') &&
        (parseFloat(opProfitGrowth1Year || '0') > 0 || opProfitGrowth1Year === 'Infinity')
      );

      const hasDailySurge = !!(
        (parseFloat(revenueGrowthPrevDay || '0') >= 5 || revenueGrowthPrevDay === 'Infinity') ||
        (parseFloat(opProfitGrowthPrevDay || '0') >= 5 || opProfitGrowthPrevDay === 'Infinity')
      );

      const priceInfo = priceDeviations.get(row.company_id) || {
        current_price: null,
        ma120: null,
        deviation: null
      };

      return {
        name: company.name,
        code: company.code,
        market: company.market,
        year: row.year,
        is_estimate: row.is_estimate || false,
        is_highlighted: isHighlighted,
        has_daily_surge: hasDailySurge,

        current_revenue: row.revenue,
        current_op_profit: row.operating_profit,

        current_price: priceInfo.current_price,
        ma120: priceInfo.ma120,
        price_deviation: priceInfo.deviation,
        price_reference_date: priceReferenceDate, // 주가 기준 날짜

        prev_day_revenue: prevDayRecord?.revenue || null,
        prev_day_op_profit: prevDayRecord?.operating_profit || null,
        revenue_growth_prev_day: revenueGrowthPrevDay,
        op_profit_growth_prev_day: opProfitGrowthPrevDay,
        prev_day_date: prevDayDate,

        onemonth_ago_revenue: oneMonthRecord?.revenue || null,
        onemonth_ago_op_profit: oneMonthRecord?.operating_profit || null,
        revenue_growth_1month: revenueGrowth1Month,
        op_profit_growth_1month: opProfitGrowth1Month,
        onemonth_ago_date: oneMonthAgoDate,

        threemonth_ago_revenue: threeMonthRecord?.revenue || null,
        threemonth_ago_op_profit: threeMonthRecord?.operating_profit || null,
        revenue_growth_3month: revenueGrowth3Month,
        op_profit_growth_3month: opProfitGrowth3Month,
        threemonth_ago_date: threeMonthsAgoDate,

        oneyear_ago_revenue: oneYearRecord?.revenue || null,
        oneyear_ago_op_profit: oneYearRecord?.operating_profit || null,
        revenue_growth_1year: revenueGrowth1Year,
        op_profit_growth_1year: opProfitGrowth1Year,
        oneyear_ago_date: oneYearAgoDate,
      };
    });

    if (sortBy) {
      comparisonData.sort((a: any, b: any) => {
        const parseValue = (val: any) => val === 'Infinity' ? Infinity : parseFloat(val || '0');
        const valA = parseValue(a[sortBy]);
        const valB = parseValue(b[sortBy]);
        if (isNaN(valA)) return 1;
        if (isNaN(valB)) return -1;
        return sortOrder === 'ASC' ? valA - valB : valB - valA;
      });
    }

    return NextResponse.json(comparisonData);
  } catch (error: any) {
    console.error('Error in stock-comparison:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
