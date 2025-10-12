# 🚀 YoonStock Pro - 최종 배포 가이드

**작성일**: 2025-10-12
**상태**: ✅ 코드 준비 완료 | ⏳ Supabase 함수 생성 필요 | ⏳ Vercel 배포 대기

---

## ✅ 완료된 작업

### 1. 코드 수정 완료
- ✅ TypeScript 타입 에러 수정 (3개 파일)
  - `app/api/collect-stock-prices/route.ts` (중요: Cron 엔드포인트)
  - `app/api/collect-stock-prices/manual/route.ts`
  - `vercel.json` (unsupported description 필드 제거)
- ✅ Git 커밋 및 푸시 완료
  - 최신 커밋: `066c00f`
  - GitHub 동기화 완료

### 2. 데이터 수집 완료
- ✅ 18개 배치 수집 성공 (100% 완료)
- ✅ 107,055개 주가 레코드 저장
- ✅ 1,788개 기업 중 95%+ 커버리지

---

## 🔧 필수 작업 (순서대로 진행)

### Step 1: Supabase SQL 함수 생성 (1분)

**위치**: Supabase Dashboard → SQL Editor

**실행할 파일**: `scripts/create-dashboard-function.sql`

**실행 방법**:
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 → **SQL Editor** 클릭
4. **New Query** 클릭
5. 아래 SQL 코드 복사-붙여넣기 후 **Run** 클릭

```sql
CREATE OR REPLACE FUNCTION get_collection_dashboard()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_companies', (SELECT COUNT(*) FROM companies),
    'companies_with_financial_data', (SELECT COUNT(DISTINCT company_id) FROM financial_data),
    'companies_with_prices', (SELECT COUNT(DISTINCT company_id) FROM daily_stock_prices),
    'total_financial_records', (SELECT COUNT(*) FROM financial_data),
    'total_price_records', (SELECT COUNT(*) FROM daily_stock_prices),
    'latest_financial_date', (SELECT MAX(report_date) FROM financial_data),
    'latest_price_date', (SELECT MAX(date) FROM daily_stock_prices),
    'companies_with_120d_prices', (
      SELECT COUNT(DISTINCT company_id)
      FROM daily_stock_prices
      WHERE date >= CURRENT_DATE - INTERVAL '120 days'
      GROUP BY company_id
      HAVING COUNT(*) >= 100
    ),
    'market_breakdown', (
      SELECT json_object_agg(market, count)
      FROM (
        SELECT
          COALESCE(market, 'Unknown') as market,
          COUNT(*) as count
        FROM companies
        GROUP BY market
      ) market_counts
    ),
    'collection_progress', json_build_object(
      'financial_coverage', ROUND(
        (SELECT COUNT(DISTINCT company_id)::NUMERIC FROM financial_data) /
        (SELECT COUNT(*)::NUMERIC FROM companies) * 100, 2
      ),
      'price_coverage', ROUND(
        (SELECT COUNT(DISTINCT company_id)::NUMERIC FROM daily_stock_prices) /
        (SELECT COUNT(*)::NUMERIC FROM companies) * 100, 2
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_collection_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_dashboard() TO anon;

SELECT get_collection_dashboard();
```

**예상 결과**: JSON 형태의 대시보드 데이터 출력

---

### Step 2: Vercel 배포 확인 및 환경변수 설정 (3분)

#### 2-1. Vercel 배포 상태 확인

1. https://vercel.com/dashboard 접속
2. 프로젝트 선택
3. **Deployments** 탭 확인
4. 최신 배포 상태 확인 (커밋 `066c00f` 찾기)

**예상 상태**:
- ✅ **Ready** (성공) - Step 2-2로 이동
- 🔄 **Building** (진행중) - 완료 대기 후 Step 2-2로 이동
- ❌ **Error** (실패) - 에러 로그 확인 필요

#### 2-2. 환경변수 설정 (필수!)

**위치**: Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

**추가할 변수들**:

| Variable Name | Value | Where to Find | Environment |
|--------------|-------|---------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase → Settings → API → Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Supabase → Settings → API → anon/public | Production, Preview, Development |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Supabase → Settings → API → service_role | Production, Preview, Development |
| `CRON_SECRET` | `yoonstock-cron-secret-2025-production` | 직접 입력 (보안 토큰) | Production, Preview, Development |

**입력 방법**:
1. **Settings** → **Environment Variables** 클릭
2. **Add New** 클릭
3. 변수명 입력 (예: `NEXT_PUBLIC_SUPABASE_URL`)
4. 값 입력 (Supabase에서 복사)
5. Environment 선택: **Production**, **Preview**, **Development** 모두 체크
6. **Save** 클릭
7. 4개 변수 모두 반복

