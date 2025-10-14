import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Materialized View 갱신 API
 * 데이터 수집 후 자동으로 호출되어야 함
 */
export async function POST(request: NextRequest) {
  try {
    // Cron Secret 검증 (선택적 - Authorization 헤더가 있는 경우에만)
    const authHeader = request.headers.get('authorization');

    // Authorization 헤더가 있으면 반드시 검증
    if (authHeader) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    // Authorization 헤더가 없으면 통과 (브라우저에서 호출 허용)

    console.log('🔄 Materialized View 갱신 시작...');
    const startTime = Date.now();

    // Supabase RPC 호출로 갱신
    const { error } = await supabaseAdmin.rpc('refresh_all_views');

    if (error) {
      console.error('❌ View 갱신 실패:', error);
      throw error;
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ View 갱신 완료 (${duration}초)`);

    return NextResponse.json({
      success: true,
      message: 'Views refreshed successfully',
      duration_seconds: duration
    });
  } catch (error: any) {
    console.error('Error refreshing views:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
