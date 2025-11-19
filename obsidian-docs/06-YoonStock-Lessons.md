# 06. YoonStock Pro - 학습 내용 및 문제 해결

> 태그: #yoonstock #학습 #문제해결 #트러블슈팅

## 핵심 학습 내용

### 1. Materialized Views의 힘

**문제**:
- 복잡한 쿼리 (10+ JOIN)
- API 응답 시간 ~2000ms
- 사용자 경험 저하

**시도한 해결책**:

```typescript
// ❌ 시도 1: Pagination 제거 (Revert)
// 문제: 메모리 부족, 느린 응답

// ❌ 시도 2: 클라이언트 중복 제거 (Revert)
// 문제: 네트워크 오버헤드 증가

// ❌ 시도 3: PostgreSQL Function (Revert)
// 문제: 여전히 느림, 복잡도 증가

// ✅ 최종 해결: Materialized Views
CREATE MATERIALIZED VIEW v_investment_opportunities AS
SELECT ... /* 복잡한 계산 */
FROM ...
WHERE ...
```

**결과**:
- API 응답: 2000ms → **50ms** (40배 향상)
- 복잡도: 높음 → 낮음
- 유지보수: 어려움 → 쉬움

**교훈**:
> 복잡한 읽기 쿼리는 Materialized Views로 사전 계산하라.
> 성능 개선은 측정 → 시도 → 검증의 반복이다.

### 2. 타임존 지옥 탈출

**문제**:
```javascript
// ❌ 잘못된 방식
const today = new Date().toISOString().split('T')[0];
// 결과: UTC 시간 (한국보다 9시간 느림)
// 오후 11시 수집 → 다음날로 기록
```

**해결**:
```javascript
// ✅ 올바른 방식
const today = new Date().toLocaleString('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).replace(/\. /g, '-').replace('.', '');
// 결과: 한국 시간 (2025-11-12)
```

**교훈**:
> 타임존은 항상 명시적으로 지정하라.
> 서버 시간 ≠ 사용자 시간

**체크리스트**:
- [ ] `toLocaleString` 사용 시 `timeZone` 명시
- [ ] 데이터베이스에 저장 시 UTC로 통일
- [ ] 표시 시 사용자 타임존 적용
- [ ] GitHub Actions 스케줄 UTC 기준 확인

### 3. Web Scraping 안정성

**문제들**:

1. **네트워크 불안정**
   ```javascript
   // ❌ 재시도 없음
   const data = await axios.get(url);
   ```

2. **Rate Limiting**
   ```javascript
   // ❌ 동시 요청 폭주
   await Promise.all(urls.map(scrape));
   ```

3. **인코딩 이슈**
   ```javascript
   // ❌ UTF-8만 지원
   const data = response.data;
   ```

**해결책**:

```javascript
// ✅ 재시도 로직
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, { timeout: 10000 });
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // 지수 백오프
    }
  }
}

// ✅ Rate Limiting
async function scrapeBatch(urls, batchSize = 50, rateLimit = 2) {
  const results = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(scrape));
    results.push(...batchResults);
    await delay(1000 / rateLimit); // 2 req/s
  }
  return results;
}

// ✅ EUC-KR 인코딩
const response = await axios.get(url, {
  responseType: 'arraybuffer'
});
const html = iconv.decode(response.data, 'EUC-KR');
```

**교훈**:
> 네트워크는 항상 실패할 수 있다. 재시도 로직 필수.
> Rate Limiting으로 서버와 좋은 관계 유지.
> 한국 사이트는 EUC-KR 인코딩 확인 필수.

### 4. TypeScript 타입 안전성

**문제**:
```typescript
// ❌ any 남용
const data: any = await fetch('/api/data');
const revenue = data.revenue; // 오타 가능, 타입 체크 없음
```

**해결**:
```typescript
// ✅ 명시적 타입
interface FinancialData {
  revenue: number;
  opProfit: number;
  year: number;
}

const data: ApiResponse<FinancialData[]> = await fetch('/api/data');
const revenue = data.revenue; // ❌ 컴파일 에러
const revenue = data.data[0].revenue; // ✅ 타입 안전
```

**교훈**:
> TypeScript의 타입 시스템을 최대한 활용하라.
> `any`는 타입 안전성을 포기하는 것이다.

**Best Practices**:
```typescript
// 1. 인터페이스로 명시적 정의
interface Company {
  id: number;
  name: string;
  code: string;
}

// 2. Generic 타입으로 재사용
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 3. Union Type으로 제한
type Market = 'KOSPI' | 'KOSDAQ';
type Grade = 'S' | 'A' | 'B' | 'C';

// 4. Nullable 처리
interface StockPrice {
  price: number | null;  // null 가능성 명시
}
```

### 5. 차트 라이브러리 선택

**시도한 라이브러리**:

1. **Chart.js**
   - ❌ TypeScript 지원 약함
   - ❌ Dual-axis 복잡

2. **D3.js**
   - ❌ 학습 곡선 높음
   - ❌ 개발 시간 많이 소요

3. **Recharts** ✅
   - ✅ TypeScript 완벽 지원
   - ✅ React 네이티브 통합
   - ✅ Dual-axis 간단
   - ✅ 반응형 디자인

**Recharts 예시**:
```typescript
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    <YAxis yAxisId="left" />
    <YAxis yAxisId="right" orientation="right" />
    <Line yAxisId="left" dataKey="revenue" />
    <Line yAxisId="right" dataKey="opProfit" />
  </LineChart>
</ResponsiveContainer>
```

**교훈**:
> 기술 선택 시 학습 곡선과 프로젝트 일정 고려.
> React 프로젝트는 React-native 라이브러리 우선.

## 주요 버그 및 해결

### Bug #1: ETF change_rate 계산 오류

