/**
 * Naver Finance API 연결 테스트
 * 목적: Naver Finance JSON API가 정상 작동하는지 확인
 */

const axios = require('axios');

// Rate Limiting 설정
const RATE_LIMIT_DELAY = 2000; // 2초

// 테스트할 종목 10개
const TEST_STOCKS = [
  { code: '011170', name: '영원무역' },
  { code: '004370', name: '농심' },
  { code: '005930', name: '삼성전자' },
  { code: '000660', name: 'SK하이닉스' },
  { code: '051910', name: 'LG화학' },
  { code: '035420', name: 'NAVER' },
  { code: '068270', name: '셀트리온' },
  { code: '005380', name: '현대차' },
  { code: '012330', name: '현대모비스' },
  { code: '028260', name: '삼성물산' },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNaverAPI(stockCode, stockName) {
  try {
    const url = `https://m.stock.naver.com/api/stock/${stockCode}/finance/annual`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://m.stock.naver.com/',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    // 응답 데이터 구조 확인
    const financeInfo = response.data?.financeInfo;

    if (!financeInfo) {
      return {
        code: stockCode,
        name: stockName,
        success: false,
        error: '응답에 financeInfo 없음',
      };
    }

    // 데이터 포인트 수 확인
    const years = financeInfo.trTitleList?.length || 0;
    const metrics = financeInfo.rowList?.length || 0;

    // 샘플 데이터 추출 (최신 연도)
    let sampleData = {};
    if (years > 0 && metrics > 0) {
      const latestYear = financeInfo.trTitleList[0];
      const yearKey = latestYear.key;
      const isConsensus = latestYear.isConsensus === 'Y';

      // 주요 지표 추출
      financeInfo.rowList.forEach(row => {
        const title = row.title;
        const value = row.columns?.[yearKey]?.value || '-';

        if (['매출액', '영업이익', 'EPS', 'PER', 'ROE'].includes(title)) {
          sampleData[title] = value;
        }
      });

      sampleData['연도'] = latestYear.title;
      sampleData['컨센서스'] = isConsensus ? 'Y' : 'N';
    }

    return {
      code: stockCode,
      name: stockName,
      success: true,
      years,
      metrics,
      totalDataPoints: years * metrics,
      sampleData,
    };

  } catch (error) {
    return {
      code: stockCode,
      name: stockName,
      success: false,
      error: error.response?.status
        ? `HTTP ${error.response.status}`
        : error.message,
    };
  }
}

async function runTests() {
  console.log('🧪 Naver Finance API 연결 테스트 시작\n');
  console.log(`📊 테스트 대상: ${TEST_STOCKS.length}개 종목\n`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < TEST_STOCKS.length; i++) {
    const stock = TEST_STOCKS[i];

    console.log(`[${i + 1}/${TEST_STOCKS.length}] ${stock.name} (${stock.code}) 테스트 중...`);

    const result = await testNaverAPI(stock.code, stock.name);
    results.push(result);

    if (result.success) {
      successCount++;
      console.log(`  ✅ 성공: ${result.years}년 × ${result.metrics}개 지표 = ${result.totalDataPoints} 데이터 포인트`);

      // 샘플 데이터 출력
      if (result.sampleData && Object.keys(result.sampleData).length > 0) {
        console.log(`  📝 샘플 데이터 (${result.sampleData['연도']}, 컨센서스: ${result.sampleData['컨센서스']}):`);
        ['매출액', '영업이익', 'EPS', 'PER', 'ROE'].forEach(key => {
          if (result.sampleData[key]) {
            console.log(`     - ${key}: ${result.sampleData[key]}`);
          }
        });
      }
    } else {
      failCount++;
      console.log(`  ❌ 실패: ${result.error}`);
    }

    // Rate limiting (마지막 종목 제외)
    if (i < TEST_STOCKS.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }

    console.log('');
  }

  // 최종 결과 요약
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 테스트 결과 요약\n');
  console.log(`✅ 성공: ${successCount}/${TEST_STOCKS.length} (${(successCount / TEST_STOCKS.length * 100).toFixed(1)}%)`);
  console.log(`❌ 실패: ${failCount}/${TEST_STOCKS.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 성공한 종목의 평균 데이터 포인트
  if (successCount > 0) {
    const avgDataPoints = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.totalDataPoints, 0) / successCount;

    console.log(`📈 평균 데이터 포인트: ${avgDataPoints.toFixed(0)}개/종목\n`);
  }

  // 실패 목록 (있는 경우)
  if (failCount > 0) {
    console.log('❌ 실패 종목 상세:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.name} (${r.code}): ${r.error}`);
      });
    console.log('');
  }

  // 결론
  if (successCount === TEST_STOCKS.length) {
    console.log('✨ 모든 테스트 통과! Naver Finance API 사용 가능합니다.');
    console.log('✅ 다음 단계: DB 스키마 추가 (NAVER_MIGRATION_PLAN.md Phase 1 참조)\n');
  } else if (successCount > 0) {
    console.log('⚠️  일부 종목 실패. Rate limiting 또는 일시적 오류 가능성 있음.');
    console.log('💡 해결책: 재시도 또는 실패 종목 제외 후 진행\n');
  } else {
    console.log('🚨 모든 종목 실패! API 접근 차단 또는 네트워크 문제 가능성.');
    console.log('💡 해결책:');
    console.log('   1. VPN 사용하여 재시도');
    console.log('   2. User-Agent 변경');
    console.log('   3. DART API 대체 고려\n');
  }

  // 상세 결과 JSON 출력 (선택사항)
  if (process.argv.includes('--json')) {
    console.log('📄 JSON 결과:');
    console.log(JSON.stringify(results, null, 2));
  }
}

// 실행
runTests().catch(error => {
  console.error('🚨 치명적 오류:', error);
  process.exit(1);
});
