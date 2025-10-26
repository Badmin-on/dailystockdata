/**
 * 배치 방식 주가 데이터 수집 API
 *
 * Vercel 5분 타임아웃 회피를 위해 200개씩 배치 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchLatestStockPrice } from '@/lib/scraper-daily';
import { ProgressTracker } from '@/lib/progress-tracker';

export const maxDuration = 300; // 5분

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { sessionId, batchIndex, totalBatches } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const COMPANIES_PER_BATCH = 200;
    const startIdx = batchIndex * COMPANIES_PER_BATCH;
    const endIdx = startIdx + COMPANIES_PER_BATCH;

    console.log(`🚀 [Batch ${batchIndex + 1}/${totalBatches}] 주가 데이터 수집 시작`);

    const tracker = new ProgressTracker(sessionId, 'price');

    // 첫 번째 배치인 경우 초기화
    if (batchIndex === 0) {
      const { data: companies } = await supabaseAdmin
        .from('companies')
        .select('id, code, name, market')
        .order('id');

      await tracker.initialize(companies?.length || 0);
      await tracker.update({
        log: `📋 전체 ${companies?.length || 0}개 기업 로드 완료`
      });
    }

    // 현재 배치의 기업 목록 가져오기
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, code, name, market')
      .order('id')
      .range(startIdx, endIdx - 1);

    if (!companies || companies.length === 0) {
      throw new Error('No companies found for this batch');
    }

    // 이전 카운트 가져오기
    const { data: progressData } = await supabaseAdmin
      .from('collection_progress')
      .select('success_count, error_count, skip_count, total_count')
      .eq('session_id', sessionId)
      .single();

    let successCount = progressData?.success_count || 0;
    let errorCount = progressData?.error_count || 0;
    let skippedCount = progressData?.skip_count || 0;
    const totalCount = progressData?.total_count || 1000;

    await tracker.update({
      log: `📊 배치 ${batchIndex + 1}/${totalBatches} 처리 중 (${startIdx + 1}~${startIdx + companies.length}번째)`
    });

    // 10개씩 병렬 처리
    const PARALLEL_SIZE = 10;
    for (let i = 0; i < companies.length; i += PARALLEL_SIZE) {
      const batch = companies.slice(i, i + PARALLEL_SIZE);
      const globalIndex = startIdx + i;

      const pricePromises = batch.map(async (company) => {
        try {
          const price = await fetchLatestStockPrice(company.code);
          return { company, price, error: null };
        } catch (error) {
          return { company, price: null, error };
        }
      });

      const results = await Promise.all(pricePromises);

      // DB에 저장
      for (const result of results) {
        if (result.error) {
          errorCount++;
          continue;
        }

        const { company, price } = result;

        if (!price || !price.date || price.close_price === null) {
          skippedCount++;
          continue;
        }

        try {
          const { error: upsertError } = await supabaseAdmin
            .from('daily_stock_prices')
            .upsert(
              {
                company_id: company.id,
                date: price.date,
                close_price: price.close_price,
                change_rate: price.change_rate,
                volume: price.volume
              },
              { onConflict: 'company_id,date' }
            );

          if (upsertError) {
            errorCount++;
          } else {
            successCount++;
          }
        } catch (dbError) {
          errorCount++;
        }
      }

      // 진행률 업데이트
      const currentCount = globalIndex + batch.length;
      const progress = (currentCount / totalCount * 100).toFixed(1);
      await tracker.update({
        current_count: currentCount,
        success_count: successCount,
        error_count: errorCount,
        skip_count: skippedCount,
        log: `📈 ${currentCount}/${totalCount} (${progress}%) - 성공: ${successCount}`
      });

      // 배치 간 딜레이
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 마지막 배치인 경우 완료 처리
    const isLastBatch = batchIndex === totalBatches - 1;
    if (isLastBatch) {
      await tracker.complete({
        success_count: successCount,
        error_count: errorCount,
        skip_count: skippedCount
      });
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      batch: {
        index: batchIndex,
        total: totalBatches,
        processed: companies.length,
        isLast: isLastBatch
      },
      stats: {
        success_count: successCount,
        error_count: errorCount,
        skipped_count: skippedCount
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
