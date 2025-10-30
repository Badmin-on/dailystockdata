import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

/**
 * 주가 이격도 계산 (120일 이평선 기준) - 배치 처리 최적화
 * 성능 개선: 1,794개 순차 쿼리 → ~18개 배치 쿼리
 */
async function calculatePriceDeviations(
  companyIds: number[],
  referenceDate: string
): Promise<Map<number, { current_price: number | null; ma120: number | null; deviation: number | null }>> {
  const deviations = new Map();
  const BATCH_SIZE = 100;

  for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
    const batchIds = companyIds.slice(i, i + BATCH_SIZE);

    try {
      const { data: allPriceData, error } = await supabaseAdmin
        .from('daily_stock_prices')
        .select('company_id, close_price, date')
        .in('company_id', batchIds)
        .lte('date', referenceDate)
        .order('company_id', { ascending: true })
        .order('date', { ascending: false });

      if (error) {
        console.error(`Batch error (${i / BATCH_SIZE + 1}):`, error);
        batchIds.forEach(id => deviations.set(id, { current_price: null, ma120: null, deviation: null }));
        continue;
      }

      const pricesByCompany = new Map<number, any[]>();
      allPriceData?.forEach((row: any) => {
        if (!pricesByCompany.has(row.company_id)) {
          pricesByCompany.set(row.company_id, []);
        }
        pricesByCompany.get(row.company_id)!.push(row);
      });

      batchIds.forEach(companyId => {
        const companyPrices = pricesByCompany.get(companyId);

        if (!companyPrices || companyPrices.length === 0) {
          deviations.set(companyId, { current_price: null, ma120: null, deviation: null });
          return;
        }

        // 최소 1개 데이터가 있으면 현재가는 표시
        const prices = companyPrices.map((row: any) => parseFloat(row.close_price));
        const currentPrice = prices[0];

        // 120일 이상 데이터가 있으면 이격도 계산
        if (companyPrices.length >= 120) {
          const last120Prices = companyPrices.slice(0, 120);
          const prices120 = last120Prices.map((row: any) => parseFloat(row.close_price));
          const ma120 = prices120.reduce((sum: number, price: number) => sum + price, 0) / 120;
          const deviation = ((currentPrice / ma120) * 100 - 100);

          deviations.set(companyId, {
            current_price: currentPrice,
            ma120: parseFloat(ma120.toFixed(2)),
            deviation: parseFloat(deviation.toFixed(2))
          });
        } else {
          // 120일 미만이면 현재가만 표시
          deviations.set(companyId, {
            current_price: currentPrice,
            ma120: null,
            deviation: null
          });
        }
      });
    } catch (error) {
      console.error(`Error batch ${i / BATCH_SIZE + 1}:`, error);
      batchIds.forEach(id => deviations.set(id, { current_price: null, ma120: null, deviation: null }));
    }
  }

  return deviations;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const year = searchParams.get('year');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') || 'DESC';

    let latestScrapeDate: string;
    if (date) {
      latestScrapeDate = date;
    } else {
      const { data: latestData } = await supabaseAdmin
        .from('financial_data')
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
    let scrapeDatesQuery = supabaseAdmin
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(400);

    // year 파라미터가 있으면 해당 연도 데이터가 있는 날짜만 가져오기
    if (year) {
      scrapeDatesQuery = scrapeDatesQuery.eq('year', parseInt(year));
    }

    const { data: allScrapeDates } = await scrapeDatesQuery;

    const uniqueDates = [...new Set((allScrapeDates || []).map((d: any) => d.scrape_date))].sort().reverse();

    console.log(`📅 Year ${year || 'all'}: ${uniqueDates.length} unique dates found`);
    console.log(`   First 5 dates: ${uniqueDates.slice(0, 5).join(', ')}`);

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

      console.log(`   Comparison dates found:`);
      console.log(`   - Prev day: ${prevDayDate}`);
      console.log(`   - 1 month: ${oneMonthAgoDate}`);
      console.log(`   - 3 months: ${threeMonthsAgoDate}`);
      console.log(`   - 1 year: ${oneYearAgoDate}`);
    } else {
      console.log(`⚠️  Not enough dates (${uniqueDates.length}) for comparison`);
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
      .from('financial_data')
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
        .from('financial_data')
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
      if (current == null || previous == null || previous === 0) return null;
      if (previous < 0 && current > 0) return 'Infinity';
      return ((current - previous) / Math.abs(previous) * 100).toFixed(2);
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
