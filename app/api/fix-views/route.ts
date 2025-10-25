import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST() {
  try {
    console.log('🔧 투자 점수 계산 View 수정 시작...');

    // Read the SQL file
    const sqlPath = join(process.cwd(), 'scripts', 'fix-investment-score.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Execute the SQL
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // Fallback: execute directly (if RPC doesn't exist)
      return await supabaseAdmin.from('_raw_sql').select('*').limit(0).then(() => {
        // This won't work, we need to use a different approach
        throw new Error('Cannot execute raw SQL without proper setup');
      });
    });

    // Alternative: Execute using Postgres connection
    const { error: viewError } = await supabaseAdmin.rpc('create_or_replace_view', {
      view_name: 'v_investment_opportunities',
      view_definition: sql.split('CREATE OR REPLACE VIEW')[1]
    }).catch(() => ({ error: 'RPC not available' }));

    if (viewError) {
      console.warn('⚠️ RPC 실행 실패, SQL 직접 실행이 필요합니다');
      return NextResponse.json({
        success: false,
        message: 'View 수정을 위해 Supabase SQL Editor에서 fix-investment-score.sql 파일을 수동 실행해주세요',
        sql_path: '/scripts/fix-investment-score.sql'
      });
    }

    console.log('✅ View 수정 완료!');

    return NextResponse.json({
      success: true,
      message: 'v_investment_opportunities View 수정 완료'
    });
  } catch (error: any) {
    console.error('❌ View 수정 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        instruction: 'Supabase Dashboard의 SQL Editor에서 scripts/fix-investment-score.sql을 수동으로 실행해주세요'
      },
      { status: 500 }
    );
  }
}