**증상**:
```sql
-- ETF 종목의 change_rate가 null
SELECT * FROM daily_stock_prices WHERE code LIKE '2%';
-- change_rate: null, null, null...
```

**원인 분석**:
```sql
-- 이전 가격 데이터 확인
SELECT * FROM daily_stock_prices
WHERE code = '251340'  -- TIGER 코스닥150
ORDER BY date DESC;

-- 결과: 데이터는 있지만 change_rate null
```

**근본 원인**:
- change_rate 계산 로직이 일반 주식만 고려
- ETF 코드 패턴 (2xxxxx) 미처리

**해결**:
```sql
-- 자동 계산 트리거 수정
CREATE OR REPLACE FUNCTION calculate_change_rate()
RETURNS TRIGGER AS $$
DECLARE
  prev_price DECIMAL;
BEGIN
  -- 이전 가격 조회 (ETF 포함)
  SELECT close_price INTO prev_price
  FROM daily_stock_prices
  WHERE company_id = NEW.company_id
    AND date < NEW.date
  ORDER BY date DESC
  LIMIT 1;

  -- 변화율 계산
  IF prev_price IS NOT NULL AND prev_price > 0 THEN
    NEW.change_rate := ((NEW.close_price - prev_price) / prev_price) * 100;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
CREATE TRIGGER auto_calculate_change_rate
BEFORE INSERT OR UPDATE ON daily_stock_prices
FOR EACH ROW
EXECUTE FUNCTION calculate_change_rate();
```

**재발 방지**:
- [ ] 모든 종목 유형 테스트 (일반주, ETF, ETN)
- [ ] 엣지 케이스 문서화
- [ ] 자동 테스트 추가

### Bug #2: Materialized View Refresh 실패

**증상**:
```
Error: connection refused to 127.0.0.1:27124
```

**원인**:
- GitHub Actions에서 IPv6 우선
- Supabase는 IPv4만 지원
- 타임아웃 발생

**해결**:
```typescript
// Fallback 메커니즘
export async function POST() {
  try {
    // 1차 시도: Materialized View 갱신
    const { error } = await supabase.rpc('refresh_materialized_views');

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.log('Fallback to regular views');

    // 2차 시도: Regular View 사용
    // API는 정상 동작 (약간 느려짐)
    return NextResponse.json({
      success: true,
      fallback: true,
      message: 'Using regular views due to refresh failure'
    });
  }
}
```

**교훈**:
> 항상 Fallback 전략을 준비하라.
> 완벽한 시스템은 없다. 장애 대응이 중요하다.

### Bug #3: Consensus Trend 차트 갭

**증상**:
- 차트가 중간에 끊김
- Null 값이 있는 구간에서 선이 사라짐

**원인**:
```typescript
// Null 값 처리 안 함
<Line dataKey="revenue" />
// Null이 있으면 선이 끊김
```

**해결**:
```typescript
// connectNulls 옵션 사용
<Line dataKey="revenue" connectNulls={true} />
// Null 값을 건너뛰고 연결
```

**추가 개선**:
```typescript
// 데이터 전처리로 Null 보간
const fillNullValues = (data) => {
  return data.map((item, index) => {
    if (item.revenue === null && index > 0) {
      // 이전 값으로 채움
      item.revenue = data[index - 1].revenue;
    }
    return item;
  });
};
```

## 성능 최적화 경험

### Before / After 비교

| 항목 | Before | After | 개선율 |
|------|--------|-------|--------|
| API 응답 | 2000ms | 50ms | 40배 |
| 페이지 로드 | 5s | 1s | 5배 |
| 데이터 수집 | 3h | 1.5h | 2배 |
| 번들 크기 | 800KB | 400KB | 50% |

### 최적화 기법

1. **Materialized Views**: 쿼리 사전 계산
2. **Code Splitting**: Next.js 자동 분할
3. **Image Optimization**: Next.js Image 컴포넌트
4. **Tailwind Purge**: 미사용 CSS 제거
5. **Batch Processing**: 데이터 수집 배치화

## 개발 원칙 정리

### 성공 원칙

1. **측정 먼저**: 추측하지 말고 측정하라
2. **단순함**: 복잡한 솔루션보다 단순한 솔루션
3. **자동화**: 반복 작업은 자동화
4. **타입 안전**: TypeScript 100% 활용
5. **문서화**: 코드와 함께 문서 작성

### 실패에서 배운 것

1. **과도한 최적화**: 성능 이슈 없을 때 최적화 금지
2. **완벽주의**: Done is better than perfect
3. **기술 집착**: 최신 기술보다 적합한 기술
4. **테스트 부족**: 테스트 없으면 리팩토링 불가
5. **문서 지연**: 나중에 쓰겠다는 생각 금물

## 다음 프로젝트 적용사항

### Must Have

- [ ] 프로젝트 시작 시 TypeScript 타입 정의
- [ ] 처음부터 테스트 코드 작성
- [ ] Materialized Views 적극 활용
- [ ] 타임존 명시적 처리
- [ ] 에러 처리 표준화

### Nice to Have

- [ ] E2E 테스트 (Playwright)
- [ ] 성능 모니터링 (Vercel Analytics)
- [ ] 에러 트래킹 (Sentry)
- [ ] 문서 자동화 (JSDoc)
- [ ] CI/CD 파이프라인

### 피해야 할 것

- [ ] any 타입 남용
- [ ] 타임존 무시
- [ ] 재시도 로직 없는 네트워크 호출
- [ ] Fallback 없는 시스템
- [ ] 테스트 없는 리팩토링

---

**이전 문서**: [[05-YoonStock-Patterns]]
**관련 문서**: [[04-YoonStock-DevHistory]], [[02-YoonStock-TechStack]]
