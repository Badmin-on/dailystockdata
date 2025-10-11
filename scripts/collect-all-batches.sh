#!/bin/bash

# 배치 수집 스크립트 (Windows Git Bash용)
# 사용법: bash scripts/collect-all-batches.sh

BASE_URL="http://localhost:3000"
TOTAL_BATCHES=18  # 1788 / 100 = 18 배치

echo "🚀 YoonStock 주가 데이터 배치 수집 시작"
echo "총 배치 수: ${TOTAL_BATCHES}"
echo ""

for batch in $(seq 1 $TOTAL_BATCHES); do
  echo "📦 배치 ${batch}/${TOTAL_BATCHES} 처리 중..."

  response=$(curl -s "${BASE_URL}/api/collect-stock-prices/batch?batch=${batch}")

  success=$(echo $response | grep -o '"success":true' | wc -l)

  if [ $success -eq 1 ]; then
    success_count=$(echo $response | grep -o '"success_count":[0-9]*' | cut -d':' -f2)
    echo "✅ 배치 ${batch} 완료 - 성공: ${success_count}개"
  else
    echo "❌ 배치 ${batch} 실패"
  fi

  # 배치 간 딜레이 (1초)
  sleep 1
done

echo ""
echo "🎉 전체 배치 수집 완료!"
echo "Supabase에서 데이터 확인: SELECT COUNT(*) FROM daily_stock_prices;"
