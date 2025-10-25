# 🚀 Phase 1 실행 계획: 데이터 수집 완전성 확보

**날짜**: 2025-10-25  
**우선순위**: 🔴 긴급 (Critical)  
**예상 소요 시간**: 1-2일  
**담당자**: 개발팀

---

## 📊 현재 상태

### 데이터 커버리지 (2025-10-25 기준)

| 항목 | 현재 | 목표 | 상태 |
|------|------|------|------|
| **총 기업 수** | 1,788개 | 1,788개 | ✅ 완료 |
| **재무 데이터** | 135,241건 (1,891%) | 135,000건 이상 | ✅ 완료 |
| **주가 데이터** | 32,425건 (1.1%) | 214,560건 (100%) | ⚠️ **1.1%만 수집됨** |
| **120일 준비** | ~15개 (0.8%) | 1,788개 (100%) | ❌ **거의 없음** |

### 주요 문제점

1. **주가 데이터 불균형**
   - 19개 기업에만 데이터 집중 (평균 1,707일치)
   - 나머지 1,769개 기업은 데이터 없음 (0일)
   
2. **120일 이평선 분석 불가**
   - 전체의 0.8%만 분석 가능
   - 투자 기회 발굴 시스템 작동 불가

3. **원인 분석**
   - 배치 수집 스크립트가 일부 기업에만 반복 실행된 것으로 추정
   - 수집 로직의 범위 설정 오류
   - Rate limiting으로 인한 중간 중단 가능성

---

## 🎯 Phase 1 목표

### 핵심 목표
✅ **전체 1,788개 기업의 120일치 주가 데이터 수집 완료**

### 성공 기준
- [x] 주가 데이터 커버리지: **100%** (1,788개 기업 모두)
- [x] 평균 주가 레코드: **120일치 이상**
- [x] 총 주가 레코드: **214,560건 이상** (1,788 × 120)
- [x] 120일 이평선 분석 가능: **100%** (1,788개 기업)
- [x] 데이터 품질: **99% 이상** (에러율 <1%)

---

## 📝 실행 단계

### Step 1: 사전 점검 (10분)

#### 1.1 환경변수 확인
```bash
# .env.local 파일 존재 여부 확인
cd /home/user/webapp
ls -la .env.local

# 환경변수 검증
cat .env.local | grep SUPABASE
```

**필수 환경변수**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `CRON_SECRET`

#### 1.2 데이터베이스 연결 테스트
```bash
# 로컬 개발 서버 실행
cd /home/user/webapp && npm run dev

# 별도 터미널에서 테스트
curl http://localhost:3000/api/test-db
```

**예상 응답**:
```json
{
  "success": true,
  "message": "Database connected",
  "tables": {
    "companies": 1788,
    "financial_data": 135241,
    "daily_stock_prices": 32425
  }
}
```

#### 1.3 현재 데이터 스냅샷
```bash
# 데이터 상태 확인
curl http://localhost:3000/api/data-status
```

**저장**: 결과를 `data-snapshot-before.json`에 저장하여 비교용으로 보관

---

### Step 2: 주가 데이터 수집 (2-4시간)

#### 2.1 수집 전략

**옵션 A: 배치 수집 스크립트 사용 (권장)**

```bash
# 전체 18개 배치 자동 실행
cd /home/user/webapp
bash scripts/collect-all-batches.sh
```

**장점**:
- 자동화된 프로세스
- 진행률 추적 가능
- 에러 발생 시 재시도

**예상 소요 시간**:
- 배치당 60-120초
- 총 18배치 × 100초 = **약 30분 ~ 1시간**

**옵션 B: API 직접 호출 (수동)**

```bash
# 100개씩 18배치 수동 실행
for i in {1..18}; do
  echo "배치 $i/18 실행 중..."
  curl "http://localhost:3000/api/collect-stock-prices/batch?batch=$i"
  echo "\n배치 $i 완료. 60초 대기..."
  sleep 60
done
```

**옵션 C: 전체 수집 API (소규모 테스트용)**

```bash
# 전체 기업 한 번에 수집 (5개 샘플)
curl http://localhost:3000/api/collect-stock-prices/manual
```

**⚠️ 주의사항**:
- Rate Limiting: 초당 2개 기업 제한
- Timeout: 최대 5분 (Vercel 제한)
- 네트워크 안정성 필요

#### 2.2 실시간 모니터링

**터미널 1**: 수집 실행
```bash
bash scripts/collect-all-batches.sh
```

**터미널 2**: 모니터링 대시보드
```bash
# 브라우저에서 열기
open http://localhost:3000/monitor

# 또는 API로 확인
watch -n 30 'curl -s http://localhost:3000/api/data-status | jq'
```

**확인 지표**:
- `total_price_records`: 증가 추이 확인
- `companies_with_prices`: 19개 → 1,788개로 증가
- `price_collection_rate`: 1.1% → 100%로 증가
- `estimated_companies_with_120day`: 15개 → 1,788개로 증가

#### 2.3 에러 핸들링

