/**
 * 전체 종목 Naver Finance 데이터 스크래핑
 * 목적: DB의 모든 종목에 대해 Naver 재무 데이터 수집
 */

// 환경 변수 로드
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { scrapeAllCompanies } from '../lib/scraper-naver';
import { supabaseAdmin } from '../lib/supabase';

async function main() {
  console.log('🚀 전체 종목 Naver Finance 스크래핑 시작\n');

  // 1. 종목 수 확인
  const { data: companies, error } = await supabaseAdmin
    .from('companies')
    .select('id, name, code')
    .order('id');

  if (error || !companies) {
    console.error('❌ 종목 목록 조회 실패:', error);
    process.exit(1);
  }

  const totalCompanies = companies.length;
  const estimatedMinutes = Math.ceil((totalCompanies * 2) / 60);

  console.log(`📊 총 종목 수: ${totalCompanies}개`);
  console.log(`⏱️  예상 소요 시간: 약 ${estimatedMinutes}분\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 2. 사용자 확인
  console.log('⚠️  주의사항:');
  console.log('- Rate limiting으로 각 종목마다 2초 대기');
  console.log('- 중간에 중단하려면 Ctrl+C 입력');
  console.log('- 실패한 종목은 나중에 재시도 가능\n');

  // 3. 스크래핑 실행
  const startTime = Date.now();
  const results = await scrapeAllCompanies();
  const endTime = Date.now();

  const elapsedSeconds = Math.round((endTime - startTime) / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const remainingSeconds = elapsedSeconds % 60;

  // 4. 상세 결과 출력
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 최종 결과\n');

  const successResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  const totalRecords = successResults.reduce((sum, r) => sum + r.records_inserted, 0);

  console.log(`✅ 성공: ${successResults.length}/${totalCompanies} (${(successResults.length / totalCompanies * 100).toFixed(1)}%)`);
  console.log(`❌ 실패: ${failedResults.length}/${totalCompanies}`);
  console.log(`📊 총 레코드: ${totalRecords}개`);
  console.log(`⏱️  실제 소요 시간: ${elapsedMinutes}분 ${remainingSeconds}초\n`);

  // 5. 실패 종목 목록 (있는 경우)
  if (failedResults.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ 실패 종목 목록\n');

    failedResults.forEach(result => {
      console.log(`- ${result.company_name} (${result.company_id}): ${result.error}`);
    });

    console.log('\n💡 실패 종목 재시도 방법:');
    console.log('특정 종목만 다시 스크래핑하려면 test-scraper.ts의 SAMPLE_CODES를 수정하세요.\n');
  }

  // 6. DB 검증
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 데이터베이스 최종 확인\n');

  const { data: dbStats, error: statsError } = await supabaseAdmin
    .from('financial_data_extended')
    .select('data_source, is_estimate', { count: 'exact', head: true })
    .eq('data_source', 'naver');

  if (!statsError && dbStats !== null) {
    console.log(`📊 Naver 데이터 총 레코드: ${totalRecords}개`);
  }

  const { data: latestData } = await supabaseAdmin
    .from('financial_data_extended')
    .select('company_id, year, revenue, operating_profit, net_income, eps, per, roe')
    .eq('data_source', 'naver')
    .order('created_at', { ascending: false })
    .limit(3);

  if (latestData && latestData.length > 0) {
    console.log('\n최근 저장된 데이터 샘플:');
    latestData.forEach((record, index) => {
      console.log(`\n${index + 1}. Company ID ${record.company_id} (${record.year}년)`);
      console.log(`   - 매출액: ${record.revenue ? (record.revenue / 100000000).toFixed(0) + '억' : 'N/A'}`);
      console.log(`   - 영업이익: ${record.operating_profit ? (record.operating_profit / 100000000).toFixed(0) + '억' : 'N/A'}`);
      console.log(`   - EPS: ${record.eps || 'N/A'}`);
      console.log(`   - PER: ${record.per || 'N/A'}`);
      console.log(`   - ROE: ${record.roe ? record.roe + '%' : 'N/A'}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (successResults.length === totalCompanies) {
    console.log('🎉 완벽! 모든 종목 스크래핑 성공!\n');
    console.log('📝 다음 단계:');
    console.log('1. API 엔드포인트 추가 (새 데이터 활용)');
    console.log('2. Git 커밋 및 푸시');
    console.log('3. Vercel Preview 배포 테스트\n');
  } else if (successResults.length > totalCompanies * 0.9) {
    console.log('✅ 90% 이상 성공! 대부분의 데이터 수집 완료\n');
    console.log('💡 실패한 종목은 나중에 재시도하거나 제외 가능합니다.\n');
  } else {
    console.log('⚠️  성공률이 낮습니다. 네트워크 또는 API 문제를 확인하세요.\n');
  }
}

// 실행
main().catch(error => {
  console.error('🚨 치명적 오류:', error);
  process.exit(1);
});
