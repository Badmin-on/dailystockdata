# View 업데이트 가이드

v_investment_opportunities View를 동적 년도 필터로 업데이트하는 가이드입니다.

## 📋 문제 상황

기존 View가 `WHERE c.year >= 2025`로 하드코딩되어 있어서, 2026년이 되면 수동으로 수정해야 합니다.

**목표**: `WHERE c.year >= EXTRACT(YEAR FROM CURRENT_DATE)`로 변경하여 매년 자동으로 업데이트되도록 설정

## 🔍 진단 먼저 실행 (권장)

Supabase SQL Editor에서 `scripts/diagnose-views.sql` 파일을 열어서 **한 줄씩 실행**하세요.

### 진단 결과 확인 사항:

1. **Materialized Views 존재 확인**
   - `mv_consensus_changes` ✅ 존재해야 함
   - `mv_stock_analysis` ✅ 존재해야 함

2. **컬럼 구조 확인**
   - `mv_consensus_changes`: company_id, code, name, year, revenue, operating_profit, revenue_change_1m, op_change_1m, revenue_change_3m, op_change_3m, collected_at
   - `mv_stock_analysis`: company_id, code, name, date, close_price, change_rate, ma_120, divergence_rate, week_52_high, week_52_low, position_in_52w_range

3. **데이터 확인**
   - 샘플 데이터가 정상적으로 조회되어야 함
   - 최근 갱신 시간 확인

## ✅ 업데이트 실행

### 방법 1: 안전 업데이트 (권장)

`scripts/update-view-safe.sql` 파일을 Supabase SQL Editor에서 **전체 복사 후 한 번에 실행**하세요.

```sql
-- 파일 내용을 전체 복사해서 실행
-- CASCADE로 의존성 문제 자동 해결
-- CREATE OR REPLACE로 안전하게 재생성
```

**실행 후 확인**:
```sql
-- View가 정상적으로 생성되었는지 확인
SELECT COUNT(*) FROM v_investment_opportunities;

-- 샘플 데이터 확인
SELECT * FROM v_investment_opportunities LIMIT 5;

-- 현재 년도 필터 확인
SELECT DISTINCT year FROM v_investment_opportunities ORDER BY year;
```

### 방법 2: 기존 방법

`scripts/update-view-dynamic-year.sql` 파일 사용

## ❌ 에러 발생 시 해결 방법

### 에러 1: "column c.revenue does not exist"

**원인**: Materialized View의 컬럼 구조가 예상과 다름

**해결**:
1. `scripts/diagnose-views.sql`의 Step 2, 3 실행하여 실제 컬럼 구조 확인
2. 컬럼 이름이 다르면 `update-view-safe.sql` 파일 수정 필요

### 에러 2: "relation mv_consensus_changes does not exist"

**원인**: Materialized Views가 생성되지 않음

**해결**:
1. `scripts/schema.sql` 파일에서 Materialized Views 생성 부분 실행
2. 또는 DATABASE.md의 MV 생성 스크립트 실행
3. Materialized Views 생성 후 View 업데이트 재시도

### 에러 3: "cannot drop view because other objects depend on it"

**원인**: 다른 객체가 이 View를 참조하고 있음

**해결**:
- `DROP VIEW IF EXISTS v_investment_opportunities CASCADE;` 사용 (이미 update-view-safe.sql에 포함됨)

### 에러 4: Materialized View가 비어있음 (ispopulated = false)

**원인**: MV가 생성되었지만 데이터가 채워지지 않음

**해결**:
```sql
-- Materialized Views 수동 갱신
REFRESH MATERIALIZED VIEW mv_consensus_changes;
REFRESH MATERIALIZED VIEW mv_stock_analysis;
```

## 🔄 업데이트 후 작업

### 1. Materialized Views 갱신 (중요!)

```sql
REFRESH MATERIALIZED VIEW mv_consensus_changes;
REFRESH MATERIALIZED VIEW mv_stock_analysis;
```

### 2. API 테스트

웹사이트에서 `/api/investment-opportunities` 엔드포인트 확인:
- http://localhost:3000/api/investment-opportunities (로컬)
- https://dailystockdata.vercel.app/api/investment-opportunities (프로덕션)

### 3. 프론트엔드 확인

- `/opportunities` 페이지에서 데이터 정상 조회 확인
- 년도 필터가 현재 년도 이상만 표시되는지 확인

## 📅 동적 필터 작동 방식

### 현재 (2025년):
```sql
WHERE c.year >= EXTRACT(YEAR FROM CURRENT_DATE)
-- = WHERE c.year >= 2025
```

### 2026년 1월 1일 자정 이후:
```sql
WHERE c.year >= EXTRACT(YEAR FROM CURRENT_DATE)
-- = WHERE c.year >= 2026
```

**자동으로 필터가 업데이트되므로 수동 작업 불필요!**

## 🚨 주의 사항

### 과거 데이터 조회 제한

동적 필터를 적용하면 과거 년도 데이터가 View에서 제외됩니다:

- **2025년**: 2025, 2026, 2027년 데이터만 표시
- **2026년**: 2026, 2027년 데이터만 표시 (2025년 데이터 숨김)

**과거 데이터 조회가 필요하면**:
- Materialized Views를 직접 조회: `SELECT * FROM mv_consensus_changes WHERE year = 2025`
- 또는 View 필터를 제거하고 API에서 처리 (향후 고려 사항)

## 🎯 검증 체크리스트

- [ ] `diagnose-views.sql` 실행하여 MV 존재 확인
- [ ] `update-view-safe.sql` 실행하여 View 업데이트
- [ ] 에러 없이 완료 메시지 표시
- [ ] `SELECT COUNT(*) FROM v_investment_opportunities` 실행하여 데이터 확인
- [ ] Materialized Views 수동 갱신 (`REFRESH MATERIALIZED VIEW`)
- [ ] API 엔드포인트 테스트
- [ ] 웹사이트에서 데이터 정상 조회 확인
- [ ] Git commit & push (선택사항)

## 📞 추가 도움

문제가 계속되면:
1. `diagnose-views.sql`의 모든 결과 스크린샷 확인
2. 에러 메시지 전체 텍스트 확인
3. Supabase Dashboard → Database → Tables에서 직접 확인

---

**작성일**: 2025-11-06
**버전**: 1.0
**파일 위치**: `scripts/VIEW_UPDATE_GUIDE.md`
