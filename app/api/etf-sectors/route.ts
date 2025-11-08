import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: 모든 섹터 조회
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('etf_sectors')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching ETF sectors:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: 새 섹터 생성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, growth_outlook, color_code } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Sector name is required' },
        { status: 400 }
      );
    }

    // 함수 호출로 섹터 생성
    const { data, error } = await supabaseAdmin
      .rpc('create_etf_sector', {
        p_name: name,
        p_description: description || null,
        p_growth_outlook: growth_outlook || '중립',
        p_color_code: color_code || '#6B7280'
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      sector_id: data,
      message: `섹터 "${name}" 생성 완료`
    });
  } catch (error: any) {
    console.error('Error creating ETF sector:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT: 섹터 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { sector_id, name, description, growth_outlook, color_code } = body;

    if (!sector_id || !name) {
      return NextResponse.json(
        { error: 'Sector ID and name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .rpc('update_etf_sector', {
        p_sector_id: sector_id,
        p_name: name,
        p_description: description || null,
        p_growth_outlook: growth_outlook || '중립',
        p_color_code: color_code || '#6B7280'
      });

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Sector not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `섹터 "${name}" 업데이트 완료`
    });
  } catch (error: any) {
    console.error('Error updating ETF sector:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 섹터 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sectorId = searchParams.get('sector_id');

    if (!sectorId) {
      return NextResponse.json(
        { error: 'Sector ID is required' },
        { status: 400 }
      );
    }

    // 해당 섹터에 속한 ETF 개수 확인
    const { count, error: countError } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('sector_id', sectorId)
      .eq('is_etf', true);

    if (countError) throw countError;

    if (count && count > 0) {
      return NextResponse.json(
        { error: `이 섹터에 ${count}개의 ETF가 할당되어 있습니다. 먼저 ETF를 다른 섹터로 이동하거나 할당 해제하세요.` },
        { status: 400 }
      );
    }

    // 섹터 삭제
    const { error } = await supabaseAdmin
      .from('etf_sectors')
      .delete()
      .eq('id', sectorId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '섹터 삭제 완료'
    });
  } catch (error: any) {
    console.error('Error deleting ETF sector:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
