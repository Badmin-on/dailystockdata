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

// 수동 전체 수집 API (KOSPI + KOSDAQ 전체)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const scrapeDate = new Date().toISOString().split('T')[0];

  console.log(`🚀 전체 재무 데이터 수집 시작: ${scrapeDate}`);

  try {
    // KOSPI + KOSDAQ 전체 수집
    console.log('📋 KOSPI 기업 목록 수집 중...');
    const kospiStocks = await fetchTopStocks('KOSPI', 1000);
    console.log(`✅ KOSPI ${kospiStocks.length}개 수집`);

    console.log('📋 KOSDAQ 기업 목록 수집 중...');
    const kosdaqStocks = await fetchTopStocks('KOSDAQ', 1000);
    console.log(`✅ KOSDAQ ${kosdaqStocks.length}개 수집`);

    const allStocks = [...kospiStocks, ...kosdaqStocks];
    console.log(`✅ 총 ${allStocks.length}개 기업 목록 수집 완료`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // 배치 처리 (50개씩)
    const BATCH_SIZE = 50;
    for (let i = 0; i < allStocks.length; i += BATCH_SIZE) {
      const batch = allStocks.slice(i, i + BATCH_SIZE);
      console.log(`🔄 배치 처리 중: ${i + 1}-${Math.min(i + BATCH_SIZE, allStocks.length)}/${allStocks.length}`);

      for (const stock of batch) {
        try {
          const financialData = await fetchFinancialData(stock.code);

          if (!financialData.headers || financialData.headers.length === 0) {
            skippedCount++;
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
            console.error(`❌ 회사 등록 실패: ${stock.name}`, companyError);
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

          successCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`❌ 오류 (${stock.name}):`, error.message);
          errorCount++;
        }
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n✅ 재무 데이터 수집 완료!');
    console.log(`📊 결과: 성공 ${successCount}개, 실패 ${errorCount}개, 스킵 ${skippedCount}개`);
    console.log(`⏱️ 소요 시간: ${duration}초`);

    // View 자동 갱신
    console.log('🔄 Materialized View 갱신 중...');
    try {
      const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/refresh-views`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json'
        }
      });

      if (refreshResponse.ok) {
        console.log('✅ View 갱신 완료');
      }
    } catch (refreshError) {
      console.error('⚠️ View 갱신 오류:', refreshError);
    }

    return NextResponse.json({
      success: true,
      message: 'Financial data collection completed',
      scrape_date: scrapeDate,
      total_companies: allStocks.length,
      success_count: successCount,
      error_count: errorCount,
      skipped_count: skippedCount,
      duration_seconds: duration
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
