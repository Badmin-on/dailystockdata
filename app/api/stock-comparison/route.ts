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

        if (!companyPrices || companyPrices.length < 120) {
          deviations.set(companyId, { current_price: null, ma120: null, deviation: null });
          return;
        }

        const last120Prices = companyPrices.slice(0, 120);
        const prices = last120Prices.map((row: any) => parseFloat(row.close_price));
        const ma120 = prices.reduce((sum: number, price: number) => sum + price, 0) / 120;
        const currentPrice = prices[0];
        const deviation = ((currentPrice / ma120) * 100 - 100);

        deviations.set(companyId, {
          current_price: currentPrice,
          ma120: parseFloat(ma120.toFixed(2)),
          deviation: parseFloat(deviation.toFixed(2))
        });
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

    const companyIds = todayData.map((d: any) => d.company_id);

    const [prevDayData, oneMonthData, threeMonthData, oneYearData] = await Promise.all([
      prevDayDate ? supabase.from('financial_data').select('company_id,year,revenue,operating_profit').eq('scrape_date', prevDayDate).in('company_id', companyIds) : Promise.resolve({ data: [] }),
      oneMonthAgoDate ? supabase.from('financial_data').select('company_id,year,revenue,operating_profit').eq('scrape_date', oneMonthAgoDate).in('company_id', companyIds) : Promise.resolve({ data: [] }),
      threeMonthsAgoDate ? supabase.from('financial_data').select('company_id,year,revenue,operating_profit').eq('scrape_date', threeMonthsAgoDate).in('company_id', companyIds) : Promise.resolve({ data: [] }),
      oneYearAgoDate ? supabase.from('financial_data').select('company_id,year,revenue,operating_profit').eq('scrape_date', oneYearAgoDate).in('company_id', companyIds) : Promise.resolve({ data: [] }),
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

    const priceDeviations = await calculatePriceDeviations(companyIds, latestScrapeDate);

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
