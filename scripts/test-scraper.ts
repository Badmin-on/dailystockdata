/**
 * Naver 스크래퍼 테스트 스크립트
 * 목적: scraper-naver.ts 기능 검증
 */

// 환경 변수 로드
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { scrapeSampleCompanies } from '../lib/scraper-naver';
import { supabaseAdmin } from '../lib/supabase';

// 테스트할 샘플 종목 (API 테스트에서 100% 성공한 종목들)
const SAMPLE_CODES = [
  '011170', // 영원무역
  '004370', // 농심
  '005930', // 삼성전자
];

async function testScraper() {
  console.log('🧪 Naver 스크래퍼 테스트 시작\n');
  console.log(`📊 테스트 종목: ${SAMPLE_CODES.length}개\n`);

  // 1. 스크래핑 실행
  const results = await scrapeSampleCompanies(SAMPLE_CODES);

  // 2. 결과 검증
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 스크래핑 결과\n');

  let totalRecords = 0;

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} [${index + 1}/${results.length}] ${result.company_name}`);
    console.log(`   - 종목 ID: ${result.company_id}`);
    console.log(`   - 저장된 레코드: ${result.records_inserted}개`);

    if (result.error) {
      console.log(`   - 오류: ${result.error}`);
    }

    totalRecords += result.records_inserted;
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 3. DB 검증
  console.log('🔍 데이터베이스 검증\n');

  for (const result of results) {
    if (!result.success) continue;

    const { data, error } = await supabaseAdmin
      .from('financial_data_extended')
      .select('*')
      .eq('company_id', result.company_id)
      .eq('data_source', 'naver')
      .order('year', { ascending: false });

    if (error) {
      console.error(`❌ DB 조회 실패 (${result.company_name}):`, error);
      continue;
    }

    console.log(`✅ ${result.company_name} (${data?.length || 0}개 레코드)`);

    if (data && data.length > 0) {
      // 최신 연도 데이터 샘플 출력
      const latest = data[0];
      console.log(`   최신 데이터 (${latest.year}년${latest.is_estimate ? ' - 컨센서스' : ''}):`);
      console.log(`   - 매출액: ${latest.revenue ? (latest.revenue / 100000000).toFixed(0) + '억' : 'N/A'}`);
      console.log(`   - 영업이익: ${latest.operating_profit ? (latest.operating_profit / 100000000).toFixed(0) + '억' : 'N/A'}`);
      console.log(`   - 순이익: ${latest.net_income ? (latest.net_income / 100000000).toFixed(0) + '억' : 'N/A'}`);
      console.log(`   - EPS: ${latest.eps || 'N/A'}`);
      console.log(`   - PER: ${latest.per || 'N/A'}`);
      console.log(`   - ROE: ${latest.roe ? latest.roe + '%' : 'N/A'}`);
    }

    console.log('');
  }

  // 4. 최종 요약
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / results.length * 100).toFixed(1);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ 테스트 완료\n');
  console.log(`✅ 성공: ${successCount}/${results.length} (${successRate}%)`);
  console.log(`📊 총 레코드: ${totalRecords}개`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (successCount === results.length) {
    console.log('🎉 모든 테스트 통과! 스크래퍼가 정상 작동합니다.');
    console.log('\n📝 다음 단계:');
    console.log('1. 전체 종목 스크래핑 실행 (선택사항)');
    console.log('2. Git 커밋 및 푸시');
    console.log('3. Vercel Preview 배포 테스트\n');
  } else {
    console.log('⚠️  일부 테스트 실패. 로그를 확인해주세요.\n');
  }
}

// 실행
testScraper().catch(error => {
  console.error('🚨 치명적 오류:', error);
  process.exit(1);
});
