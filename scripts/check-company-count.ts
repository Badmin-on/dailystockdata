/**
 * DB 종목 수 확인
 */

// 환경 변수 로드
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdmin } from '../lib/supabase';

async function checkCount() {
  const { data, error, count } = await supabaseAdmin
    .from('companies')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  const totalCompanies = count || 0;
  const estimatedSeconds = totalCompanies * 2;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  console.log(`\n📊 DB 종목 수: ${totalCompanies}개`);
  console.log(`⏱️  예상 소요 시간: 약 ${estimatedMinutes}분 (${estimatedSeconds}초)`);
  console.log(`📈 예상 레코드 수: 약 ${totalCompanies * 4}개 (종목당 4년)\n`);
}

checkCount();
