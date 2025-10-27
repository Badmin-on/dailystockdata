import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * 날짜별 비교 분석 API
 * 핵심: 사용자가 지정한 두 날짜 간의 컨센서스 값 변화 추적
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const metric = searchParams.get('metric') || 'operating_profit';
    const minGrowth = parseFloat(searchParams.get('minGrowth') || '-1000');
    const year = searchParams.get('year');
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작 날짜와 종료 날짜를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: '시작 날짜는 종료 날짜보다 이전이어야 합니다.' },
        { status: 400 }
      );
    }

    const findClosestDate = async (targetDate: Date, direction: 'before' | 'after' = 'before') => {
      const targetStr = targetDate.toISOString().split('T')[0];
      const operator = direction === 'before' ? 'lte' : 'gte';
      const ascending = direction === 'after';

      const { data } = await supabase
        .from('financial_data')
        .select('scrape_date')
        [operator]('scrape_date', targetStr)
        .order('scrape_date', { ascending })
        .limit(1)
        .single();

      return data?.scrape_date || null;
    };

    const actualStartDate = await findClosestDate(start, 'after');
    const actualEndDate = await findClosestDate(end, 'before');

    if (!actualStartDate || !actualEndDate) {
      return NextResponse.json(
        { error: '해당 기간에 데이터가 없습니다.' },
        { status: 404 }
      );
    }

    const metricColumn = metric === 'revenue' ? 'revenue' : 'operating_profit';
    const metricDisplayName = metric === 'revenue' ? '매출액' : '영업이익';

    // 시작 날짜 데이터 조회
    let startQuery = supabase
      .from('financial_data')
      .select('company_id, year, ' + metricColumn + ', is_estimate, companies!inner(id, name, code, market)')
      .eq('scrape_date', actualStartDate)
      .not(metricColumn, 'is', null)
      .neq(metricColumn, 0);

    if (year) {
      startQuery = startQuery.eq('year', parseInt(year));
    }

    const { data: startData, error: startError } = await startQuery;

    if (startError) throw startError;
    if (!startData || startData.length === 0) {
      return NextResponse.json(
        { error: '시작 날짜에 데이터가 없습니다.' },
        { status: 404 }
      );
    }

    const companyIds = startData.map((d: any) => d.company_id);

    // 종료 날짜 데이터 조회
    let endQuery = supabase
      .from('financial_data')
      .select('company_id, year, ' + metricColumn + ', is_estimate')
      .eq('scrape_date', actualEndDate)
      .in('company_id', companyIds)
      .not(metricColumn, 'is', null);

    if (year) {
      endQuery = endQuery.eq('year', parseInt(year));
    }

    const { data: endData, error: endError } = await endQuery;

    if (endError) throw endError;

    // 데이터 비교
    const endMap = new Map();
    endData?.forEach((item: any) => {
      const key = item.company_id + '-' + item.year;
      endMap.set(key, item);
    });

    const comparisons = startData
      .map((startRow: any) => {
        const key = startRow.company_id + '-' + startRow.year;
        const endRow = endMap.get(key);

        if (!endRow) return null;

        const startValue = parseFloat(startRow[metricColumn]);
        const endValue = parseFloat(endRow[metricColumn]);

        let growthRate: number | null = null;
        if (startValue > 0) {
          growthRate = ((endValue - startValue) / startValue) * 100;
        } else if (startValue < 0) {
          growthRate = ((endValue - startValue) / Math.abs(startValue)) * 100;
        }

        const absoluteChange = endValue - startValue;

        if (growthRate !== null && growthRate < minGrowth) {
          return null;
        }

        return {
          id: startRow.companies.id,
          name: startRow.companies.name,
          code: startRow.companies.code,
          market: startRow.companies.market,
          year: startRow.year,
          startValue: startValue,
          endValue: endValue,
          growthRate: growthRate ? parseFloat(growthRate.toFixed(2)) : null,
          absoluteChange: absoluteChange,
          valueUnit: '억원',
          isLossToProfit: startValue < 0 && endValue > 0,
          startIsEstimate: startRow.is_estimate || false,
          endIsEstimate: endRow.is_estimate || false
        };
      })
      .filter((item: any) => item !== null);

    comparisons.sort((a: any, b: any) => {
      const valA = a.growthRate ?? -Infinity;
      const valB = b.growthRate ?? -Infinity;
      return sortOrder === 'ASC' ? valA - valB : valB - valA;
    });

    const limited = comparisons.slice(0, limit);

    const responseData = {
      actualStartDate,
      actualEndDate,
      requestedStartDate: startDate,
      requestedEndDate: endDate,
      metric: metricDisplayName,
      minGrowth,
      totalCompanies: limited.length,
      companies: limited
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Error in date comparison API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
