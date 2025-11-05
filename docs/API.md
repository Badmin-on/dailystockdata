# 📡 API Documentation

YoonStock Pro REST API 엔드포인트 상세 문서입니다.

## Base URL

- **Production**: `https://dailystockdata.vercel.app`
- **Local Development**: `http://localhost:3000`

## Authentication

현재 API는 **인증이 필요하지 않습니다** (공개 데이터).

단, Cron Job 엔드포인트는 `CRON_SECRET` 헤더를 통해 보호됩니다.

## Response Format

모든 API는 JSON 형식으로 응답합니다.

**Success Response**:
```json
{
  "data": [...],
  "count": 100
}
```

**Error Response**:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### 1. Investment Opportunities

투자 기회를 발굴하는 핵심 API입니다.

#### `GET /api/investment-opportunities`

**Description**: 컨센서스 변화 + 주가 이격도 기반 투자 점수 계산

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `grade` | string | No | - | 투자 등급 필터 (S/A/B/C) |
| `minScore` | number | No | 0 | 최소 투자 점수 |
| `maxScore` | number | No | 100 | 최대 투자 점수 |
| `year` | number | No | 2025 | 재무 데이터 연도 |
| `limit` | number | No | 100 | 결과 개수 제한 |
| `sort` | string | No | `score_desc` | 정렬 방식 |

**Sort Options**:
- `score_desc`: 투자 점수 내림차순 (기본)
- `score_asc`: 투자 점수 오름차순
- `revenue_desc`: 매출 증가율 내림차순
- `profit_desc`: 영업이익 증가율 내림차순

**Example Request**:
```bash
# S급 투자 기회 조회
curl "https://dailystockdata.vercel.app/api/investment-opportunities?grade=S&limit=20"

# 투자 점수 80점 이상
curl "https://dailystockdata.vercel.app/api/investment-opportunities?minScore=80"
```

**Example Response**:
```json
{
  "data": [
    {
      "company_id": 123,
      "code": "005930",
      "name": "삼성전자",
      "year": 2025,
      "revenue": 2750000000000,
      "operating_profit": 350000000000,
      "revenue_change_1m": 5.2,
      "op_change_1m": 8.5,
      "revenue_change_3m": 12.3,
      "op_change_3m": 15.7,
      "close_price": 71500.00,
      "change_rate": -1.38,
      "ma_120": 68000.00,
      "divergence_rate": 5.15,
      "week_52_high": 75000.00,
      "week_52_low": 55000.00,
      "position_in_52w_range": 82.5,
      "investment_score": 85.3,
      "investment_grade": "S",
      "last_updated": "2025-11-05T10:30:00Z"
    }
  ],
  "count": 1
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `company_id` | number | 기업 ID |
| `code` | string | 종목 코드 |
| `name` | string | 회사명 |
| `year` | number | 재무 데이터 연도 |
| `revenue` | number | 매출액 (원) |
| `operating_profit` | number | 영업이익 (원) |
| `revenue_change_1m` | number | 1개월 대비 매출 증감률 (%) |
| `op_change_1m` | number | 1개월 대비 영업이익 증감률 (%) |
| `revenue_change_3m` | number | 3개월 대비 매출 증감률 (%) |
| `op_change_3m` | number | 3개월 대비 영업이익 증감률 (%) |
| `close_price` | number | 종가 |
| `change_rate` | number | 변동률 (%) |
| `ma_120` | number | 120일 이동평균선 |
| `divergence_rate` | number | 이격도 (%) |
| `week_52_high` | number | 52주 최고가 |
| `week_52_low` | number | 52주 최저가 |
| `position_in_52w_range` | number | 52주 범위 내 위치 (%) |
| `investment_score` | number | 투자 점수 (0-100) |
| `investment_grade` | string | 투자 등급 (S/A/B/C) |
| `last_updated` | string | 마지막 업데이트 시각 (ISO 8601) |

---

### 2. Consensus Changes

재무 컨센서스 변화 추적 API입니다.

#### `GET /api/consensus-changes`

**Description**: 전일/1개월/3개월/1년 대비 재무 컨센서스 변화율 조회

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `code` | string | No | - | 종목 코드 (예: 005930) |
| `year` | number | No | 2025 | 재무 데이터 연도 |
| `minChange1m` | number | No | - | 1개월 대비 최소 증감률 (%) |
| `minChange3m` | number | No | - | 3개월 대비 최소 증감률 (%) |
| `limit` | number | No | 100 | 결과 개수 제한 |
| `sort` | string | No | `op_1m_desc` | 정렬 방식 |

**Sort Options**:
- `op_1m_desc`: 1개월 영업이익 증감률 내림차순 (기본)
- `op_3m_desc`: 3개월 영업이익 증감률 내림차순
- `revenue_1m_desc`: 1개월 매출 증감률 내림차순
- `revenue_3m_desc`: 3개월 매출 증감률 내림차순

**Example Request**:
```bash
# 삼성전자 컨센서스 조회
curl "https://dailystockdata.vercel.app/api/consensus-changes?code=005930"

