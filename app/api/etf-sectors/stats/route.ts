import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: ETF 섹터별 통계 조회
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('v_etf_sector_stats')
      .select('*')
      .order('sector_investment_score', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching ETF sector stats:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
