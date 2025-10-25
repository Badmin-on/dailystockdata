# 📊 YoonStock Pro - 시스템 분석 및 개선 계획서

**작성일**: 2025-10-25  
**작성자**: 전문 개발자 분석팀  
**버전**: 1.0.0

---

## 📋 목차

1. [현재 시스템 구조 분석](#1-현재-시스템-구조-분석)
2. [데이터 수집 방법 및 로직](#2-데이터-수집-방법-및-로직)
3. [데이터 저장 위치 및 형식](#3-데이터-저장-위치-및-형식)
4. [UI/UX 구조 분석](#4-uiux-구조-분석)
5. [문제점 및 개선사항](#5-문제점-및-개선사항)
6. [단계별 개선 계획](#6-단계별-개선-계획)

---

## 1. 현재 시스템 구조 분석

### 1.1 기술 스택

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend Layer                        │
│  Next.js 15 + React 19 + TypeScript + Tailwind CSS    │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                   API Layer                             │
│         Next.js API Routes (13개 엔드포인트)            │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                 Data Layer                              │
│     Supabase (PostgreSQL) + Materialized Views         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 프로젝트 구조

```
webapp/
├── app/
│   ├── api/                          # API 라우트 (13개)
│   │   ├── available-years/          # 연도 목록
│   │   ├── collect-data/             # 재무데이터 수집 (Cron)
│   │   │   ├── route.ts              # 메인 Cron Job
│   │   │   └── manual/               # 수동 테스트
│   │   ├── collect-stock-prices/     # 주가데이터 수집 (Cron)
│   │   │   ├── route.ts              # 메인 Cron Job
│   │   │   ├── manual/               # 수동 테스트
│   │   │   └── batch/                # 배치 수집
│   │   ├── consensus-changes/        # 재무 컨센서스 변화
│   │   ├── data-status/              # 데이터 수집 현황
│   │   ├── investment-opportunities/ # 투자 기회 분석
│   │   ├── refresh-views/            # View 갱신
│   │   ├── stock-analysis/           # 주가 이격도 분석
│   │   ├── stock-comparison/         # 기업 비교
│   │   └── test-db/                  # DB 상태 확인
│   ├── dashboard/                    # 재무제표 대시보드
│   ├── monitor/                      # 모니터링 대시보드
│   ├── opportunities/                # 투자기회 대시보드
│   ├── layout.tsx                    # 전역 레이아웃
│   └── page.tsx                      # 홈페이지
├── lib/
│   ├── supabase.ts                   # Supabase 클라이언트
│   └── scraper.ts                    # 데이터 스크래핑 로직
├── scripts/
│   ├── schema.sql                    # 기본 DB 스키마
│   ├── schema-enhancement-final.sql  # 고급 분석 뷰
│   ├── create-dashboard-function.sql # 대시보드 함수
│   └── collect-all-batches.sh        # 배치 수집 스크립트
└── vercel.json                       # Vercel Cron 설정
```

### 1.3 데이터베이스 스키마

#### 핵심 테이블 (3개)

1. **companies** (기업 정보)
   - `id` (Primary Key)
   - `name` (회사명)
   - `code` (종목코드, UNIQUE)
   - `market` (KOSPI/KOSDAQ)

2. **financial_data** (재무 데이터)
   - `company_id` (Foreign Key → companies.id)
   - `year` (연도)
   - `scrape_date` (수집일)
   - `revenue` (매출액, BIGINT - 원 단위)
   - `operating_profit` (영업이익, BIGINT - 원 단위)
   - `is_estimate` (추정치 여부)
   - **UNIQUE**: (company_id, year, scrape_date)

3. **daily_stock_prices** (일일 주가)
   - `company_id` (Foreign Key → companies.id)
   - `date` (날짜)
   - `close_price` (종가, DECIMAL)
   - `change_rate` (변동률, %)
   - `volume` (거래량)
   - **UNIQUE**: (company_id, date)

#### 분석 뷰 (3개)

1. **mv_consensus_changes** (Materialized View)
   - 재무 컨센서스 변화율 계산
   - 1일/1개월/3개월/1년 전 대비 증감률

2. **mv_stock_analysis** (Materialized View)
   - 120일 이동평균선 계산
   - 이격도 분석

3. **v_investment_opportunities** (View)
   - 투자 점수 계산 (컨센서스 60% + 이격도 40%)
   - S/A/B/C/D 등급 자동 분류

---

## 2. 데이터 수집 방법 및 로직

### 2.1 재무 데이터 수집 (FnGuide 기반)

**API**: `/api/collect-data`  
**스케줄**: 평일 08:00 KST (Vercel Cron)  
**소스**: Naver Finance (FnGuide 컨센서스)

#### 수집 프로세스

```
1. 기업 목록 수집
   ├─ KOSPI 상위 500개 (시가총액 기준)
   └─ KOSDAQ 상위 500개 (시가총액 기준)
   
2. 각 기업별 재무데이터 수집 (4개년)
   ├─ URL: https://finance.naver.com/item/coinfo.naver?code={종목코드}
   ├─ 파싱: cheerio를 이용한 HTML 파싱
   ├─ 데이터: 매출액, 영업이익 (연간/분기)
   └─ 스케일링: 억원 → 원 단위 자동 변환 (× 100,000,000)
   
3. 데이터베이스 저장
   ├─ companies 테이블 upsert (종목코드 기준)
   ├─ financial_data 테이블 upsert (company_id, year, scrape_date 기준)
   └─ 배치 처리: 50개씩 순차 처리
```

#### 핵심 로직 (lib/scraper.ts)

```typescript
// 1. 기업 목록 수집
fetchTopStocks(market: 'KOSPI' | 'KOSDAQ', limit: number)
  → Naver Finance 시가총액 순위에서 수집

// 2. 재무데이터 수집
fetchFinancialData(code: string)
  → FnGuide 컨센서스 테이블 파싱
  → 매출액, 영업이익 추출

// 3. 데이터 변환
parseAndScaleValue(value: string)
  → "1,234" → 123400000000 (억원 → 원)
  → 단위 자동 인식 및 변환
```

### 2.2 주가 데이터 수집 (Naver Finance 기반)

**API**: `/api/collect-stock-prices`  
**스케줄**: 평일 20:00 KST (장 마감 후)  
**소스**: Naver Finance 일별 시세

#### 수집 프로세스

```
1. 등록된 전체 기업 목록 로드
   └─ companies 테이블에서 id, code, name 조회
   
2. 각 기업별 주가 데이터 수집 (120일치)
   ├─ URL: https://finance.naver.com/item/sise_day.naver?code={종목코드}
   ├─ 페이지 순회: 최대 10페이지 (약 120일)
   ├─ 데이터: 날짜, 종가, 전일대비, 거래량
   └─ Rate Limiting: 초당 2개 기업 (500ms 딜레이)
   
3. 데이터베이스 저장
   ├─ daily_stock_prices 테이블 upsert (company_id, date 기준)
   ├─ 배치 처리: 50개씩 순차 처리
   └─ 자동 View 갱신 (수집 완료 후)
```

#### 핵심 로직

```typescript
// 주가 데이터 수집 (120일치 배열 반환)
fetchStockPrice(code: string): Promise<StockPriceData[]>
  → 여러 페이지 순회
  → 날짜, 종가, 변동률, 거래량 추출
  → 배열로 반환 (최대 120개 레코드)
```

### 2.3 데이터 수집 현황 (2025-10-25 기준)

| 항목 | 상태 | 수량 | 커버리지 |
|------|------|------|----------|
| **총 기업 수** | ✅ 완료 | 1,788개 | 100% |
| **재무 데이터** | ✅ 완료 | 135,241건 | 1,891% (기업당 75.6건) |
| **주가 데이터** | ⚠️ **부분** | 32,425건 | **19개 기업만** (1.1%) |
| **120일 이평선 준비** | ⚠️ **불충분** | ~15개 기업 | 0.8% |

**⚠️ 주요 문제점**:
- 주가 데이터가 19개 기업에만 집중 수집됨
- 나머지 1,769개 기업은 주가 데이터 없음
- 120일 이평선 분석이 대부분 불가능

---

## 3. 데이터 저장 위치 및 형식

### 3.1 데이터베이스: Supabase (PostgreSQL)

**위치**: 클라우드 호스팅 (Supabase)  
**리전**: Northeast Asia (Seoul)  
**연결**: 
- Public URL: `NEXT_PUBLIC_SUPABASE_URL`
- Service Key: `SUPABASE_SERVICE_KEY`

### 3.2 데이터 형식

#### 재무 데이터

```json
{
  "company_id": 123,
  "year": 2024,
  "scrape_date": "2025-10-25",
  "revenue": 123400000000,        // 원 단위 (1,234억원)
  "operating_profit": 45600000000, // 원 단위 (456억원)
  "is_estimate": false
}
```

#### 주가 데이터

```json
{
  "company_id": 123,
  "date": "2025-10-25",
  "close_price": 45600.00,  // 원
  "change_rate": 2.34,       // %
  "volume": 1234567          // 주
}
```

### 3.3 캐싱 전략

- **없음**: 현재 캐싱 미구현
- **문제**: API 호출마다 DB 쿼리 발생
- **개선 필요**: Redis 또는 Next.js 캐싱 도입

---

## 4. UI/UX 구조 분석

### 4.1 현재 페이지 구조

```
/ (홈페이지)
├─ 데이터베이스 연결 상태
├─ 기본 통계 (기업수, 재무데이터, 주가데이터)
└─ 3개 대시보드 바로가기 버튼

/monitor (모니터링 대시보드) ⭐ 주요 페이지
├─ 데이터 수집 현황 (4개 카드)
├─ 수집 진행률 (프로그레스 바)
├─ 최근 수집 날짜
├─ 권장 사항
└─ 상위 투자 기회 Top 20

/opportunities (투자 기회)
├─ S/A/B/C/D 등급별 필터
├─ 정렬 옵션 (투자점수/이름/코드)
├─ 투자 점수 계산
└─ 상세 데이터 테이블

/dashboard (기본 대시보드)
├─ 연도별 재무제표
├─ 전일/1개월/3개월/1년 증감률
└─ 유망 기업 하이라이팅
```

### 4.2 UI 문제점

#### ❌ 문제 1: 네비게이션 부재
- 페이지 간 이동이 불편함
- 뒤로가기 버튼만 존재
- 전체 메뉴 구조가 불명확

#### ❌ 문제 2: 필터링 기능 약함
- 시장별 필터 (KOSPI/KOSDAQ) 없음
- 업종별 필터 없음
- 시가총액 범위 필터 없음

#### ❌ 문제 3: 데이터 시각화 부족
- 차트 없음 (테이블 위주)
- 트렌드 파악 어려움
- 비교 분석 기능 미흡

#### ❌ 문제 4: 반응형 디자인 미흡
- 모바일 환경 최적화 부족
- 테이블 가로 스크롤 불편

---

## 5. 문제점 및 개선사항

### 5.1 데이터 수집 문제점

| 문제 | 현황 | 영향도 | 우선순위 |
|------|------|--------|----------|
| **주가 데이터 불균형** | 19개 기업만 수집 | 🔴 Critical | 1순위 |
| **120일 데이터 부족** | 0.8%만 분석 가능 | 🔴 Critical | 1순위 |
| **에러 핸들링 약함** | 수집 실패 시 재시도 없음 | 🟠 High | 2순위 |
| **Rate Limiting 위험** | Naver 차단 가능성 | 🟡 Medium | 3순위 |

### 5.2 데이터 정확성 검증 필요

- [ ] 재무 데이터 단위 변환 검증 (억원 → 원)
- [ ] 주가 데이터 날짜 정합성 확인
- [ ] 컨센서스 변화율 계산 로직 검증
- [ ] 120일 이평선 계산 검증

### 5.3 성능 문제

- [ ] 캐싱 미구현 (모든 요청이 DB 직접 쿼리)
- [ ] Materialized View 갱신 빈도 최적화
- [ ] 대량 데이터 조회 시 페이지네이션 없음

---

## 6. 단계별 개선 계획

### 🎯 Phase 1: 데이터 수집 완전성 확보 (긴급)

**목표**: 전체 1,788개 기업의 주가 데이터 수집  
**예상 소요**: 1-2일

#### 작업 내역
1. ✅ 배치 수집 스크립트 실행
   ```bash
   # 100개씩 18배치 실행
   bash scripts/collect-all-batches.sh
   ```

2. ✅ 수집 모니터링
   - `/monitor` 페이지에서 실시간 진행률 확인
   - 에러 로그 모니터링

3. ✅ View 갱신
   ```bash
   curl -X POST /api/refresh-views
   ```

4. ✅ 데이터 검증
   - 전체 기업 주가 데이터 확인
   - 120일 이상 데이터 보유 기업 수 확인

---

### 🎯 Phase 2: 데이터 정확성 검증 (1주)

**목표**: 수집된 데이터의 정확성 100% 검증

#### 작업 내역

1. **재무 데이터 검증**
   - [ ] FnGuide 원본 데이터와 비교
   - [ ] 단위 변환 로직 재확인 (억원 → 원)
   - [ ] 추정치 플래그 정확성 검증

2. **주가 데이터 검증**
   - [ ] Naver Finance와 날짜별 비교
   - [ ] 변동률 계산 로직 검증
   - [ ] 이상치 탐지 (극단값 필터링)

3. **분석 로직 검증**
   - [ ] 120일 이평선 계산 수식 확인
   - [ ] 이격도 계산 로직 검증
   - [ ] 컨센서스 변화율 계산 검증

4. **테스트 케이스 작성**
   ```typescript
   // 예시: 샘플 기업 10개 선정 후 수동 검증
   const testCompanies = [
     '005930', // 삼성전자
     '000660', // SK하이닉스
     // ... 8개 더
   ];
   ```

---

### 🎯 Phase 3: UI/UX 대대적 개선 (2주)

**목표**: 왼쪽 사이드바 메뉴 + 고급 필터링 + 차트 시각화

#### 3.1 왼쪽 사이드바 레이아웃 구현

```
┌─────────────────────────────────────────────────┐
│  [로고] YoonStock Pro                            │
├─────────────────────────────────────────────────┤
│  📊 대시보드                                     │
│    ├─ 🏠 홈                                      │
│    ├─ 📈 모니터링                                │
│    ├─ 🎯 투자 기회                               │
│    └─ 📋 재무제표                                │
│                                                  │
│  🔍 분석 도구                                    │
│    ├─ 📊 섹터 분석                               │
│    ├─ 🔥 급등주 알림                             │
│    └─ 💡 AI 추천                                 │
│                                                  │
│  ⚙️ 설정                                         │
│    ├─ 🔔 알림 설정                               │
│    ├─ 🎨 테마                                    │
│    └─ 💾 데이터 관리                             │
└─────────────────────────────────────────────────┘
```

**구현 방법**:
```typescript
// app/components/Sidebar.tsx
export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 fixed h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold">YoonStock Pro</h1>
      </div>
      <nav className="mt-6">
        <MenuItem icon="📊" label="대시보드" href="/monitor" />
        <MenuItem icon="🎯" label="투자 기회" href="/opportunities" />
        {/* ... */}
      </nav>
    </aside>
  );
}
```

#### 3.2 고급 필터링 시스템

```typescript
// 필터 옵션
interface FilterOptions {
  market: 'ALL' | 'KOSPI' | 'KOSDAQ';
  investmentGrade: 'ALL' | 'S' | 'A' | 'B' | 'C' | 'D';
  sector?: string;  // 신규 추가
  marketCapRange?: [number, number];  // 시가총액 범위
  priceRange?: [number, number];      // 주가 범위
  divergenceRange?: [number, number]; // 이격도 범위
}
```

**구현 컴포넌트**:
- `FilterPanel.tsx`: 필터 UI
- `useFilter.ts`: 필터 상태 관리 Hook

#### 3.3 차트 시각화 (Recharts 도입)

```bash
npm install recharts
```

**추가할 차트**:
1. **주가 추세 차트** (Line Chart)
   - 120일 이평선 + 현재 주가
   - 이격도 표시

2. **컨센서스 변화 차트** (Bar Chart)
   - 매출액/영업이익 변화율 비교

3. **투자 기회 분포도** (Scatter Plot)
   - X축: 컨센서스 점수
   - Y축: 이격도 점수

4. **섹터별 분포** (Pie Chart)
   - 투자 등급별 기업 수

---

### 🎯 Phase 4: 백엔드 Cron Job 최적화 (1주)

**목표**: 안정적이고 효율적인 자동 수집 시스템

#### 4.1 에러 핸들링 강화

```typescript
// lib/scraper.ts 개선
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

#### 4.2 수집 스케줄 최적화

| 작업 | 현재 | 개선 후 | 이유 |
|------|------|---------|------|
| 재무 데이터 | 매일 08:00 | **주 1회** (일요일 23:00) | 재무제표는 변동 적음 |
| 주가 데이터 | 매일 20:00 | 매일 20:00 유지 | 일일 업데이트 필요 |
| View 갱신 | 수동 | **자동** (수집 완료 후) | 데이터 일관성 |

#### 4.3 알림 시스템 구축

```typescript
// 신규 API: /api/notify
// S급 기업 발견 시 이메일/Slack 알림
interface NotificationConfig {
  email?: string[];
  slack_webhook?: string;
  triggers: {
    investmentGrade: 'S' | 'A';
    minScore: number;
  };
}
```

---

### 🎯 Phase 5: Vercel 프로덕션 배포 (1일)

**목표**: 안정적인 프로덕션 환경 구축

#### 5.1 환경변수 설정

**Vercel Dashboard → Settings → Environment Variables**

| 변수명 | 값 | 환경 |
|--------|---|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Production, Preview, Development |
| `SUPABASE_SERVICE_KEY` | Supabase Service Key | Production, Preview, Development |
| `CRON_SECRET` | 랜덤 문자열 | Production |

#### 5.2 Vercel Cron 설정

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/collect-data",
      "schedule": "0 14 * * 0"  // 주 1회 (일요일 23:00 KST)
    },
    {
      "path": "/api/collect-stock-prices",
      "schedule": "0 11 * * 1-5"  // 평일 20:00 KST
    },
    {
      "path": "/api/refresh-views",
      "schedule": "0 12 * * 1-5"  // 평일 21:00 KST (수집 후 1시간)
    }
  ]
}
```

#### 5.3 모니터링 설정

1. **Vercel Analytics**
   - 페이지 로딩 속도
   - API 응답 시간

2. **Sentry 통합** (선택)
   ```bash
   npm install @sentry/nextjs
   ```

3. **로그 모니터링**
   - Supabase Logs
   - Vercel Function Logs

---

### 🎯 Phase 6: 추가 기능 개발 (2주)

**목표**: 프리미엄 기능 구현

#### 6.1 포트폴리오 관리

```typescript
// 신규 테이블: user_portfolios
interface Portfolio {
  user_id: string;
  company_id: number;
  buy_price: number;
  quantity: number;
  buy_date: string;
}
```

**기능**:
- 보유 종목 추적
- 수익률 계산
- 투자 기회와 비교

#### 6.2 AI 추천 시스템 (GPT-4 통합)

```typescript
// OpenAI API 활용
async function getAIRecommendations(companies: Company[]) {
  // GPT-4에 재무/주가 데이터 전달
  // 투자 추천 및 이유 생성
}
```

#### 6.3 실시간 알림 (WebSocket)

- 주가 급등/급락 알림
- S급 기업 발견 알림
- 포트폴리오 목표가 도달 알림

---

## 📊 성공 지표 (KPI)

### 데이터 품질

- ✅ 주가 데이터 커버리지: **100%** (현재 1.1%)
- ✅ 120일 이평선 분석 가능: **100%** (현재 0.8%)
- ✅ 데이터 정확도: **99.9% 이상**

### 시스템 성능

- ✅ API 응답 시간: **<500ms** (P95)
- ✅ 페이지 로딩 시간: **<2초**
- ✅ Cron Job 성공률: **>99%**

### 사용자 경험

- ✅ 모바일 최적화: **완료**
- ✅ 직관적 네비게이션: **완료**
- ✅ 데이터 시각화: **5개 이상 차트**

---

## 🔗 참고 문서

- [README.md](./README.md): 프로젝트 개요
- [CURRENT_STATUS.md](./CURRENT_STATUS.md): 현재 상태
- [DATA_ANALYSIS_REPORT.md](./DATA_ANALYSIS_REPORT.md): 데이터 분석
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md): 배포 가이드

---

## 📅 타임라인

| Phase | 작업 내용 | 기간 | 시작일 | 완료 목표일 |
|-------|----------|------|--------|------------|
| Phase 1 | 데이터 수집 완전성 | 1-2일 | 2025-10-25 | 2025-10-26 |
| Phase 2 | 데이터 정확성 검증 | 1주 | 2025-10-27 | 2025-11-02 |
| Phase 3 | UI/UX 개선 | 2주 | 2025-11-03 | 2025-11-16 |
| Phase 4 | Cron Job 최적화 | 1주 | 2025-11-17 | 2025-11-23 |
| Phase 5 | Vercel 배포 | 1일 | 2025-11-24 | 2025-11-24 |
| Phase 6 | 추가 기능 개발 | 2주 | 2025-11-25 | 2025-12-08 |

**총 예상 기간**: 약 6주

---

## 💬 다음 단계

### 즉시 실행 가능한 작업

1. ✅ **데이터 수집 완료** (최우선)
   ```bash
   bash scripts/collect-all-batches.sh
   ```

2. ✅ **View 갱신**
   ```bash
   curl -X POST http://localhost:3000/api/refresh-views
   ```

3. ✅ **모니터링 대시보드 확인**
   - http://localhost:3000/monitor

4. ✅ **데이터 검증**
   - 주가 데이터 커버리지 확인
   - 120일 준비율 확인

---

**작성 완료**: 2025-10-25  
**다음 업데이트**: Phase 1 완료 후
