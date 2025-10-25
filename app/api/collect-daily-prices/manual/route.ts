/**
 * 주가 데이터 수집 API (수동 실행용 - 실시간 스트리밍)
 * 
 * 수집 내용:
 * - 모든 등록된 기업의 최신 주가
 * - Naver 증권에서 종가, 등락률, 거래량 수집
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

export const maxDuration = 300; // Vercel Pro: 5분 타임아웃

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 네이버 증권에서 주가 데이터 수집
 */
async function fetchStockPrice(code: string): Promise<{
  price: number;
  change_rate: number;
  volume: number;
} | null> {
  try {
    const url = `https://finance.naver.com/item/main.nhn?code=${code}`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const html = iconv.decode(response.data, 'EUC-KR');
    const $ = cheerio.load(html);

    // 현재가
    const priceText = $('.no_today .blind').first().text().trim();
    const price = parseInt(priceText.replace(/,/g, ''));

    // 등락률
    const changeRateText = $('.no_exday .blind').eq(1).text().trim();
    const changeRate = parseFloat(changeRateText.replace(/[^0-9.-]/g, ''));

    // 거래량
    const volumeText = $('#_nowVal').text().trim();
    const volume = parseInt(volumeText.replace(/,/g, ''));

    if (isNaN(price) || price === 0) {
      return null;
    }

    return {
      price,
      change_rate: changeRate || 0,
      volume: volume || 0,
    };
  } catch (error) {
    return null;
  }
}

/**
 * POST 요청 핸들러 (Server-Sent Events 스트리밍)
 */
export async function POST() {
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

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
          message: `🚀 주가 데이터 수집 시작: ${today}`,
        });

        // ============================================
        // 1. DB에서 모든 기업 목록 조회
        // ============================================
        sendMessage({
          status: 'running',
          message: '📋 [1/3] 기업 목록 조회 중...',
        });

        const { data: companies, error: fetchError } = await supabaseAdmin
          .from('companies')
          .select('id, code, name, market')
          .order('market', { ascending: true })
          .order('name', { ascending: true });

        if (fetchError) {
          throw new Error(`기업 목록 조회 실패: ${fetchError.message}`);
        }

        if (!companies || companies.length === 0) {
          throw new Error('등록된 기업이 없습니다');
        }

        const totalCompanies = companies.length;

        sendMessage({
          status: 'running',
          message: `✅ 총 ${totalCompanies}개 기업 조회 완료`,
          progress: {
            current: 0,
            total: totalCompanies,
            percentage: 0
          }
        });

        // ============================================
        // 2. 각 기업별 주가 데이터 수집
        // ============================================
        sendMessage({
          status: 'running',
          message: `💰 [2/3] 주가 데이터 수집 시작 (총 ${totalCompanies}개)`,
        });

        let successCount = 0;
        let errorCount = 0;
        const stockPrices: any[] = [];

        // 배치 처리 (10개씩 동시 수집)
        const BATCH_SIZE = 10;
        const UPDATE_INTERVAL = 50; // 50개마다 진행 상황 업데이트

        for (let i = 0; i < companies.length; i += BATCH_SIZE) {
          const batch = companies.slice(i, i + BATCH_SIZE);

          // 배치 내 기업들 동시 처리
          const results = await Promise.all(
            batch.map(async (company) => {
              try {
                const priceData = await fetchStockPrice(company.code);

                if (priceData) {
                  return {
                    company_id: company.id,
                    date: today,
                    close_price: priceData.price,
                    change_rate: priceData.change_rate,
                    volume: priceData.volume,
                  };
                }
                return null;
              } catch (error) {
                return null;
              }
            })
          );

          // 성공한 데이터만 수집
          results.forEach((result) => {
            if (result) {
              stockPrices.push(result);
              successCount++;
            } else {
              errorCount++;
            }
          });

          // 진행 상황 업데이트
          const currentIndex = Math.min(i + BATCH_SIZE, totalCompanies);
          if (currentIndex % UPDATE_INTERVAL === 0 || currentIndex === totalCompanies) {
            sendMessage({
              status: 'running',
              message: `✅ ${currentIndex}/${totalCompanies} 수집 중...`,
              progress: {
                current: currentIndex,
                total: totalCompanies,
                percentage: Math.round((currentIndex / totalCompanies) * 100)
              },
              stats: {
                companies: successCount,
                errors: errorCount
              }
            });
          }

          // Rate limiting (1초 대기)
          await delay(1000);
        }

        sendMessage({
          status: 'running',
          message: `✅ 주가 수집 완료: ${successCount}개 성공, ${errorCount}개 실패`,
        });

        // ============================================
        // 3. Daily Stock Prices 테이블 저장
        // ============================================
        sendMessage({
          status: 'running',
          message: `💾 [3/3] 주가 데이터 저장 중 (${stockPrices.length}개)...`,
        });

        if (stockPrices.length > 0) {
          // 배치로 나누어 저장 (500개씩)
          const SAVE_BATCH_SIZE = 500;
          for (let i = 0; i < stockPrices.length; i += SAVE_BATCH_SIZE) {
            const batch = stockPrices.slice(i, i + SAVE_BATCH_SIZE);

            const { error } = await supabaseAdmin
              .from('daily_stock_prices')
              .upsert(batch, {
                onConflict: 'company_id,date'
              });

            if (error) {
              throw new Error(`DB 저장 실패: ${error.message}`);
            }

            sendMessage({
              status: 'running',
              message: `💾 ${Math.min(i + SAVE_BATCH_SIZE, stockPrices.length)}/${stockPrices.length} 저장 완료`,
            });
          }
        }

        // ============================================
        // 4. Materialized Views 갱신
        // ============================================
        sendMessage({
          status: 'running',
          message: '🔄 Materialized Views 갱신 중...',
        });

        await supabaseAdmin.rpc('refresh_materialized_view', {
          view_name: 'mv_stock_analysis'
        }).catch(() => {
          // View가 없으면 무시
        });

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
