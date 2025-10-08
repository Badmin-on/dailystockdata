import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('financial_data')
      .select('year')
      .order('year', { ascending: false });

    if (error) throw error;

    // 중복 제거
    const uniqueYears = [...new Set(data?.map(d => d.year) || [])];

    return NextResponse.json(uniqueYears);
  } catch (error: any) {
    console.error('Error fetching years:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
