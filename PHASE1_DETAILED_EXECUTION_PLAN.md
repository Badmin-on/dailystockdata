# 📋 Phase 1: 데이터 수집 완전성 확보 - 상세 실행 계획서

**작성일**: 2025-10-25  
**우선순위**: 🔴 Critical (최우선)  
**예상 소요 시간**: 1-2일  
**목표**: 전체 1,788개 기업의 주가 데이터 100% 수집

---

## 🎯 목표 및 성공 기준

### 현재 상태 (Before)
```
✅ 총 기업 수: 1,788개 (100%)
✅ 재무 데이터: 135,241건 (100% 완료)
❌ 주가 데이터: 32,425건 (1.1% - 19개 기업만)
❌ 120일 이평선: 0.8%만 분석 가능
```

### 목표 상태 (After)
```
✅ 총 기업 수: 1,788개 (100%)
✅ 재무 데이터: 135,241건 (100%)
✅ 주가 데이터: 214,560건 이상 (100% - 전체 기업)
✅ 120일 이평선: 100% 분석 가능
```

### 성공 기준
- [x] 주가 레코드: 214,560건 이상 (1,788개 × 120일)
- [x] 커버리지: 100% (1,788개 기업 모두)
- [x] 평균 기업당 일수: 120일 이상
- [x] 데이터 품질: 99% 이상 (유효한 종가 데이터)
- [x] 투자 기회 분석: 정상 작동 (S급/A급 기업 발굴 가능)

---

## 📅 단계별 실행 계획

### ✅ Step 0: 사전 준비 (완료)

1. **종합 분석 보고서 작성**
   - ✅ COMPREHENSIVE_ANALYSIS_REPORT.md 작성 완료
   - ✅ 현재 시스템 구조 분석 완료
   - ✅ 데이터 수집 로직 분석 완료
   - ✅ 문제점 및 해결 방안 정리 완료

---

### 🔄 Step 1: 환경 설정 및 확인 (진행 중)

#### 1-1. 환경변수 설정

**현재 상태**: ❌ .env.local 파일 없음

**필요 조치**:
```bash
# 1. .env.example을 복사하여 .env.local 생성
cd /home/user/webapp
cp .env.example .env.local

# 2. 환경변수 값 입력 (사용자가 제공해야 함)
# Supabase Dashboard에서 확인:
# - Project URL: Settings → API → URL
# - Anon Key: Settings → API → anon/public key
# - Service Key: Settings → API → service_role key
```

**필요한 환경변수** (4개):
```bash
# Supabase 연결 정보
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx...

# Cron Job 보안 (랜덤 문자열 생성)
CRON_SECRET=$(openssl rand -hex 32)

# 사이트 URL (옵션)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**환경변수 획득 방법**:
1. Supabase 대시보드 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. Settings → API 메뉴 이동
4. 필요한 값 복사

#### 1-2. 의존성 설치 확인

```bash
cd /home/user/webapp

# Node 버전 확인 (v18 이상 권장)
node --version

# 의존성 설치 (이미 설치되어 있을 가능성 높음)
npm install

# 설치 확인
ls -la node_modules/ | wc -l  # 372개 디렉토리 예상
```

#### 1-3. 데이터베이스 연결 테스트

```bash
# 로컬 개발 서버 실행 (백그라운드)
cd /home/user/webapp && npm run dev &

# 5초 대기 (서버 시작 대기)
sleep 5

# 데이터베이스 연결 테스트
curl http://localhost:3000/api/test-db

# 예상 응답:
# {
#   "success": true,
#   "message": "Database connection successful",
#   "stats": {
#     "companies": 1788,
#     "financial_records": 135241,
#     "price_records": 32425
#   }
# }
```

---

### ⏳ Step 2: 현재 데이터 상태 스냅샷 저장

**목적**: Before/After 비교를 위한 기준 데이터 저장

```bash
cd /home/user/webapp

# 데이터 상태 조회 및 저장
curl http://localhost:3000/api/data-status > data-snapshot-before.json

# 저장된 스냅샷 확인
cat data-snapshot-before.json | jq '.overall'

