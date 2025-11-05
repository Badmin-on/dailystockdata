# 🔧 Troubleshooting Guide

YoonStock Pro에서 발생할 수 있는 일반적인 문제와 해결 방법을 설명합니다.

## 📊 Data Issues

### Issue 1: Website Shows Old Stock Price Data

**Symptoms**:
- 웹사이트에서 주가가 며칠 전 데이터로 표시됨
- 예: 11월 5일인데 10월 31일 주가가 표시됨

**Root Cause**:
- Materialized Views가 갱신되지 않음
- `mv_stock_analysis`가 최신 데이터를 반영하지 못함

**Solution**:

**Option A: Manual Refresh** (즉시 해결):
```sql
-- Supabase SQL Editor에서 실행
REFRESH MATERIALIZED VIEW mv_consensus_changes;
REFRESH MATERIALIZED VIEW mv_stock_analysis;
```

**Option B: Wait for Automatic Refresh**:
- GitHub Actions가 매일 오후 7시에 자동으로 REFRESH 실행
- 다음 자동 실행까지 대기 (최대 24시간)

**Verification**:
```sql
-- 마지막 갱신 시간 확인
SELECT matviewname, last_refresh
FROM pg_matviews
WHERE matviewname IN ('mv_consensus_changes', 'mv_stock_analysis');
```

### Issue 2: Wrong Stock Price (Parsing Error)

**Symptoms**:
- 주가가 실제와 다르게 표시됨
- 예: 네이버에서 44,950원인데 앱에서 42,550원으로 표시

**Root Cause**:
- 네이버 금융 HTML 구조 변경
- 셀 인덱스 또는 텍스트 파싱 로직 오류

**Diagnostic Steps**:

1. **테스트 스크립트 실행**:
```bash
cd scripts
node -e "
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function test() {
  const url = 'https://finance.naver.com/item/sise_day.naver?code=058970';
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    responseType: 'arraybuffer'
  });
  const html = iconv.decode(data, 'euc-kr');
  const $ = cheerio.load(html);
  const row = $('table.type2 tr[onmouseover]').first();
  row.find('td').each((i, cell) => {
    console.log(\`[\${i}] \${$(cell).text().trim()}\`);
  });
}
test();
"
```

2. **HTML 구조 확인**:
```
예상 출력:
[0] 2025.11.05     <- 날짜
[1] 42,300         <- 종가 (사용)
[2] 하락 2,650     <- 변동 (사용)
[3] 44,100         <- 시가
[4] 44,100         <- 고가
[5] 41,250         <- 저가
[6] 74,126         <- 거래량 (사용)
```

3. **파싱 로직 수정**:
```javascript
// scripts/stock-price-scraper.js:87-102
// 올바른 셀 인덱스와 텍스트 파싱 사용
const priceChangeText = $(cells[2]).text().trim();
const isUp = priceChangeText.includes('상승');
const isDown = priceChangeText.includes('하락');
const changeAmount = cleanNumber(priceChangeText.replace('하락', '').replace('상승', ''));
```

**Solution**: `scripts/stock-price-scraper.js` 수정 후 재실행

### Issue 3: Only 2027 Financial Data Appears

**Symptoms**:
- 재무 데이터가 2027년만 표시됨
- 2024, 2025, 2026년 데이터가 없음

**Root Cause**:
- 이것은 정상입니다!
- FnGuide는 미래 추정치를 제공 (2024-2027)
- 2027년이 2년 후이므로 애널리스트가 가장 자주 업데이트
- 2024년은 대부분 확정, 2025는 현재 연도 (변경 적음)

**Verification**:
```sql
-- 모든 연도의 데이터 확인
SELECT year, COUNT(*) as count
FROM financial_data
GROUP BY year
ORDER BY year;

-- 예상 결과:
-- year | count
-- -----|-------
-- 2024 | 30000+
-- 2025 | 30000+
-- 2026 | 30000+
-- 2027 | 40000+ (가장 많음)
```

