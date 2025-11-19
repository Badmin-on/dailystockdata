/**
 * 상위 100개 종목 Naver Finance 데이터 스크래핑 (테스트용)
 */

// 환경 변수 로드
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { scrapeNaverFinance } from '../lib/scraper-naver';
import { supabaseAdmin } from '../lib/supabase';

const BATCH_SIZE = 100;
const RATE_LIMIT_DELAY = 2000; // 2초

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeTop100() {
  console.log('🚀 상위 100개 종목 Naver Finance 스크래핑 시작\n');

  // 1. 상위 100개 종목 가져오기
  const { data: companies, error } = await supabaseAdmin
    .from('companies')
    .select('id, name, code')
    .order('id')
    .limit(BATCH_SIZE);

  if (error || !companies) {
    console.error('❌ 종목 목록 조회 실패:', error);
    process.exit(1);
  }

  console.log(`📊 대상 종목: ${companies.length}개`);
  console.log(`⏱️  예상 소요 시간: 약 ${Math.ceil((companies.length * 2) / 60)}분\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 2. 스크래핑 실행
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  let totalRecords = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];

    console.log(`[${i + 1}/${companies.length}] ${company.name} (${company.code}) 처리 중...`);

    const result = await scrapeNaverFinance(company.id, company.name, company.code);

    if (result.success) {
      successCount++;
      totalRecords += result.records_inserted;
      console.log(`  ✅ 성공: ${result.records_inserted}개 레코드`);
    } else {
      failCount++;
      console.log(`  ❌ 실패: ${result.error}`);
    }

    // Rate limiting (마지막 종목 제외)
    if (i < companies.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }

    // 진행률 표시 (20개마다)
    if ((i + 1) % 20 === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = (i + 1) / elapsed;
      const remaining = Math.round((companies.length - i - 1) / rate);
      console.log(`\n📈 진행률: ${i + 1}/${companies.length} (${((i + 1) / companies.length * 100).toFixed(1)}%)`);
      console.log(`⏱️  남은 시간: 약 ${Math.ceil(remaining / 60)}분\n`);
    }
  }

  const endTime = Date.now();
  const elapsedSeconds = Math.round((endTime - startTime) / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const remainingSeconds = elapsedSeconds % 60;

  // 3. 결과 출력
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 테스트 스크래핑 완료\n');
  console.log(`✅ 성공: ${successCount}/${companies.length} (${(successCount / companies.length * 100).toFixed(1)}%)`);
  console.log(`❌ 실패: ${failCount}/${companies.length}`);
  console.log(`📊 총 레코드: ${totalRecords}개`);
  console.log(`⏱️  실제 소요 시간: ${elapsedMinutes}분 ${remainingSeconds}초\n`);

  // 4. 성공률 판단
  const successRate = successCount / companies.length;

  if (successRate >= 0.95) {
    console.log('🎉 훌륭합니다! 95% 이상 성공!\n');
    console.log('✅ 전체 종목 스크래핑을 안전하게 진행할 수 있습니다.\n');
    console.log('📝 다음 명령어로 전체 실행:');
    console.log('   npx tsx -r dotenv/config scripts/scrape-all-companies.ts dotenv_config_path=.env.local\n');
    return true;
  } else if (successRate >= 0.8) {
    console.log('✅ 양호합니다! 80% 이상 성공\n');
    console.log('⚠️  일부 실패가 있지만 전체 진행 가능합니다.\n');
    return true;
  } else {
    console.log('⚠️  성공률이 낮습니다 (80% 미만)\n');
    console.log('🔍 문제 확인이 필요합니다:');
    console.log('   - 네트워크 연결 상태');
    console.log('   - Naver API 응답 상태');
    console.log('   - Rate limiting 설정\n');
    return false;
  }
}

// 실행
scrapeTop100()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('🚨 치명적 오류:', error);
    process.exit(1);
  });
