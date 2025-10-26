/**
 * 실시간 스트리밍 재무 데이터 수집 API
 *
 * 원본 1_seoul_ys_fnguide.js처럼 실시간 진행률을 표시하되,
 * Response Streaming을 사용하여 구현
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  fetchTopStocks,
  fetchStockFinancialData,
  transformFinancialData,
  type CompanyFinancialData
} from '@/lib/scraper-fnguide';

export const maxDuration = 300; // 5분
export const dynamic = 'force-dynamic';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const scrapeDate = new Date().toISOString().split('T')[0];

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendProgress({ type: 'start', message: '재무 데이터 수집 시작...' });

        // 1. 기업 목록 수집
        sendProgress({ type: 'log', message: '📋 기업 목록 수집 중...' });

        const kospiStocks = await fetchTopStocks('KOSPI', 500);
        sendProgress({ type: 'log', message: `✅ KOSPI ${kospiStocks.length}개 수집` });

        const kosdaqStocks = await fetchTopStocks('KOSDAQ', 500);
        sendProgress({ type: 'log', message: `✅ KOSDAQ ${kosdaqStocks.length}개 수집` });

        const allStocks = [...kospiStocks, ...kosdaqStocks];
        const totalCompanies = allStocks.length;

        sendProgress({
          type: 'total',
          total: totalCompanies,
          message: `총 ${totalCompanies}개 기업 목록 수집 완료`
        });

        // 2. 각 기업별 재무 데이터 수집
        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;
        const allFinancialData: CompanyFinancialData[] = [];

        for (let i = 0; i < allStocks.length; i++) {
          const stock = allStocks[i];

          try {
            const rawData = await fetchStockFinancialData(stock.code);

            if (!rawData.headers || rawData.headers.length === 0) {
              skipCount++;
              sendProgress({
                type: 'progress',
                current: i + 1,
                total: totalCompanies,
                success: successCount,
                error: errorCount,
                skip: skipCount,
                message: `⚠️ [${i + 1}/${totalCompanies}] 데이터 없음: ${stock.name}`
              });
              continue;
            }

            const financialData = transformFinancialData(stock, rawData);
            allFinancialData.push(financialData);
            successCount++;

            // 10개마다 진행률 전송
            if ((i + 1) % 10 === 0 || i === allStocks.length - 1) {
              const percent = ((i + 1) / totalCompanies * 100).toFixed(1);
              sendProgress({
                type: 'progress',
                current: i + 1,
                total: totalCompanies,
                success: successCount,
                error: errorCount,
                skip: skipCount,
                percent: parseFloat(percent),
                message: `📈 ${i + 1}/${totalCompanies} (${percent}%) - 성공: ${successCount}`
              });
            }

            await delay(1000); // Rate limiting

          } catch (error) {
            errorCount++;
            sendProgress({
              type: 'progress',
              current: i + 1,
              total: totalCompanies,
              success: successCount,
              error: errorCount,
              skip: skipCount,
              message: `❌ [${i + 1}/${totalCompanies}] 오류: ${stock.name}`
            });
          }
        }

        sendProgress({
          type: 'log',
          message: `✅ 재무 데이터 수집 완료: 성공 ${successCount}, 실패 ${errorCount}, 스킵 ${skipCount}`
        });

        // 3. Supabase에 데이터 저장
        sendProgress({ type: 'log', message: `💾 Supabase 저장 중 (${allFinancialData.length}개 기업)...` });

        let companiesSaved = 0;
        let financialRecordsSaved = 0;

        for (let i = 0; i < allFinancialData.length; i++) {
          const item = allFinancialData[i];

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

            // 50개마다 저장 진행률 전송
            if ((i + 1) % 50 === 0 || i === allFinancialData.length - 1) {
              const percent = ((i + 1) / allFinancialData.length * 100).toFixed(1);
              sendProgress({
                type: 'save_progress',
                current: i + 1,
                total: allFinancialData.length,
                percent: parseFloat(percent),
                message: `💾 저장 진행: ${i + 1}/${allFinancialData.length} (${percent}%)`
              });
            }

          } catch (error) {
            console.error(`저장 오류: ${item.company.name}`, error);
          }
        }

        sendProgress({
          type: 'log',
          message: `✅ 저장 완료: 기업 ${companiesSaved}개, 재무레코드 ${financialRecordsSaved}개`
        });

        // 4. Materialized View 갱신
        try {
          sendProgress({ type: 'log', message: '🔄 Materialized View 갱신 중...' });
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          await fetch(`${siteUrl}/api/refresh-views`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.CRON_SECRET}`,
              'Content-Type': 'application/json'
            }
          });
          sendProgress({ type: 'log', message: '✅ View 갱신 완료' });
        } catch (e) {
          sendProgress({ type: 'log', message: '⚠️ View 갱신 실패 (데이터 수집은 성공)' });
        }

        // 완료
        sendProgress({
          type: 'complete',
          stats: {
            total_companies: totalCompanies,
            scraped_success: successCount,
            scraped_error: errorCount,
            scraped_skip: skipCount,
            saved_companies: companiesSaved,
            saved_financial_records: financialRecordsSaved
          },
          message: '✅ 모든 작업 완료!'
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
