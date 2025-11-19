# 긴급 롤백 절차

**목적**: Naver Finance 마이그레이션 중 문제 발생 시 안전하게 이전 상태로 복원

---

## 🚨 롤백 결정 기준

다음 상황 발생 시 즉시 롤백 실행:

### Critical (즉시 롤백)
- [ ] 데이터 수집 완전 실패 (2일 연속)
- [ ] 사용자 대상 API 응답 에러율 > 10%
- [ ] 데이터베이스 손상 또는 중요 데이터 손실
- [ ] Naver API 영구 차단 (IP ban)
- [ ] 성능 저하 > 50% (p95 latency)

### Warning (모니터링 강화, 롤백 준비)
- [ ] 데이터 수집 부분 실패 (성공률 < 80%)
- [ ] 데이터 정확도 문제 (평균 오차율 > 10%)
- [ ] API 응답 시간 2배 증가
- [ ] Rate limit 경고 (Naver API)

### Info (정상 범위)
- [ ] 일시적 수집 실패 (< 5% 종목)
- [ ] 데이터 오차 < 5%
- [ ] API 응답 시간 < 2초

---

## 📋 롤백 체크리스트 (실행 전 확인)

### 사전 확인
- [ ] 현재 상태 스냅샷 생성 (롤백 후 재시도 대비)
- [ ] 롤백 사유 문서화
- [ ] 관련 팀원 통지
- [ ] 사용자 공지 준비 (필요 시)

### 롤백 권한 확인
- [ ] Vercel 관리자 권한
- [ ] Supabase 관리자 권한
- [ ] GitHub repository write 권한
- [ ] `.env` 파일 접근 권한

---

## 🔄 Phase별 롤백 절차

## Phase 1 롤백: 스키마 추가 단계

**상황**: 새 테이블(`financial_data_extended`) 생성 후 문제 발생

### 1단계: 데이터베이스 롤백
```sql
-- Supabase SQL Editor에서 실행

-- 1. 새 테이블 및 관련 객체 삭제
DROP TABLE IF EXISTS financial_data_extended CASCADE;
DROP FUNCTION IF EXISTS migrate_fnguide_to_extended() CASCADE;
DROP FUNCTION IF EXISTS validate_extended_data() CASCADE;

-- 2. 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%financial%';
-- ✅ financial_data만 존재해야 함
```

### 2단계: 코드 롤백
```bash
# Git 롤백
cd /path/to/dailystockdata
git checkout backup-before-naver-migration-2025-11-19

# 또는 특정 파일만 롤백
git checkout backup-before-naver-migration-2025-11-19 -- lib/scraper-naver.ts
git checkout backup-before-naver-migration-2025-11-19 -- types/database.types.ts

# 확인
git status
```

### 3단계: Vercel 재배포
```bash
vercel --prod

# 배포 확인
curl https://dailystockdata.vercel.app/api/companies | jq '.[:5]'
```

### 검증
```bash
# API 정상 동작 확인
npm run test

# 수동 테스트
open https://dailystockdata.vercel.app
```

---

## Phase 2 롤백: 병렬 수집 단계

**상황**: FnGuide + Naver 듀얼 수집 중 문제 발생

### 1단계: 듀얼 수집 중단
```bash
# .env.local 수정
NEXT_PUBLIC_DUAL_COLLECTION=false

# GitHub Actions 워크플로우 비활성화
git checkout main -- .github/workflows/daily-data-collection-dual.yml
git add .github/workflows/daily-data-collection-dual.yml
git commit -m "Rollback: Disable dual collection"
git push origin main
```

### 2단계: Naver 수집 데이터 삭제 (선택사항)
```sql
-- Supabase SQL Editor

-- 백업 생성 (만약을 대비)
CREATE TABLE financial_data_extended_backup AS
SELECT * FROM financial_data_extended WHERE data_source = 'naver';

-- Naver 데이터 삭제
DELETE FROM financial_data_extended WHERE data_source = 'naver';

-- 확인
SELECT data_source, COUNT(*)
FROM financial_data_extended
GROUP BY data_source;
-- ✅ naver: 0건이어야 함
```

### 3단계: FnGuide 단독 수집 재개
```bash
# 기존 워크플로우 복원
git checkout backup-before-naver-migration-2025-11-19 -- .github/workflows/daily-data-collection.yml
git add .github/workflows/daily-data-collection.yml
git commit -m "Rollback: Restore FnGuide-only collection"
git push origin main
```

### 검증
```bash
# 수동 수집 테스트
curl -X POST https://dailystockdata.vercel.app/api/collect-data \
  -H "Authorization: Bearer $API_SECRET_KEY" \
  -H "Content-Type: application/json"

# 결과 확인
psql -h [SUPABASE_HOST] -U postgres -c \
  "SELECT COUNT(*) FROM financial_data WHERE scrape_date = CURRENT_DATE;"
```

