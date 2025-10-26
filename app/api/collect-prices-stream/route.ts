/**
 * 실시간 스트리밍 주가 데이터 수집 API
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchLatestStockPrice } from '@/lib/scraper-daily';

export const maxDuration = 300; // 5분
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Edge runtime 대신 Node.js runtime 사용

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendProgress({ type: 'start', message: '주가 데이터 수집 시작...' });

        // 전체 기업 목록 가져오기
        const { data: companies, error: companiesError } = await supabaseAdmin
          .from('companies')
          .select('id, code, name, market')
          .order('id');

        if (companiesError || !companies) {
          throw new Error(`Failed to fetch companies: ${companiesError?.message}`);
        }

        const totalCompanies = companies.length;
        sendProgress({
          type: 'total',
          total: totalCompanies,
          message: `✅ ${totalCompanies}개 기업 로드 완료`
        });

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        // 10개씩 병렬 처리
        const BATCH_SIZE = 10;
        for (let i = 0; i < companies.length; i += BATCH_SIZE) {
          const batch = companies.slice(i, i + BATCH_SIZE);

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

          // 진행률 전송
          const currentCount = i + batch.length;
          const percent = (currentCount / totalCompanies * 100).toFixed(1);

          sendProgress({
            type: 'progress',
            current: currentCount,
            total: totalCompanies,
            success: successCount,
            error: errorCount,
            skip: skippedCount,
            percent: parseFloat(percent),
            message: `📈 ${currentCount}/${totalCompanies} (${percent}%) - 성공: ${successCount}`
          });

          // 배치 간 딜레이
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        sendProgress({
          type: 'complete',
          stats: {
            total_companies: totalCompanies,
            success_count: successCount,
            error_count: errorCount,
            skipped_count: skippedCount
          },
          message: '✅ 주가 데이터 수집 완료!'
        });

        controller.close();

      } catch (error: any) {
        sendProgress({
          type: 'error',
          message: `❌ 오류 발생: ${error.message}`
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
