/**
 * 데이터 수집 진행 상태 확인 API
 * 
 * 현재 DB에 저장된 데이터 현황을 실시간으로 조회
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 전체 회사 수
    const { count: totalCompanies } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true });

    // 2. 재무 데이터가 있는 회사 수 (최소 1개 이상의 재무 레코드)
    const { data: companiesWithFinancial } = await supabaseAdmin
      .from('financial_data')
      .select('company_id')
      .order('company_id');
    
    const uniqueCompaniesWithFinancial = new Set(
      companiesWithFinancial?.map(row => row.company_id) || []
    ).size;

    // 3. 총 재무 레코드 수
    const { count: totalFinancialRecords } = await supabaseAdmin
      .from('financial_data')
      .select('*', { count: 'exact', head: true });

    // 4. 가격 데이터가 있는 회사 수
    const { data: companiesWithPrices } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('company_id')
      .order('company_id');
    
    const uniqueCompaniesWithPrices = new Set(
      companiesWithPrices?.map(row => row.company_id) || []
    ).size;

    // 5. 총 가격 레코드 수
    const { count: totalPriceRecords } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('*', { count: 'exact', head: true });

    // 6. 시장별 회사 수
    const { data: marketStats } = await supabaseAdmin
      .from('companies')
      .select('market')
      .order('market');
    
    const kospiCount = marketStats?.filter(row => row.market === 'KOSPI').length || 0;
    const kosdaqCount = marketStats?.filter(row => row.market === 'KOSDAQ').length || 0;

    // 7. 최근 업데이트 시간
    const { data: latestFinancial } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(1)
      .single();

    const { data: latestPrice } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // 8. 목표 대비 진행률 계산
    const TARGET_COMPANIES = 1000; // KOSPI 500 + KOSDAQ 500
    const financialProgress = ((uniqueCompaniesWithFinancial / TARGET_COMPANIES) * 100).toFixed(1);
    const priceProgress = ((uniqueCompaniesWithPrices / TARGET_COMPANIES) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        companies: {
          total: totalCompanies || 0,
          with_financial_data: uniqueCompaniesWithFinancial,
          with_price_data: uniqueCompaniesWithPrices,
          kospi: kospiCount,
          kosdaq: kosdaqCount
        },
        financial_data: {
          companies_count: uniqueCompaniesWithFinancial,
          total_records: totalFinancialRecords || 0,
          latest_update: latestFinancial?.scrape_date || null,
          progress_percent: parseFloat(financialProgress),
          target: TARGET_COMPANIES
        },
        price_data: {
          companies_count: uniqueCompaniesWithPrices,
          total_records: totalPriceRecords || 0,
          latest_update: latestPrice?.updated_at || null,
          progress_percent: parseFloat(priceProgress),
          target: TARGET_COMPANIES
        },
        overall: {
          target_companies: TARGET_COMPANIES,
          financial_coverage: `${financialProgress}%`,
          price_coverage: `${priceProgress}%`,
          status: uniqueCompaniesWithFinancial >= TARGET_COMPANIES ? 'COMPLETE' : 'IN_PROGRESS'
        }
      }
    });

  } catch (error) {
    console.error('❌ 상태 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
