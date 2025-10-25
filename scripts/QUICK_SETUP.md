# ⚡ YoonStock Pro - 빠른 스키마 설정 가이드

**예상 소요 시간**: 5분
**실행 위치**: Supabase SQL Editor

---

## 🚨 에러가 발생했다면?

### 에러: "policy already exists"
**원인**: 스키마가 이미 부분적으로 실행되었습니다.
**해결**: 아래 순서대로 실행하세요.

---

## ✅ 실행 순서

### **Step 1: Supabase SQL Editor 접속**
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 → **SQL Editor** 클릭

---

### **Step 2: 기본 테이블 생성 (안전 버전)**

#### 2.1. New Query 클릭
- SQL Editor 상단 → **New Query** 버튼 클릭

#### 2.2. schema-safe.sql 실행
```sql
-- 아래 파일 내용을 복사해서 붙여넣고 Run 클릭
-- 파일 위치: scripts/schema-safe.sql
```

**파일 열기**:
```bash
# Windows
notepad scripts/schema-safe.sql

# 또는 VS Code
code scripts/schema-safe.sql
```

#### 2.3. 실행 결과 확인
**성공 시**:
```
✅ YoonStock 데이터베이스 스키마 생성 완료!
📊 생성된 테이블: companies, financial_data, daily_stock_prices

table_name          | record_count
--------------------+-------------
companies           | 1788 (또는 0)
daily_stock_prices  | 108504 (또는 0)
financial_data      | 141505 (또는 0)
```

**에러 발생 시**:
- 에러 메시지 전체 복사
- 아래 "문제 해결" 섹션 참고

---

### **Step 3: 함수 및 View 생성**

#### 3.1. New Query 클릭 (다시)

#### 3.2. schema-complete.sql 실행
```sql
-- 아래 파일 내용을 복사해서 붙여넣고 Run 클릭
-- 파일 위치: scripts/schema-complete.sql
```

**파일 열기**:
```bash
# Windows
notepad scripts/schema-complete.sql

# 또는 VS Code
code scripts/schema-complete.sql
```

#### 3.3. 실행 결과 확인
**성공 시**:
```
✅ YoonStock Pro 완전한 스키마 생성 완료!

📊 생성된 객체:
  ├─ 함수:
  │  ├─ get_distinct_years() - 사용 가능한 년도 조회
  │  ├─ calculate_ma_120() - 120일 이동평균 계산
  │  ├─ calculate_divergence() - 이격도 계산
  │  ├─ refresh_all_views() - View 갱신
  │  └─ get_collection_dashboard() - 데이터 수집 대시보드
  ├─ Materialized Views:
  │  ├─ mv_consensus_changes - 재무 컨센서스 변화
  │  └─ mv_stock_analysis - 주가 분석
  └─ Views:
     └─ v_investment_opportunities - 투자 기회
```

---

### **Step 4: 검증**

#### 4.1. 함수 확인
```sql
-- New Query에서 실행
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**기대 결과** (최소 5개):
- calculate_divergence
- calculate_ma_120
- get_collection_dashboard
- get_distinct_years
- refresh_all_views

#### 4.2. View 확인
```sql
-- New Query에서 실행
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type IN ('VIEW', 'BASE TABLE')
ORDER BY table_type, table_name;
```

**기대 결과**:
- BASE TABLE: companies, daily_stock_prices, financial_data
- VIEW: v_investment_opportunities

#### 4.3. Materialized View 확인
```sql
-- New Query에서 실행
SELECT matviewname
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;
```

**기대 결과**:
- mv_consensus_changes
- mv_stock_analysis

---

## ✅ 완료!

스키마 설정이 완료되었습니다. 이제 다음 단계로:

1. **로컬 환경변수 설정**: `.env.local` 파일 생성
2. **로컬 서버 실행**: `npm run dev`
3. **데이터 확인**: http://localhost:3000/api/test-db

상세한 가이드는 `FIX_GUIDE.md` 참고하세요.

---

## 🐛 문제 해결

### 에러 1: "relation already exists"
**원인**: 테이블이 이미 존재합니다.
**해결**: `schema-safe.sql`이 자동으로 처리합니다. 그냥 실행하세요.

### 에러 2: "function already exists"
**해결**: 아래 스크립트 실행 후 재시도
```sql
-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_distinct_years() CASCADE;
DROP FUNCTION IF EXISTS calculate_ma_120(INT, DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_divergence(DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS get_collection_dashboard() CASCADE;
DROP FUNCTION IF EXISTS refresh_all_views() CASCADE;

-- 그 다음 schema-complete.sql 다시 실행
```

### 에러 3: "materialized view already exists"
**해결**: 아래 스크립트 실행 후 재시도
```sql
-- 기존 View 삭제
DROP MATERIALIZED VIEW IF EXISTS mv_consensus_changes CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_stock_analysis CASCADE;
DROP VIEW IF EXISTS v_investment_opportunities CASCADE;

-- 그 다음 schema-complete.sql 다시 실행
```

### 에러 4: "permission denied"
**원인**: 권한이 부족합니다.
**해결**:
1. Supabase Dashboard → Settings → Database
2. Database Password 확인
3. SQL Editor에서 다시 로그인

---

## 📝 참고

### 스키마 완전 초기화 (⚠️ 주의: 모든 데이터 삭제됨)
```sql
-- ⚠️ 경고: 이 명령은 모든 테이블과 데이터를 삭제합니다!
-- 데이터 백업 후 실행하세요!

DROP TABLE IF EXISTS daily_stock_prices CASCADE;
DROP TABLE IF EXISTS financial_data CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

DROP MATERIALIZED VIEW IF EXISTS mv_consensus_changes CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_stock_analysis CASCADE;
DROP VIEW IF EXISTS v_investment_opportunities CASCADE;

DROP FUNCTION IF EXISTS get_distinct_years() CASCADE;
DROP FUNCTION IF EXISTS calculate_ma_120(INT, DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_divergence(DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS get_collection_dashboard() CASCADE;
DROP FUNCTION IF EXISTS refresh_all_views() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 이후 schema-safe.sql, schema-complete.sql 순서대로 실행
```

---

## 💡 도움말

문제가 계속되면:
1. 에러 메시지 **전체** 복사
2. 실행한 SQL 스크립트 복사
3. GitHub Issues에 문의

**Happy Coding! 🚀**