---

## Phase 3 롤백: API 전환 단계

**상황**: Naver 데이터를 메인으로 사용 중 문제 발생

### 1단계: Feature Flag 전환 (긴급)
```bash
# .env.local 수정 (즉시 적용)
NEXT_PUBLIC_USE_NAVER_DATA=false
NEXT_PUBLIC_ENABLE_EXTENDED_METRICS=false

# Vercel Dashboard에서도 환경변수 수정
# Settings → Environment Variables → Edit
```

### 2단계: Vercel 재배포
```bash
vercel --prod

# 배포 완료 확인
vercel ls | head -5
```

### 3단계: API 응답 확인
```bash
# date-comparison API 테스트
curl "https://dailystockdata.vercel.app/api/date-comparison?date1=2025-11-18&date2=2025-11-19" | jq

# 예상 결과: financial_data 테이블 기반 응답
# {
#   "success": true,
#   "data": [
#     {
#       "revenue": 123456,
#       "operating_profit": 7890,
#       // ❌ net_income, eps, per 등 확장 필드 없음 (정상)
#     }
#   ]
# }
```

### 4단계: 코드 롤백 (선택사항)
```bash
# Feature flag 관련 코드만 제거하고 싶다면
git checkout backup-before-naver-migration-2025-11-19 -- lib/feature-flags.ts
git checkout backup-before-naver-migration-2025-11-19 -- lib/data-fetcher.ts

git commit -m "Rollback: Remove feature flag system"
git push origin main
```

### 검증
```bash
# 전체 API 엔드포인트 테스트
npm run test:api

# 수동 확인
echo "Testing /api/date-comparison..."
curl -s "https://dailystockdata.vercel.app/api/date-comparison?date1=2025-11-18&date2=2025-11-19" | jq '.success'

echo "Testing /api/stock-comparison..."
curl -s "https://dailystockdata.vercel.app/api/stock-comparison?code1=005930&code2=000660" | jq '.success'

echo "Testing /api/consensus-trend..."
curl -s "https://dailystockdata.vercel.app/api/consensus-trend?stockCode=005930" | jq '.success'
```

---

## Phase 4-5 롤백: 완전 전환 이후

**상황**: Naver 완전 전환 후 심각한 문제 발견

### 🚨 완전 롤백 (Nuclear Option)

**경고**: 이 절차는 모든 Naver 관련 변경사항을 제거하고 2025-11-19 상태로 완전 복원합니다.

### 1단계: Git 완전 롤백
```bash
cd /path/to/dailystockdata

# 현재 상태 임시 백업
git branch backup-before-full-rollback-$(date +%Y%m%d)

# 백업 브랜치로 완전 복원
git checkout backup-before-naver-migration-2025-11-19

# 강제 푸시 (⚠️ 주의: 팀원과 조율 필수)
git push origin main --force

# 확인
git log --oneline -5
# ✅ "Pre-migration: Save current stable state" 커밋이 최신이어야 함
```

### 2단계: 데이터베이스 완전 복원
```bash
# 로컬에서 백업 SQL 복원
psql -h [SUPABASE_HOST] -U postgres -d postgres < backup_2025-11-19.sql

# 또는 Supabase Dashboard에서:
# Database → Backups → Restore from backup_2025-11-19
```

### 3단계: 새 테이블 삭제
```sql
-- Supabase SQL Editor

-- 마지막 확인: Naver 데이터 백업
CREATE TABLE emergency_backup_$(date +%Y%m%d) AS
SELECT * FROM financial_data_extended;

-- 완전 삭제
DROP TABLE IF EXISTS financial_data_extended CASCADE;
DROP TABLE IF EXISTS financial_data_archive CASCADE;

-- 기존 MV 복원 (필요 시)
-- MASTER-flexible-all-periods.sql 재실행
```

### 4단계: 환경변수 초기화
```bash
# .env.local
NEXT_PUBLIC_USE_NAVER_DATA=false
NEXT_PUBLIC_ENABLE_EXTENDED_METRICS=false
NEXT_PUBLIC_DUAL_COLLECTION=false

# Vercel Dashboard
# Settings → Environment Variables
# - 위 3개 변수 삭제 또는 false로 설정
```

### 5단계: Vercel 재배포
```bash
vercel --prod

# 배포 URL 확인
vercel ls | head -1
```

### 6단계: 전체 검증
```bash
# 1. 데이터베이스 상태 확인
psql -h [HOST] -U postgres << EOF
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%financial%';
EOF
# ✅ 예상: financial_data, financial_data_archive만 존재

# 2. 데이터 건수 확인
psql -h [HOST] -U postgres << EOF
SELECT
  (SELECT COUNT(*) FROM companies) AS companies,
  (SELECT COUNT(*) FROM financial_data) AS financial_data,
  (SELECT COUNT(*) FROM daily_stock_prices) AS stock_prices;
EOF

# 3. API 전체 테스트
npm run test

# 4. 수동 UI 테스트
open https://dailystockdata.vercel.app
# ✅ 날짜별 비교, 종목 비교, 컨센서스 추이 모두 정상 작동
```

