# Phase 1 실행 가이드: DB 스키마 추가

**목적**: Naver Finance 데이터를 저장할 확장 테이블 생성
**소요 시간**: 5분
**위험도**: 🟢 낮음 (기존 테이블 영향 없음)

---

## ✅ 사전 확인

현재 상태:
- ✅ Git 브랜치: `feature/naver-v2` (안전한 개발 브랜치)
- ✅ Naver API 테스트: 100% 성공
- ✅ TypeScript 타입 정의: 완료

---

## 🚀 Step 1: Supabase SQL Editor 접속

### 1-1. Supabase Dashboard 열기

**URL**: https://supabase.com/dashboard

**로그인 정보**:
- 프로젝트 선택: `dailystockdata` (또는 해당 프로젝트 이름)

### 1-2. SQL Editor 열기

```
왼쪽 메뉴 → SQL Editor 클릭
```

또는 단축키: `Alt + S` (Windows), `Cmd + S` (Mac)

---

## 📝 Step 2: SQL 스크립트 실행

### 2-1. 새 쿼리 생성

```
SQL Editor → "New Query" 버튼 클릭
```

### 2-2. SQL 복사-붙여넣기

**파일 위치**: `scripts/migration-001-add-naver-schema.sql`

**VS Code에서 열기:**
```bash
code scripts/migration-001-add-naver-schema.sql
```

**전체 내용 복사 (Ctrl+A, Ctrl+C)**

**Supabase SQL Editor에 붙여넣기 (Ctrl+V)**

### 2-3. 실행

```
"Run" 버튼 클릭 (또는 Ctrl+Enter)
```

### 2-4. 예상 출력

```sql
NOTICE:  ✅ Migration 001 완료
NOTICE:  📊 financial_data_extended 테이블 생성됨
NOTICE:  🔍 인덱스 5개 생성됨
NOTICE:  🔒 RLS 정책 활성화됨
NOTICE:  🛠️ 헬퍼 함수 2개 생성됨
NOTICE:
NOTICE:  📝 다음 단계:
NOTICE:  1. 검증: SELECT * FROM validate_extended_data();
NOTICE:  2. 마이그레이션: SELECT * FROM migrate_fnguide_to_extended();

Success. No rows returned
```

---

## 🔍 Step 3: 검증

### 3-1. 테이블 생성 확인

**SQL Editor에서 실행:**
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%financial%'
ORDER BY table_name;
```

**예상 결과:**
```
table_name               | table_type
-------------------------|------------
financial_data           | BASE TABLE  ← 기존 (유지됨)
financial_data_extended  | BASE TABLE  ← 🆕 신규 (추가됨)
```

### 3-2. 컬럼 확인

**SQL Editor에서 실행:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'financial_data_extended'
ORDER BY ordinal_position;
```

**예상 결과 (일부):**
```
column_name          | data_type | is_nullable
---------------------|-----------|-------------
id                   | integer   | NO
company_id           | integer   | NO
year                 | integer   | NO
revenue              | bigint    | YES
operating_profit     | bigint    | YES
net_income           | bigint    | YES  ← 🆕
eps                  | numeric   | YES  ← 🆕
per                  | numeric   | YES  ← 🆕
roe                  | numeric   | YES  ← 🆕
...
```

### 3-3. 인덱스 확인

**SQL Editor에서 실행:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'financial_data_extended'
ORDER BY indexname;
```

**예상 결과:**
```
indexname                     | indexdef
------------------------------|--------------------
idx_fin_ext_company_year      | CREATE INDEX ...
idx_fin_ext_composite         | CREATE INDEX ...
idx_fin_ext_estimate          | CREATE INDEX ...
idx_fin_ext_scrape_date       | CREATE INDEX ...
idx_fin_ext_source            | CREATE INDEX ...
```

### 3-4. 검증 함수 실행 (추가)

**SQL Editor에서 실행:**
```sql
SELECT * FROM validate_extended_data();
```

**예상 결과:**
```
check_name                | status    | detail
--------------------------|-----------|------------------
Total Records             | ❌ FAIL   | Count: 0
NULL Revenue Rate         | ✅ PASS   | NULL Rate: 0.00%
Data Source Distribution  | ✅ PASS   | (no data yet)
```

**참고**: 아직 데이터가 없어서 "Total Records"가 FAIL이 정상입니다.

---

## 📊 Step 4: 기존 데이터 마이그레이션 (선택사항)

기존 FnGuide 데이터를 새 테이블로 복사하려면:

**SQL Editor에서 실행:**
```sql
SELECT * FROM migrate_fnguide_to_extended();
```

**예상 결과:**
```
migrated_count | error_count | last_error
---------------|-------------|------------
1234           | 0           |
```

**확인:**
```sql
SELECT COUNT(*) AS total_records
FROM financial_data_extended
WHERE data_source = 'fnguide';
```

**참고**:
- 이 단계는 **선택사항**입니다.
- 과거 데이터를 보존하려면 실행하세요.
- Naver 데이터만 수집하고 싶다면 건너뛰세요.

---

## ✅ 완료 확인 체크리스트

- [ ] **테이블 생성 확인**: `financial_data_extended` 존재
- [ ] **16개 컬럼 확인**: revenue, operating_profit, net_income, eps, per, roe 등
- [ ] **5개 인덱스 확인**: company_year, scrape_date, estimate, source, composite
- [ ] **RLS 정책 활성화**: Row Level Security 적용됨
- [ ] **검증 함수 실행**: `validate_extended_data()` 정상 작동

---

## 🎉 성공!

DB 스키마 추가가 완료되었습니다!

### 현재 상태
```
✅ Git 브랜치: feature/naver-v2
✅ Naver API: 100% 작동
✅ TypeScript 타입: 완료
✅ DB 스키마: 추가 완료 ← 🆕
```

### 다음 단계

**옵션 A: 커밋 및 푸시**
```bash
git add .
git commit -m "feat: Add financial_data_extended table for Naver Finance

- Create extended financial data table (16 metrics)
- Add TypeScript type definitions
- Add migration and validation functions
- Add indexes for performance optimization"

git push origin feature/naver-v2
```

**옵션 B: Naver 스크래퍼 구현**
- `lib/scraper-naver.ts` 생성
- Naver API 데이터 파싱 로직 구현
- 테스트 실행

**추천**: **옵션 A (커밋)** 먼저 → **옵션 B (스크래퍼)** 진행

---

## 🚨 문제 발생 시

### 오류: "relation already exists"

**원인**: 이미 테이블이 생성되어 있음

**해결:**
```sql
DROP TABLE IF EXISTS financial_data_extended CASCADE;
```
그리고 다시 migration-001 스크립트 실행

### 오류: "permission denied"

**원인**: RLS 정책 권한 부족

**해결:**
1. Supabase Dashboard → Authentication → Policies
2. `financial_data_extended` 테이블 확인
3. "Enable insert for authenticated users only" 정책 활성화

### 테이블은 생성됐는데 검증 함수 실행 안됨

**확인:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%extended%';
```

**재생성:**
migration-001-add-naver-schema.sql 스크립트 다시 실행

---

## 📞 도움말

- **NAVER_MIGRATION_PLAN.md**: 전체 마이그레이션 계획
- **ROLLBACK_PROCEDURE.md**: 롤백 절차
- **BRANCH_STRATEGY_GUIDE.md**: Git 브랜치 사용법

---

**문서 버전**: 1.0
**작성일**: 2025-11-19
**예상 소요 시간**: 5분
