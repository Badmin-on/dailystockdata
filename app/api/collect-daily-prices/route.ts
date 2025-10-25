import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchLatestStockPrice } from '@/lib/scraper-daily';

export const maxDuration = 300; // 5분

// 일별 주가 업데이트 API (당일 최신 주가 1개만 수집 - 빠름!)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('secret');
  
  // Cron Secret 검증
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('🚀 일별 주가 업데이트 시작');

  try {
    // 전체 기업 목록 가져오기
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, code, name, market')
      .order('id');

    if (companiesError || !companies) {
      throw new Error(`Failed to fetch companies: ${companiesError?.message}`);
    }

    console.log(`✅ ${companies.length}개 기업 로드 완료`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // 10개씩 병렬 처리 (원래 코드 방식)
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      batches.push(companies.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 총 ${batches.length}개 배치로 처리`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // 병렬로 주가 수집
      const pricePromises = batch.map(company => 
        fetchLatestStockPrice(company.code)
          .then(price => ({ company, price, error: null }))
          .catch(error => ({ company, price: null, error }))
      );

      const results = await Promise.all(pricePromises);

      // DB에 저장
      for (const result of results) {
        if (result.error) {
          console.error(`❌ ${result.company.name} (${result.company.code}) 수집 실패:`, result.error);
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
            console.error(`❌ ${company.name} 저장 실패:`, upsertError);
            errorCount++;
          } else {
            successCount++;
            console.log(`✅ ${company.name} (${company.code}): ${price.close_price}원`);
          }
        } catch (dbError) {
          console.error(`❌ ${company.name} DB 오류:`, dbError);
          errorCount++;
        }
      }

      // 진행률 출력
      const progress = ((batchIndex + 1) / batches.length * 100).toFixed(1);
      console.log(`📊 진행률: ${progress}% (배치 ${batchIndex + 1}/${batches.length})`);

      // 배치 간 딜레이 (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`✅ 일별 주가 업데이트 완료!`);
    console.log(`📊 결과: 성공 ${successCount}개, 실패 ${errorCount}개, 스킵 ${skippedCount}개`);
    console.log(`⏱️ 소요 시간: ${duration}초`);

    return NextResponse.json({
      success: true,
      message: '일별 주가 업데이트 완료',
      stats: {
        total_companies: companies.length,
        success_count: successCount,
        error_count: errorCount,
        skipped_count: skippedCount,
        duration_seconds: duration
      }
    });
  } catch (error: any) {
    console.error('일별 주가 업데이트 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
