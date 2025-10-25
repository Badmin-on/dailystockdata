import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * 데이터 수집 현황 조회 API
 * 모니터링 페이지에서 실시간 수집 상태 확인용
 */
export async function GET() {
  try {
    // Supabase 함수 호출
    const { data: dashboardData, error } = await supabaseAdmin
      .rpc('get_collection_dashboard');

    if (error) {
      console.error('Dashboard function error:', error);
      throw error;
    }

    // 데이터가 없으면 기본값 반환
    if (!dashboardData) {
      throw new Error('No data returned from database');
    }

    const totalCompanies = dashboardData.total_companies || 0;
    const companiesWithPrices = dashboardData.companies_with_prices || 0;
    const totalFinancialRecords = dashboardData.total_financial_records || 0;
    const totalPriceRecords = dashboardData.total_price_records || 0;
    const kospiCompanies = dashboardData.kospi_companies || 0;
    const kosdaqCompanies = dashboardData.kosdaq_companies || 0;

    // 목표치 (4개년 데이터)
    const targetFinancialCompanies = totalCompanies;
    const targetPriceCompanies = totalCompanies;

    // 재무 데이터 수집률 계산
    const financialCompaniesCount = totalFinancialRecords > 0
      ? Math.min(totalCompanies, Math.floor(totalFinancialRecords / 4))
      : 0;
    const financialProgress = targetFinancialCompanies > 0
      ? (financialCompaniesCount / targetFinancialCompanies) * 100
      : 0;

    // 주가 데이터 수집률 계산
    const priceProgress = targetPriceCompanies > 0
      ? (companiesWithPrices / targetPriceCompanies) * 100
      : 0;

    // collection-status 페이지가 기대하는 형식으로 변환
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        companies: {
          total: totalCompanies,
          with_financial_data: financialCompaniesCount,
          with_price_data: companiesWithPrices,
          kospi: kospiCompanies,
          kosdaq: kosdaqCompanies,
        },
        financial_data: {
          companies_count: financialCompaniesCount,
          total_records: totalFinancialRecords,
          latest_update: dashboardData.latest_financial_date || null,
          progress_percent: parseFloat(financialProgress.toFixed(1)),
          target: targetFinancialCompanies,
        },
        price_data: {
          companies_count: companiesWithPrices,
          total_records: totalPriceRecords,
          latest_update: dashboardData.latest_price_date || null,
          progress_percent: parseFloat(priceProgress.toFixed(1)),
          target: targetPriceCompanies,
        },
        overall: {
          target_companies: totalCompanies,
          financial_coverage: `${financialProgress.toFixed(1)}%`,
          price_coverage: `${priceProgress.toFixed(1)}%`,
          status: (financialProgress >= 100 && priceProgress >= 100) ? 'COMPLETE' : 'IN_PROGRESS',
        },
      },
    });
  } catch (error: any) {
    console.error('Collection status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch collection status',
      },
      { status: 500 }
    );
  }
}
