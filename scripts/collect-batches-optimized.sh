#!/bin/bash

# 최적화된 배치 수집 스크립트
# 배치 크기: 20개 (60초 내 완료 가능)
# 총 배치: 90개 (1788 / 20 = 90)

BASE_URL="http://localhost:3000"
BATCH_SIZE=20
TOTAL_COMPANIES=1788
TOTAL_BATCHES=$(( (TOTAL_COMPANIES + BATCH_SIZE - 1) / BATCH_SIZE ))

echo "🚀 YoonStock 주가 데이터 배치 수집 시작"
echo "총 기업: ${TOTAL_COMPANIES}개"
echo "배치 크기: ${BATCH_SIZE}개"
echo "총 배치: ${TOTAL_BATCHES}개"
echo ""

# 시작 배치 번호 (인자로 받거나 기본값 1)
START_BATCH=${1:-1}
END_BATCH=${2:-$TOTAL_BATCHES}

echo "실행 범위: 배치 ${START_BATCH} ~ ${END_BATCH}"
echo ""

success_total=0
error_total=0
skip_total=0

for batch in $(seq $START_BATCH $END_BATCH); do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 배치 ${batch}/${TOTAL_BATCHES} 처리 중..."
  
  start_time=$(date +%s)
  
  # 배치 번호를 사용한 API 호출
  response=$(curl -s -m 90 "${BASE_URL}/api/collect-stock-prices/batch-small?batch=${batch}&size=${BATCH_SIZE}")
  
  end_time=$(date +%s)
  duration=$((end_time - start_time))
  
  # 응답 파싱
  success=$(echo $response | jq -r '.success // false')
  
  if [ "$success" = "true" ]; then
    success_count=$(echo $response | jq -r '.success_count // 0')
    error_count=$(echo $response | jq -r '.error_count // 0')
    skipped_count=$(echo $response | jq -r '.skipped_count // 0')
    
    success_total=$((success_total + success_count))
    error_total=$((error_total + error_count))
    skip_total=$((skip_total + skipped_count))
    
    echo "✅ 배치 ${batch} 완료 (${duration}초)"
    echo "   성공: ${success_count}개, 실패: ${error_count}개, 스킵: ${skipped_count}개"
  else
    error_msg=$(echo $response | jq -r '.error // "Unknown error"')
    echo "❌ 배치 ${batch} 실패: ${error_msg}"
    error_total=$((error_total + 1))
  fi
  
  # 진행률 계산
  progress=$(( (batch - START_BATCH + 1) * 100 / (END_BATCH - START_BATCH + 1) ))
  echo "   진행률: ${progress}%"
  
  # 10배치마다 요약 출력
  if [ $((batch % 10)) -eq 0 ]; then
    echo ""
    echo "📊 중간 요약 (배치 ${batch}/${TOTAL_BATCHES})"
    echo "   누적 성공: ${success_total}개"
    echo "   누적 실패: ${error_total}개"
    echo "   누적 스킵: ${skip_total}개"
    echo ""
  fi
  
  # 배치 간 짧은 딜레이 (서버 부하 방지)
  sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 배치 수집 완료!"
echo ""
echo "📊 최종 결과:"
echo "   총 성공: ${success_total}개"
echo "   총 실패: ${error_total}개"
echo "   총 스킵: ${skip_total}개"
echo ""
echo "다음 단계:"
echo "1. 데이터 확인: curl http://localhost:3000/api/data-status"
echo "2. View 갱신: curl -X POST http://localhost:3000/api/refresh-views"
echo "3. 투자 기회: curl http://localhost:3000/api/investment-opportunities?limit=20"
