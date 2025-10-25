import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchStockPrice } from '@/lib/scraper';

export const maxDuration = 60;

// 작은 배치 수집 API (한 번에 20개씩 - 60초 내 완료 가능)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const batchNumber = parseInt(searchParams.get('batch') || '1');
  const batchSize = parseInt(searchParams.get('size') || '20');

  const startTime = Date.now();
  const offset = (batchNumber - 1) * batchSize;

  console.log(`🚀 배치 ${batchNumber} 시작 (기업 ${offset + 1}~${offset + batchSize})`);

  try {
    // 배치별로 기업 가져오기
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, code, name')
      .order('id')
      .range(offset, offset + batchSize - 1);

    if (companiesError || !companies) {
      throw new Error(`Failed to fetch companies: ${companiesError?.message}`);
    }

    console.log(`✅ ${companies.length}개 기업 로드 완료`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const results: any[] = [];

    for (const company of companies) {
      try {
        const priceDataArray = await fetchStockPrice(company.code);

        if (!priceDataArray || priceDataArray.length === 0) {
          console.log(`⚠️ 데이터 없음: ${company.name} (${company.code})`);
          skippedCount++;
          results.push({
            company: company.name,
            code: company.code,
            status: 'skipped',
            reason: 'no_data'
          });
          continue;
        }

        // 120일치 데이터를 배치로 저장
        let savedCount = 0;
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

          if (!upsertError) {
            savedCount++;
          }
        }

        successCount += savedCount;
        results.push({
          company: company.name,
          code: company.code,
          status: 'success',
          records_saved: savedCount
        });

        console.log(`✅ ${company.name}: ${savedCount}개 레코드 저장`);

        // 기업 간 짧은 딜레이 (Rate Limiting 방지)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`❌ 오류 (${company.name}):`, error.message);
        errorCount++;
        results.push({
          company: company.name,
          code: company.code,
          status: 'error',
          error: error.message
        });
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`✅ 배치 ${batchNumber} 완료! (${duration}초)`);
    console.log(`📊 결과: 성공 ${successCount}개, 실패 ${errorCount}개, 스킵 ${skippedCount}개`);

    // 다음 배치 정보
    const totalCompanies = 1788;
    const totalBatches = Math.ceil(totalCompanies / batchSize);
    const hasMore = batchNumber < totalBatches;

    return NextResponse.json({
      success: true,
      batch: batchNumber,
      batch_size: batchSize,
      total_batches: totalBatches,
      has_more: hasMore,
      next_batch: hasMore ? batchNumber + 1 : null,
      companies_processed: companies.length,
      success_count: successCount,
      error_count: errorCount,
      skipped_count: skippedCount,
      duration_seconds: duration,
      results: results
    });
  } catch (error: any) {
    console.error(`❌ 배치 ${batchNumber} 실패:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        batch: batchNumber
      },
      { status: 500 }
    );
  }
}