---

## 📊 롤백 후 조치사항

### 즉시 실행
1. **사용자 공지**
   ```markdown
   [공지] 시스템 긴급 점검 완료

   안녕하세요, YoonStock Pro 팀입니다.

   오늘 [시간] 데이터 수집 시스템 점검으로 인해
   일시적으로 이전 버전으로 복원되었습니다.

   - 현재 상태: FnGuide 데이터 수집 방식 사용
   - 영향: 없음 (기존 기능 모두 정상 작동)
   - 복구 예정: 문제 분석 후 공지 예정

   불편을 드려 죄송합니다.
   ```

2. **로그 수집 및 분석**
   ```bash
   # Vercel 로그 다운로드
   vercel logs [DEPLOYMENT_URL] --since 24h > rollback-logs.txt

   # Supabase 로그 확인
   # Dashboard → Logs → Past 24 hours
   ```

3. **문제 원인 파악**
   - [ ] Naver API 응답 분석
   - [ ] 데이터베이스 쿼리 성능 분석
   - [ ] 에러 패턴 식별
   - [ ] 재발 방지 대책 수립

### 24시간 내 실행
4. **사후 분석 보고서 작성**
   ```markdown
   # 롤백 사후 분석 보고서

   ## 롤백 정보
   - 일시: YYYY-MM-DD HH:MM
   - 담당자: [Name]
   - 롤백 단계: Phase X

   ## 문제 요약
   [문제 상황 상세 설명]

   ## 원인 분석
   [근본 원인]

   ## 영향 범위
   - 영향받은 사용자 수: X명
   - 데이터 손실: 없음/있음 (상세)
   - 다운타임: X분

   ## 재발 방지 대책
   1. [대책 1]
   2. [대책 2]

   ## 향후 계획
   [재시도 여부 및 일정]
   ```

5. **재시도 여부 결정**
   - [ ] 문제 완전 해결 확인
   - [ ] 테스트 환경에서 재검증
   - [ ] 팀 회의 후 결정

---

## 🛠️ 예방적 모니터링

### 롤백 후 24시간 모니터링 항목

```sql
-- Supabase에서 매 시간 실행

-- 1. 데이터 수집 현황
SELECT
    scrape_date,
    COUNT(DISTINCT company_id) AS companies,
    COUNT(*) AS records
FROM financial_data
WHERE scrape_date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY scrape_date
ORDER BY scrape_date DESC;

-- 2. NULL 값 비율
SELECT
    ROUND(AVG(CASE WHEN revenue IS NULL THEN 1 ELSE 0 END) * 100, 2) AS null_revenue_pct,
    ROUND(AVG(CASE WHEN operating_profit IS NULL THEN 1 ELSE 0 END) * 100, 2) AS null_op_pct
FROM financial_data
WHERE scrape_date = CURRENT_DATE;

-- 3. 이상치 탐지
SELECT
    c.name,
    fd.year,
    fd.revenue,
    fd.operating_profit
FROM financial_data fd
JOIN companies c ON fd.company_id = c.id
WHERE fd.scrape_date = CURRENT_DATE
    AND (fd.revenue > 1000000 OR fd.operating_profit > 500000)
ORDER BY fd.revenue DESC;
```

### API 성능 모니터링
```bash
# 매 30분 실행
while true; do
  echo "=== $(date) ==="

  # 응답 시간 측정
  time curl -s "https://dailystockdata.vercel.app/api/date-comparison?date1=2025-11-18&date2=2025-11-19" > /dev/null

  # 에러율 확인
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://dailystockdata.vercel.app/api/companies")
  echo "Status: $STATUS"

  sleep 1800  # 30분
done
```

---

## 📞 긴급 연락처

### 기술 지원
- **시스템 관리자**: [Name] ([Email])
- **데이터베이스 관리자**: [Name] ([Email])
- **백엔드 개발자**: [Name] ([Email])

### 외부 서비스
- **Vercel Support**: support@vercel.com
- **Supabase Support**: support@supabase.io

### 참고 문서
- 마이그레이션 계획: `NAVER_MIGRATION_PLAN.md`
- 백업 위치: `backup_2025-11-19.sql`
- Git 백업 브랜치: `backup-before-naver-migration-2025-11-19`

---

**문서 버전**: 1.0
**작성일**: 2025-11-19
**최종 수정**: 2025-11-19
**다음 리뷰**: 마이그레이션 완료 후
