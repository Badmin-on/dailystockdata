import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * ETF 운용사별 요약 통계 API
 * 각 운용사별 평균 수익률, 이격도, 상위/하위 ETF 정보 제공
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 모든 ETF 데이터 조회
    const { data: etfData, error: etfError } = await supabaseAdmin
      .from('companies')
      .select('id, name, code, etf_provider')
      .eq('is_etf', true);

    if (etfError) throw etfError;
    if (!etfData || etfData.length === 0) {
      return NextResponse.json([]);
    }

    const companyIds = etfData.map(etf => etf.id);

    // 2. 주가 데이터 조회
    const { data: priceData, error: priceError } = await supabaseAdmin
      .from('mv_stock_analysis')
      .select('company_id, current_price, divergence_120, change_rate')
      .in('company_id', companyIds);

    if (priceError) {
      console.error('Error fetching price data:', priceError);
    }

    // 3. company_id를 키로 하는 맵 생성
    const priceMap = new Map();
    priceData?.forEach((row: any) => {
      priceMap.set(row.company_id, {
        current_price: row.current_price,
        divergence_120: row.divergence_120,
        change_rate: row.change_rate
      });
    });

    // 4. ETF + 주가 데이터 결합
    const combinedData = etfData.map(etf => ({
      ...etf,
      ...(priceMap.get(etf.id) || {
        current_price: null,
        divergence_120: null,
        change_rate: null
      })
    }));

    // 5. 운용사별 그룹화 및 통계 계산
    const providerStats: any = {};

    combinedData.forEach(etf => {
      const provider = etf.etf_provider || 'ETC';

      if (!providerStats[provider]) {
        providerStats[provider] = {
          provider,
          etf_count: 0,
          etfs: []
        };
      }

      providerStats[provider].etf_count++;
      providerStats[provider].etfs.push(etf);
    });

    // 6. 각 운용사별 통계 계산
    const summaryData = Object.values(providerStats).map((stat: any) => {
      const validChangeRates = stat.etfs
        .filter((e: any) => e.change_rate !== null)
        .map((e: any) => parseFloat(e.change_rate));

      const validDeviations = stat.etfs
        .filter((e: any) => e.divergence_120 !== null)
        .map((e: any) => parseFloat(e.divergence_120));

      const avgChangeRate = validChangeRates.length > 0
        ? validChangeRates.reduce((sum: number, val: number) => sum + val, 0) / validChangeRates.length
        : null;

      const avgDeviation = validDeviations.length > 0
        ? validDeviations.reduce((sum: number, val: number) => sum + val, 0) / validDeviations.length
        : null;

      // 상위/하위 성과 ETF 찾기
      const sortedByChangeRate = [...stat.etfs]
        .filter((e: any) => e.change_rate !== null)
        .sort((a: any, b: any) => parseFloat(b.change_rate) - parseFloat(a.change_rate));

      const topPerformer = sortedByChangeRate[0] || null;
      const bottomPerformer = sortedByChangeRate[sortedByChangeRate.length - 1] || null;

      // 상승/하락 ETF 개수
      const risingCount = stat.etfs.filter((e: any) => e.change_rate !== null && parseFloat(e.change_rate) > 0).length;
      const fallingCount = stat.etfs.filter((e: any) => e.change_rate !== null && parseFloat(e.change_rate) < 0).length;

      return {
        provider: stat.provider,
        etf_count: stat.etf_count,
        avg_change_rate: avgChangeRate !== null ? parseFloat(avgChangeRate.toFixed(2)) : null,
        avg_deviation: avgDeviation !== null ? parseFloat(avgDeviation.toFixed(2)) : null,
        rising_count: risingCount,
        falling_count: fallingCount,
        top_performer: topPerformer ? {
          name: topPerformer.name,
          code: topPerformer.code,
          change_rate: parseFloat(topPerformer.change_rate)
        } : null,
        bottom_performer: bottomPerformer ? {
          name: bottomPerformer.name,
          code: bottomPerformer.code,
          change_rate: parseFloat(bottomPerformer.change_rate)
        } : null
      };
    });

    // 7. ETF 개수 기준 내림차순 정렬
    summaryData.sort((a, b) => b.etf_count - a.etf_count);

    return NextResponse.json({
      success: true,
      data: summaryData
    });

  } catch (error: any) {
    console.error('Error in etf-summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
