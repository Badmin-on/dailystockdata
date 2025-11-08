import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: ETF 상세 정보 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sectorId = searchParams.get('sector_id');
    const sortBy = searchParams.get('sort_by') || 'investment_score';
    const order = searchParams.get('order') || 'desc';

    let query = supabaseAdmin
      .from('v_etf_details')
      .select('*');

    // 섹터 필터링
    if (sectorId) {
      query = query.eq('sector_id', sectorId);
    }

    // 정렬
    query = query.order(sortBy, { ascending: order === 'asc' });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching ETF details:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT: ETF 정보 업데이트 (섹터 할당 등)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { company_id, sector_id, growth_score, investment_thesis } = body;

    if (!company_id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .rpc('assign_etf_to_sector', {
        p_company_id: company_id,
        p_sector_id: sector_id || null,
        p_growth_score: growth_score || null,
        p_investment_thesis: investment_thesis || null
      });

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ETF 정보 업데이트 완료'
    });
  } catch (error: any) {
    console.error('Error updating ETF details:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
