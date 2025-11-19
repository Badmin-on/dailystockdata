# 03. YoonStock Pro - 핵심 기능 상세

> 태그: #yoonstock #기능문서 #투자분석

## 기능 맵

```
YoonStock Pro
├── 투자 기회 발굴 (/opportunities)
├── Smart Money Flow (/smart-money-flow)
├── Consensus Trend (/consensus-trend)
├── ETF 모니터링 (/etf-monitoring)
├── 종목 비교 (/stock-comparison)
├── 모니터링 대시보드 (/monitor)
└── 설정 (/settings)
```

## 1. 투자 기회 발굴

**경로**: `/opportunities`
**API**: `GET /api/investment-opportunities`

### 핵심 알고리즘

```typescript
// 투자 점수 계산
investment_score = (
  consensus_score * 0.6 +
  divergence_score * 0.4
)

consensus_score = (
  revenue_change_1m * 0.3 +
  op_profit_change_1m * 0.4 +
  revenue_change_3m * 0.2 +
  op_profit_change_3m * 0.1
)

divergence_score = f(divergence_120)
// -10% ~ 0% = 높은 점수
// 0% ~ +15% = 중간 점수
// +15% 이상 = 낮은 점수
```

### 등급 시스템

| 등급 | 점수 | 설명 | 투자 전략 |
|------|------|------|-----------|
| S급 | 80+ | 컨센서스 급상승 + 주가 저평가 | 적극 매수 |
| A급 | 70-79 | 컨센서스 상승 + 주가 적정 | 단기 매매 |
| B급 | 60-69 | 컨센서스 소폭 상승 | 분할 매수 |
| C급 | 50-59 | 관찰 필요 | 모니터링 |

### 필터링 기능

```typescript
// 사용 가능한 필터
{
  minScore: number,      // 최소 점수 (기본: 50)
  grade: 'S' | 'A' | 'B' | 'C',
  market: 'KOSPI' | 'KOSDAQ',
  year: number,          // 재무 연도
  sortBy: 'investment_score' | 'consensus_score' | 'divergence_score'
}
```

### 주요 지표

1. **컨센서스 변화율**
   - 전일 대비 (1d)
   - 1개월 전 대비 (1m) ← 가중치 높음
   - 3개월 전 대비 (3m)
   - 1년 전 대비 (1y)

2. **이격도 분석**
   - 120일 이동평균선 기준
   - -10% ~ 0%: 매수 적기
   - 0% ~ +5%: 양호
   - +15% 이상: 과열

3. **52주 범위**
   - 52주 최고가 대비 위치
   - 52주 최저가 대비 위치
   - 현재 가격 위치 (%)

## 2. Smart Money Flow

**경로**: `/smart-money-flow`
**API**: `GET /api/smart-money-flow`

### 핵심 개념

```
컨센서스 상승 + 주가 하락 = 매수 기회
↓
기관/외국인이 싸게 매수할 기회
↓
"Smart Money"가 흐르는 종목
```

### 알고리즘

```sql
SELECT
  c.name,
  c.code,
  fd.current_revenue,
  fd.current_op_profit,
  dsp.current_price,
  dsp.ma_120,
  dsp.divergence_120,
  -- 컨센서스 변화율
  fd.revenue_change_1m,
  fd.op_profit_change_1m
FROM companies c
WHERE
  -- 컨센서스 상승
  (fd.revenue_change_1m > 5 OR fd.op_profit_change_1m > 5)
  AND
  -- 주가 하락
  dsp.divergence_120 < -5
ORDER BY
  -- 괴리도가 클수록 매수 기회
  dsp.divergence_120 ASC
```

### 활용 전략

1. **대형주 중심**: 시가총액 상위 종목 필터
2. **거래량 확인**: 충분한 유동성 확보
3. **분할 매수**: 점진적 포지션 구축

## 3. Consensus Trend

**경로**: `/consensus-trend`
**API**: `GET /api/consensus-trend`

### Dual-Axis 차트

```typescript
// 좌축: 매출액 (억원)
// 우축: 영업이익 (억원)
// X축: 날짜 (시계열)

<LineChart>
  <YAxis yAxisId="left" />
  <YAxis yAxisId="right" orientation="right" />

  <Line yAxisId="left" dataKey="revenue" stroke="#8884d8" />
  <Line yAxisId="right" dataKey="opProfit" stroke="#82ca9d" />
</LineChart>
```

### 표시 모드

1. **실제값 모드**
   - 매출액: 10조원 → "10,000,000 (백만원)"
   - 영업이익: 1조원 → "1,000,000 (백만원)"

