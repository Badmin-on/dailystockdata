/**
 * 배치 방식 재무 데이터 수집 API
 *
 * Vercel 5분 타임아웃 회피를 위해 100개씩 배치 처리
 * 클라이언트에서 순차적으로 여러 번 호출
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  fetchTopStocks,
  fetchStockFinancialData,
  transformFinancialData,
  type CompanyFinancialData
} from '@/lib/scraper-fnguide';
import { ProgressTracker } from '@/lib/progress-tracker';

export const maxDuration = 300; // 5분

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const scrapeDate = new Date().toISOString().split('T')[0];

  try {
    const body = await request.json();
    const { sessionId, batchIndex, totalBatches } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const COMPANIES_PER_BATCH = 100;
    const startIdx = batchIndex * COMPANIES_PER_BATCH;
    const endIdx = startIdx + COMPANIES_PER_BATCH;

    console.log(`🚀 [Batch ${batchIndex + 1}/${totalBatches}] 재무 데이터 수집 시작`);

    // 진행률 추적기
    const tracker = new ProgressTracker(sessionId, 'financial');

    // 첫 번째 배치인 경우 초기화
    if (batchIndex === 0) {
      // 전체 기업 목록 가져오기
      const kospiStocks = await fetchTopStocks('KOSPI', 500);
      const kosdaqStocks = await fetchTopStocks('KOSDAQ', 500);
      const allStocks = [...kospiStocks, ...kosdaqStocks];

      await tracker.initialize(allStocks.length);
      await tracker.update({
        log: `📋 전체 ${allStocks.length}개 기업 목록 수집 완료`
      });

      // 전체 목록을 세션 스토리지에 임시 저장 (다음 배치에서 사용)
      const { error } = await supabaseAdmin
        .from('collection_progress')
        .update({
          current_item: JSON.stringify(allStocks)
        })
        .eq('session_id', sessionId);

      if (error) {
        console.error('Failed to store stock list:', error);
      }
    }

    // 저장된 전체 목록 가져오기
    const { data: progressData } = await supabaseAdmin
      .from('collection_progress')
      .select('current_item, success_count, error_count, skip_count')
      .eq('session_id', sessionId)
      .single();

    if (!progressData || !progressData.current_item) {
      throw new Error('Stock list not found in progress data');
    }

    const allStocks = JSON.parse(progressData.current_item);
    const batchStocks = allStocks.slice(startIdx, endIdx);
    const totalCompanies = allStocks.length;

    // 이전 배치의 누적 카운트
    let successCount = progressData.success_count || 0;
    let errorCount = progressData.error_count || 0;
    let skipCount = progressData.skip_count || 0;

    const allFinancialData: CompanyFinancialData[] = [];

    await tracker.update({
      log: `📊 배치 ${batchIndex + 1}/${totalBatches} 처리 중 (${startIdx + 1}~${Math.min(endIdx, totalCompanies)}번째)`
    });

    // 배치 내 각 기업 처리
    for (let i = 0; i < batchStocks.length; i++) {
      const stock = batchStocks[i];
      const globalIndex = startIdx + i;

      try {
        const rawData = await fetchStockFinancialData(stock.code);

        if (!rawData.headers || rawData.headers.length === 0) {
          skipCount++;
          await tracker.update({
            current_count: globalIndex + 1,
            skip_count: skipCount,
            log: `⚠️ [${globalIndex + 1}/${totalCompanies}] 데이터 없음: ${stock.name}`
          });
          continue;
        }

        const financialData = transformFinancialData(stock, rawData);
        allFinancialData.push(financialData);
        successCount++;

        // 10개마다 진행률 업데이트
        if ((i + 1) % 10 === 0 || i === batchStocks.length - 1) {
          const progress = ((globalIndex + 1) / totalCompanies * 100).toFixed(1);
          await tracker.update({
            current_count: globalIndex + 1,
            success_count: successCount,
            error_count: errorCount,
            skip_count: skipCount,
            current_item: stock.name,
            log: `📈 ${globalIndex + 1}/${totalCompanies} (${progress}%) - 성공: ${successCount}`
          });
        }

        await delay(1000); // Rate limiting

      } catch (error) {
        errorCount++;
        await tracker.update({
          current_count: globalIndex + 1,
          error_count: errorCount,
          log: `❌ [${globalIndex + 1}/${totalCompanies}] 오류: ${stock.name}`
        });
      }
    }

    // Supabase에 데이터 저장
    let companiesSaved = 0;
    let financialRecordsSaved = 0;

    for (const item of allFinancialData) {
      try {
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

        if (companyError || !company) continue;

        companiesSaved++;

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
      } catch (error) {
        console.error(`Failed to save: ${item.company.name}`, error);
      }
    }

    await tracker.update({
      log: `💾 배치 저장 완료: 기업 ${companiesSaved}개, 레코드 ${financialRecordsSaved}개`
    });

    // 마지막 배치인 경우 완료 처리
    const isLastBatch = batchIndex === totalBatches - 1;
    if (isLastBatch) {
      await tracker.complete({
        success_count: successCount,
        error_count: errorCount,
        skip_count: skipCount
      });

      // Materialized View 갱신
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        await fetch(`${siteUrl}/api/refresh-views`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json'
          }
        });
        await tracker.update({ log: '🔄 View 갱신 완료' });
      } catch (e) {
        console.error('View refresh failed:', e);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      batch: {
        index: batchIndex,
        total: totalBatches,
        processed: batchStocks.length,
        isLast: isLastBatch
      },
      stats: {
        success_count: successCount,
        error_count: errorCount,
        skip_count: skipCount,
        companies_saved: companiesSaved,
        records_saved: financialRecordsSaved
      },
      duration_seconds: duration
    });

  } catch (error: any) {
    console.error('[Batch] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
