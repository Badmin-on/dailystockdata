# 🏗️ System Architecture

YoonStock Pro의 전체 시스템 아키텍처와 데이터 흐름을 설명합니다.

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                            │
│  ┌──────────────────┐              ┌─────────────────────┐     │
│  │  FnGuide Scraper │              │ Stock Price Scraper │     │
│  │   (07:00 KST)    │              │    (19:00 KST)      │     │
│  └────────┬─────────┘              └──────────┬──────────┘     │
│           │                                    │                 │
│           └────────────────┬───────────────────┘                │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Supabase Database  │
                  │    (PostgreSQL)      │
                  │                      │
                  │  ┌─────────────────┐ │
                  │  │  Raw Tables     │ │
                  │  │  - companies    │ │
                  │  │  - financial... │ │
                  │  │  - daily_stock..│ │
                  │  └────────┬────────┘ │
                  │           │          │
                  │           ▼          │
                  │  ┌─────────────────┐ │
                  │  │ Materialized    │ │
                  │  │ Views (Cache)   │ │
                  │  │  - mv_consensus │ │
                  │  │  - mv_stock_ana │ │
                  │  └────────┬────────┘ │
                  │           │          │
                  │           ▼          │
                  │  ┌─────────────────┐ │
                  │  │  Normal Views   │ │
                  │  │  - v_investment │ │
                  │  └─────────────────┘ │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Next.js API Routes  │
                  │   (Vercel Deploy)    │
                  │                      │
                  │  /api/investment-... │
                  │  /api/consensus-...  │
                  │  /api/stock-analy... │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   React Frontend     │
                  │  - Dashboard         │
                  │  - Opportunities     │
                  │  - Analysis Pages    │
                  └──────────────────────┘
```

## 🔄 Data Flow

### 1. 재무 데이터 수집 흐름 (Financial Data Collection)

```
[FnGuide Website]
       │
       │ 1. HTTP GET (EUC-KR encoded)
       │
       ▼
[fnguide-scraper.js]
       │
       │ 2. Parse HTML with Cheerio
       │ 3. Extract Revenue & Operating Profit (2024-2027)
       │
       ▼
[Supabase: financial_data table]
       │
       │ 4. Upsert with conflict resolution
       │ 5. Korean timezone conversion (UTC+9)
       │
       ▼
[GitHub Actions: REFRESH MVs]
       │
       │ 6. psql connection to Supabase
       │ 7. REFRESH MATERIALIZED VIEW mv_consensus_changes
       │
       ▼
[Cached Computation Results]
```

**Schedule**: 매일 오전 7:00 KST (UTC 22:00 전날)
**Duration**: ~60분 (1,000개 기업 처리)

### 2. 주가 데이터 수집 흐름 (Stock Price Collection)

```
[Naver Finance]
       │
       │ 1. HTTP GET per stock code
       │ 2. EUC-KR to UTF-8 conversion
       │
       ▼
[stock-price-scraper.js]
       │
       │ 3. Parse with Cheerio
       │ 4. Extract: 종가, 변동률, 거래량
       │ 5. Korean text detection (하락/상승)
       │
       ▼
[Supabase: daily_stock_prices table]
       │
       │ 6. Upsert with conflict resolution
       │ 7. Korean timezone conversion (UTC+9)
       │
       ▼
[GitHub Actions: REFRESH MVs]
       │
       │ 8. psql connection to Supabase
       │ 9. REFRESH MATERIALIZED VIEW mv_stock_analysis
       │
       ▼
[120일 이평선 & 이격도 계산 결과]
```

**Schedule**: 매일 오후 7:00 KST (UTC 10:00)
**Duration**: ~16-17분 (1,000개 기업 처리)

### 3. API 요청 흐름 (API Request Flow)

```
[User Browser]
       │
       │ GET /api/investment-opportunities
       │
       ▼
[Next.js API Handler]
       │
       │ 1. Parse query params (filters, sorting)
       │
       ▼
[Supabase Client Query]
       │
       │ 2. SELECT FROM v_investment_opportunities
       │
       ▼
[Normal View Execution]
       │
       │ 3. Fast JOIN on Materialized Views
       │ 4. No heavy computation (already cached)
       │
       ▼
[Materialized Views]
       │
       │ mv_consensus_changes (재무 변화율)
       │ mv_stock_analysis (주가 분석)
       │
       ▼
[JSON Response]
       │
       │ 5. Return investment opportunities
       │ 6. Investment score, grade, metrics
       │
       ▼
[React Component Rendering]
```

**Performance**:
- Materialized Views → Sub-second response time
- Without MVs → Several seconds computation time

## 🏛️ Database Architecture

### Table Hierarchy

```
┌─────────────────────────────────────────┐
│         Raw Data Tables                 │
│  (Directly updated by scrapers)         │
├─────────────────────────────────────────┤
│                                         │
│  companies                              │
│  ├─ id (PK)                            │
│  ├─ code (종목코드)                     │
│  ├─ name (회사명)                       │
│  └─ market (시장구분)                   │
│                                         │
│  financial_data                         │
│  ├─ id (PK)                            │
│  ├─ company_id (FK → companies)        │
│  ├─ year (연도)                         │
│  ├─ quarter (분기)                      │
│  ├─ revenue (매출액)                    │
│  ├─ operating_profit (영업이익)         │
│  └─ is_estimate (추정치 여부)           │
│                                         │
│  daily_stock_prices                     │
│  ├─ id (PK)                            │
│  ├─ company_id (FK → companies)        │
│  ├─ date (거래일)                       │
│  ├─ close_price (종가)                  │
│  ├─ change_rate (변동률)                │
│  └─ volume (거래량)                     │
└─────────────────────────────────────────┘
                  │
                  │ Heavy Computation
                  │ (Window Functions, Aggregations)
                  ▼