**예상 에러**:
1. **네트워크 타임아웃**
   - 해결: 해당 배치 재실행
   - 명령어: `curl "http://localhost:3000/api/collect-stock-prices/batch?batch=X"`

2. **Naver Finance Rate Limit**
   - 증상: 429 Too Many Requests
   - 해결: 10분 대기 후 재실행

3. **Supabase Connection Error**
   - 확인: `curl http://localhost:3000/api/test-db`
   - 해결: 환경변수 재확인

**에러 로그 확인**:
```bash
# 로그 파일 확인 (있는 경우)
tail -f /home/user/webapp/logs/collection.log

# Next.js 개발 서버 로그
# 터미널에서 직접 확인
```

---

### Step 3: 데이터 검증 (30분)

#### 3.1 수집 완료 확인

```bash
# 최종 데이터 상태 확인
curl http://localhost:3000/api/data-status > data-snapshot-after.json

# 비교
diff data-snapshot-before.json data-snapshot-after.json
```

**기대 결과**:
```json
{
  "overall": {
    "total_companies": 1788,
    "total_price_records": 214560,  // 32,425 → 214,560 (약 6.6배 증가)
    "companies_with_prices": 1788,  // 19 → 1,788 (100%)
    "estimated_companies_with_120day": 1788,  // 15 → 1,788 (100%)
    "latest_price_date": "2025-10-24"
  },
  "collection_progress": {
    "price_collection_rate": "100.0%",  // 1.1% → 100%
    "estimated_ma120_ready_rate": "100.0%",  // 0.8% → 100%
    "avg_days_collected": 120
  }
}
```

#### 3.2 샘플 검증 (10개 기업)

**테스트 기업 목록** (대표 기업):
```javascript
const testCompanies = [
  { code: '005930', name: '삼성전자' },
  { code: '000660', name: 'SK하이닉스' },
  { code: '035420', name: 'NAVER' },
  { code: '051910', name: 'LG화학' },
  { code: '035720', name: '카카오' },
  { code: '068270', name: '셀트리온' },
  { code: '207940', name: '삼성바이오로직스' },
  { code: '006400', name: '삼성SDI' },
  { code: '105560', name: 'KB금융' },
  { code: '055550', name: '신한지주' }
];
```

**검증 쿼리** (Supabase SQL Editor):
```sql
-- 1. 주가 데이터 보유 기업 수
SELECT COUNT(DISTINCT company_id) as companies_with_prices
FROM daily_stock_prices;
-- 예상: 1,788

-- 2. 평균 주가 레코드 수
SELECT 
  c.name,
  c.code,
  COUNT(dsp.id) as price_records,
  MIN(dsp.date) as earliest_date,
  MAX(dsp.date) as latest_date
FROM companies c
LEFT JOIN daily_stock_prices dsp ON c.id = dsp.company_id
WHERE c.code IN ('005930', '000660', '035420', '051910', '035720')
GROUP BY c.id, c.name, c.code
ORDER BY c.name;
-- 예상: 각 120개 레코드

-- 3. 120일 이상 데이터 보유 기업
SELECT COUNT(*) as ready_for_ma120
FROM (
  SELECT company_id, COUNT(*) as records
  FROM daily_stock_prices
  GROUP BY company_id
  HAVING COUNT(*) >= 120
) sub;
-- 예상: 1,788
```

#### 3.3 데이터 품질 체크

**체크리스트**:
- [x] 날짜 형식: YYYY-MM-DD
- [x] 종가: NULL 값 < 5%
- [x] 변동률: -30% ~ +30% 범위 (이상치 제외)
- [x] 거래량: 양수 값
- [x] 중복 레코드: 0건 (UNIQUE 제약 조건)

**이상치 탐지 쿼리**:
```sql
-- 극단적인 변동률 확인
SELECT c.name, dsp.date, dsp.change_rate
FROM daily_stock_prices dsp
JOIN companies c ON dsp.company_id = c.id
WHERE ABS(dsp.change_rate) > 30
ORDER BY ABS(dsp.change_rate) DESC
LIMIT 20;

-- NULL 값 비율 확인
SELECT 
  COUNT(*) as total,
  COUNT(close_price) as has_price,
  ROUND(100.0 * COUNT(close_price) / COUNT(*), 2) as price_coverage
FROM daily_stock_prices;
-- 예상: 95% 이상
```

---

### Step 4: View 갱신 (5분)

#### 4.1 Materialized View 갱신

```bash
# View 갱신 API 호출
curl -X POST http://localhost:3000/api/refresh-views \
  -H "Content-Type: application/json"
```

**갱신되는 View**:
1. `mv_consensus_changes`: 재무 컨센서스 변화율
2. `mv_stock_analysis`: 120일 이평선 + 이격도

**예상 응답**:
```json
{
  "success": true,
  "message": "All views refreshed successfully",
  "refreshed": [
    "mv_consensus_changes",
    "mv_stock_analysis"
  ],
  "timestamp": "2025-10-25T12:34:56.789Z"
}
```

