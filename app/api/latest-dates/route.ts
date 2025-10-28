import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. 재무 데이터 최신 날짜 조회
    const { data: latestFinancial, error: financialError } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(1)
      .single();

    if (financialError) {
      console.error('Financial data error:', financialError);
    }

    // 해당 날짜의 레코드 수
    const { count: financialCount } = await supabaseAdmin
      .from('financial_data')
      .select('*', { count: 'exact', head: true })
      .eq('scrape_date', latestFinancial?.scrape_date);

    // 2. 주가 데이터 최신 날짜 조회
    const { data: latestPrice, error: priceError } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (priceError) {
      console.error('Price data error:', priceError);
    }

    // 해당 날짜의 레코드 수
    const { count: priceCount } = await supabaseAdmin
      .from('daily_stock_prices')
      .select('*', { count: 'exact', head: true })
      .eq('date', latestPrice?.date);

    // 3. 모든 재무 데이터 날짜 이력 (최대 100,000개 조회)
    const { data: recentDates } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(100000);

    // 고유 날짜별 레코드 수 계산
    const dateCounts: Record<string, number> = {};
    recentDates?.forEach(record => {
      dateCounts[record.scrape_date] = (dateCounts[record.scrape_date] || 0) + 1;
    });

    const recentHistory = Object.entries(dateCounts)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 50)  // 최근 50개 날짜 표시
      .map(([date, count]) => ({ date, count }));

    const totalUniqueDates = Object.keys(dateCounts).length;

    return NextResponse.json({
      financial: {
        latest_date: latestFinancial?.scrape_date,
        record_count: financialCount,
      },
      price: {
        latest_date: latestPrice?.date,
        record_count: priceCount,
      },
      total_unique_dates: totalUniqueDates,
      recent_history: recentHistory,
    });
  } catch (error: any) {
    console.error('Error fetching latest dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
