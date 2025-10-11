# 🚀 YoonStock Pro 배포 가이드

## 📋 배포 전 체크리스트

### 1. Supabase 스키마 확장

```bash
# Supabase SQL Editor에서 실행
scripts/schema-enhancement.sql
```

**생성되는 객체:**
- ✅ 함수: `calculate_ma_120()`, `calculate_divergence()`, `refresh_all_views()`
- ✅ Materialized View: `mv_consensus_changes`, `mv_stock_analysis`
- ✅ View: `v_investment_opportunities`
- ✅ 인덱스: 성능 최적화용 복합 인덱스

### 2. 초기 데이터 생성

```sql
-- Supabase SQL Editor 또는 psql에서 실행
SELECT refresh_all_views();

-- 결과 확인
SELECT COUNT(*) FROM mv_consensus_changes;
SELECT COUNT(*) FROM mv_stock_analysis;
SELECT * FROM v_investment_opportunities LIMIT 10;
```

### 3. 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables에 추가:

```bash
# 기존 환경 변수 (유지)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
CRON_SECRET=your_cron_secret

# 신규 환경 변수 (추가)
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

### 4. Vercel Cron Jobs 설정

`vercel.json` 파일이 자동으로 설정됩니다:

```json
{
  "crons": [
    {
      "path": "/api/collect-data",
      "schedule": "0 23 * * 0-4",
      "description": "매일 08:00 KST - 재무제표 수집 (월-금)"
    },
    {
      "path": "/api/collect-stock-prices",
      "schedule": "0 11 * * 1-5",
      "description": "매일 20:00 KST - 주가 데이터 수집 (월-금)"
    }
  ]
}
```

**데이터 수집 후 자동으로 View가 갱신됩니다.**

---

## 🔧 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일 생성:

```bash
cp .env.example .env.local
# .env.local 파일 편집하여 Supabase 키 입력
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 로컬 테스트

```bash
# 투자 기회 API 테스트
curl http://localhost:3000/api/investment-opportunities?minScore=70

# 컨센서스 변화 API 테스트
curl http://localhost:3000/api/consensus-changes?period=1m&minChange=10

# 주가 분석 API 테스트
curl http://localhost:3000/api/stock-analysis?minDivergence=-10&maxDivergence=5

# View 갱신 테스트 (POST 요청)
curl -X POST http://localhost:3000/api/refresh-views \
  -H "Authorization: Bearer your_cron_secret"
```

---

## 📊 API 엔드포인트 상세

### 1. `/api/investment-opportunities` (GET)

**목적:** 투자 기회 발굴 (컨센서스 + 이격도 종합 분석)

**파라미터:**
- `minScore`: 최소 투자 점수 (기본값: 50)
- `grade`: 투자 등급 필터 (S급/A급/B급/C급)
- `market`: 시장 구분 (KOSPI/KOSDAQ)
- `sortBy`: 정렬 기준 (investment_score/consensus_score/divergence_score)
- `limit`: 결과 개수 (기본값: 100)

**응답 예시:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "company_id": 123,
      "name": "삼성전자",
      "code": "005930",
      "market": "KOSPI",
      "investment_score": 85,
      "investment_grade": "A급",
      "consensus_score": 80,
      "divergence_score": 95,
      "current_price": 70000,
      "ma_120": 65000,
      "divergence_120": 7.69,
      "revenue_change_1m": 15.5,
      "op_profit_change_1m": 20.3
    }
  ]
}
```

### 2. `/api/consensus-changes` (GET)

**목적:** 재무 컨센서스 변화 모니터링

**파라미터:**
- `period`: 기간 (1d/1m/3m/1y)
- `type`: 유형 (revenue/op_profit)
- `minChange`: 최소 변화율 (%)
- `market`: 시장 구분
- `limit`: 결과 개수

### 3. `/api/stock-analysis` (GET)

**목적:** 주가 기술적 분석 (120일 이평선, 이격도)

**파라미터:**
- `code`: 특정 종목코드 조회
- `minDivergence`: 최소 이격도 (%)
- `maxDivergence`: 최대 이격도 (%)
- `market`: 시장 구분
- `limit`: 결과 개수

### 4. `/api/refresh-views` (POST)

**목적:** Materialized View 수동 갱신

**인증:** `Authorization: Bearer ${CRON_SECRET}`

**사용 시점:**
- 데이터 수집 후 자동 호출 (Cron Job에서 자동 실행)
- 수동 갱신 필요 시

---

## 🎯 투자 점수 알고리즘 상세

### 컨센서스 점수 (0-100점)

```
30% 이상 상승: 100점
20-30% 상승: 80점
10-20% 상승: 60점
5-10% 상승: 40점
0-5% 상승: 20점
0% 이하: 0점
```

**계산 기준:** 1개월 전 대비 매출액 또는 영업이익 변화율 중 높은 값

### 이격도 점수 (0-100점)

```
-10% ~ 0%: 100점 (최적 매수 구간)
0% ~ 5%: 90점 (양호)
5% ~ 10%: 75점 (보통)
10% ~ 15%: 60점 (주의)
15% ~ 20%: 40점 (과열)
20% ~ 30%: 20점 (고평가)
30% 이상: 0점 (조정 위험)
```

### 종합 투자 점수

```
Investment Score = (Consensus Score × 0.6) + (Divergence Score × 0.4)

