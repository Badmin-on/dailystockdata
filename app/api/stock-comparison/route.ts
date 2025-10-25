import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

/**
 * 주가 이격도 계산 (120일 이평선 기준)
 */
async function calculatePriceDeviations(
  companyIds: number[],
  referenceDate: string
): Promise<Map<number, { current_price: number | null; ma120: number | null; deviation: number | null }>> {
  const deviations = new Map();

  for (const companyId of companyIds) {
    try {
      // 최근 120일 주가 데이터 가져오기
      const { data: priceData, error } = await supabaseAdmin
        .from('daily_stock_prices')
        .select('close_price')
        .eq('company_id', companyId)
        .lte('date', referenceDate)
        .order('date', { ascending: false })
        .limit(120);

      if (error) {
        console.error(`Price data error for company ${companyId}:`, error);
        deviations.set(companyId, { current_price: null, ma120: null, deviation: null });
        continue;
      }

      if (!priceData || priceData.length < 120) {
        // 120일 데이터가 부족하면 null
        deviations.set(companyId, { current_price: null, ma120: null, deviation: null });
        continue;
      }

      // 120일 이평선 계산
      const prices = priceData.map(row => parseFloat(row.close_price));
      const ma120 = prices.reduce((sum, price) => sum + price, 0) / 120;
      const currentPrice = prices[0]; // 최신 가격

      // 이격도 계산: ((현재가 / 120일 이평) * 100 - 100)
      const deviation = ((currentPrice / ma120) * 100 - 100);

      deviations.set(companyId, {
        current_price: currentPrice,
        ma120: parseFloat(ma120.toFixed(2)),
        deviation: parseFloat(deviation.toFixed(2))
      });
    } catch (error) {
      console.error(`Error calculating deviation for company ${companyId}:`, error);
      deviations.set(companyId, { current_price: null, ma120: null, deviation: null });
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

    // 최신 scrape_date 가져오기
    let latestScrapeDate: string;
    if (date) {
      latestScrapeDate = date;
    } else {
      const { data: latestData } = await supabase
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

    // 가장 가까운 과거 날짜 찾기
    const findClosestDate = async (targetDate: Date) => {
      const { data } = await supabase
        .from('financial_data')
        .select('scrape_date')
        .lte('scrape_date', targetDate.toISOString().split('T')[0])
        .order('scrape_date', { ascending: false })
        .limit(1)
        .single();
      return data?.scrape_date || null;
    };

    const today = new Date(latestScrapeDate);
    const prevDayDate = await findClosestDate(new Date(today.getTime() - 24 * 60 * 60 * 1000));
    const oneMonthAgoDate = await findClosestDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()));
    const threeMonthsAgoDate = await findClosestDate(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()));
    const oneYearAgoDate = await findClosestDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));

    // 현재 데이터 가져오기
    let query = supabase
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

    // 과거 데이터 가져오기 (배치 처리)
    const companyIds = todayData.map((d: any) => d.company_id);

    const [prevDayData, oneMonthData, threeMonthData, oneYearData] = await Promise.all([
      prevDayDate ? supabase.from('financial_data').select('company_id,year,revenue,operating_profit').eq('scrape_date', prevDayDate).in('company_id', companyIds) : Promise.resolve({ data: [] }),
      oneMonthAgoDate ? supabase.from('financial_data').select('company_id,year,revenue,operating_profit').eq('scrape_date', oneMonthAgoDate).in('company_id', companyIds) : Promise.resolve({ data: [] }),
      threeMonthsAgoDate ? supabase.from('financial_data').select('company_id,year,revenue,operating_profit').eq('scrape_date', threeMonthsAgoDate).in('company_id', companyIds) : Promise.resolve({ data: [] }),
      oneYearAgoDate ? supabase.from('financial_data').select('company_id,year,revenue,operating_profit').eq('scrape_date', oneYearAgoDate).in('company_id', companyIds) : Promise.resolve({ data: [] }),
    ]);

    // 데이터 맵 생성
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

    // 주가 이격도 계산
    const priceDeviations = await calculatePriceDeviations(companyIds, latestScrapeDate);

    // 증감률 계산 함수
    const calculateGrowth = (current: number | null, previous: number | null) => {
      if (current == null || previous == null || previous === 0) return null;
      if (previous < 0 && current > 0) return 'Infinity';
      return ((current - previous) / Math.abs(previous) * 100).toFixed(2);
    };

    // 데이터 조합
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

      // 주가 이격도 정보
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

        // 주가 및 이격도 정보
        current_price: priceInfo.current_price,
        ma120: priceInfo.ma120,
        price_deviation: priceInfo.deviation,

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

    // 정렬
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
