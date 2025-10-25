import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchLatestStockPrice } from '@/lib/scraper-daily';

export const dynamic = 'force-dynamic';

// 수동 테스트용 API (첫 20개 기업만)
export async function GET() {
  const startTime = Date.now();
  console.log('🧪 일별 주가 수집 테스트 시작 (20개 기업)');

  try {
    // 첫 20개 기업만 가져오기
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, code, name, market')
      .order('id')
      .limit(20);

    if (companiesError || !companies) {
      throw new Error(`Failed to fetch companies: ${companiesError?.message}`);
    }

    console.log(`✅ ${companies.length}개 기업 로드 완료`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const results: any[] = [];

    // 순차 처리 (로그 확인용)
    for (const company of companies) {
      try {
        const price = await fetchLatestStockPrice(company.code);

        if (!price || !price.date || price.close_price === null) {
          skippedCount++;
          results.push({
            company: company.name,
            code: company.code,
            status: 'skipped',
            reason: 'no_data'
          });
          console.log(`⚠️ ${company.name} (${company.code}): 데이터 없음`);
          continue;
        }

        // DB에 저장
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
          results.push({
            company: company.name,
            code: company.code,
            status: 'error',
            error: upsertError.message
          });
        } else {
          successCount++;
          results.push({
            company: company.name,
            code: company.code,
            status: 'success',
            date: price.date,
            close_price: price.close_price,
            change_rate: price.change_rate,
            volume: price.volume
          });
          console.log(`✅ ${company.name} (${company.code}): ${price.close_price}원 (${price.change_rate}%)`);
        }

        // 기업 간 딜레이 (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`❌ ${company.name} (${company.code}) 처리 실패:`, error);
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

    console.log(`✅ 테스트 완료!`);
    console.log(`📊 결과: 성공 ${successCount}개, 실패 ${errorCount}개, 스킵 ${skippedCount}개`);
    console.log(`⏱️ 소요 시간: ${duration}초`);

    return NextResponse.json({
      success: true,
      message: '테스트 완료',
      stats: {
        total_companies: companies.length,
        success_count: successCount,
        error_count: errorCount,
        skipped_count: skippedCount,
        duration_seconds: duration
      },
      results
    });
  } catch (error: any) {
    console.error('테스트 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
