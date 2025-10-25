import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Check scrape_date distribution
    const { data: dateData, error: dateError } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date, company_id, year')
      .order('scrape_date', { ascending: false })
      .limit(1000);

    if (dateError) throw dateError;

    // Group by scrape_date
    const dateStats = new Map<string, { companies: Set<number>; records: number; years: Set<number> }>();
    
    dateData?.forEach(row => {
      const date = row.scrape_date;
      if (!dateStats.has(date)) {
        dateStats.set(date, { companies: new Set(), records: 0, years: new Set() });
      }
      const stats = dateStats.get(date)!;
      stats.companies.add(row.company_id);
      stats.years.add(row.year);
      stats.records++;
    });

    // Convert to array
    const result = Array.from(dateStats.entries())
      .map(([date, stats]) => ({
        scrape_date: date,
        companies: stats.companies.size,
        records: stats.records,
        years: Array.from(stats.years).sort()
      }))
      .sort((a, b) => b.scrape_date.localeCompare(a.scrape_date))
      .slice(0, 20);

    // Total stats
    const { count: totalRecords } = await supabaseAdmin
      .from('financial_data')
      .select('*', { count: 'exact', head: true });

    const { data: uniqueCompanies } = await supabaseAdmin
      .from('financial_data')
      .select('company_id')
      .order('company_id');
    
    const uniqueCompanyCount = new Set(uniqueCompanies?.map(r => r.company_id)).size;

    return NextResponse.json({
      success: true,
      total_records: totalRecords,
      unique_companies: uniqueCompanyCount,
      dates: result,
      message: '과거 데이터가 있으면 여러 scrape_date가 보여야 합니다'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