#### 4.2 투자 기회 분석 테스트

```bash
# 상위 20개 투자 기회 조회
curl "http://localhost:3000/api/investment-opportunities?limit=20&sortBy=investment_score"
```

**기대 결과**:
- S급 기업: 5-10개
- A급 기업: 10-20개
- 모든 기업에 `investment_score` 계산 완료
- `divergence_120` (이격도) 값 존재

---

### Step 5: 프로덕션 배포 준비 (30분)

#### 5.1 최종 테스트

**브라우저 테스트**:
1. http://localhost:3000/ → 통계 확인
2. http://localhost:3000/monitor → 100% 커버리지 확인
3. http://localhost:3000/opportunities → S급 기업 확인
4. http://localhost:3000/dashboard → 재무제표 확인

#### 5.2 Git 커밋 및 푸시

```bash
cd /home/user/webapp

# 변경사항 확인
git status

# Phase 1 완료 태그
git tag -a v1.1.0-phase1-complete -m "Phase 1 Complete: 100% stock price data collection"
git push origin v1.1.0-phase1-complete
```

#### 5.3 Vercel 배포 트리거

```bash
# GitHub 푸시 시 자동 배포
git push origin main

# 배포 상태 확인
# https://vercel.com/dashboard
```

---

## 📊 체크리스트

### 수집 전 준비
- [ ] 환경변수 설정 완료
- [ ] 데이터베이스 연결 테스트 통과
- [ ] 현재 데이터 스냅샷 저장
- [ ] 로컬 개발 서버 실행 중

### 데이터 수집
- [ ] 배치 1-6 완료 (333개 기업)
- [ ] 배치 7-12 완료 (666개 기업)
- [ ] 배치 13-18 완료 (1,788개 기업)
- [ ] 에러 로그 확인 및 재시도

### 데이터 검증
- [ ] 총 주가 레코드: 214,560건 이상
- [ ] 주가 커버리지: 100% (1,788개 기업)
- [ ] 120일 준비율: 100%
- [ ] 샘플 10개 기업 수동 검증
- [ ] 이상치 확인 (극단 변동률 체크)

### View 갱신
- [ ] `mv_consensus_changes` 갱신 완료
- [ ] `mv_stock_analysis` 갱신 완료
- [ ] 투자 기회 API 테스트 통과

### 최종 확인
- [ ] 모든 페이지 정상 작동
- [ ] 투자 점수 계산 정상
- [ ] S급 기업 발견됨
- [ ] Git 커밋 및 푸시 완료
- [ ] Vercel 배포 트리거

---

## 🚨 문제 해결 가이드

### 문제 1: 배치 수집 중단

**증상**: 특정 배치에서 멈춤

**해결**:
```bash
# 해당 배치만 재실행
curl "http://localhost:3000/api/collect-stock-prices/batch?batch=X"

# 또는 다음 배치부터 재개
for i in {X..18}; do
  curl "http://localhost:3000/api/collect-stock-prices/batch?batch=$i"
  sleep 60
done
```

### 문제 2: Rate Limiting (429 Error)

**증상**: "Too Many Requests" 에러

**해결**:
```bash
# 10분 대기 후 재시도
sleep 600
bash scripts/collect-all-batches.sh
```

### 문제 3: View 갱신 실패

**증상**: "Could not refresh materialized view"

**해결**:
```bash
# Supabase SQL Editor에서 수동 실행
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consensus_changes;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;
```

### 문제 4: 데이터 일부만 수집됨

**증상**: 커버리지 < 100%

**해결**:
```sql
-- 수집 안 된 기업 확인
SELECT c.id, c.name, c.code
FROM companies c
LEFT JOIN daily_stock_prices dsp ON c.id = dsp.company_id
WHERE dsp.id IS NULL
ORDER BY c.id
LIMIT 100;

-- 특정 기업 재수집 (API 개선 필요)
```

---

## 📈 예상 결과

### 수집 전 (Before)
```
총 기업: 1,788개
주가 레코드: 32,425건
커버리지: 1.1% (19개 기업)
120일 준비: 0.8% (15개 기업)
```

### 수집 후 (After)
```
총 기업: 1,788개
주가 레코드: 214,560건 ↑ (6.6배 증가)
커버리지: 100% (1,788개 기업) ↑
120일 준비: 100% (1,788개 기업) ↑
```

### 투자 기회 분석 가능
```
S급 기업: 5-10개 발견 예상
A급 기업: 10-20개 발견 예상
분석 가능: 1,788개 기업 전체
```

---

## 🎯 다음 단계 (Phase 2)

Phase 1 완료 후:
- [ ] **Phase 2**: 데이터 정확성 검증 (1주)
  - 재무 데이터와 FnGuide 원본 비교
  - 주가 데이터와 Naver Finance 비교
  - 이평선 계산 로직 수학적 검증
  - 샘플 100개 기업 완전 검증

---

**작성일**: 2025-10-25  
**업데이트**: Phase 1 실행 중  
**다음 업데이트**: Phase 1 완료 후 결과 보고서
