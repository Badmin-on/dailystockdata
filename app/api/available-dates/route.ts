import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('financial_data')
      .select('scrape_date')
      .order('scrape_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    const uniqueDates = [...new Set(data?.map(d => d.scrape_date) || [])];
    
    return NextResponse.json(uniqueDates);
  } catch (error: any) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
