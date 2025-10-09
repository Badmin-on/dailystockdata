import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchStockPrice } from '@/lib/scraper';

export const maxDuration = 60;

// 수동 테스트용 API (5개 기업만 수집)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🧪 주가 테스트 수집 시작 (5개 기업)');

  try {
    // 테스트: 상위 5개 기업만
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, code, name')
      .limit(5);

    if (companiesError || !companies) {
      throw new Error(`Failed to fetch companies: ${companiesError?.message}`);
    }

    console.log(`✅ ${companies.length}개 기업 로드 완료`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const company of companies) {
      try {
        console.log(`🔄 처리 중: ${company.name} (${company.code})`);

        const priceData = await fetchStockPrice(company.code);

        if (!priceData) {
          results.push({
            company: company.name,
            code: company.code,
            status: 'error',
            message: 'No price data found'
          });
          errorCount++;
          continue;
        }

        // 데이터베이스 저장
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
          results.push({
            company: company.name,
            code: company.code,
            status: 'error',
            message: upsertError.message
          });
          errorCount++;
        } else {
          results.push({
            company: company.name,
            code: company.code,
            status: 'success',
            data: priceData
          });
          successCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        results.push({
          company: company.name,
          code: company.code,
          status: 'error',
          message: error.message
        });
        errorCount++;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      message: 'Test stock price collection completed',
      total_companies: companies.length,
      success_count: successCount,
      error_count: errorCount,
      duration_seconds: duration,
      results
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
