# 🚀 Supabase 스키마 설정 가이드

## ⚠️ 중요: 반드시 순서대로 실행하세요!

### Step 1: 기본 스키마 생성 (필수)

**파일:** `scripts/schema.sql`

Supabase SQL Editor에서 **전체 내용을 복사하여 실행**

**생성되는 테이블:**
- ✅ `companies` (기업 정보)
- ✅ `financial_data` (재무제표)
- ✅ `daily_stock_prices` (주가 데이터)

**실행 후 확인:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('companies', 'financial_data', 'daily_stock_prices');
```

**예상 결과:** 3개 테이블이 모두 조회되어야 함

---

### Step 2: 확장 스키마 생성 (YoonStock Pro 기능)

**파일:** `scripts/schema-enhancement.sql`

⚠️ **Step 1이 완료된 후에만 실행하세요!**

Supabase SQL Editor에서 **전체 내용을 복사하여 실행**

**생성되는 객체:**
- ✅ 함수: `calculate_ma_120()`, `calculate_divergence()`, `refresh_all_views()`
- ✅ Materialized View: `mv_consensus_changes`, `mv_stock_analysis`
- ✅ View: `v_investment_opportunities`

**실행 후 확인:**
```sql
-- 함수 확인
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'calculate%' OR routine_name = 'refresh_all_views';

-- View 확인
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'mv_%' OR table_name LIKE 'v_%';
```

**예상 결과:**
- 함수 3개
- View 3개

---

### Step 3: 초기 데이터 생성

```sql
-- Materialized View 초기화
SELECT refresh_all_views();
```

**⚠️ 주의:** 이 단계는 **데이터가 있을 때만** 실행하세요.
- 데이터가 없으면 빈 View가 생성됩니다.
- 데이터 수집 후 자동으로 갱신됩니다.

---

## 🔧 트러블슈팅

### 문제 1: "relation does not exist" 에러

**원인:** Step 1을 건너뛰고 Step 2를 실행함

**해결:**
1. Step 2 실행 취소 (아래 참조)
2. Step 1 먼저 실행
3. Step 2 다시 실행

**실행 취소 방법:**
```sql
-- 생성된 객체 삭제
DROP VIEW IF EXISTS v_investment_opportunities CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_stock_analysis CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_consensus_changes CASCADE;
DROP FUNCTION IF EXISTS refresh_all_views();
DROP FUNCTION IF EXISTS calculate_divergence(DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS calculate_ma_120(INT, DATE);
```

### 문제 2: "duplicate key value" 에러

**원인:** 이미 실행된 스크립트를 다시 실행함

**해결:** 무시해도 됨 (이미 생성됨)

### 문제 3: View가 비어있음

**원인:** 데이터가 아직 수집되지 않음

**해결:**
1. `/api/collect-data/manual` 호출하여 재무제표 수집
2. `/api/collect-stock-prices/manual` 호출하여 주가 수집
3. `SELECT refresh_all_views();` 실행

---

## ✅ 최종 검증

```sql
-- 1. 테이블 확인
SELECT
  'companies' as table_name, COUNT(*) as record_count
FROM companies
UNION ALL
SELECT
  'financial_data', COUNT(*)
FROM financial_data
UNION ALL
SELECT
  'daily_stock_prices', COUNT(*)
FROM daily_stock_prices;

-- 2. View 확인
SELECT
  'mv_consensus_changes' as view_name, COUNT(*) as record_count
FROM mv_consensus_changes
UNION ALL
SELECT
  'mv_stock_analysis', COUNT(*)
FROM mv_stock_analysis
UNION ALL
SELECT
  'v_investment_opportunities', COUNT(*)
FROM v_investment_opportunities;

-- 3. 함수 테스트
SELECT calculate_ma_120(1, CURRENT_DATE) as ma_120_test;
SELECT calculate_divergence(70000, 65000) as divergence_test;
```

**예상 결과:**
- 테이블에 데이터가 있어야 함
- View에 레코드가 있어야 함
- 함수가 숫자 값을 반환해야 함

---

## 📋 체크리스트

- [ ] Step 1: `schema.sql` 실행 완료
- [ ] Step 1 검증: 3개 테이블 생성 확인
- [ ] Step 2: `schema-enhancement.sql` 실행 완료
- [ ] Step 2 검증: 3개 함수 + 3개 View 생성 확인
- [ ] Step 3: 데이터 수집 (선택적)
- [ ] Step 3: `refresh_all_views()` 실행 (선택적)
- [ ] 최종 검증: View에 데이터 확인

---

## 🆘 여전히 문제가 있다면?

1. Supabase Dashboard → Database → Query 로그 확인
2. 에러 메시지 전체 복사
3. GitHub Issues에 문의
