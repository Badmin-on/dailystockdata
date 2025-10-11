#!/bin/bash

# 단일 배치 테스트 스크립트
# 배치 1번만 수집하여 정상 작동 확인

echo "🧪 배치 1 테스트 수집 시작..."
echo ""

response=$(curl -s -w "\n%{http_code}" "http://localhost:3000/api/collect-stock-prices/batch?batch=1")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "HTTP Status: $http_code"
echo ""
echo "Response:"
echo "$body" | python -m json.tool
echo ""

if [ "$http_code" -eq 200 ]; then
    echo "✅ 테스트 성공! 전체 수집을 진행해도 안전합니다."
    echo ""
    echo "다음 명령으로 전체 수집 시작:"
    echo "  bash scripts/collect-prices-safe.sh"
else
    echo "❌ 테스트 실패! 문제를 해결한 후 다시 시도하세요."
fi