#### 2-3. 환경변수 설정 후 재배포

환경변수 설정이 완료되면 **반드시 재배포** 해야 합니다:

1. **Deployments** 탭으로 이동
2. 최신 배포 클릭
3. 오른쪽 위 점 3개 메뉴 (⋮) 클릭
4. **Redeploy** 선택
5. **Redeploy** 버튼 클릭
6. 배포 완료 대기 (약 2-3분)

---

### Step 3: 프로덕션 테스트 (5분)

배포가 완료되면 다음 항목을 테스트하세요:

#### 3-1. 기본 페이지 접근 테스트

```bash
# 홈페이지
curl https://your-domain.vercel.app

# 모니터 대시보드
curl https://your-domain.vercel.app/monitor

# 투자 기회 페이지
curl https://your-domain.vercel.app/opportunities
```

#### 3-2. API 엔드포인트 테스트

```bash
# 데이터베이스 연결 테스트
curl https://your-domain.vercel.app/api/test-db

# 데이터 상태 확인
curl https://your-domain.vercel.app/api/data-status

# 투자 기회 조회 (상위 10개)
curl "https://your-domain.vercel.app/api/investment-opportunities?limit=10"
```

**예상 결과**: 모든 엔드포인트에서 `{"success": true, ...}` 응답

#### 3-3. View 갱신 테스트

```bash
curl -X POST https://your-domain.vercel.app/api/refresh-views \
  -H "Authorization: Bearer yoonstock-cron-secret-2025-production"
```

**예상 결과**: `{"success": true, "message": "Views refreshed successfully"}`

---

## ⏰ Cron Jobs 검증

### 현재 설정된 스케줄

**파일**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/collect-data",
      "schedule": "0 23 * * 0-4"
    },
    {
      "path": "/api/collect-stock-prices",
      "schedule": "0 11 * * 1-5"
    }
  ]
}
```

### 스케줄 상세

| Cron Job | 실행 시간 (KST) | 실행 시간 (UTC) | 실행 요일 | 작업 내용 |
|----------|----------------|----------------|---------|-----------|
| **재무 데이터 수집** | 매일 08:00 | 전날 23:00 | 월-금 | 기업 재무제표 수집 |
| **주가 데이터 수집** | 매일 20:00 | 당일 11:00 | 월-금 | 1,788개 기업 주가 수집 |

### Cron Jobs 확인 방법

1. Vercel Dashboard → Your Project → **Settings** → **Cron Jobs**
2. 2개의 Cron Job이 **Active** 상태인지 확인
3. 스케줄이 올바르게 설정되었는지 확인

### 수동 Cron Job 테스트

```bash
# 재무 데이터 수집 테스트
curl -X GET https://your-domain.vercel.app/api/collect-data \
  -H "Authorization: Bearer yoonstock-cron-secret-2025-production"

# 주가 데이터 수집 테스트 (주의: 약 15-20분 소요)
curl -X GET https://your-domain.vercel.app/api/collect-stock-prices \
  -H "Authorization: Bearer yoonstock-cron-secret-2025-production"
```

**⚠️ 주의**: 주가 데이터 수집은 1,788개 기업을 순회하므로 시간이 오래 걸립니다.

---

## 📊 모니터링 및 유지보수

### 일일 점검 (5분)

1. **모니터 대시보드 확인**
   - URL: `https://your-domain.vercel.app/monitor`
   - 확인 항목: 데이터 수집 진행률, 최신 날짜, 커버리지

2. **투자 기회 확인**
   - URL: `https://your-domain.vercel.app/opportunities`
   - 확인 항목: S등급, A등급 기업 목록

### 주간 점검 (15분)

1. **데이터 품질 검토**
   ```bash
   curl https://your-domain.vercel.app/api/data-status
   ```
   - 커버리지: 95% 이상 유지 확인
   - 120일 데이터 준비 완료 기업 수 확인

2. **Cron Job 로그 확인**
   - Vercel Dashboard → Logs
   - 필터: `/api/collect-data`, `/api/collect-stock-prices`
   - 에러 없이 정상 완료되는지 확인

3. **View 갱신**
   ```bash
   curl -X POST https://your-domain.vercel.app/api/refresh-views \
     -H "Authorization: Bearer yoonstock-cron-secret-2025-production"
   ```

### 월간 점검 (30분)

1. **성능 검토**
   - 투자 스코어링 효과성 분석
   - 데이터 수집 성능 검토
   - 데이터 갭 확인

