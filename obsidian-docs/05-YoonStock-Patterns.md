# 05. YoonStock Pro - 재사용 가능한 개발 패턴

> 태그: #yoonstock #개발패턴 #베스트프랙티스

## 1. Next.js API Route 패턴

### 표준 API 구조

```typescript
// app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // 1. 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const param1 = searchParams.get('param1');
    const param2 = parseInt(searchParams.get('param2') || '0');

    // 2. 데이터베이스 쿼리
    let query = supabase.from('table_name').select('*');

    // 3. 필터 적용
    if (param1) {
      query = query.eq('column', param1);
    }

    // 4. 정렬 및 제한
    query = query.order('created_at', { ascending: false });
    query = query.limit(100);

    // 5. 실행
    const { data, error } = await query;

    if (error) throw error;

    // 6. 응답
    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**재사용 포인트**:
- ✅ 일관된 에러 처리
- ✅ 표준화된 응답 형식
- ✅ 동적 쿼리 구성
- ✅ 타입 안전성

## 2. 클라이언트 데이터 페칭 패턴

### 실시간 폴링 패턴

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function RealTimePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 데이터 페칭 함수
  const fetchData = async () => {
    try {
      const res = await fetch('/api/endpoint');
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드 및 폴링 설정
  useEffect(() => {
    fetchData(); // 즉시 실행
    const interval = setInterval(fetchData, 5000); // 5초마다
    return () => clearInterval(interval); // 클린업
  }, []);

  // 로딩 상태
  if (loading) {
    return <LoadingSpinner />;
  }

  // 에러 상태
  if (error) {
    return <ErrorMessage error={error} />;
  }

  // 데이터 렌더링
  return <DataTable data={data} />;
}
```

**재사용 포인트**:
- ✅ 로딩/에러/성공 상태 관리
- ✅ 자동 클린업
- ✅ 실시간 업데이트

### Custom Hook 패턴

```typescript
// hooks/useFetch.ts
export function useFetch<T>(url: string, interval?: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url);
      const result = await res.json();

      if (!result.success) throw new Error(result.error);

      setData(result.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    if (interval) {
      const id = setInterval(fetchData, interval);
      return () => clearInterval(id);
    }
  }, [fetchData, interval]);

  return { data, loading, error, refetch: fetchData };
}

// 사용
function MyComponent() {
  const { data, loading, error } = useFetch('/api/data', 5000);

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  return <Data items={data} />;
}
```

## 3. Supabase Materialized View 패턴

### View 생성 및 갱신

```sql
-- 1. Materialized View 생성
CREATE MATERIALIZED VIEW v_complex_data AS
SELECT
  -- 복잡한 계산과 조인
  c.id,
  c.name,
  SUM(d.amount) as total,
  AVG(d.value) as average
FROM companies c
LEFT JOIN data d ON c.id = d.company_id
GROUP BY c.id, c.name
ORDER BY total DESC;

-- 2. 인덱스 생성 (성능 향상)
CREATE INDEX idx_v_complex_data_id ON v_complex_data(id);
CREATE INDEX idx_v_complex_data_total ON v_complex_data(total);

-- 3. 갱신 함수
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW v_complex_data;
  REFRESH MATERIALIZED VIEW v_other_data;
END;
$$ LANGUAGE plpgsql;
```

**API에서 갱신**:

```typescript
// app/api/refresh-views/route.ts
export async function POST() {
  const { error } = await supabase.rpc('refresh_materialized_views');

  if (error) {
    console.error('View refresh failed:', error);
    // Fallback: 일반 테이블 사용
    return NextResponse.json({
      success: true,
      fallback: true
    });
  }

  return NextResponse.json({ success: true });
}
```

**재사용 포인트**:
- ✅ 복잡한 쿼리 사전 계산
- ✅ API 응답 시간 단축
- ✅ Fallback 메커니즘

## 4. Web Scraping 패턴

### 안정적인 스크래핑

