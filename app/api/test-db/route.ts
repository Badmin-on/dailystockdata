import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. 연결 테스트
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .limit(5);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // 2. 테이블 카운트
    const { count: companiesCount } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true });

    const { count: financialCount } = await supabaseAdmin
      .from('financial_data')
      .select('*', { count: 'exact', head: true });

    const { count: pricesCount } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: '✅ Supabase 연결 성공!',
      tables: {
        companies: companiesCount || 0,
        financial_data: financialCount || 0,
        daily_stock_prices: pricesCount || 0,
      },
      sample_companies: companies,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
