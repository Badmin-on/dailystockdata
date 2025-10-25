/**
 * 재무 데이터 수집 API (수동 실행용 - 실시간 스트리밍)
 * 
 * 수집 내용:
 * - KOSPI 상위 500개 + KOSDAQ 상위 500개 = 1,000개 기업
 * - FnGuide에서 최근 4개년도 재무 컨센서스 데이터
 * - 매출액, 영업이익 및 증감률
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  fetchTopStocks,
  fetchStockFinancialData,
  transformFinancialData,
  type CompanyFinancialData
} from '@/lib/scraper-fnguide';

export const maxDuration = 300; // Vercel Pro: 5분 타임아웃

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * POST 요청 핸들러 (Server-Sent Events 스트리밍)
 */
export async function POST() {
  const startTime = Date.now();
  const scrapeDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // ReadableStream 생성
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // 메시지 전송 헬퍼 함수
      const sendMessage = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendMessage({
          status: 'running',
          message: `🚀 재무 데이터 수집 시작: ${scrapeDate}`,
        });

        // ============================================
        // 1. 기업 목록 수집 (KOSPI 500 + KOSDAQ 500)
        // ============================================
        sendMessage({
          status: 'running',
          message: '📋 [1/4] KOSPI 기업 목록 수집 중...',
        });

        const kospiStocks = await fetchTopStocks('KOSPI', 500);
        sendMessage({
          status: 'running',
          message: `✅ KOSPI ${kospiStocks.length}개 수집 완료`,
        });

        sendMessage({
          status: 'running',
          message: '📋 [1/4] KOSDAQ 기업 목록 수집 중...',
        });

        const kosdaqStocks = await fetchTopStocks('KOSDAQ', 500);
        sendMessage({
          status: 'running',
          message: `✅ KOSDAQ ${kosdaqStocks.length}개 수집 완료`,
        });

        const allStocks = [...kospiStocks, ...kosdaqStocks];
        const totalCompanies = allStocks.length;

        sendMessage({
          status: 'running',
          message: `✅ 총 ${totalCompanies}개 기업 목록 수집 완료`,
          progress: {
            current: 0,
            total: totalCompanies,
            percentage: 0
          }
        });

        // ============================================
        // 2. 각 기업별 재무 데이터 수집
        // ============================================
        sendMessage({
          status: 'running',
          message: `📊 [2/4] 재무 데이터 수집 시작 (총 ${totalCompanies}개)`,
        });

        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;
        const allFinancialData: CompanyFinancialData[] = [];

        // 진행 상황 업데이트 (10개마다)
        const UPDATE_INTERVAL = 10;

        for (let i = 0; i < allStocks.length; i++) {
          const stock = allStocks[i];

          try {
            // FnGuide에서 재무 데이터 수집
            const rawData = await fetchStockFinancialData(stock.code);

            // 데이터 검증
            if (!rawData.headers || rawData.headers.length === 0) {
              skipCount++;
              
              if ((i + 1) % UPDATE_INTERVAL === 0) {
                sendMessage({
                  status: 'running',
                  message: `⚠️ 데이터 없음: ${stock.name} (${stock.code})`,
                  progress: {
                    current: i + 1,
                    total: totalCompanies,
                    percentage: Math.round(((i + 1) / totalCompanies) * 100)
                  }
                });
              }
              continue;
            }

            // 데이터 변환 및 저장 준비
            const financialData = transformFinancialData(rawData, stock, scrapeDate);
            allFinancialData.push(...financialData);
            successCount++;

            // 진행 상황 업데이트
            if ((i + 1) % UPDATE_INTERVAL === 0 || i === allStocks.length - 1) {
              sendMessage({
                status: 'running',
                message: `✅ ${stock.name} (${i + 1}/${totalCompanies})`,
                progress: {
                  current: i + 1,
                  total: totalCompanies,
                  percentage: Math.round(((i + 1) / totalCompanies) * 100)
                },
                stats: {
                  companies: successCount,
                  errors: errorCount
                }
              });
            }

            // Rate limiting (1초 대기)
            await delay(1000);

          } catch (error: any) {
            errorCount++;
            console.error(`   ❌ 오류: ${stock.name} (${stock.code})`, error.message);

            if ((i + 1) % UPDATE_INTERVAL === 0) {
              sendMessage({
                status: 'running',
                message: `❌ 오류: ${stock.name} - ${error.message}`,
                progress: {
                  current: i + 1,
                  total: totalCompanies,
                  percentage: Math.round(((i + 1) / totalCompanies) * 100)
                }
              });
            }
          }
        }

        sendMessage({
          status: 'running',
          message: `✅ 재무 데이터 수집 완료: ${successCount}개 성공, ${errorCount}개 실패, ${skipCount}개 스킵`,
        });

        // ============================================
        // 3. Companies 테이블 업데이트
        // ============================================
        sendMessage({
          status: 'running',
          message: '💾 [3/4] Companies 테이블 업데이트 중...',
        });

        for (const stock of allStocks) {
          await supabaseAdmin.from('companies').upsert({
            code: stock.code,
            name: stock.name,
            market: stock.market,
          }, {
            onConflict: 'code'
          });
        }

        sendMessage({
          status: 'running',
          message: `✅ ${allStocks.length}개 기업 정보 업데이트 완료`,
        });

        // ============================================
        // 4. Financial Data 테이블 저장
        // ============================================
        sendMessage({
          status: 'running',
          message: `💾 [4/4] 재무 데이터 저장 중 (${allFinancialData.length}개 레코드)...`,
        });

        if (allFinancialData.length > 0) {
          // 배치로 나누어 저장 (500개씩)
          const BATCH_SIZE = 500;
          for (let i = 0; i < allFinancialData.length; i += BATCH_SIZE) {
            const batch = allFinancialData.slice(i, i + BATCH_SIZE);
            
            const { error } = await supabaseAdmin
              .from('financial_data')
              .upsert(batch, {
                onConflict: 'company_id,year,scrape_date'
              });

            if (error) {
              throw new Error(`DB 저장 실패: ${error.message}`);
            }

            sendMessage({
              status: 'running',
              message: `💾 ${Math.min(i + BATCH_SIZE, allFinancialData.length)}/${allFinancialData.length} 저장 완료`,
            });
          }
        }

        // ============================================
        // 5. Materialized Views 갱신
        // ============================================
        sendMessage({
          status: 'running',
          message: '🔄 Materialized Views 갱신 중...',
        });

        try {
          await supabaseAdmin.rpc('refresh_materialized_view', {
            view_name: 'mv_consensus_changes'
          });
        } catch (error) {
          // View가 없으면 무시
        }

        try {
          await supabaseAdmin.rpc('refresh_materialized_view', {
            view_name: 'mv_stock_analysis'
          });
        } catch (error) {
          // View가 없으면 무시
        }

        sendMessage({
          status: 'running',
          message: '✅ Views 갱신 완료',
        });

        // ============================================
        // 완료
        // ============================================
        const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

        sendMessage({
          status: 'completed',
          message: `✅ 모든 작업 완료!`,
          stats: {
            companies: successCount,
            duration: `${duration}분`,
            errors: errorCount
          }
        });

        controller.close();

      } catch (error: any) {
        sendMessage({
          status: 'error',
          message: `❌ 오류 발생: ${error.message}`,
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