```javascript
const axios = require('axios');
const cheerio = require('cheerio');

class RobustScraper {
  constructor(config = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.timeout = config.timeout || 10000;
  }

  // 지수 백오프 재시도
  async fetchWithRetry(url, attempt = 1) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 ...'
        }
      });
      return response.data;
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      console.log(`Retry ${attempt}/${this.maxRetries} for ${url}`);
      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      await this.sleep(delay);

      return this.fetchWithRetry(url, attempt + 1);
    }
  }

  // Rate Limiting
  async scrapeWithRateLimit(urls, limit = 2) {
    const results = [];
    const delay = 1000 / limit; // requests per second

    for (const url of urls) {
      const data = await this.fetchWithRetry(url);
      results.push(data);
      await this.sleep(delay);
    }

    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 사용
const scraper = new RobustScraper({
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000
});

const data = await scraper.scrapeWithRateLimit(urls, 2);
```

**재사용 포인트**:
- ✅ 자동 재시도
- ✅ Rate Limiting
- ✅ 타임아웃 처리
- ✅ User-Agent 설정

### 배치 처리 패턴

```javascript
// 대량 데이터 배치 처리
async function processBatch(items, batchSize = 50) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    console.log(`Processing batch ${i / batchSize + 1}...`);

    // 병렬 처리
    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    );

    results.push(...batchResults);

    // Rate limiting
    if (i + batchSize < items.length) {
      await delay(500);
    }
  }

  return results;
}
```

## 5. 타입 안전 패턴

### 공통 타입 정의

```typescript
// types/index.ts

// 기본 엔티티
export interface Company {
  id: number;
  name: string;
  code: string;
  market: 'KOSPI' | 'KOSDAQ';
  is_etf: boolean;
}

export interface FinancialData {
  id: number;
  company_id: number;
  year: number;
  revenue: number;
  op_profit: number;
  is_estimate: boolean;
  scrape_date: string;
}

export interface StockPrice {
  id: number;
  company_id: number;
  date: string;
  close_price: number;
  change_rate: number;
  volume: number;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data?: T;
  error?: string;
}

// View 타입
export interface InvestmentOpportunity {
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
  investment_grade: 'S' | 'A' | 'B' | 'C';
}
```

## 6. 반응형 UI 패턴

### Tailwind 반응형 레이아웃

```tsx
// 그리드 레이아웃
<div className="
  grid
  grid-cols-1            /* 모바일: 1열 */
  md:grid-cols-2         /* 태블릿: 2열 */
  lg:grid-cols-3         /* 데스크톱: 3열 */
  gap-4
">

// 텍스트 크기
<h1 className="
  text-2xl               /* 모바일 */
  md:text-3xl            /* 태블릿 */
  lg:text-4xl            /* 데스크톱 */
  font-bold
">

// 패딩
<div className="
  px-4 py-6              /* 모바일 */
  md:px-6 md:py-8        /* 태블릿 */
  lg:px-8 lg:py-12       /* 데스크톱 */
">

// 숨김/표시
<div className="
  hidden                 /* 모바일: 숨김 */
  md:block               /* 태블릿 이상: 표시 */
">
```

## 7. 에러 처리 패턴

### 계층화된 에러 처리

```typescript
// 1. API 레벨
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase.from('table').select();

    if (error) throw new DatabaseError(error.message);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 2. 클라이언트 레벨
async function fetchData() {
  try {
    const res = await fetch('/api/data');
    const result = await res.json();

    if (!result.success) {
      throw new ApiError(result.error);
    }

    return result.data;

  } catch (error) {
    if (error instanceof ApiError) {
      showToast('데이터 로드 실패: ' + error.message);
    } else {
      showToast('알 수 없는 오류가 발생했습니다');
    }
    throw error;
  }
}
```

## 8. GitHub Actions 패턴

### 재사용 가능한 워크플로우

```yaml
name: Data Collection Workflow

on:
  schedule:
    - cron: '0 22 * * *'  # UTC 시간
  workflow_dispatch:      # 수동 실행
    inputs:
      mode:
        description: 'Collection mode'
        required: true
        default: 'full'
        type: choice
        options:
          - full
          - incremental

jobs:
  collect:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run collection
        run: node scripts/collect.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          MODE: ${{ inputs.mode || 'full' }}

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: error-logs
          path: logs/
          retention-days: 7
```

---

**이전 문서**: [[04-YoonStock-DevHistory]]
**다음 문서**: [[06-YoonStock-Lessons]]
