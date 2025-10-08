import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  fetchTopStocks,
  fetchFinancialData,
  parseAndScaleValue,
  extractYear,
  isEstimate
} from '@/lib/scraper';

export const maxDuration = 300;

// 수동 테스트용 API (소수의 기업만 수집)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const scrapeDate = new Date().toISOString().split('T')[0];

  console.log(`🧪 테스트 수집 시작: ${scrapeDate}`);

  try {
    // 테스트: KOSPI 상위 5개만
    console.log('📋 기업 목록 수집 중 (테스트: 5개)...');
    const testStocks = await fetchTopStocks('KOSPI', 5);

    console.log(`✅ ${testStocks.length}개 기업 목록 수집 완료`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const stock of testStocks) {
      try {
        console.log(`🔄 처리 중: ${stock.name} (${stock.code})`);

        const financialData = await fetchFinancialData(stock.code);

        if (!financialData.headers || financialData.headers.length === 0) {
          results.push({
            company: stock.name,
            code: stock.code,
            status: 'error',
            message: 'No financial data found'
          });
          errorCount++;
          continue;
        }

        // 회사 등록
        const { data: company, error: companyError } = await supabaseAdmin
          .from('companies')
          .upsert(
            { code: stock.code, name: stock.name, market: stock.market },
            { onConflict: 'code' }
          )
          .select('id')
          .single();

        if (companyError || !company) {
          results.push({
            company: stock.name,
            code: stock.code,
            status: 'error',
            message: companyError?.message || 'Company upsert failed'
          });
          errorCount++;
          continue;
        }

        // 재무 데이터 저장
        let savedYears = 0;
        for (let yearIndex = 0; yearIndex < financialData.headers.length; yearIndex++) {
          const header = financialData.headers[yearIndex];
          const year = extractYear(header);

          if (!year) continue;

          const revenue = parseAndScaleValue(financialData.data['매출액']?.[yearIndex]);
          const opProfit = parseAndScaleValue(financialData.data['영업이익']?.[yearIndex]);

          if (revenue === null && opProfit === null) continue;

          await supabaseAdmin
            .from('financial_data')
            .upsert(
              {
                company_id: company.id,
                year: year,
                scrape_date: scrapeDate,
                revenue: revenue,
                operating_profit: opProfit,
                is_estimate: isEstimate(header)
              },
              { onConflict: 'company_id,year,scrape_date' }
            );

          savedYears++;
        }

        results.push({
          company: stock.name,
          code: stock.code,
          status: 'success',
          saved_years: savedYears,
          headers: financialData.headers
        });

        successCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        results.push({
          company: stock.name,
          code: stock.code,
          status: 'error',
          message: error.message
        });
        errorCount++;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      message: 'Test collection completed',
      scrape_date: scrapeDate,
      total_stocks: testStocks.length,
      success_count: successCount,
      error_count: errorCount,
      duration_seconds: duration,
      results
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        scrape_date: scrapeDate
      },
      { status: 500 }
    );
  }
}