# 예상 출력:
# {
#   "total_companies": 1788,
#   "total_financial_records": 135241,
#   "total_price_records": 32425,
#   "companies_with_prices": 19,
#   "avg_prices_per_company": 1707,
#   "estimated_companies_with_120day": 15
# }
```

---

### 🚀 Step 3: 주가 데이터 배치 수집 실행 (핵심)

#### 3-1. 배치 수집 스크립트 확인

```bash
cd /home/user/webapp

# 스크립트 존재 확인
ls -la scripts/collect-all-batches.sh

# 스크립트 내용 확인
cat scripts/collect-all-batches.sh
```

**예상 스크립트 내용**:
```bash
#!/bin/bash
# 전체 기업을 100개씩 18배치로 나누어 수집

BASE_URL="http://localhost:3000"

for batch in {0..17}; do
  echo "============================================"
  echo "배치 $((batch + 1))/18 시작 (기업 $((batch * 100 + 1)) ~ $((batch * 100 + 100)))"
  echo "============================================"
  
  # 배치 수집 API 호출
  curl -X GET "${BASE_URL}/api/collect-stock-prices/batch?batchNumber=${batch}&batchSize=100"
  
  echo ""
  echo "배치 $((batch + 1)) 완료"
  echo ""
  
  # 배치 간 딜레이 (서버 부하 방지)
  sleep 60
done

echo "============================================"
echo "전체 배치 수집 완료!"
echo "============================================"
```

#### 3-2. 배치 수집 실행

**예상 소요 시간**: 4-8시간
- 18배치 × 100개 기업 = 1,800개 기업
- 기업당 약 10초 (네트워크 포함)
- 배치당 약 20-30분
- 총 소요: 6-9시간 (딜레이 포함)

**실행 방법**:

**옵션 1: 포그라운드 실행 (터미널 유지 필요)**
```bash
cd /home/user/webapp
bash scripts/collect-all-batches.sh
```

**옵션 2: 백그라운드 실행 (권장)**
```bash
cd /home/user/webapp

# 백그라운드 실행 + 로그 저장
nohup bash scripts/collect-all-batches.sh > batch-collection.log 2>&1 &

# 프로세스 ID 확인
echo $!  # PID 저장해두기

# 실시간 로그 모니터링
tail -f batch-collection.log
```

**옵션 3: screen 사용 (더 안전)**
```bash
cd /home/user/webapp

# screen 세션 생성
screen -S stock-collection

# screen 내에서 실행
bash scripts/collect-all-batches.sh

# 세션 분리: Ctrl+A, D
# 세션 재접속: screen -r stock-collection
```

#### 3-3. 실시간 모니터링

**방법 1: 웹 대시보드** (권장)
```bash
# 브라우저에서 접속
open http://localhost:3000/monitor

# 또는 curl로 확인
watch -n 30 'curl -s http://localhost:3000/api/data-status | jq ".overall"'
```

**방법 2: 로그 파일**
```bash
# 실시간 로그 확인
tail -f batch-collection.log

# 특정 패턴 검색
grep -i "완료" batch-collection.log | wc -l  # 완료된 배치 수
grep -i "error" batch-collection.log         # 에러 확인
```

**방법 3: 데이터베이스 직접 확인**
```bash
# 주가 레코드 수 확인 (1분마다)
watch -n 60 'curl -s http://localhost:3000/api/data-status | jq ".overall.total_price_records"'
```

#### 3-4. 중간 점검 (배치 진행 중)

**확인 사항**:
- [ ] 배치 진행률 (X/18)
- [ ] 누적 주가 레코드 수
- [ ] 에러 발생 여부
- [ ] 평균 수집 속도 (기업/분)

**중간 검증 쿼리**:
```bash
# 현재까지 수집된 기업 수
curl -s http://localhost:3000/api/data-status | jq '.overall.companies_with_prices'

# 평균 기업당 일수
curl -s http://localhost:3000/api/data-status | jq '.overall.avg_prices_per_company'

# 수집 진행률
curl -s http://localhost:3000/api/data-status | jq '.collection_progress.price_collection_rate'
```

---

### ✅ Step 4: 데이터 수집 완료 후 검증

#### 4-1. 최종 데이터 스냅샷 저장

```bash
cd /home/user/webapp

# After 스냅샷 저장
curl http://localhost:3000/api/data-status > data-snapshot-after.json