**Action**: 정상 동작이므로 조치 불필요

### Issue 4: Missing Data for Specific Company

**Symptoms**:
- 특정 기업의 데이터가 없거나 불완전함

**Diagnostic Steps**:

1. **기업 존재 확인**:
```sql
SELECT * FROM companies WHERE code = '005930';
```

2. **재무 데이터 확인**:
```sql
SELECT * FROM financial_data
WHERE company_id = (SELECT id FROM companies WHERE code = '005930')
ORDER BY year DESC, collected_at DESC;
```

3. **주가 데이터 확인**:
```sql
SELECT * FROM daily_stock_prices
WHERE company_id = (SELECT id FROM companies WHERE code = '005930')
ORDER BY date DESC
LIMIT 10;
```

**Solution**:
- 데이터 없음: Scraper 재실행
- 오래된 데이터: Scraper 재실행 + Materialized View REFRESH

## 🚀 GitHub Actions Issues

### Issue 1: GitHub Actions Workflow Failed

**Symptoms**:
- GitHub Actions 탭에서 빨간색 X 표시
- 워크플로우 실패 알림 이메일 수신

**Diagnostic Steps**:

1. **로그 확인**:
   - GitHub → Actions 탭 → 실패한 워크플로우 클릭
   - 각 Job의 로그 확인

2. **일반적인 오류**:

**Error A: Supabase Connection Failed**
```
Error: connect ETIMEDOUT
```
**Solution**: Supabase가 일시적으로 다운됨. 수동 재실행.

**Error B: Rate Limiting**
```
HTTP 429: Too Many Requests
```
**Solution**:
- `CONCURRENT_BATCH_SIZE` 줄이기 (10 → 5)
- `DELAY_BETWEEN_BATCHES_MS` 늘리기 (500 → 1000)

**Error C: Timeout**
```
Error: Timeout of 300000ms exceeded
```
**Solution**:
- Vercel Pro 플랜 필요 (최대 5분)
- 또는 배치 크기 줄이기

**Error D: Encoding Error**
```
Error: Invalid character in header content
```
**Solution**: `iconv-lite` 인코딩 확인

3. **Manual Workflow Execution**:
```bash
# GitHub Actions 탭에서
1. "Stock Data Auto Update" 선택
2. "Run workflow" 버튼 클릭
3. 실행할 scraper 선택 (fnguide/stock-price/both)
4. "Run workflow" 확인
```

### Issue 2: Materialized View Not Refreshing

**Symptoms**:
- GitHub Actions는 성공했는데 데이터가 업데이트 안 됨

**Diagnostic Steps**:

1. **워크플로우 로그 확인**:
```
🔄 Materialized View 갱신 중...
✅ Materialized View 갱신 완료!
```

2. **psql 연결 오류 확인**:
```
Error: psql: connection to server failed
```

**Solution**:

**Option A: GitHub Secrets 확인**:
```bash
# Repository → Settings → Secrets and variables → Actions
# 다음 secrets이 설정되어 있는지 확인:
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
```

**Option B: 수동 REFRESH**:
```sql
REFRESH MATERIALIZED VIEW mv_consensus_changes;
REFRESH MATERIALIZED VIEW mv_stock_analysis;
```

### Issue 3: GitHub Actions Not Running on Schedule

**Symptoms**:
- 매일 7시/7시에 자동 실행되지 않음

**Root Cause**:
- GitHub Actions는 정확한 시간 보장 안 함 (±15분)
- Repository가 비활성화되면 cron이 자동으로 중지됨

**Solution**:

1. **워크플로우 파일 확인**:
```yaml
# .github/workflows/stock-data-cron.yml
on:
  schedule:
    - cron: '0 22 * * *'  # 오전 7시 KST
    - cron: '0 10 * * *'  # 오후 7시 KST
```