┌─────────────────────────────────────────┐
│      Materialized Views (Cache)         │
│  (Refreshed by GitHub Actions)          │
├─────────────────────────────────────────┤
│                                         │
│  mv_consensus_changes                   │
│  ├─ 전일/1개월/3개월/1년 대비 증감률    │
│  ├─ 매출액 & 영업이익 변화 추적         │
│  └─ LAG() window function 사용          │
│                                         │
│  mv_stock_analysis                      │
│  ├─ 120일 이동평균선 계산               │
│  ├─ 이격도 계산                         │
│  ├─ 52주 최고/최저가                    │
│  └─ AVG() OVER window function         │
└─────────────────────────────────────────┘
                  │
                  │ Fast JOIN only
                  ▼
┌─────────────────────────────────────────┐
│         Normal Views                    │
│  (Real-time, no storage)                │
├─────────────────────────────────────────┤
│                                         │
│  v_investment_opportunities             │
│  ├─ JOIN mv_consensus + mv_stock       │
│  ├─ 투자 점수 계산                      │
│  ├─ S/A/B 등급 분류                    │
│  └─ Filtering & Sorting                │
└─────────────────────────────────────────┘
```

## 🚀 Technology Stack Details

### Frontend Layer
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **State Management**: React Context + Server Components
- **Data Fetching**: Native fetch with Next.js caching

### Backend Layer
- **API**: Next.js API Routes (Serverless Functions)
- **Database**: Supabase PostgreSQL
- **ORM**: Supabase Client (JavaScript SDK)
- **Authentication**: None (Public Data)

### Data Collection Layer
- **Automation**: GitHub Actions
- **Web Scraping**:
  - axios (HTTP requests)
  - cheerio (HTML parsing)
  - iconv-lite (EUC-KR to UTF-8 encoding)
- **Batch Processing**: Promise.all() with concurrency control
- **Error Handling**: Retry logic + Artifact upload on failure

### Deployment Layer
- **Frontend Hosting**: Vercel (Edge Network)
- **Database Hosting**: Supabase Cloud (Seoul Region)
- **CI/CD**: GitHub Actions + Vercel Git Integration
- **Monitoring**: Vercel Analytics + GitHub Actions Logs

## 📊 Performance Characteristics

### Data Collection Performance

| Operation | Processing Time | Throughput |
|-----------|----------------|------------|
| FnGuide 재무 데이터 수집 | ~60분 | 1,000 기업 (KOSPI 500 + KOSDAQ 500) |
| Naver 주가 데이터 수집 | ~16-17분 | 1,000 기업 |
| Materialized View REFRESH | ~30초 | 2개 MVs (mv_consensus + mv_stock) |

### API Response Performance

| Endpoint | Without MVs | With MVs | Improvement |
|----------|------------|----------|-------------|
| /api/investment-opportunities | ~5-10초 | <1초 | 5-10x |
| /api/consensus-changes | ~3-5초 | <1초 | 3-5x |
| /api/stock-analysis | ~2-4초 | <1초 | 2-4x |

### Concurrency Settings
- **FnGuide Scraper**: 50개씩 병렬 처리 (배치 크기)
- **Stock Price Scraper**: 10개씩 병렬 처리 (배치 크기)
- **Rate Limiting**: 500ms 배치 간 대기 시간

## 🔐 Security Considerations

### API Key Management
- **Environment Variables**: `.env.local` (로컬), GitHub Secrets (CI/CD)
- **Supabase Keys**:
  - `NEXT_PUBLIC_SUPABASE_URL`: 공개 URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 익명 접근 키 (공개 가능)
  - `SUPABASE_SERVICE_KEY`: 서비스 역할 키 (비밀)

### Data Access Control
- **Row Level Security (RLS)**: Disabled (공개 데이터)
- **API Rate Limiting**: Vercel 기본 제한 적용
- **Database Connection**: SSL 강제 (Supabase 기본)

### Web Scraping Ethics
- **User-Agent**: 정상 브라우저 식별
- **Rate Limiting**: 초당 2개 요청 제한
- **Error Handling**: 실패 시 재시도 (최대 3회)
- **Data Usage**: 비상업적 개인 프로젝트

## 🔧 Scalability Considerations

### Current Limitations
- **Free Tier Constraints**:
  - Supabase: 500MB storage, 50,000 rows
  - Vercel: 100GB bandwidth/month
  - GitHub Actions: 2,000분/month

### Scaling Strategies
- **Database**: Materialized Views로 읽기 성능 최적화
- **API**: Edge caching (Vercel CDN)
- **Scraping**: 배치 크기 조정으로 속도 최적화
- **Storage**: 오래된 데이터 아카이빙 전략 필요

## 📍 Deployment Regions
- **Frontend**: Vercel Edge Network (전세계)
- **Database**: Supabase Seoul Region (ap-northeast-2)
- **CI/CD**: GitHub Actions (미국 동부)

## 🔄 Timezone Handling
- **저장 기준**: Korean Standard Time (KST = UTC+9)
- **변환 로직**: `new Date(now.getTime() + (9 * 60 * 60 * 1000))`
- **GitHub Actions**: UTC 환경에서 KST로 변환하여 저장

## 📝 Logging and Monitoring
- **Scraper Logs**: GitHub Actions Artifacts (실패 시 저장)
- **API Logs**: Vercel Function Logs
- **Database Logs**: Supabase Dashboard
- **Error Tracking**: Console logs + Artifact upload
