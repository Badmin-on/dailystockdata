# 🔧 YoonStock Pro - 문제 해결 가이드

**작성일**: 2025-10-25
**상태**: 완전 분석 및 수정 방안 제시 완료
**예상 소요 시간**: 20-30분

---

## 📋 발견된 문제 요약

### ❌ Critical Issues
1. **환경변수 미설정** - Supabase 연결 실패
2. **DB 스키마 미실행** - 필수 View/Function 누락
3. **RPC 함수 누락** - get_distinct_years() 없음

### ⚠️ High Priority Issues
4. **API 엔드포인트 누락** - /api/collect-data/status, /api/settings
5. **데이터 부족** - 2024년 데이터만 존재 가능성

---

## 🛠️ 해결 방법 (단계별)

### **Step 1: 로컬 환경변수 설정** (5분)

#### 1.1. 환경변수 파일 생성
```bash
cd C:\Users\nebad\Desktop\dailystockdata

# 템플릿에서 .env.local 생성
cp .env.local.template .env.local
```

#### 1.2. Supabase 정보 입력
1. **Supabase Dashboard** 접속: https://supabase.com/dashboard
2. 프로젝트 선택 → **Settings** → **API**
3. 다음 3개 값 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (⚠️ 비밀!) → `SUPABASE_SERVICE_KEY`

#### 1.3. .env.local 편집
```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiI...

# Cron Secret (랜덤 문자열)
CRON_SECRET=my-super-secret-cron-key-2025

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

### **Step 2: 데이터베이스 스키마 설정** (10분)

#### 2.1. Supabase SQL Editor 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 → **SQL Editor** 클릭

#### 2.2. 기본 스키마 실행 (필수)
1. **New Query** 클릭
2. `scripts/schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭
5. **성공 메시지 확인**:
   ```
   ✅ YoonStock 데이터베이스 스키마 생성 완료!
   📊 생성된 테이블: companies, financial_data, daily_stock_prices
   ```

#### 2.3. 확장 스키마 실행 (필수)
1. **New Query** 클릭
2. `scripts/schema-complete.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭
5. **성공 메시지 확인**:
   ```
   ✅ YoonStock Pro 완전한 스키마 생성 완료!
   📊 생성된 객체:
     ├─ 함수: get_distinct_years(), calculate_ma_120(), ...
     ├─ Materialized Views: mv_consensus_changes, mv_stock_analysis
     └─ Views: v_investment_opportunities
   ```

#### 2.4. 스키마 검증
SQL Editor에서 다음 쿼리 실행:
```sql
-- 함수 확인
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- View 확인
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- Materialized View 확인
SELECT matviewname
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;
```

**기대 결과**:
- **함수** (5개): calculate_divergence, calculate_ma_120, get_collection_dashboard, get_distinct_years, refresh_all_views
- **View** (1개): v_investment_opportunities
- **Materialized View** (2개): mv_consensus_changes, mv_stock_analysis

---

### **Step 3: 로컬 개발 서버 테스트** (5분)

#### 3.1. 의존성 설치 및 서버 실행
```bash
cd C:\Users\nebad\Desktop\dailystockdata

# 의존성 설치 (처음만)
npm install

# 개발 서버 실행
npm run dev
```

#### 3.2. 브라우저 확인
**테스트 URL**:
1. http://localhost:3000 - 메인 페이지
2. http://localhost:3000/api/test-db - DB 연결 테스트
3. http://localhost:3000/api/data-status - 데이터 현황
4. http://localhost:3000/api/available-years - 사용 가능한 연도

**기대 결과**:
```json
// /api/test-db
{
  "success": true,
  "message": "Database connection successful"
}

// /api/data-status
{
  "success": true,
  "overall": {
    "total_companies": 1788,
    "total_financial_records": ...,
    "total_price_records": ...
  }
}

// /api/available-years
[2024, 2025, 2026, 2027]
```

---

### **Step 4: 데이터 확인 및 수집** (선택)

#### 4.1. 현재 데이터 확인
Supabase SQL Editor에서 실행:
```sql
-- 기업 수
SELECT COUNT(*) as total_companies FROM companies;

-- 재무 데이터 현황
SELECT
  year,
  COUNT(DISTINCT company_id) as companies,
  COUNT(*) as records
FROM financial_data
GROUP BY year
ORDER BY year;

-- 주가 데이터 현황
SELECT
  COUNT(DISTINCT company_id) as companies_with_prices,
  COUNT(*) as total_price_records,
  MAX(date) as latest_date