2. **Repository 활성화**:
- 최소 2주에 1번씩 commit 또는 push
- 또는 수동으로 워크플로우 실행

3. **Actions 활성화 확인**:
- Settings → Actions → General
- "Allow all actions and reusable workflows" 선택됨 확인

## 🌐 API Issues

### Issue 1: API Returns Empty Data

**Symptoms**:
- `/api/investment-opportunities` returns `[]`
- 또는 `{"error": "No data"}`

**Diagnostic Steps**:

1. **Database 연결 확인**:
```typescript
// app/api/test-db/route.ts 호출
fetch('/api/test-db')
  .then(r => r.json())
  .then(console.log);
```

2. **View 데이터 확인**:
```sql
SELECT COUNT(*) FROM v_investment_opportunities;
-- 결과가 0이면 Materialized Views REFRESH 필요
```

3. **Supabase Keys 확인**:
```bash
# .env.local 확인
cat .env.local | grep SUPABASE
```

**Solution**:
- Materialized Views REFRESH
- Environment Variables 재확인
- Supabase RLS 정책 확인 (필요 시 비활성화)

### Issue 2: API Response Slow (>3 seconds)

**Symptoms**:
- API 호출 시 3초 이상 소요

**Root Cause**:
- Materialized Views가 없거나 오래됨
- 대량 데이터 조회 (LIMIT 없음)

**Solution**:

1. **Materialized Views REFRESH**:
```sql
REFRESH MATERIALIZED VIEW mv_consensus_changes;
REFRESH MATERIALIZED VIEW mv_stock_analysis;
```

2. **Query Optimization**:
```typescript
// Add LIMIT and pagination
const { data } = await supabase
  .from('v_investment_opportunities')
  .select('*')
  .limit(100)  // Add limit
  .order('investment_score', { ascending: false });
```

3. **Index 확인**:
```sql
-- Missing indexes?
SELECT * FROM pg_indexes
WHERE tablename IN ('mv_consensus_changes', 'mv_stock_analysis');
```

### Issue 3: CORS Error

**Symptoms**:
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:3001' has been blocked by CORS policy
```

**Root Cause**:
- Next.js API Routes는 기본적으로 same-origin만 허용

**Solution**:

**Option A: Use Same Origin**:
- API와 Frontend를 같은 도메인에서 호스팅

**Option B: Add CORS Headers**:
```typescript
// app/api/your-route/route.ts
export async function GET(request: Request) {
  const data = await fetchData();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });
}
```

## 🖥️ Frontend Issues

### Issue 1: Page Not Loading / White Screen

**Symptoms**:
- 페이지가 로딩 중 멈춤
- 흰 화면만 표시됨

**Diagnostic Steps**:

1. **Browser Console 확인** (F12):
```
Check for JavaScript errors
```

2. **Network Tab 확인**:
```
Check API calls
Status codes (200, 404, 500?)
Response data
```

3. **Next.js 로그 확인**:
```bash
npm run dev
# Terminal에서 에러 메시지 확인
```

**Common Errors**:

**Error A: Undefined Data**
```javascript
TypeError: Cannot read property 'map' of undefined
```
**Solution**: Add null check
```typescript
{data?.map((item) => <div key={item.id}>{item.name}</div>)}
```

**Error B: Invalid Date**
```javascript
RangeError: Invalid time value
```
**Solution**: Validate date before rendering
```typescript
const date = new Date(dateString);
if (isNaN(date.getTime())) {
  return <span>Invalid Date</span>;
}
```

### Issue 2: Hydration Error

**Symptoms**:
```
Unhandled Runtime Error
Error: Hydration failed because the initial UI does not match what was rendered on the server
```

**Root Cause**:
- Server와 Client의 렌더링 결과가 다름
- Date, Random, Window 객체 사용

**Solution**:

**Option A: Use Client Component**:
```typescript
'use client';