2. **퍼센트 변화 모드**
   - 기준일 대비 % 변화
   - 추세 파악 용이

### Null값 처리

```typescript
// 데이터 갭 해결
const connectNulls = true;

// 차트가 끊기지 않고 연결
<Line connectNulls={connectNulls} />
```

## 4. ETF 모니터링

**경로**: `/etf-monitoring`
**API**: `GET /api/etf-monitoring`

### 섹터 시스템

```sql
-- 동적 섹터 할당
CREATE TABLE etf_sector_allocation (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10),
  sector VARCHAR(50),
  allocation_percentage DECIMAL(5,2)
);

-- 예시
INSERT INTO etf_sector_allocation VALUES
  ('005930', 'IT', 25.5),
  ('000660', 'Energy', 15.3),
  ('035420', 'Pharma', 10.2);
```

### Top 20 종목

```typescript
// 각 섹터별 상위 20개 종목
SELECT
  esa.sector,
  c.name,
  c.code,
  dsp.current_price,
  dsp.change_rate,
  esa.allocation_percentage
FROM etf_sector_allocation esa
JOIN companies c ON esa.code = c.code
JOIN daily_stock_prices dsp ON c.id = dsp.company_id
ORDER BY
  esa.sector,
  esa.allocation_percentage DESC
LIMIT 20
```

### 변화율 계산

```sql
-- 전일 대비 섹터 변화율
WITH sector_prices AS (
  SELECT
    sector,
    SUM(current_price * allocation_percentage) AS weighted_price
  FROM ...
)
SELECT
  sector,
  (weighted_price - prev_price) / prev_price * 100 AS change_rate
FROM sector_prices
```

## 5. 종목 비교

**경로**: `/stock-comparison`
**API**: `GET /api/stock-comparison`

### 비교 항목

```typescript
interface ComparisonData {
  // 기본 정보
  name: string;
  code: string;
  market: string;

  // 재무 데이터 (4개년)
  revenue: {
    2024: number,
    2025: number,
    2026: number,
    2027: number
  };
  opProfit: {
    2024: number,
    2025: number,
    2026: number,
    2027: number
  };

  // 주가 정보
  currentPrice: number;
  ma120: number;
  divergence: number;
  week52High: number;
  week52Low: number;
}
```

### 시각화

```tsx
// 테이블 형식
<table>
  <thead>
    <tr>
      <th>항목</th>
      <th>삼성전자</th>
      <th>SK하이닉스</th>
      <th>NAVER</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2025 매출액</td>
      <td>300조</td>
      <td>60조</td>
      <td>10조</td>
    </tr>
    <!-- ... -->
  </tbody>
</table>
```

## 6. 모니터링 대시보드

**경로**: `/monitor`

### 실시간 지표

```typescript
// 5초마다 갱신
useEffect(() => {
  const interval = setInterval(fetchStatus, 5000);
  return () => clearInterval(interval);
}, []);
```

### 표시 정보

1. **데이터 수집 현황**
   - 마지막 수집 시간
   - 수집된 기업 수
   - 데이터 품질 상태

2. **Top 20 기업**
   - 투자 점수 상위 20개
   - 컨센서스 급변 상위 20개
   - 이격도 극단 20개

3. **시장 통계**
   - KOSPI/KOSDAQ 비율
   - S급/A급 기업 수
   - 평균 투자 점수

## 공통 기능

### 반응형 디자인

```tsx
// 모바일 최적화
<div className="
  px-4 md:px-6 lg:px-8        /* Padding */
  text-sm md:text-base         /* Font size */
  grid-cols-1 md:grid-cols-2   /* Layout */
">
```

### 로딩 상태

```tsx
{loading ? (
  <div className="animate-spin ...">
    Loading...
  </div>
) : (
  <DataTable data={data} />
)}
```

### 에러 처리

```tsx
try {
  const res = await fetch('/api/...');
  const result = await res.json();

  if (!result.success) {
    throw new Error(result.error);
  }

  setData(result.data);
} catch (error) {
  console.error('데이터 로딩 실패:', error);
  setError(error.message);
}
```

### 데이터 포맷팅

```typescript
// 숫자 포맷
const formatNumber = (num: number) => {
  return num.toLocaleString('ko-KR');
};

// 퍼센트 포맷
const formatPercent = (num: number) => {
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
};

// 가격 포맷
const formatPrice = (price: number) => {
  return `${price.toLocaleString()}원`;
};
```

---

**이전 문서**: [[02-YoonStock-TechStack]]
**다음 문서**: [[04-YoonStock-DevHistory]]
**관련 문서**: [[07-YoonStock-API]]
