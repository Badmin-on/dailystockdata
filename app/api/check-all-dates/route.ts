import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get ALL financial data rows (no limit!)
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: page, error } = await supabaseAdmin
        .from('financial_data')
        .select('scrape_date, company_id, year')
        .range(from, from + pageSize - 1);
      
      if (error) throw error;
      if (!page || page.length === 0) break;
      
      allData = allData.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }
    
    // Group manually
    const dateMap = new Map<string, { companies: Set<number>; records: number; years: Set<number> }>();
    allData?.forEach(row => {
      if (!dateMap.has(row.scrape_date)) {
        dateMap.set(row.scrape_date, { companies: new Set(), records: 0, years: new Set() });
      }
      const stats = dateMap.get(row.scrape_date)!;
      stats.companies.add(row.company_id);
      stats.years.add(row.year);
      stats.records++;
    });
    
    const result = Array.from(dateMap.entries()).map(([date, stats]) => ({
      scrape_date: date,
      companies: stats.companies.size,
      records: stats.records,
      years: Array.from(stats.years).sort()
    })).sort((a, b) => b.scrape_date.localeCompare(a.scrape_date));

    return NextResponse.json({
      success: true,
      total_records: allData?.length || 0,
      unique_dates: result.length,
      dates: result,
      message: '모든 scrape_date 확인 완료'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
