import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 컨센서스 & 주가 추이 분석 API
 * 특정 기업의 컨센서스 변화와 주가 변화를 시계열로 제공
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const name = searchParams.get('name');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const years = searchParams.get('years')?.split(',').map(y => parseInt(y)) || [2025, 2026, 2027];

    if (!code && !name) {
      return NextResponse.json(
        { error: '기업 코드 또는 이름을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 1. 기업 정보 조회
    let companyQuery = supabase
      .from('companies')
      .select('id, code, name, market');

    if (code) {
      companyQuery = companyQuery.eq('code', code);
    } else if (name) {
      companyQuery = companyQuery.ilike('name', `%${name}%`);
    }

    const { data: companies, error: companyErr } = await companyQuery.limit(1).single();

    if (companyErr || !companies) {
      return NextResponse.json(
        { error: '기업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 컨센서스 데이터 조회 (financial_data)
    // 잘못된 데이터 필터링: fnguide 우선 또는 매출 ≥ 1000억
    let consensusQuery = supabase
      .from('financial_data_extended')
      .select('scrape_date, year, revenue, operating_profit, data_source')
      .eq('company_id', companies.id)
      .in('year', years)
      .gte('revenue', 100_000_000_000)  // 1000억원 이상만 (잘못된 단위 데이터 제외)
      .order('scrape_date', { ascending: true })
      .order('year', { ascending: true });

    if (startDate) {
      consensusQuery = consensusQuery.gte('scrape_date', startDate);
    }
    if (endDate) {
      consensusQuery = consensusQuery.lte('scrape_date', endDate);
    }

    const { data: consensusData, error: consensusErr } = await consensusQuery;

    if (consensusErr) {
      console.error('컨센서스 데이터 조회 오류:', consensusErr);
      return NextResponse.json(
        { error: '컨센서스 데이터 조회 실패' },
        { status: 500 }
      );
    }

    // 3. 주가 데이터 조회 (daily_stock_prices)
    let priceQuery = supabase
      .from('daily_stock_prices')
      .select('date, close_price, volume')
      .eq('company_id', companies.id)
      .order('date', { ascending: true });

    if (startDate) {
      priceQuery = priceQuery.gte('date', startDate);
    }
    if (endDate) {
      priceQuery = priceQuery.lte('date', endDate);
    }

    const { data: priceData, error: priceErr } = await priceQuery;

    if (priceErr) {
      console.error('주가 데이터 조회 오류:', priceErr);
      return NextResponse.json(
        { error: '주가 데이터 조회 실패' },
        { status: 500 }
      );
    }

    // 4. 데이터 병합 및 가공 (fnguide 우선)
    // 같은 날짜에 fnguide와 naver가 있으면 fnguide 사용
    const consensusByDate = new Map<string, any[]>();

    // fnguide 데이터 우선 정렬 (fnguide가 뒤에 오면 덮어쓰기)
    const sortedData = [...(consensusData || [])].sort((a, b) => {
      if (a.data_source === 'fnguide' && b.data_source !== 'fnguide') return 1;
      if (a.data_source !== 'fnguide' && b.data_source === 'fnguide') return -1;
      return 0;
    });

    sortedData.forEach(item => {
      const dateKey = item.scrape_date;
      const yearKey = `${dateKey}-${item.year}`;

      if (!consensusByDate.has(dateKey)) {
        consensusByDate.set(dateKey, []);
      }

      // 같은 날짜+연도에 이미 데이터가 있으면 fnguide만 덮어쓰기
      const existingItems = consensusByDate.get(dateKey)!;
      const existingIndex = existingItems.findIndex(e => e.year === item.year);

      if (existingIndex === -1) {
        existingItems.push(item);
      } else if (item.data_source === 'fnguide') {
        // fnguide는 항상 덮어쓰기
        existingItems[existingIndex] = item;
      }
    });

    const priceByDate = new Map<string, any>();
    priceData?.forEach(item => {
      priceByDate.set(item.date, item);
    });

    // 5. 통합 시계열 데이터 생성
    const allDates = new Set([
      ...Array.from(consensusByDate.keys()),
      ...Array.from(priceByDate.keys())
    ]);

    const timeSeriesData = Array.from(allDates).sort().map(date => {
      const consensusItems = consensusByDate.get(date) || [];
      const priceItem = priceByDate.get(date);

      const dataPoint: any = {
        date,
        close_price: priceItem?.close_price || null,
        volume: priceItem?.volume || null,
      };

      // 년도별 컨센서스 추가
      years.forEach(year => {
        const yearData = consensusItems.find(item => item.year === year);
        dataPoint[`revenue_${year}`] = yearData?.revenue || null;
        dataPoint[`op_profit_${year}`] = yearData?.operating_profit || null;
      });

      return dataPoint;
    });

    // 6. 통계 및 인사이트 계산
    const stats = calculateInsights(timeSeriesData, years);

    return NextResponse.json({
      company: companies,
      timeSeriesData,
      stats,
      metadata: {
        totalDataPoints: timeSeriesData.length,
        dateRange: {
          start: timeSeriesData[0]?.date,
          end: timeSeriesData[timeSeriesData.length - 1]?.date,
        },
        years,
      },
    });

  } catch (error: any) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 인사이트 계산 함수
 */
function calculateInsights(data: any[], years: number[]) {
  if (data.length === 0) return null;

  const recentData = data.slice(-30); // 최근 30일
  const weekData = data.slice(-7); // 최근 7일

  const stats: any = {
    recent30Days: {},
    recent7Days: {},
    correlation: {},
  };

  years.forEach(year => {
    const revenueKey = `revenue_${year}`;
    const recentRevenue = recentData.filter(d => d[revenueKey] !== null).map(d => d[revenueKey]);

    if (recentRevenue.length >= 2) {
      const firstRevenue = recentRevenue[0];
      const lastRevenue = recentRevenue[recentRevenue.length - 1];

      // 0 또는 비정상적으로 작은 값은 null 반환
      if (firstRevenue < 1000000000) {  // 10억원 미만은 잘못된 데이터
        stats.recent30Days[year] = {
          revenue_change: null,
          first: firstRevenue,
          last: lastRevenue,
          error: 'invalid_first_value'
        };
      } else {
        const changeRate = ((lastRevenue - firstRevenue) / firstRevenue * 100);
        // 합리적인 범위 내 값만 반환 (±500% 이상은 이상치로 간주)
        const validChangeRate = Math.abs(changeRate) <= 500 ? parseFloat(changeRate.toFixed(2)) : null;

        stats.recent30Days[year] = {
          revenue_change: validChangeRate,
          first: firstRevenue,
          last: lastRevenue,
        };
      }
    }
  });

  // 주가 변화율
  const recentPrices = recentData.filter(d => d.close_price !== null).map(d => d.close_price);
  if (recentPrices.length >= 2) {
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];

    // 0 또는 비정상적으로 작은 값은 null 반환
    if (firstPrice <= 0) {
      stats.recent30Days.price_change = null;
    } else {
      const priceChangeRate = ((lastPrice - firstPrice) / firstPrice * 100);
      // 합리적인 범위 내 값만 반환 (±500% 이상은 이상치)
      stats.recent30Days.price_change = Math.abs(priceChangeRate) <= 500
        ? parseFloat(priceChangeRate.toFixed(2))
        : null;
    }
    stats.recent30Days.price_first = firstPrice;
    stats.recent30Days.price_last = lastPrice;
  }

  // 괴리율 계산 (컨센서스 변화 vs 주가 변화)
  // 둘 다 유효한 값일 때만 계산
  const revenueChange = stats.recent30Days[2025]?.revenue_change;
  const priceChange = stats.recent30Days.price_change;

  if (typeof revenueChange === 'number' && typeof priceChange === 'number') {
    stats.recent30Days.divergence = parseFloat((revenueChange - priceChange).toFixed(2));
  } else {
    stats.recent30Days.divergence = null;
  }

  return stats;
}