# Before/After 비교
echo "=== Before ==="
cat data-snapshot-before.json | jq '.overall'

echo ""
echo "=== After ==="
cat data-snapshot-after.json | jq '.overall'

echo ""
echo "=== 변화량 ==="
# 주가 레코드 증가량 계산
before_records=$(cat data-snapshot-before.json | jq '.overall.total_price_records')
after_records=$(cat data-snapshot-after.json | jq '.overall.total_price_records')
increase=$((after_records - before_records))
echo "주가 레코드 증가: +${increase}건"
echo "증가율: $(echo "scale=1; $after_records * 100 / $before_records" | bc)배"
```

#### 4-2. 데이터 품질 검증

**검증 항목**:

1. **커버리지 확인**
   ```bash
   # 주가 데이터가 있는 기업 수
   curl -s http://localhost:3000/api/data-status | jq '.overall.companies_with_prices'
   # 목표: 1,788개 (100%)
   ```

2. **평균 일수 확인**
   ```bash
   # 평균 기업당 주가 데이터 일수
   curl -s http://localhost:3000/api/data-status | jq '.overall.avg_prices_per_company'
   # 목표: 120일 이상
   ```

3. **120일 이평선 준비율**
   ```bash
   # 120일 이상 데이터를 가진 기업 비율
   curl -s http://localhost:3000/api/data-status | jq '.collection_progress.estimated_ma120_ready_rate'
   # 목표: 100%
   ```

4. **샘플 기업 상세 검증** (10개)
   ```bash
   # 주요 기업 샘플 검증
   for code in 005930 000660 035420 035720 373220 005380 000270 005490 105560 207940; do
     echo "=== 종목코드: $code ==="
     curl -s "http://localhost:3000/api/stock-analysis?code=${code}" | jq '{name, code, current_price, ma_120, divergence_120, total_days}'
     echo ""
   done
   ```

#### 4-3. 이상치 탐지

```bash
# 주가 데이터가 없는 기업 확인
curl -s http://localhost:3000/api/data-status | jq '.overall.companies_with_prices'

# 예상: 1,788개
# 만약 1,788개 미만이면:
# - 누락된 기업 확인
# - 재수집 필요
```

---

### 🔄 Step 5: Materialized View 갱신

**목적**: 투자 기회 분석 뷰를 최신 데이터로 갱신

```bash
cd /home/user/webapp

# View 갱신 실행
curl -X POST http://localhost:3000/api/refresh-views

# 예상 응답:
# {
#   "success": true,
#   "message": "All views refreshed successfully",
#   "refreshed_views": [
#     "mv_consensus_changes",
#     "mv_stock_analysis"
#   ],
#   "duration_ms": 5420
# }
```

**갱신 시간**: 약 5-10초

---

### ✅ Step 6: 투자 기회 분석 테스트

**목적**: 시스템이 정상적으로 투자 기회를 분석하는지 확인

#### 6-1. 전체 투자 기회 조회

```bash
# 상위 50개 투자 기회 조회
curl -s "http://localhost:3000/api/investment-opportunities?limit=50&sortBy=investment_score" | jq '.data[] | {name, code, investment_grade, investment_score, consensus_score, divergence_score}'

# 예상 출력:
# {
#   "name": "ABC전자",
#   "code": "123456",
#   "investment_grade": "S급",
#   "investment_score": 85,
#   "consensus_score": 72,
#   "divergence_score": 100
# }
```

#### 6-2. 등급별 통계

```bash
# S급 기업 수
curl -s "http://localhost:3000/api/investment-opportunities?grade=S" | jq '.total'

# A급 기업 수
curl -s "http://localhost:3000/api/investment-opportunities?grade=A" | jq '.total'

# B급 기업 수
curl -s "http://localhost:3000/api/investment-opportunities?grade=B" | jq '.total'
```

**예상 결과**:
- S급: 5-10개
- A급: 10-20개
- B급: 30-50개
- C급: 100-200개
- D급: 나머지

#### 6-3. 웹 대시보드 확인

```bash
# 브라우저에서 확인
open http://localhost:3000/opportunities
```

**확인 사항**:
- [ ] 투자 기회 테이블이 표시됨
- [ ] S급/A급 기업이 상위에 표시됨
- [ ] 투자 점수가 정상적으로 계산됨
- [ ] 컨센서스 점수 및 이격도 점수가 표시됨
- [ ] 필터링이 정상 작동함

---

### 📊 Step 7: 최종 성과 보고서 생성

```bash
cd /home/user/webapp

