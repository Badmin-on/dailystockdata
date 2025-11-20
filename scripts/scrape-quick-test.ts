/**
 * 빠른 테스트: 10개 종목만 스크래핑
 */

// 환경 변수 로드
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { scrapeNaverFinance } from '../lib/scraper-naver';
import { supabaseAdmin } from '../lib/supabase';

const TEST_SIZE = 10;
const RATE_LIMIT_DELAY = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function quickTest() {
  console.log(`🚀 빠른 테스트: ${TEST_SIZE}개 종목 스크래핑\n`);

  const { data: companies, error } = await supabaseAdmin
    .from('companies')
    .select('id, name, code')
    .order('id')
    .limit(TEST_SIZE);

  if (error || !companies) {
    console.error('❌ 조회 실패:', error);
    return false;
  }

  console.log(`📊 대상: ${companies.length}개 종목\n`);

  let successCount = 0;
  let totalRecords = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    console.log(`[${i + 1}/${companies.length}] ${company.name} 처리 중...`);

    const result = await scrapeNaverFinance(company.id, company.name, company.code);

    if (result.success) {
      successCount++;
      totalRecords += result.records_inserted;
      console.log(`  ✅ ${result.records_inserted}개 레코드\n`);
    } else {
      console.log(`  ❌ ${result.error}\n`);
    }

    if (i < companies.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 성공: ${successCount}/${companies.length} (${(successCount / companies.length * 100).toFixed(0)}%)`);
  console.log(`📊 총 레코드: ${totalRecords}개\n`);

  return successCount / companies.length >= 0.8;
}

quickTest()
  .then(success => {
    if (success) {
      console.log('🎉 테스트 통과! 100개 종목 테스트 진행 가능\n');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('오류:', error);
    process.exit(1);
  });
