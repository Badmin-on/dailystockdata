# 02. YoonStock Pro - 기술 스택 및 아키텍처

> 태그: #yoonstock #기술스택 #아키텍처 #nextjs #supabase

## 기술 스택 전체 구조

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js 15)           │
│  React 19 + TypeScript + Tailwind CSS   │
└─────────────┬───────────────────────────┘
              │ API Routes
              ↓
┌─────────────────────────────────────────┐
│      Backend (Next.js API Routes)       │
│         Supabase Client SDK             │
└─────────────┬───────────────────────────┘
              │ PostgreSQL
              ↓
┌─────────────────────────────────────────┐
│      Database (Supabase PostgreSQL)     │
│  Tables + Views + Materialized Views    │
└─────────────────────────────────────────┘
              ↑
              │ GitHub Actions
┌─────────────┴───────────────────────────┐
│      Data Collection (Scripts)          │
│  FnGuide Scraper + Stock Price Scraper  │
└─────────────────────────────────────────┘
```

## Frontend 기술 스택

### Next.js 15

**선택 이유**:
- App Router 기반 최신 아키텍처
- Server Components로 성능 최적화
- API Routes로 백엔드 통합
- Vercel 배포 최적화

**주요 설정**:

```typescript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true
}
```

**파일 구조**:

```
app/
├── page.tsx                 # 메인 페이지
├── layout.tsx               # 공통 레이아웃
├── globals.css              # 글로벌 스타일
├── api/                     # API Routes
│   ├── investment-opportunities/
│   ├── smart-money-flow/
│   ├── consensus-trend/
│   └── ...
├── opportunities/           # 투자 기회 대시보드
├── smart-money-flow/        # Smart Money Flow
├── consensus-trend/         # Consensus Trend
├── etf-monitoring/          # ETF 모니터링
└── monitor/                 # 모니터링 대시보드
```

### React 19

**새로운 기능 활용**:
- Server Components
- Streaming SSR
- Automatic Batching
- useTransition Hook

**컴포넌트 패턴**:

```typescript
// Client Component 예시
'use client';

import { useState, useEffect } from 'react';

export default function OpportunitiesPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, []);

  return (
    // JSX
  );
}
```

### TypeScript

**타입 안정성**:

```typescript
// 타입 정의
interface InvestmentOpportunity {
  company_id: number;
  name: string;
  code: string;
  market: string;
  year: number;

  // 재무 데이터
  current_revenue: number | null;
  current_op_profit: number | null;
  revenue_change_1m: number | null;
  op_profit_change_1m: number | null;

  // 주가 데이터
  current_price: number | null;
  ma_120: number | null;
  divergence_120: number | null;

  // 점수
  consensus_score: number;
  divergence_score: number;
  investment_score: number;
  investment_grade: string;
}
```

### Tailwind CSS

**디자인 시스템**:

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 커스텀 유틸리티 */
.gradient-bg {
  @apply bg-gradient-to-br from-blue-50 to-indigo-100;
}
```

**반응형 디자인**:

```tsx
<div className="
  grid grid-cols-1           /* 모바일 */
  md:grid-cols-2             /* 태블릿 */
  lg:grid-cols-3             /* 데스크톱 */
  gap-4
">
```

### Recharts

**차트 라이브러리 선택 이유**:
- TypeScript 지원
- 반응형 디자인
- 다양한 차트 타입
- Next.js와 호환성 우수

**Dual-Axis 차트 구현**:

```typescript
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />

    {/* 좌측 Y축 (매출액) */}
    <YAxis yAxisId="left" />

    {/* 우측 Y축 (영업이익) */}
    <YAxis yAxisId="right" orientation="right" />

    <Tooltip />
    <Legend />

    <Line yAxisId="left" type="monotone" dataKey="revenue" />
    <Line yAxisId="right" type="monotone" dataKey="opProfit" />
  </LineChart>
</ResponsiveContainer>
```

## Backend 기술 스택

### Supabase

**선택 이유**:
- PostgreSQL 기반 (성능 + 안정성)
- 실시간 구독 지원
- Row Level Security
- 서울 리전 지원
- 무료 티어 500MB

**연결 설정**:

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### PostgreSQL Views

**Materialized Views 활용**:

```sql
-- 투자 기회 View (성능 최적화)
CREATE MATERIALIZED VIEW v_investment_opportunities AS
SELECT
  c.id as company_id,
  c.name,
  c.code,
  c.market,
  fd.year,
  -- 복잡한 계산 로직...
FROM companies c
LEFT JOIN financial_data fd ON c.id = fd.company_id
LEFT JOIN daily_stock_prices dsp ON c.id = dsp.company_id
-- WHERE 조건 및 계산...
```

