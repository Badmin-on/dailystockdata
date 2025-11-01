import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * ETF 섹터 모니터링 API
 * 136개 ETF의 실시간 주가 및 이격도 정보 제공
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider'); // 운용사 필터
    const sector = searchParams.get('sector'); // 섹터 필터
    const searchTerm = searchParams.get('search'); // 검색어
    const sortBy = searchParams.get('sortBy') || 'etf_provider';
    const sortOrder = searchParams.get('sortOrder') || 'ASC';

    // ETF 목록 조회 (companies 테이블)
    let etfQuery = supabaseAdmin
      .from('companies')
      .select('id, name, code, market, etf_provider, etf_sector')
      .eq('is_etf', true);

    // 운용사 필터
    if (provider && provider !== 'ALL') {
      etfQuery = etfQuery.eq('etf_provider', provider);
    }

    // 섹터 필터
    if (sector && sector !== 'ALL') {
      etfQuery = etfQuery.eq('etf_sector', sector);
    }

    // 검색 필터
    if (searchTerm) {
      etfQuery = etfQuery.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
    }

    const { data: etfData, error: etfError } = await etfQuery;

    if (etfError) {
      console.error('Error fetching ETF data:', etfError);
      throw etfError;
    }

    if (!etfData || etfData.length === 0) {
      return NextResponse.json([]);
    }

    // ETF company IDs 추출
    const companyIds = etfData.map(etf => etf.id);

    // 주가 데이터 조회 (mv_stock_analysis)
    const { data: priceData, error: priceError } = await supabaseAdmin
      .from('mv_stock_analysis')
      .select('company_id, current_price, ma_120, divergence_120, latest_date, change_rate, volume')
      .in('company_id', companyIds);

    if (priceError) {
      console.error('Error fetching price data:', priceError);
    }

    // 주가 데이터를 Map으로 변환
    const priceMap = new Map();
    priceData?.forEach((row: any) => {
      priceMap.set(row.company_id, {
        current_price: row.current_price,
        ma_120: row.ma_120,
        divergence_120: row.divergence_120,
        latest_date: row.latest_date,
        change_rate: row.change_rate,
        volume: row.volume
      });
    });

    // ETF 데이터 + 주가 데이터 결합
    const combinedData = etfData.map(etf => {
      const priceInfo = priceMap.get(etf.id) || {
        current_price: null,
        ma_120: null,
        divergence_120: null,
        latest_date: null,
        change_rate: null,
        volume: null
      };

      return {
        name: etf.name,
        code: etf.code,
        market: etf.market,
        provider: etf.etf_provider,
        sector: etf.etf_sector,
        current_price: priceInfo.current_price,
        ma_120: priceInfo.ma_120,
        price_deviation: priceInfo.divergence_120,
        latest_date: priceInfo.latest_date,
        change_rate: priceInfo.change_rate,
        volume: priceInfo.volume
      };
    });

    // 정렬
    const validSortColumns = ['name', 'provider', 'sector', 'current_price', 'price_deviation', 'change_rate', 'volume'];

    if (validSortColumns.includes(sortBy)) {
      combinedData.sort((a, b) => {
        let aVal: any = a[sortBy as keyof typeof a];
        let bVal: any = b[sortBy as keyof typeof b];

        // null 처리
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        // 숫자/문자열 비교
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (sortOrder === 'ASC') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return NextResponse.json({
      success: true,
      count: combinedData.length,
      data: combinedData
    });

  } catch (error: any) {
    console.error('Error in etf-monitoring:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
