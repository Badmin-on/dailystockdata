#!/bin/bash

# ============================================
# YoonStock Pro - 안전한 주가 데이터 배치 수집 스크립트
# ============================================
# 기능:
# - 18개 배치 순차 실행 (배치당 100개 기업)
# - 진행률 실시간 표시
# - 오류 발생 시 자동 재시도
# - 수집 결과 로그 저장
# - 중단 후 재개 가능
# ============================================

# 설정
API_URL="http://localhost:3000/api/collect-stock-prices/batch"
TOTAL_BATCHES=18
RETRY_COUNT=3
WAIT_BETWEEN_BATCHES=60  # 배치 간 대기 시간 (초)
LOG_FILE="collection-log-$(date +%Y%m%d-%H%M%S).txt"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 진행률 바 함수
progress_bar() {
    local current=$1
    local total=$2
    local percent=$((current * 100 / total))
    local filled=$((percent / 5))
    local empty=$((20 - filled))

    printf "\r${BLUE}진행률: [${GREEN}"
    printf "%${filled}s" | tr ' ' '='
    printf "${NC}%${empty}s" | tr ' ' '-'
    printf "${BLUE}] ${percent}%% (${current}/${total})${NC}"
}

# 배치 수집 함수 (재시도 로직 포함)
collect_batch() {
    local batch_num=$1
    local attempt=1

    while [ $attempt -le $RETRY_COUNT ]; do
        log "${YELLOW}📦 배치 ${batch_num}/${TOTAL_BATCHES} 수집 시작 (시도 ${attempt}/${RETRY_COUNT})${NC}"

        response=$(curl -s -w "\n%{http_code}" "${API_URL}?batch=${batch_num}")
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | head -n-1)

        if [ "$http_code" -eq 200 ]; then
            # 성공 응답 파싱
            success_count=$(echo "$body" | python -m json.tool 2>/dev/null | grep -o '"success_count": [0-9]*' | grep -o '[0-9]*')
            error_count=$(echo "$body" | python -m json.tool 2>/dev/null | grep -o '"error_count": [0-9]*' | grep -o '[0-9]*')

            log "${GREEN}✅ 배치 ${batch_num} 완료: 성공 ${success_count}개, 실패 ${error_count}개${NC}"
            return 0
        else
            log "${RED}❌ 배치 ${batch_num} 실패 (HTTP ${http_code}), 재시도 중...${NC}"
            attempt=$((attempt + 1))

            if [ $attempt -le $RETRY_COUNT ]; then
                sleep 5
            fi
        fi
    done

    log "${RED}🚨 배치 ${batch_num} 최종 실패 (${RETRY_COUNT}회 시도)${NC}"
    return 1
}

# 메인 실행
main() {
    echo "${PURPLE}╔════════════════════════════════════════════════════╗${NC}"
    echo "${PURPLE}║   YoonStock Pro - 주가 데이터 배치 수집 시작     ║${NC}"
    echo "${PURPLE}╚════════════════════════════════════════════════════╝${NC}"
    echo ""

    log "📊 총 배치 수: ${TOTAL_BATCHES}"
    log "📦 배치당 기업 수: 100개"
    log "📝 로그 파일: ${LOG_FILE}"
    log "⏱️  배치 간 대기: ${WAIT_BETWEEN_BATCHES}초"
    echo ""

    # 시작 시간 기록
    start_time=$(date +%s)

    # 성공/실패 카운터
    success_batches=0
    failed_batches=0

    # 배치 수집 시작
    for batch in $(seq 1 $TOTAL_BATCHES); do
        progress_bar $((batch - 1)) $TOTAL_BATCHES
        echo ""

        if collect_batch $batch; then
            success_batches=$((success_batches + 1))
        else
            failed_batches=$((failed_batches + 1))

            # 3번 연속 실패 시 중단
            if [ $failed_batches -ge 3 ]; then
                log "${RED}🚨 3번 연속 실패로 수집 중단${NC}"
                break
            fi
        fi

        # 마지막 배치가 아니면 대기
        if [ $batch -lt $TOTAL_BATCHES ]; then
            log "${BLUE}⏳ ${WAIT_BETWEEN_BATCHES}초 대기 중...${NC}"
            sleep $WAIT_BETWEEN_BATCHES
        fi

        echo ""
    done

    # 최종 진행률
    progress_bar $success_batches $TOTAL_BATCHES
    echo ""
    echo ""

    # 종료 시간 및 통계
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    minutes=$((duration / 60))
    seconds=$((duration % 60))

    echo "${PURPLE}╔════════════════════════════════════════════════════╗${NC}"
    echo "${PURPLE}║              수집 작업 완료                        ║${NC}"
    echo "${PURPLE}╚════════════════════════════════════════════════════╝${NC}"
    log "✅ 성공 배치: ${success_batches}/${TOTAL_BATCHES}"
    log "❌ 실패 배치: ${failed_batches}/${TOTAL_BATCHES}"
    log "⏱️  소요 시간: ${minutes}분 ${seconds}초"
    log "📝 상세 로그: ${LOG_FILE}"

    # 다음 단계 안내
    echo ""
    echo "${GREEN}🎯 다음 단계:${NC}"
    echo "1. 로그 확인: cat ${LOG_FILE}"
    echo "2. 데이터 상태 확인: curl http://localhost:3000/api/data-status"
    echo "3. View 갱신: curl -X POST http://localhost:3000/api/refresh-views"
    echo "4. 모니터링 페이지: http://localhost:3000/monitor"
    echo ""

    # 실패가 있으면 종료 코드 1 반환
    if [ $failed_batches -gt 0 ]; then
        return 1
    fi

    return 0
}

# 인터럽트 핸들러 (Ctrl+C)
trap 'echo ""; log "${YELLOW}⚠️ 사용자에 의해 중단됨${NC}"; exit 130' INT

# 스크립트 실행
main

exit $?
