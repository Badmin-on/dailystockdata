/**
 * 데이터 수집 진행률 조회 API
 * 클라이언트에서 polling으로 실시간 진행률 확인
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProgressTracker } from '@/lib/progress-tracker';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const progress = await ProgressTracker.getProgress(sessionId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      progress
    });
  } catch (error: any) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch progress'
      },
      { status: 500 }
    );
  }
}