**View 갱신 자동화**:

```typescript
// api/refresh-views/route.ts
export async function POST() {
  const { error } = await supabase.rpc('refresh_materialized_views');

  if (error) throw error;

  return NextResponse.json({ success: true });
}
```

### API Routes

**RESTful API 설계**:

```
GET  /api/investment-opportunities    # 투자 기회 목록
GET  /api/smart-money-flow            # Smart Money Flow
GET  /api/consensus-trend             # Consensus Trend
GET  /api/etf-monitoring              # ETF 모니터링
GET  /api/stock-comparison            # 종목 비교
POST /api/refresh-views               # View 갱신
GET  /api/collect-data                # 데이터 수집 (Cron)
```

**API 응답 형식**:

```typescript
// 성공 응답
{
  success: true,
  count: 100,
  data: [...]
}

// 에러 응답
{
  success: false,
  error: "Error message"
}
```

## 인프라 및 배포

### Vercel

**배포 설정**:

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["icn1"]  // Seoul
}
```

**환경 변수**:

```bash
# Production Environment
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
CRON_SECRET=random_secret_string
```

### GitHub Actions

**워크플로우 1: 재무 데이터 수집**

```yaml
# .github/workflows/collect-fnguide.yml
name: Collect FnGuide Data

on:
  schedule:
    - cron: '0 22 * * *'  # UTC 22:00 = KST 07:00
  workflow_dispatch:

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: node scripts/fnguide-scraper.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

**워크플로우 2: 주가 데이터 수집**

```yaml
# .github/workflows/collect-stock-prices.yml
name: Collect Stock Prices

on:
  schedule:
    - cron: '0 10 * * *'  # UTC 10:00 = KST 19:00
  workflow_dispatch:

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node scripts/stock-price-scraper.js
```

## 데이터 수집 스택

### Web Scraping

**라이브러리**:

```json
{
  "dependencies": {
    "axios": "^1.7.9",         // HTTP 클라이언트
    "cheerio": "^1.1.0",       // HTML 파싱
    "iconv-lite": "^0.6.3"     // 인코딩 변환 (EUC-KR)
  }
}
```

**FnGuide 스크래핑**:

```javascript
// scripts/fnguide-scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function scrapeFnGuide(code) {
  const url = `http://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${code}`;

  // EUC-KR 인코딩 처리
  const response = await axios.get(url, {
    responseType: 'arraybuffer'
  });
  const html = iconv.decode(response.data, 'EUC-KR');
  const $ = cheerio.load(html);

  // 재무 데이터 추출
  const revenue = extractRevenue($);
  const opProfit = extractOpProfit($);

  return { revenue, opProfit };
}
```

**Naver Finance 스크래핑**:

```javascript
// scripts/stock-price-scraper.js
async function scrapeStockPrice(code) {
  const url = `https://finance.naver.com/item/main.nhn?code=${code}`;

  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const price = $('.no_today .blind').first().text();
  const changeRate = $('.no_exday .blind').eq(1).text();

  return { price, changeRate };
}
```

## 성능 최적화

### 1. Materialized Views

**쿼리 성능 개선**:

```
Before (Regular View):
- API 응답 시간: ~2000ms
- 복잡한 JOIN 및 계산 매번 실행

After (Materialized View):
- API 응답 시간: ~50ms
- 사전 계산된 결과 조회
- 40배 성능 향상
```

### 2. 캐싱 전략

**Next.js 캐싱**:

```typescript
// API Route에서 캐싱 비활성화 (실시간 데이터)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

**클라이언트 폴링**:

```typescript
// 5초마다 데이터 갱신
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
}, []);
```

### 3. 배치 처리

**데이터 수집 최적화**:

```javascript
// 50개씩 병렬 처리
const batchSize = 50;
for (let i = 0; i < companies.length; i += batchSize) {
  const batch = companies.slice(i, i + batchSize);
  await Promise.all(batch.map(scrapeCompany));
  await delay(500); // Rate limiting
}
```

## 보안

### 환경 변수 관리

```bash
# .env.local (개발)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
CRON_SECRET=...
```

### API 보호

```typescript
// Cron Job 인증
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}
```

### Supabase RLS

```sql
-- Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
ON companies FOR SELECT
USING (true);
```

## 모니터링 및 로깅

### GitHub Actions Logs

```
자동 수집 실패 시:
- Error 로그 자동 저장
- Artifact로 업로드
- 디버깅 용이
```

### Vercel Analytics

```
- 페이지 로딩 시간
- API 응답 시간
- 사용자 트래픽
```

---

**이전 문서**: [[01-YoonStock-Overview]]
**다음 문서**: [[03-YoonStock-Features]]
**관련 문서**: [[08-YoonStock-Database]]
