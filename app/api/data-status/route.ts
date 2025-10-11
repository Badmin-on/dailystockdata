import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Basic counts
    const { count: totalCompanies } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true });

    const { count: totalFinancial } = await supabaseAdmin
      .from('financial_data')
      .select('*', { count: 'exact', head: true });

    const { count: totalPrices } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('*', { count: 'exact', head: true });

    // 2. Latest dates
    const { data: latestPriceDate } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const { data: latestFinancialDate } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(1)
      .single();

    // 3. Count distinct companies with prices using aggregation query
    const { data: distinctCompanies, error: distinctError } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('company_id');

    if (distinctError) {
      console.error('Error fetching distinct companies:', distinctError);
    }

    const uniqueCompaniesWithPrices = distinctCompanies
      ? new Set(distinctCompanies.map((p) => p.company_id)).size
      : 0;

    // 4. Average prices per company
    const avgPricesPerCompany = uniqueCompaniesWithPrices > 0
      ? Math.round((totalPrices || 0) / uniqueCompaniesWithPrices)
      : 0;

    // 5. Estimate 120-day ready companies
    const estimated120DayCompanies = avgPricesPerCompany >= 120
      ? Math.floor(uniqueCompaniesWithPrices * 0.8)
      : 0;

    // 6. 시장별 통계
    const { count: kospiCount } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('market', 'KOSPI');

    const { count: kosdaqCount } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('market', 'KOSDAQ');

    // 7. 투자 기회 분석 가능 여부 확인
    const { data: investmentOpportunities, error: invError } = await supabaseAdmin
      .from('v_investment_opportunities')
      .select('*', { count: 'exact', head: true })
      .limit(1);

    const canAnalyzeInvestments = !invError;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      overall: {
        total_companies: totalCompanies || 0,
        total_financial_records: totalFinancial || 0,
        total_price_records: totalPrices || 0,
        companies_with_prices: uniqueCompaniesWithPrices,
        avg_prices_per_company: avgPricesPerCompany,
        estimated_companies_with_120day: estimated120DayCompanies,
        latest_price_date: latestPriceDate?.date || null,
        latest_financial_date: latestFinancialDate?.scrape_date || null,
      },
      markets: {
        kospi: {
          total: kospiCount || 0,
        },
        kosdaq: {
          total: kosdaqCount || 0,
        },
      },
      collection_progress: {
        financial_coverage: `${((totalCompanies || 0) > 0 ? ((totalFinancial || 0) / ((totalCompanies || 0) * 4) * 100) : 0).toFixed(1)}%`,
        price_collection_rate: `${(((uniqueCompaniesWithPrices / (totalCompanies || 1)) * 100).toFixed(1))}%`,
        avg_days_collected: avgPricesPerCompany,
        estimated_ma120_ready_rate: `${((estimated120DayCompanies / (totalCompanies || 1)) * 100).toFixed(1)}%`,
        can_analyze_investments: canAnalyzeInvestments,
      },
      next_steps: {
        need_more_price_data: avgPricesPerCompany < 120,
        days_until_120day: Math.max(0, 120 - avgPricesPerCompany),
        recommendation: avgPricesPerCompany >= 120
          ? '✅ 투자 기회 분석 가능 - View 갱신 권장'
          : `⏳ 약 ${120 - avgPricesPerCompany}일 후 분석 가능`,
      },
    });
  } catch (error: any) {
    console.error('Data status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
