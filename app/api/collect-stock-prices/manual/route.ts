import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchStockPrice } from '@/lib/scraper';

export const maxDuration = 60; // Vercel Hobby 최대 60초
// 로컬 개발에서는 무제한

// 수동 전체 수집 API (전체 기업 수집)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 주가 전체 수집 시작');

  try {
    // 전체 기업 수집
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, code, name')
      .order('id');

    if (companiesError || !companies) {
      throw new Error(`Failed to fetch companies: ${companiesError?.message}`);
    }

    console.log(`✅ ${companies.length}개 기업 로드 완료`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // 배치 처리 (50개씩)
    const BATCH_SIZE = 50;
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, i + BATCH_SIZE);
      console.log(`🔄 처리 중: ${i + 1}-${Math.min(i + BATCH_SIZE, companies.length)}/${companies.length}`);

      for (const company of batch) {
        try {
          const priceData = await fetchStockPrice(company.code);

          if (!priceData) {
            skippedCount++;
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
            console.error(`❌ 주가 저장 실패: ${company.name}`, upsertError);
            errorCount++;
          } else {
            successCount++;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`❌ 오류 (${company.name}):`, error.message);
          errorCount++;
        }
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n✅ 주가 수집 완료!');
    console.log(`📊 결과: 성공 ${successCount}개, 실패 ${errorCount}개, 스킵 ${skippedCount}개`);
    console.log(`⏱️ 소요 시간: ${duration}초`);

    // View 자동 갱신
    console.log('🔄 Materialized View 갱신 중...');
    try {
      const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/refresh-views`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json'
        }
      });

      if (refreshResponse.ok) {
        console.log('✅ View 갱신 완료');
      }
    } catch (refreshError) {
      console.error('⚠️ View 갱신 오류:', refreshError);
    }

    return NextResponse.json({
      success: true,
      message: 'Stock price collection completed',
      total_companies: companies.length,
      success_count: successCount,
      error_count: errorCount,
      skipped_count: skippedCount,
      duration_seconds: duration
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
