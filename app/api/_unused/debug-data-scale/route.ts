import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get Samsung Electronics (005930) as example
    const { data: company, error: cError } = await supabaseAdmin
      .from('companies')
      .select('id, name, code')
      .eq('code', '005930')
      .single();
    
    if (cError) throw cError;
    
    // Get financial data for this company
    const { data: financials, error: fError } = await supabaseAdmin
      .from('financial_data')
      .select('scrape_date, year, revenue, operating_profit')
      .eq('company_id', company.id)
      .order('scrape_date', { ascending: false })
      .order('year', { ascending: true });
    
    if (fError) throw fError;
    
    // Group by scrape_date
    const grouped: Record<string, any[]> = {};
    financials?.forEach(f => {
      if (!grouped[f.scrape_date]) grouped[f.scrape_date] = [];
      grouped[f.scrape_date].push(f);
    });
    
    // Analyze scale differences
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const latestDate = dates[0];
    const oldestDate = dates[dates.length - 1];
    
    const latestData = grouped[latestDate];
    const oldestData = grouped[oldestDate];
    
    // Calculate scale factor
    const latest2024 = latestData.find(d => d.year === '2024');
    const oldest2024 = oldestData.find(d => d.year === '2024');
    
    let scaleFactor = null;
    if (latest2024 && oldest2024 && latest2024.revenue && oldest2024.revenue) {
      scaleFactor = oldest2024.revenue / latest2024.revenue;
    }
    
    return NextResponse.json({
      success: true,
      company,
      totalRecords: financials?.length || 0,
      uniqueDates: dates,
      latestDate: {
        date: latestDate,
        count: latestData.length,
        sample: latestData[0]
      },
      oldestDate: {
        date: oldestDate,
        count: oldestData.length,
        sample: oldestData[0]
      },
      scaleAnalysis: {
        latest2024Revenue: latest2024?.revenue,
        oldest2024Revenue: oldest2024?.revenue,
        scaleFactor,
        isScaleMismatch: scaleFactor && scaleFactor > 1000
      },
      allData: grouped
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
