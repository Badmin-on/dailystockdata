/**
 * 재무 데이터 수집 테스트 API
 * 
 * KOSPI 10개 + KOSDAQ 10개 = 총 20개 기업만 수집하여 테스트
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  fetchTopStocks,
  fetchStockFinancialData,
  transformFinancialData,
  type CompanyFinancialData
} from '@/lib/scraper-fnguide';

export const maxDuration = 60; // 1분 타임아웃

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GET 요청 핸들러
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const scrapeDate = new Date().toISOString().split('T')[0];

  console.log(`🧪 [TEST] 재무 데이터 수집 테스트 시작`);

  try {
    // 1. 기업 목록 수집 (각 10개씩)
    console.log('📋 기업 목록 수집 중...');
    
    const kospiStocks = await fetchTopStocks('KOSPI', 10);
    const kosdaqStocks = await fetchTopStocks('KOSDAQ', 10);
    const allStocks = [...kospiStocks, ...kosdaqStocks];
    
    console.log(`✅ KOSPI ${kospiStocks.length}개 + KOSDAQ ${kosdaqStocks.length}개 = 총 ${allStocks.length}개\n`);

    // 2. 재무 데이터 수집
    console.log('📊 재무 데이터 수집 중...');
    
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    const allFinancialData: CompanyFinancialData[] = [];
    const detailedResults: any[] = [];

    for (let i = 0; i < allStocks.length; i++) {
      const stock = allStocks[i];
      
      try {
        console.log(`   [${i + 1}/${allStocks.length}] ${stock.name} (${stock.code}) 수집 중...`);
        
        const rawData = await fetchStockFinancialData(stock.code);
        
        if (!rawData.headers || rawData.headers.length === 0) {
          console.log(`      ⚠️ 데이터 없음`);
          skipCount++;
          detailedResults.push({
            company: stock.name,
            code: stock.code,
            market: stock.market,
            status: 'skip',
            reason: 'No data from FnGuide'
          });
          continue;
        }
        
        const financialData = transformFinancialData(stock, rawData);
        allFinancialData.push(financialData);
        
        console.log(`      ✅ 성공 (연도: ${financialData.years_data.length}개)`);
        successCount++;
        
        detailedResults.push({
          company: stock.name,
          code: stock.code,
          market: stock.market,
          status: 'success',
          years_count: financialData.years_data.length,
          sample_data: financialData.years_data[financialData.years_data.length - 1] // 최신 연도
        });
        
        await delay(1000);
        
      } catch (error) {
        errorCount++;
        console.error(`      ❌ 오류: ${error instanceof Error ? error.message : String(error)}`);
        
        detailedResults.push({
          company: stock.name,
          code: stock.code,
          market: stock.market,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    console.log(`\n✅ 수집 완료: 성공 ${successCount}, 실패 ${errorCount}, 스킵 ${skipCount}\n`);

    // 3. Supabase 저장
    console.log('💾 Supabase 저장 중...');
    
    let companiesSaved = 0;
    let financialRecordsSaved = 0;

    for (const item of allFinancialData) {
      try {
        // 회사 등록
        const { data: company, error: companyError } = await supabaseAdmin
          .from('companies')
          .upsert(
            {
              code: item.company.code,
              name: item.company.name,
              market: item.company.market
            },
            { onConflict: 'code' }
          )
          .select('id')
          .single();

        if (companyError || !company) {
          console.error(`   ❌ 회사 등록 실패: ${item.company.name}`);
          continue;
        }
        
        companiesSaved++;

        // 재무 데이터 저장 (증감률은 계산하지만 DB에는 저장하지 않음)
        for (const yearData of item.years_data) {
          const { error: finError } = await supabaseAdmin
            .from('financial_data')
            .upsert(
              {
                company_id: company.id,
                year: yearData.year,
                scrape_date: scrapeDate,
                revenue: yearData.revenue,
                operating_profit: yearData.operating_profit,
                is_estimate: false
              },
              { onConflict: 'company_id,year,scrape_date' }
            );

          if (!finError) {
            financialRecordsSaved++;
          }
        }
        
        console.log(`   ✅ ${item.company.name}: ${item.years_data.length}개 레코드 저장`);
        
      } catch (error) {
        console.error(`   ❌ ${item.company.name} 저장 오류:`, error);
      }
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n🧪 ========================================');
    console.log('🧪 테스트 완료!');
    console.log('🧪 ========================================');
    console.log(`📊 결과:`);
    console.log(`   - 총 기업: ${allStocks.length}개`);
    console.log(`   - 수집 성공: ${successCount}개`);
    console.log(`   - 저장 완료: ${companiesSaved}개 기업, ${financialRecordsSaved}개 레코드`);
    console.log(`⏱️ 소요 시간: ${duration}초`);
    console.log('🧪 ========================================\n');

    return NextResponse.json({
      success: true,
      test_mode: true,
      scrape_date: scrapeDate,
      stats: {
        total: allStocks.length,
        scraped_success: successCount,
        scraped_error: errorCount,
        scraped_skip: skipCount,
        saved_companies: companiesSaved,
        saved_financial_records: financialRecordsSaved
      },
      duration_seconds: duration,
      detailed_results: detailedResults,
      message: `테스트 성공: ${companiesSaved}개 기업, ${financialRecordsSaved}개 재무 레코드 저장`
    });

  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error('❌ 테스트 중 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        test_mode: true,
        error: error instanceof Error ? error.message : String(error),
        duration_seconds: duration
      },
      { status: 500 }
    );
  }
}