# 1개월 대비 10% 이상 증가한 기업
curl "https://dailystockdata.vercel.app/api/consensus-changes?minChange1m=10"
```

**Example Response**:
```json
{
  "data": [
    {
      "company_id": 123,
      "code": "005930",
      "name": "삼성전자",
      "year": 2025,
      "revenue": 2750000000000,
      "operating_profit": 350000000000,
      "revenue_change_1d": 0.5,
      "op_change_1d": 1.2,
      "revenue_change_1m": 5.2,
      "op_change_1m": 8.5,
      "revenue_change_3m": 12.3,
      "op_change_3m": 15.7,
      "revenue_change_1y": 20.5,
      "op_change_1y": 25.3,
      "collected_at": "2025-11-05T07:30:00Z"
    }
  ],
  "count": 1
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `company_id` | number | 기업 ID |
| `code` | string | 종목 코드 |
| `name` | string | 회사명 |
| `year` | number | 재무 데이터 연도 |
| `revenue` | number | 매출액 (원) |
| `operating_profit` | number | 영업이익 (원) |
| `revenue_change_1d` | number | 전일 대비 매출 증감률 (%) |
| `op_change_1d` | number | 전일 대비 영업이익 증감률 (%) |
| `revenue_change_1m` | number | 1개월 대비 매출 증감률 (%) |
| `op_change_1m` | number | 1개월 대비 영업이익 증감률 (%) |
| `revenue_change_3m` | number | 3개월 대비 매출 증감률 (%) |
| `op_change_3m` | number | 3개월 대비 영업이익 증감률 (%) |
| `revenue_change_1y` | number | 1년 대비 매출 증감률 (%) |
| `op_change_1y` | number | 1년 대비 영업이익 증감률 (%) |
| `collected_at` | string | 수집 시각 (ISO 8601) |

---

### 3. Stock Analysis

주가 분석 (120일 이평선, 이격도) API입니다.

#### `GET /api/stock-analysis`

**Description**: 120일 이동평균선, 이격도, 52주 최고/최저가 분석

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `code` | string | No | - | 종목 코드 (예: 005930) |
| `minDivergence` | number | No | - | 최소 이격도 (%) |
| `maxDivergence` | number | No | - | 최대 이격도 (%) |
| `limit` | number | No | 100 | 결과 개수 제한 |
| `sort` | string | No | `divergence_asc` | 정렬 방식 |

**Sort Options**:
- `divergence_asc`: 이격도 오름차순 (저평가 우선)
- `divergence_desc`: 이격도 내림차순
- `change_rate_desc`: 변동률 내림차순 (급등주)

**Example Request**:
```bash
# 저평가 주식 (이격도 -10% 이하)
curl "https://dailystockdata.vercel.app/api/stock-analysis?maxDivergence=-10&sort=divergence_asc"

# 삼성전자 주가 분석
curl "https://dailystockdata.vercel.app/api/stock-analysis?code=005930"
```

**Example Response**:
```json
{
  "data": [
    {
      "company_id": 123,
      "code": "005930",
      "name": "삼성전자",
      "date": "2025-11-05",
      "close_price": 71500.00,
      "change_rate": -1.38,
      "volume": 8234567,
      "ma_120": 68000.00,
      "divergence_rate": 5.15,
      "week_52_high": 75000.00,
      "week_52_low": 55000.00,
      "position_in_52w_range": 82.5
    }
  ],
  "count": 1
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `company_id` | number | 기업 ID |
| `code` | string | 종목 코드 |
| `name` | string | 회사명 |
| `date` | string | 거래일 (YYYY-MM-DD) |
| `close_price` | number | 종가 |
| `change_rate` | number | 변동률 (%) |
| `volume` | number | 거래량 |
| `ma_120` | number | 120일 이동평균선 |
| `divergence_rate` | number | 이격도 (%) = (현재가 - 120일 이평선) / 120일 이평선 × 100 |
| `week_52_high` | number | 52주 최고가 |
| `week_52_low` | number | 52주 최저가 |
| `position_in_52w_range` | number | 52주 범위 내 위치 (%) = (현재가 - 최저가) / (최고가 - 최저가) × 100 |

---

### 4. Stock Comparison

기업 간 재무 데이터 비교 API입니다.

#### `GET /api/stock-comparison`

**Description**: 여러 기업의 재무 데이터를 한 번에 비교

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `codes` | string | Yes | - | 종목 코드 (쉼표 구분, 예: 005930,000660) |
| `year` | number | No | 2025 | 재무 데이터 연도 |

**Example Request**:
```bash
# 삼성전자 vs SK하이닉스 비교
curl "https://dailystockdata.vercel.app/api/stock-comparison?codes=005930,000660"
```

**Example Response**:
```json
{
  "data": [
    {
      "code": "005930",
      "name": "삼성전자",
      "year": 2025,
      "revenue": 2750000000000,
      "operating_profit": 350000000000,
      "close_price": 71500.00,
      "change_rate": -1.38,
      "market": "KOSPI"
    },
    {
      "code": "000660",
      "name": "SK하이닉스",
      "year": 2025,
      "revenue": 1500000000000,
      "operating_profit": 200000000000,
      "close_price": 135000.00,
      "change_rate": 2.15,
      "market": "KOSPI"
    }
  ],
  "count": 2
}
```

---

### 5. Available Years

사용 가능한 재무 데이터 연도 목록 API입니다.

#### `GET /api/available-years`

**Description**: 데이터베이스에 저장된 재무 데이터 연도 목록 조회

**Query Parameters**: None

**Example Request**:
```bash
curl "https://dailystockdata.vercel.app/api/available-years"
```

**Example Response**:
```json
{
  "years": [2024, 2025, 2026, 2027],
  "count": 4
}
```

---

### 6. Test Database Connection

데이터베이스 연결 상태 확인 API입니다.

#### `GET /api/test-db`

**Description**: Supabase 연결 및 데이터 상태 확인

**Query Parameters**: None

**Example Request**:
```bash
curl "https://dailystockdata.vercel.app/api/test-db"
```

**Example Response**:
```json
{
  "status": "connected",
  "companies_count": 1131,
  "financial_data_count": 131674,
  "stock_prices_count": 120000,
  "mv_consensus_count": 1131,
  "mv_stock_count": 1131,
  "last_refresh": {
    "mv_consensus_changes": "2025-11-05T07:30:00Z",
    "mv_stock_analysis": "2025-11-05T19:30:00Z"
  }
}
```

---

### 7. Refresh Views (Protected)

Materialized Views를 수동으로 갱신하는 API입니다.

#### `POST /api/refresh-views`

**Description**: Materialized Views를 즉시 REFRESH

**Authentication**: `Authorization: Bearer {CRON_SECRET}` 헤더 필요

**Request Body**: None

**Example Request**:
```bash
curl -X POST "https://dailystockdata.vercel.app/api/refresh-views" \
  -H "Authorization: Bearer your-cron-secret"
```

**Example Response**:
```json
{
  "status": "success",
  "refreshed": [
    "mv_consensus_changes",
    "mv_stock_analysis"
  ],
  "timestamp": "2025-11-05T10:30:00Z"
}
```

**Error Response** (Unauthorized):
```json
{
  "error": "Unauthorized",
  "code": "INVALID_SECRET"
}
```

---

### 8. Collect Data (Cron Protected)

데이터 수집을 트리거하는 Cron Job API입니다.

#### `GET /api/collect-data`

**Description**: FnGuide 재무 데이터 수집 트리거

**Authentication**: `Authorization: Bearer {CRON_SECRET}` 헤더 필요

**Query Parameters**: None

**Example Request**:
```bash
curl "https://dailystockdata.vercel.app/api/collect-data" \
  -H "Authorization: Bearer your-cron-secret"
```

**Example Response**:
```json
{
  "status": "started",
  "job": "fnguide-scraper",
  "timestamp": "2025-11-05T07:00:00Z"
}
```

---

#### `GET /api/collect-stock-prices`

**Description**: Naver 주가 데이터 수집 트리거

**Authentication**: `Authorization: Bearer {CRON_SECRET}` 헤더 필요

**Query Parameters**: None

**Example Request**:
```bash
curl "https://dailystockdata.vercel.app/api/collect-stock-prices" \
  -H "Authorization: Bearer your-cron-secret"
```

**Example Response**:
```json
{
  "status": "started",
  "job": "stock-price-scraper",
  "timestamp": "2025-11-05T19:00:00Z"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PARAMETER` | 400 | 잘못된 쿼리 파라미터 |
| `NOT_FOUND` | 404 | 데이터를 찾을 수 없음 |
| `DATABASE_ERROR` | 500 | 데이터베이스 오류 |
| `INTERNAL_ERROR` | 500 | 내부 서버 오류 |
| `UNAUTHORIZED` | 401 | 인증 실패 (Cron API) |

---

## Rate Limiting

현재 API는 **Rate Limiting이 없습니다**.

단, Vercel의 기본 제한이 적용됩니다:
- **Free Plan**: 100 requests/10 seconds
- **Pro Plan**: Unlimited

---

## CORS

모든 API는 **CORS를 허용**합니다 (`Access-Control-Allow-Origin: *`).

---

## Caching

API 응답은 **Next.js 자동 캐싱**을 사용합니다:
- Materialized Views 기반 데이터: **5분 캐시**
- Static 데이터 (years): **1시간 캐시**
- Database 상태 (test-db): **캐시 없음**

---

## Best Practices

### 1. Use Appropriate Limits

**Good**:
```bash
# Paginate large results
curl "/api/investment-opportunities?limit=50"
```

**Bad**:
```bash
# No limit = 전체 데이터 조회 (느림)
curl "/api/investment-opportunities"
```

### 2. Filter on Server Side

**Good**:
```bash
# Server-side filtering
curl "/api/investment-opportunities?grade=S&minScore=80"
```

**Bad**:
```javascript
// Client-side filtering (비효율적)
const all = await fetch('/api/investment-opportunities');
const filtered = all.filter(item => item.grade === 'S');
```

### 3. Cache Responses

**Good**:
```javascript
// Use SWR or React Query for client-side caching
import useSWR from 'swr';

const { data } = useSWR('/api/investment-opportunities', fetcher, {
  revalidateOnFocus: false,
  refreshInterval: 300000, // 5분
});
```

### 4. Handle Errors Gracefully

**Good**:
```javascript
try {
  const response = await fetch('/api/investment-opportunities');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('API Error:', error);
  // Show error message to user
}
```

---

## SDK / Client Libraries

현재 공식 SDK는 없습니다.

**JavaScript/TypeScript Example**:
```typescript
// lib/api.ts
export async function getInvestmentOpportunities(options?: {
  grade?: 'S' | 'A' | 'B' | 'C';
  minScore?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.grade) params.set('grade', options.grade);
  if (options?.minScore) params.set('minScore', String(options.minScore));
  if (options?.limit) params.set('limit', String(options.limit));

  const response = await fetch(`/api/investment-opportunities?${params}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// Usage
const data = await getInvestmentOpportunities({ grade: 'S', limit: 20 });
```

---

## Changelog

### v1.1.0 (2025-11-05)
- Added `investment_grade` field to `/api/investment-opportunities`
- Added `position_in_52w_range` to `/api/stock-analysis`
- Fixed Korean text parsing in stock prices

### v1.0.0 (2025-10-01)
- Initial API release
- Core endpoints: investment-opportunities, consensus-changes, stock-analysis
