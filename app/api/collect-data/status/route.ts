import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * 데이터 수집 현황 조회 API
 * 모니터링 페이지에서 실시간 수집 상태 확인용
 */
export async function GET() {
  try {
    // Supabase 함수 호출
    const { data, error } = await supabaseAdmin
      .rpc('get_collection_dashboard');

    if (error) {
      console.error('Dashboard function error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      ...data
    });
  } catch (error: any) {
    console.error('Collection status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch collection status'
      },
      { status: 500 }
    );
  }
}
