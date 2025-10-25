/**
 * 날짜별 비교 분석 API (원본 5_comparison_server.js 기반)
 * 
 * 특정 기간 동안의 재무 데이터 변화를 분석합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * 억원 단위로 변환
 */
function toEok(value: number | null, digits: number = 2): number | null {
  if (value === null || value === undefined) return null;
  return Number((value / 1e8).toFixed(digits));
}

/**
 * 가장 가까운 날짜 찾기
 */
async function findClosestDate(
  targetDate: Date,
  direction: 'before' | 'after' = 'before'
): Promise<string | null> {
  const operator = direction === 'before' ? '<=' : '>=';
  const order = direction === 'before' ? 'desc' : 'asc';
  
  const { data, error } = await supabaseAdmin
    .from('financial_data')
    .select('scrape_date')
    .lte('scrape_date', targetDate.toISOString().split('T')[0])
    .order('scrape_date', { ascending: direction === 'after' })
    .limit(1);
  
  if (error || !data || data.length === 0) return null;
  return data[0].scrape_date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const metric = searchParams.get('metric') || 'operating_profit';
    const minGrowth = parseFloat(searchParams.get('minGrowth') || '-1000');
    const year = searchParams.get('year');
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const limit = parseInt(searchParams.get('limit') || '100');

    // 입력값 검증
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: '시작 날짜와 종료 날짜를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: '시작 날짜는 종료 날짜보다 이전이어야 합니다.' },
        { status: 400 }
      );
    }

    // 실제 데이터가 있는 가장 가까운 날짜 찾기
    const actualStartDate = await findClosestDate(startDate, 'after');
    const actualEndDate = await findClosestDate(endDate, 'before');

    if (!actualStartDate || !actualEndDate) {
      return NextResponse.json(
        { error: '해당 기간에 데이터가 없습니다.' },
        { status: 404 }
      );
    }

    // 메트릭 설정
    const metricColumn = metric === 'revenue' ? 'revenue' : 'operating_profit';
    const metricDisplayName = metric === 'revenue' ? '매출액' : '영업이익';

    // 연도 필터
    let yearFilter = '';
    if (year) {
      yearFilter = `AND fd1.year = ${parseInt(year)} AND fd2.year = ${parseInt(year)}`;
    }

    // 시작 날짜 데이터 가져오기
    const yearEq = year ? `.eq('year', ${parseInt(year)})` : '';
    
    const { data: startData, error: startError } = await supabaseAdmin
      .from('financial_data')
      .select(`
        company_id,
        companies(id, name, code, market),
        year,
        ${metricColumn},
        is_estimate
      `)
      .eq('scrape_date', actualStartDate)
      .not(metricColumn, 'is', null)
      .neq(metricColumn, 0);

    if (startError) {
      return NextResponse.json({ error: startError.message }, { status: 500 });
    }

    // 종료 날짜 데이터 가져오기
    const { data: endData, error: endError } = await supabaseAdmin
      .from('financial_data')
      .select(`
        company_id,
        year,
        ${metricColumn},
        is_estimate
      `)
      .eq('scrape_date', actualEndDate)
      .not(metricColumn, 'is', null);

    if (endError) {
      return NextResponse.json({ error: endError.message }, { status: 500 });
    }

    // 데이터 매핑 및 증감률 계산
    const endDataMap = new Map();
    endData?.forEach(item => {
      const key = `${item.company_id}_${item.year}`;
      endDataMap.set(key, item);
    });

    const companies = [];
    for (const startItem of startData || []) {
      const key = `${startItem.company_id}_${startItem.year}`;
      const endItem = endDataMap.get(key);
      
      if (!endItem) continue;
      if (year && startItem.year !== parseInt(year)) continue;

      const startValue = startItem[metricColumn];
      const endValue = endItem[metricColumn];

      // 증감률 계산
      let growthRate = 0;
      if (startValue > 0) {
        growthRate = ((endValue - startValue) / startValue) * 100;
      } else if (startValue < 0) {
        growthRate = ((endValue - startValue) / Math.abs(startValue)) * 100;
      }

      // 최소 증감률 필터
      if (growthRate < minGrowth) continue;

      companies.push({
        id: startItem.companies.id,
        name: startItem.companies.name,
        code: startItem.companies.code,
        market: startItem.companies.market,
        year: startItem.year,
        startValue: toEok(startValue, 2),
        endValue: toEok(endValue, 2),
        growthRate: parseFloat(growthRate.toFixed(2)),
        absoluteChange: toEok(endValue - startValue, 2),
        valueUnit: '억원',
        isLossToProfit: startValue < 0 && endValue > 0,
        startIsEstimate: startItem.is_estimate || false,
        endIsEstimate: endItem.is_estimate || false
      });
    }

    // 정렬
    companies.sort((a, b) => {
      return sortOrder === 'ASC' 
        ? a.growthRate - b.growthRate 
        : b.growthRate - a.growthRate;
    });

    // 제한
    const limitedCompanies = companies.slice(0, limit);

    const responseData = {
      actualStartDate,
      actualEndDate,
      requestedStartDate: startDateParam,
      requestedEndDate: endDateParam,
      metric: metricDisplayName,
      minGrowth,
      totalCompanies: limitedCompanies.length,
      companies: limitedCompanies
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in date comparison API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
