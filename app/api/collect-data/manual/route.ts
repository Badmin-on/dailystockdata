/**
 * 수동 재무 데이터 수집 API (UI에서 트리거)
 *
 * 수집 내용:
 * - KOSPI 상위 500개 + KOSDAQ 상위 500개 = 1,000개 기업
 * - FnGuide에서 최근 4개년도 재무 컨센서스 데이터
 * - 매출액, 영업이익 및 증감률
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  fetchTopStocks,
  fetchStockFinancialData,
  transformFinancialData,
  type CompanyFinancialData
} from '@/lib/scraper-fnguide';

export const maxDuration = 300; // Vercel Pro: 5분 타임아웃

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * POST 요청 핸들러 (UI에서 수동 트리거)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const scrapeDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  console.log(`🚀 [Manual] 재무 데이터 수집 시작: ${scrapeDate}`);

  try {
    // ============================================
    // 2. 기업 목록 수집 (KOSPI 500 + KOSDAQ 500)
    // ============================================
    console.log('📋 [1/4] 기업 목록 수집 중...');
    
    const kospiStocks = await fetchTopStocks('KOSPI', 500);
    console.log(`   ✅ KOSPI ${kospiStocks.length}개 수집`);
    
    const kosdaqStocks = await fetchTopStocks('KOSDAQ', 500);
    console.log(`   ✅ KOSDAQ ${kosdaqStocks.length}개 수집`);

    const allStocks = [...kospiStocks, ...kosdaqStocks];
    const totalCompanies = allStocks.length;
    
    console.log(`   ✅ 총 ${totalCompanies}개 기업 목록 수집 완료\n`);

    // ============================================
    // 3. 각 기업별 재무 데이터 수집
    // ============================================
    console.log(`📊 [2/4] 재무 데이터 수집 중 (총 ${totalCompanies}개)...`);
    
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    const allFinancialData: CompanyFinancialData[] = [];

    // 배치 처리 (20개씩 진행상황 출력)
    const BATCH_SIZE = 20;
    for (let i = 0; i < allStocks.length; i++) {
      const stock = allStocks[i];
      
      try {
        // FnGuide에서 재무 데이터 수집
        const rawData = await fetchStockFinancialData(stock.code);
        
        // 데이터 검증
        if (!rawData.headers || rawData.headers.length === 0) {
          console.log(`   ⚠️ 데이터 없음: ${stock.name} (${stock.code})`);
          skipCount++;
          continue;
        }
        
        // 데이터 변환
        const financialData = transformFinancialData(stock, rawData);
        allFinancialData.push(financialData);
        
        successCount++;
        
        // 진행률 출력 (20개마다)
        if ((i + 1) % BATCH_SIZE === 0 || i === allStocks.length - 1) {
          const progress = ((i + 1) / totalCompanies * 100).toFixed(1);
          console.log(`   📈 진행: ${i + 1}/${totalCompanies} (${progress}%) - 성공: ${successCount}, 스킵: ${skipCount}`);
        }
        
        // Rate limiting (초당 1개, 원본 로직 유지)
        await delay(1000);
        
      } catch (error) {
        errorCount++;
        console.error(`   ❌ 오류: ${stock.name} (${stock.code})`, 
          error instanceof Error ? error.message : String(error));
      }
    }
    
    console.log(`   ✅ 재무 데이터 수집 완료: 성공 ${successCount}, 실패 ${errorCount}, 스킵 ${skipCount}\n`);

    // ============================================
    // 4. Supabase에 데이터 저장
    // ============================================
    console.log(`💾 [3/4] Supabase 저장 중 (${allFinancialData.length}개 기업)...`);
    
    let companiesSaved = 0;
    let financialRecordsSaved = 0;

    for (let i = 0; i < allFinancialData.length; i++) {
      const item = allFinancialData[i];
      
      try {
        // 4-1. 회사 정보 등록/업데이트
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
          console.error(`   ❌ 회사 등록 실패: ${item.company.name}`, companyError);
          continue;
        }
        
        companiesSaved++;

        // 4-2. 재무 데이터 저장 (각 연도별)
        for (const yearData of item.years_data) {
          // 증감률은 계산하지만 DB에는 저장하지 않음 (원본 로직 유지)
          const { error: finError } = await supabaseAdmin
            .from('financial_data')
            .upsert(
              {
                company_id: company.id,
                year: yearData.year,
                scrape_date: scrapeDate,
                revenue: yearData.revenue,
                operating_profit: yearData.operating_profit,
                is_estimate: false // FnGuide는 컨센서스이므로 추정치로 간주
              },
              { onConflict: 'company_id,year,scrape_date' }
            );

          if (finError) {
            console.error(`   ❌ 재무 데이터 저장 실패: ${item.company.name} ${yearData.year}`, finError);
          } else {
            financialRecordsSaved++;
          }
        }
        
        // 진행률 출력 (50개마다)
        if ((i + 1) % 50 === 0 || i === allFinancialData.length - 1) {
          const progress = ((i + 1) / allFinancialData.length * 100).toFixed(1);
          console.log(`   💾 저장 진행: ${i + 1}/${allFinancialData.length} (${progress}%)`);
        }
        
      } catch (error) {
        console.error(`   ❌ 저장 오류: ${item.company.name}`, 
          error instanceof Error ? error.message : String(error));
      }
    }
    
    console.log(`   ✅ 저장 완료: 기업 ${companiesSaved}개, 재무레코드 ${financialRecordsSaved}개\n`);

    // ============================================
    // 5. Materialized View 갱신
    // ============================================
    console.log('🔄 [4/4] Materialized View 갱신 중...');
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const refreshResponse = await fetch(`${siteUrl}/api/refresh-views`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json'
        }
      });

      if (refreshResponse.ok) {
        console.log('   ✅ View 갱신 완료\n');
      } else {
        console.log('   ⚠️ View 갱신 실패 (재무 데이터 수집은 성공)\n');
      }
    } catch (refreshError) {
      console.error('   ⚠️ View 갱신 오류:', refreshError);
    }

    // ============================================
    // 6. 결과 반환
    // ============================================
    const duration = Math.round((Date.now() - startTime) / 1000);
    const durationMinutes = (duration / 60).toFixed(1);

    console.log('✅ ========================================');
    console.log('✅ [Manual] 재무 데이터 수집 완료!');
    console.log('✅ ========================================');
    console.log(`📊 수집 결과:`);
    console.log(`   - 총 기업: ${totalCompanies}개`);
    console.log(`   - 수집 성공: ${successCount}개`);
    console.log(`   - 저장 완료: ${companiesSaved}개 기업, ${financialRecordsSaved}개 레코드`);
    console.log(`   - 실패/스킵: ${errorCount + skipCount}개`);
    console.log(`⏱️ 소요 시간: ${durationMinutes}분 (${duration}초)`);
    console.log('✅ ========================================\n');

    return NextResponse.json({
      success: true,
      scrape_date: scrapeDate,
      stats: {
        total_companies: totalCompanies,
        scraped_success: successCount,
        scraped_error: errorCount,
        scraped_skip: skipCount,
        saved_companies: companiesSaved,
        saved_financial_records: financialRecordsSaved
      },
      duration: {
        seconds: duration,
        minutes: parseFloat(durationMinutes)
      },
      message: `${companiesSaved}개 기업의 재무 데이터 (${financialRecordsSaved}개 레코드) 수집 완료`
    });

  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error('❌ [Manual] 데이터 수집 중 치명적 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        scrape_date: scrapeDate,
        duration_seconds: duration
      },
      { status: 500 }
    );
  }
}
