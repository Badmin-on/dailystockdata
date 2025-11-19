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

    // ============================================
    // 성능 개선: Database Function 사용 (2 쿼리 → 1 쿼리)
    // 롤백 방법: 이 try-catch 블록을 삭제하고 아래 주석 코드 복원
    // Database Function 롤백: DROP FUNCTION IF EXISTS find_closest_date_range(TEXT, TEXT);
    // ============================================
    let actualStartDate: string | null = null;
    let actualEndDate: string | null = null;

    try {
      console.log('🚀 Attempting fast method: find_closest_date_range()');

      const { data: dateRange, error } = await supabaseAdmin
        .rpc('find_closest_date_range', {
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0]
        });

      if (error) throw error;

      if (dateRange && dateRange.length > 0) {
        actualStartDate = dateRange[0].actual_start_date;
        actualEndDate = dateRange[0].actual_end_date;
        console.log(`✅ Fast method succeeded: ${actualStartDate} ~ ${actualEndDate}`);
      } else {
        throw new Error('No date range returned');
      }
    } catch (err) {
      console.warn('⚠️  Fast method failed, using fallback:', err);

      // ============================================
      // 기존 방법 (Fallback) - 항상 작동 보장
      // ============================================
      const findClosestDate = async (targetDate: Date, direction: 'before' | 'after' = 'before') => {
        const targetStr = targetDate.toISOString().split('T')[0];
        const ascending = direction === 'after';

        // TypeScript 타입 안전성을 위해 조건문 사용
        let query = supabaseAdmin
          .from('financial_data')
          .select('scrape_date');

        if (direction === 'before') {
          query = query.lte('scrape_date', targetStr);
        } else {
          query = query.gte('scrape_date', targetStr);
        }

        const { data } = await query
          .order('scrape_date', { ascending })
          .limit(1)
          .single();

        return data?.scrape_date || null;
      };

      actualStartDate = await findClosestDate(start, 'after');
      actualEndDate = await findClosestDate(end, 'before');

      console.log(`✅ Fallback method completed`);
    }

    if (!actualStartDate || !actualEndDate) {
      return NextResponse.json(
        { error: '해당 기간에 데이터가 없습니다.' },
        { status: 404 }
      );
    }

    const metricColumn = metric === 'revenue' ? 'revenue' : 'operating_profit';
    const metricDisplayName = metric === 'revenue' ? '매출액' : '영업이익';

    // 시작 날짜 데이터 조회
    let startQuery = supabaseAdmin
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
    let endQuery = supabaseAdmin
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

        // 변화가 없는 기업 제외
        if (startValue === endValue) {
          return null;
        }

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