export default function MyComponent() {
  // Component code
}
```

**Option B: Suppress Hydration Warning**:
```typescript
<div suppressHydrationWarning>
  {new Date().toLocaleDateString()}
</div>
```

**Option C: Use useEffect**:
```typescript
'use client';
import { useEffect, useState } from 'react';

export default function DateComponent() {
  const [date, setDate] = useState('');

  useEffect(() => {
    setDate(new Date().toLocaleDateString());
  }, []);

  return <div>{date}</div>;
}
```

## 🗄️ Database Issues

### Issue 1: Duplicate Key Error

**Symptoms**:
```
ERROR: duplicate key value violates unique constraint "daily_stock_prices_company_id_date_key"
```

**Root Cause**:
- Scraper가 같은 날짜 데이터를 다시 INSERT 시도

**Solution**:

**Use UPSERT (already implemented)**:
```javascript
// scripts/stock-price-scraper.js:122-132
const { error } = await supabase
  .from('daily_stock_prices')
  .upsert({
    company_id: company.id,
    date: priceData.date,
    close_price: closePrice,
    change_rate: changeRate,
    volume: volume
  }, {
    onConflict: 'company_id,date'  // <- UPSERT key
  });
```

### Issue 2: Connection Pool Exhausted

**Symptoms**:
```
Error: remaining connection slots are reserved for non-replication superuser connections
```

**Root Cause**:
- Too many simultaneous database connections
- Supabase Free tier: 최대 100 connections

**Solution**:

1. **Reduce Batch Size**:
```javascript
// scripts/stock-price-scraper.js:22
const CONCURRENT_BATCH_SIZE = 5;  // Reduce from 10
```

2. **Close Connections**:
```javascript
// After scraping complete
await supabase.removeAllChannels();
```

3. **Check Active Connections**:
```sql
SELECT count(*) FROM pg_stat_activity;
```

### Issue 3: Schema Does Not Exist

**Symptoms**:
```
ERROR: schema "cron" does not exist
```

**Root Cause**:
- Supabase Free tier doesn't support pg_cron extension

**Solution**:
- Use GitHub Actions instead of pg_cron (already implemented)
- Upgrade to Supabase Pro for pg_cron support

## 🔐 Environment & Configuration Issues

### Issue 1: Environment Variables Not Loaded

**Symptoms**:
```
❌ 환경변수 누락: SUPABASE_URL과 SUPABASE_SERVICE_KEY를 .env 파일에 설정하세요.
```

**Solution**:

**Local Development**:
```bash
# Create .env.local
cp .env.example .env.local

# Edit .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
```

**Vercel Deployment**:
1. Vercel Dashboard → Settings → Environment Variables
2. Add all variables
3. Redeploy

**GitHub Actions**:
1. Repository → Settings → Secrets and variables → Actions
2. Add all secrets
3. Re-run workflow

### Issue 2: Port Already in Use

**Symptoms**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:

**Option A: Kill Process**:
```bash
# Find process
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
```

**Option B: Use Different Port**:
```bash
PORT=3001 npm run dev
```

## 📞 Getting More Help

### Documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 구조
- [DATABASE.md](./DATABASE.md) - 데이터베이스 상세
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 개발 가이드
- [API.md](./API.md) - API 문서

### Community
- GitHub Issues: https://github.com/Badmin-on/dailystockdata/issues
- Create new issue with:
  - Problem description
  - Error messages
  - Steps to reproduce
  - Environment (OS, Node version, etc.)

### Debugging Checklist

Before asking for help, check:
- [ ] Environment variables configured correctly
- [ ] Database connection successful (`/api/test-db`)
- [ ] Materialized Views refreshed recently
- [ ] GitHub Actions logs checked
- [ ] Browser console for errors (F12)
- [ ] Network tab for API responses
- [ ] Dependencies installed (`npm install`)
- [ ] Correct Node.js version (20.x+)