FROM daily_stock_prices;
```

#### 4.2. 데이터가 부족한 경우
**재무 데이터 수집** (평일 오전 8시 자동 또는 수동):
```bash
curl http://localhost:3000/api/collect-data/manual
```

**주가 데이터 수집** (평일 오후 8시 자동 또는 수동):
```bash
curl http://localhost:3000/api/collect-daily-prices/manual
```

#### 4.3. View 갱신
데이터 수집 후 Supabase SQL Editor에서 실행:
```sql
SELECT refresh_all_views();
```

---

### **Step 5: Vercel 프로덕션 배포** (10분)

#### 5.1. Vercel 환경변수 설정
1. https://vercel.com/dashboard 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. 다음 4개 변수 추가 (Production + Preview + Development 모두 체크):

| Variable Name | Value |
|--------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://YOUR_PROJECT.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGciOiJIUzI1NiI... |
| `SUPABASE_SERVICE_KEY` | eyJhbGciOiJIUzI1NiI... |
| `CRON_SECRET` | my-super-secret-cron-key-2025 |

#### 5.2. 재배포
**방법 A: GitHub 푸시** (자동 배포)
```bash
git add .
git commit -m "fix: Add missing DB functions and API endpoints"
git push origin main
```

**방법 B: Vercel Dashboard**
1. **Deployments** 탭
2. 최신 배포 선택
3. **Redeploy** 클릭

#### 5.3. 배포 확인
1. Deployments → **최신 배포** → Status: **Ready** 확인
2. 브라우저에서 접속:
   - https://your-domain.vercel.app
   - https://your-domain.vercel.app/api/test-db

---

## ✅ 검증 체크리스트

### 로컬 환경
- [ ] `.env.local` 파일 생성 완료
- [ ] Supabase 키 3개 정확히 입력
- [ ] `npm run dev` 실행 성공
- [ ] http://localhost:3000/api/test-db 응답 성공

### 데이터베이스
- [ ] `schema.sql` 실행 완료 (기본 테이블)
- [ ] `schema-complete.sql` 실행 완료 (함수/View)
- [ ] 함수 5개 생성 확인
- [ ] View 3개 생성 확인

### API 엔드포인트
- [ ] `/api/available-years` → 년도 목록 반환
- [ ] `/api/data-status` → 데이터 현황 반환
- [ ] `/api/collect-data/status` → 수집 상태 반환
- [ ] `/api/settings` → 설정 값 반환

### 프론트엔드
- [ ] 날짜별 비교 페이지 - 연도 선택 가능
- [ ] 실시간 모니터링 - 데이터 표시
- [ ] 투자 기회 발굴 - S/A/B급 기업 표시
- [ ] 종목 비교 - 재무 데이터 로드

### Vercel 프로덕션
- [ ] 환경변수 4개 설정 완료
- [ ] 배포 성공 (Status: Ready)
- [ ] 프로덕션 URL 접속 성공
- [ ] API 엔드포인트 정상 작동

---

## 🐛 문제 해결 (Troubleshooting)

### 문제 1: "Missing NEXT_PUBLIC_SUPABASE_URL"
**원인**: .env.local 파일 없음 또는 잘못된 형식

**해결**:
```bash
# 파일 존재 확인
ls -la .env.local

# 파일 내용 확인
cat .env.local

# 올바른 형식 확인
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

### 문제 2: "Could not find the function public.get_distinct_years"
**원인**: schema-complete.sql 미실행

**해결**:
1. Supabase SQL Editor 접속
2. `scripts/schema-complete.sql` 전체 복사
3. **Run** 실행
4. 성공 메시지 확인

### 문제 3: "투자 기회 데이터가 없습니다"
**원인**: Materialized View가 비어있음

**해결**:
```sql
-- 1. 데이터 확인
SELECT COUNT(*) FROM financial_data;
SELECT COUNT(*) FROM daily_stock_prices;

-- 2. View 갱신
SELECT refresh_all_views();

-- 3. 투자 기회 확인
SELECT COUNT(*) FROM v_investment_opportunities;
```

### 문제 4: Vercel 배포 실패
**원인**: 환경변수 미설정 또는 Cron Jobs 충돌

**해결**:
1. Settings → Environment Variables → 4개 모두 설정 확인
2. Settings → Cron Jobs → 기존 Jobs 모두 삭제
3. Deployments → Redeploy

---

## 📊 기대 결과

### 로컬 개발 환경
- 모든 페이지 정상 작동
- API 응답 성공 (200 OK)
- 데이터 로딩 성공

### 날짜별 비교 페이지
- **연도 선택**: 2024, 2025, 2026, 2027 모두 선택 가능
- **데이터 비교**: 날짜 범위 선택 시 증감률 계산
- **필터링**: 영업이익/매출액 증감률 정렬

### 투자 기회 발굴 페이지
- **S급 기업**: 점수 80점 이상
- **A급 기업**: 점수 70-79점
- **B급 기업**: 점수 60-69점
- **이격도 표시**: -10% ~ +30% 범위
- **컨센서스 변화**: 1개월/3개월/1년 대비

### 실시간 모니터링
- **총 기업 수**: 1,788개
- **재무 데이터**: 141,505건
- **주가 데이터**: 108,504건
- **120일 이평선**: 122개 기업

---

## 📝 추가 작업 (선택사항)

### 데이터 자동 수집 설정
1. Vercel Dashboard → Settings → Cron Jobs
2. 추가:
   - **재무 데이터**: `0 23 * * 1-5` (평일 오전 8시 KST)
   - **주가 데이터**: `0 11 * * 1-5` (평일 오후 8시 KST)

### 성능 최적화
- [ ] Materialized View 정기 갱신 (일 1회)
- [ ] API 응답 캐싱 (5초)
- [ ] 이미지 최적화
- [ ] Bundle 크기 최적화

### 모니터링 설정
- [ ] Vercel Analytics 활성화
- [ ] Error Tracking (Sentry 등)
- [ ] 데이터 수집 알림 (Discord/Slack)

---

## 💡 참고 문서

- [Supabase Functions 문서](https://supabase.com/docs/guides/database/functions)
- [Materialized Views 문서](https://supabase.com/docs/guides/database/materialized-views)
- [Vercel 환경변수](https://vercel.com/docs/projects/environment-variables)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

## ❓ 문의

문제가 해결되지 않으면:
1. GitHub Issues: https://github.com/Badmin-on/dailystockdata/issues
2. 에러 로그 전체 복사
3. 실행한 단계 명시

**Happy Coding! 🚀**
