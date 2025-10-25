import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 애플리케이션 설정 API
 * 프론트엔드에서 필요한 설정 값 제공
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    settings: {
      // 데이터 수집 설정
      collection: {
        enabled: true,
        batchSize: 50,
        rateLimit: 2, // 초당 요청 수
        timeout: 300000, // 5분
      },
      // 투자 점수 임계값
      investmentScores: {
        sGrade: 80,
        aGrade: 70,
        bGrade: 60,
        cGrade: 50,
      },
      // 이격도 범위
      divergenceRanges: {
        optimal: { min: -10, max: 0 },
        good: { min: 0, max: 5 },
        fair: { min: 5, max: 10 },
        caution: { min: 10, max: 15 },
        warning: { min: 15, max: 20 },
        danger: { min: 20, max: 30 },
      },
      // 컨센서스 변화 임계값
      consensusThresholds: {
        significant: 30,  // 30% 이상 변화
        high: 20,
        medium: 10,
        low: 5,
      },
      // UI 설정
      ui: {
        defaultLimit: 100,
        refreshInterval: 5000, // 5초
        chartColors: {
          revenue: '#3b82f6',
          operatingProfit: '#10b981',
          stockPrice: '#f59e0b',
        },
      },
    },
  });
}

/**
 * 설정 업데이트 (관리자 전용)
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Settings update not implemented yet',
    },
    { status: 501 }
  );
}