등급 분류:
S급: 80점 이상
A급: 70-79점
B급: 60-69점
C급: 50-59점
D급: 50점 미만
```

---

## 🔍 투자 전략 활용법

### 1. S급 + 이격도 -5% 이하

**특징:** 컨센서스 급상승 + 주가 저평가
**전략:** 적극 매수 (최우선 포트폴리오)

### 2. A급 + 이격도 0~5%

**특징:** 컨센서스 상승 + 주가 적정가
**전략:** 단기 매매 또는 분할 매수

### 3. B급 + 이격도 5~10%

**특징:** 컨센서스 소폭 상승 + 주가 정상 범위
**전략:** 관망 또는 소량 매수

### 4. 이격도 15% 이상

**특징:** 주가 과열 (컨센서스 무관)
**전략:** 매도 또는 수익 실현

---

## ⚠️ 주의사항

### 데이터 수집 시간

- **재무제표:** 평일 08:00 KST (약 30-60분 소요)
- **주가 데이터:** 평일 20:00 KST (약 30-60분 소요)
- **View 갱신:** 데이터 수집 직후 자동 실행

### 데이터 신뢰도

- ✅ 컨센서스는 FnGuide 기준 (증권사 평균)
- ✅ 주가는 네이버 금융 기준 (전일 종가)
- ⚠️ 추정치(E) 데이터는 변동 가능성 높음
- ⚠️ 소형주는 컨센서스 커버리지 낮을 수 있음

### 투자 리스크

- 이 시스템은 **투자 참고 도구**이며 투자 책임은 본인에게 있습니다
- 컨센서스는 과거 데이터 기반이므로 미래를 보장하지 않습니다
- 이격도는 기술적 지표이므로 펀더멘털 분석과 병행 필요

---

## 📈 성능 최적화

### 1. Materialized View 갱신 주기

**현재:** 데이터 수집 후 자동 갱신 (1일 2회)

**수동 갱신이 필요한 경우:**
```sql
-- Supabase SQL Editor에서 실행
SELECT refresh_all_views();
```

### 2. 쿼리 성능 모니터링

Supabase Dashboard → Database → Query Performance 확인

**주요 체크 항목:**
- `mv_consensus_changes` 조회 속도 (<500ms 목표)
- `v_investment_opportunities` 조회 속도 (<1s 목표)
- 인덱스 활용률 (>80% 목표)

### 3. 데이터베이스 용량 관리

**일일 증가량 예상:**
- 재무 데이터: ~10MB/일
- 주가 데이터: ~5MB/일

**3개월마다 구 데이터 정리 권장:**
```sql
-- 1년 이상 오래된 주가 데이터 삭제
DELETE FROM daily_stock_prices
WHERE date < CURRENT_DATE - INTERVAL '1 year';
```

---

## 🛠️ 트러블슈팅

### 문제: View가 비어있음

```sql
-- 확인
SELECT COUNT(*) FROM mv_consensus_changes;

-- 해결
SELECT refresh_all_views();
```

### 문제: API 응답이 느림

1. Supabase에서 쿼리 실행 계획 확인
2. 인덱스 재구성: `REINDEX TABLE mv_consensus_changes;`
3. View 갱신: `SELECT refresh_all_views();`

### 문제: 데이터 수집 실패

1. Vercel Logs 확인
2. Supabase Logs 확인
3. Rate Limit 확인 (초당 2개 제한)
4. Cron Secret 확인

---

## 📞 지원

GitHub Issues: https://github.com/Badmin-on/dailystockdata/issues

**Before asking:**
1. Vercel Logs 확인
2. Supabase Logs 확인
3. 환경 변수 검증
4. View 갱신 상태 확인