2. **데이터베이스 유지보수**
   - 불필요한 데이터 정리 (필요 시)
   - 인덱스 최적화 (쿼리 성능 저하 시)
   - 스토리지 사용량 검토

---

## 🚨 문제 해결 가이드

### 문제 1: Cron Jobs가 실행되지 않음

**증상**:
- 데이터가 매일 업데이트되지 않음
- 최종 수집 날짜가 오래됨

**해결 방법**:
1. Vercel → Settings → Cron Jobs에서 Active 상태 확인
2. `CRON_SECRET` 환경변수 올바르게 설정되었는지 확인
3. Vercel Logs에서 에러 확인
4. 수동으로 엔드포인트 테스트

---

### 문제 2: 환경변수가 작동하지 않음

**증상**:
- API가 "Supabase URL not found" 에러 반환
- 데이터베이스 연결 실패

**해결 방법**:
1. Vercel에서 모든 환경변수가 설정되었는지 확인
2. **Production**, **Preview**, **Development** 모두 체크되었는지 확인
3. 변수명이 정확한지 확인 (대소문자 구분)
4. 변수 추가/변경 후 **반드시 재배포**

---

### 문제 3: API 응답 속도 느림

**증상**:
- 페이지 로딩이 느림
- API 타임아웃 발생

**해결 방법**:
1. Supabase 데이터베이스 성능 확인
2. Materialized View 갱신
   ```bash
   curl -X POST https://your-domain.vercel.app/api/refresh-views \
     -H "Authorization: Bearer yoonstock-cron-secret-2025-production"
   ```
3. Supabase Dashboard에서 쿼리 성능 검토
4. 필요시 인덱스 추가

---

### 문제 4: 투자 기회가 표시되지 않음

**증상**:
- `/opportunities` 페이지가 비어있음
- S등급, A등급 기업이 없음

**해결 방법**:
1. View 갱신
2. 데이터 상태 확인: `/api/data-status`
3. 120일 데이터 가용성 확인
4. Supabase에서 view 정의 검토

---

## 📈 성공 지표

### 1주차 목표

- [ ] 배포 성공 및 안정화
- [ ] Cron Jobs 매일 에러 없이 실행
- [ ] 데이터 커버리지: 95% 이상
- [ ] API 응답 시간: 평균 2초 이하
- [ ] 투자 기회: S/A등급 50개 이상

### 1개월 목표

- [ ] 100% 업타임 유지
- [ ] 데이터 신선도: 매일 업데이트
- [ ] 사용자 참여: 정기적인 모니터링 대시보드 방문
- [ ] 투자 분석: 실행 가능한 인사이트 생성

---

## ✅ 최종 체크리스트

### 배포 전

- [x] 로컬에서 모든 테스트 통과
- [x] 문서 작성 완료
- [x] Git 커밋 생성
- [x] GitHub에 푸시: `git push origin main`

### 배포 중

- [ ] Supabase SQL 함수 생성: `get_collection_dashboard()`
- [ ] Vercel 배포 확인
- [ ] 환경변수 설정 (4개)
- [ ] 재배포 실행

### 배포 후

- [ ] 모든 엔드포인트 스모크 테스트
- [ ] Cron Jobs 활성화 및 테스트
- [ ] 24시간 에러 로그 모니터링
- [ ] 프로덕션 URL 팀과 공유
- [ ] 첫 번째 주간 리뷰 예약

---

## 📞 참고 자료

### 프로젝트 문서
- **README**: `README.md`
- **수집 가이드**: `COLLECTION_GUIDE.md` (한국어)
- **빠른 시작**: `QUICK_START.md` (영어)
- **데이터 분석**: `DATA_ANALYSIS_REPORT.md`
- **배포 가이드**: `DEPLOYMENT_GUIDE.md`
- **검증 요약**: `VALIDATION_SUMMARY.md`

### 외부 리소스
- **Vercel 문서**: https://vercel.com/docs
- **Next.js 문서**: https://nextjs.org/docs
- **Supabase 문서**: https://supabase.com/docs
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs

---

## 🎉 축하합니다!

성공적으로 완료한 작업:
- ✅ 1,788개 기업에 대한 120일 주가 데이터 수집
- ✅ 포괄적인 모니터링 대시보드 구축
- ✅ 투자 기회 분석 시스템 구현
- ✅ 자동화된 데이터 수집 시스템 생성
- ✅ 전체 프로세스 문서화
- ✅ 프로덕션 배포 준비 완료

**다음 단계**: 위의 Step 1-3을 순서대로 진행하여 배포를 완료하세요!

---

**생성일**: 2025-10-12
**작성자**: Claude Code
**버전**: 1.0.0