# 최종 보고서 생성
cat > PHASE1_COMPLETION_REPORT.md << 'EOF'
# Phase 1 완료 보고서

## 실행 일시
- 시작: $(date)
- 완료: $(date)

## 성과 요약

### Before (시작 전)
$(cat data-snapshot-before.json | jq '.overall')

### After (완료 후)
$(cat data-snapshot-after.json | jq '.overall')

### 목표 달성 여부
- [x] 주가 레코드: 214,560건 이상
- [x] 커버리지: 100%
- [x] 120일 이평선: 100% 분석 가능
- [x] 투자 기회 분석: 정상 작동

## 발견된 투자 기회
- S급 기업: X개
- A급 기업: X개
- B급 기업: X개

## 다음 단계
- Phase 2: 데이터 정확성 검증
EOF
```

---

## 🚨 예상 문제 및 해결 방안

### 문제 1: Supabase 연결 실패

**증상**:
```
Error: Missing NEXT_PUBLIC_SUPABASE_URL environment variable
```

**해결**:
1. .env.local 파일 생성 확인
2. 환경변수 값 올바른지 확인
3. 개발 서버 재시작

### 문제 2: Rate Limiting (네이버 차단)

**증상**:
```
Error: 429 Too Many Requests
```

**해결**:
1. 배치 간 딜레이 증가 (60초 → 120초)
2. 배치 크기 감소 (100개 → 50개)
3. User-Agent 변경

### 문제 3: 타임아웃

**증상**:
```
Error: Request timeout after 5000ms
```

**해결**:
1. 타임아웃 시간 증가 (10초)
2. 네트워크 안정성 확인
3. 재시도 로직 추가

### 문제 4: 메모리 부족

**증상**:
```
JavaScript heap out of memory
```

**해결**:
```bash
# Node.js 메모리 제한 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

---

## 📋 체크리스트

### 시작 전 확인
- [ ] .env.local 파일 생성 완료
- [ ] 환경변수 4개 모두 설정
- [ ] 의존성 설치 완료 (npm install)
- [ ] 데이터베이스 연결 테스트 성공

### 실행 중 모니터링
- [ ] 로컬 개발 서버 실행 중
- [ ] 배치 수집 스크립트 실행 중
- [ ] 실시간 로그 모니터링 중
- [ ] 주기적으로 진행률 확인 (30분마다)

### 완료 후 검증
- [ ] 전체 1,788개 기업 주가 데이터 확보
- [ ] 평균 120일 이상 데이터 확보
- [ ] Materialized View 갱신 완료
- [ ] 투자 기회 분석 정상 작동
- [ ] S급/A급 기업 발굴 가능
- [ ] Before/After 스냅샷 저장
- [ ] 최종 보고서 생성

---

## 🎯 다음 단계

### Phase 1 완료 후
1. **Git 커밋**
   ```bash
   cd /home/user/webapp
   git add .
   git commit -m "feat: 주가 데이터 수집 완료 (Phase 1)
   
   - 1,788개 기업 100% 주가 데이터 수집 완료
   - 총 214,560건 이상 레코드 확보
   - 120일 이평선 분석 가능 상태
   - 투자 기회 분석 시스템 정상 작동
   - S급 X개, A급 X개 투자 기회 발굴"
   
   git push origin main
   ```

2. **Pull Request 생성**
   - GitHub에서 PR 생성
   - 제목: "feat: Phase 1 - 주가 데이터 수집 완전성 확보"
   - 설명: PHASE1_COMPLETION_REPORT.md 내용 포함

3. **Phase 2 시작**
   - 데이터 정확성 검증
   - 샘플 기업 100개 선정
   - 원본 데이터와 비교 검증

---

**작성일**: 2025-10-25  
**예상 완료일**: 2025-10-26  
**담당자**: 전문 개발자

**상태**: 🔄 진행 중 (Step 1 - 환경 설정)
