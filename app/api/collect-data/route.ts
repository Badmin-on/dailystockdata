import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  fetchTopStocks,
  fetchFinancialData,
  parseAndScaleValue,
  extractYear,
  isEstimate
} from '@/lib/scraper';

export const maxDuration = 300; // Vercel Pro: 5분 타임아웃

export async function GET(request: NextRequest) {
  // Cron Secret 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const scrapeDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  console.log(`🚀 데이터 수집 시작: ${scrapeDate}`);

  try {
    // 1. 상위 1000개 기업 목록 가져오기
    console.log('📋 기업 목록 수집 중...');
    const [kospiStocks, kosdaqStocks] = await Promise.all([
      fetchTopStocks('KOSPI', 500),
      fetchTopStocks('KOSDAQ', 500)
    ]);

    const allStocks = [...kospiStocks, ...kosdaqStocks];
    console.log(`✅ ${allStocks.length}개 기업 목록 수집 완료`);

    let successCount = 0;
    let errorCount = 0;

    // 2. 배치 처리 (50개씩)
    const BATCH_SIZE = 50;
    for (let i = 0; i < allStocks.length; i += BATCH_SIZE) {
      const batch = allStocks.slice(i, i + BATCH_SIZE);
      console.log(`🔄 처리 중: ${i + 1}-${Math.min(i + BATCH_SIZE, allStocks.length)}/${allStocks.length}`);

      for (const stock of batch) {
        try {
          // 재무 데이터 수집
          const financialData = await fetchFinancialData(stock.code);

          if (!financialData.headers || financialData.headers.length === 0) {
            errorCount++;
            continue;
          }

          // 회사 등록/업데이트
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
          for (let yearIndex = 0; yearIndex < financialData.headers.length; yearIndex++) {
            const header = financialData.headers[yearIndex];
            const year = extractYear(header);

            if (!year) continue;

            const revenue = parseAndScaleValue(financialData.data['매출액']?.[yearIndex]);
            const opProfit = parseAndScaleValue(financialData.data['영업이익']?.[yearIndex]);

            if (revenue === null && opProfit === null) continue;

            const { error: finError } = await supabaseAdmin
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

            if (finError) {
              console.error(`❌ 재무 데이터 저장 실패: ${stock.name} ${year}`, finError);
            }
          }

          successCount++;

          // Rate limiting (초당 1-2개)
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`❌ 오류 (${stock.name}):`, error.message);
          errorCount++;
        }
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n✅ 데이터 수집 완료!');
    console.log(`📊 결과: 성공 ${successCount}개, 실패 ${errorCount}개`);
    console.log(`⏱️ 소요 시간: ${duration}초`);

    return NextResponse.json({
      success: true,
      scrape_date: scrapeDate,
      total_stocks: allStocks.length,
      success_count: successCount,
      error_count: errorCount,
      duration_seconds: duration
    });
  } catch (error: any) {
    console.error('❌ 데이터 수집 중 오류:', error);
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
