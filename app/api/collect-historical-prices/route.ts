import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchStockPrice } from '@/lib/scraper'; // 기존 120일 수집 함수

export const maxDuration = 300; // 5분

// 과거 주가 데이터 수집 API (120일치 - 필요할 때만 실행)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startBatch = parseInt(searchParams.get('start') || '1');
  const endBatch = parseInt(searchParams.get('end') || '10');
  const batchSize = 50;

  const startTime = Date.now();
  console.log(`🕰️ 과거 주가 데이터 수집 시작 (배치 ${startBatch}~${endBatch})`);

  try {
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let batchNum = startBatch; batchNum <= endBatch; batchNum++) {
      const offset = (batchNum - 1) * batchSize;

      // 배치별로 기업 가져오기
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from('companies')
        .select('id, code, name')
        .order('id')
        .range(offset, offset + batchSize - 1);

      if (companiesError || !companies) {
        throw new Error(`Failed to fetch companies: ${companiesError?.message}`);
      }

      console.log(`📦 배치 ${batchNum}: ${companies.length}개 기업 처리 중...`);

      for (const company of companies) {
        try {
          const priceDataArray = await fetchStockPrice(company.code);

          if (!priceDataArray || priceDataArray.length === 0) {
            skippedCount++;
            continue;
          }

          // 120일치 데이터를 배치로 저장
          for (const priceData of priceDataArray) {
            const { error: upsertError } = await supabaseAdmin
              .from('daily_stock_prices')
              .upsert(
                {
                  company_id: company.id,
                  date: priceData.date,
                  close_price: priceData.close_price,
                  change_rate: priceData.change_rate,
                  volume: priceData.volume
                },
                { onConflict: 'company_id,date' }
              );

            if (upsertError) {
              console.error(`❌ 저장 실패: ${company.name} (${priceData.date})`, upsertError);
              errorCount++;
            } else {
              successCount++;
            }
          }

          console.log(`✅ ${company.name}: ${priceDataArray.length}일치 저장`);

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`❌ 오류 (${company.name}):`, error.message);
          errorCount++;
        }
      }

      console.log(`✅ 배치 ${batchNum} 완료`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`✅ 과거 데이터 수집 완료!`);
    console.log(`📊 결과: 성공 ${successCount}개, 실패 ${errorCount}개, 스킵 ${skippedCount}개`);

    return NextResponse.json({
      success: true,
      message: '과거 주가 데이터 수집 완료',
      batches: {
        start: startBatch,
        end: endBatch
      },
      stats: {
        success_count: successCount,
        error_count: errorCount,
        skipped_count: skippedCount,
        duration_seconds: duration
      }
    });
  } catch (error: any) {
    console.error('과거 데이터 수집 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
