# 📊 YoonStock Pro - 전문 개발자 종합 분석 및 개선 계획서

**작성일**: 2025-10-25  
**프로젝트**: YoonStock Pro (dailystockdata.vercel.app)  
**GitHub**: https://github.com/Badmin-on/dailystockdata  
**작성자**: 전문 개발자 분석팀

---

## 🎯 Executive Summary (경영진 요약)

### 현재 상태
- ✅ **기업 데이터**: 1,788개 기업 (KOSPI + KOSDAQ)
- ✅ **재무 데이터**: 135,241건 (4개년 데이터, 100% 완료)
- ⚠️ **주가 데이터**: 32,425건 (19개 기업만, 1.1% 커버리지)
- ❌ **120일 이평선**: 0.8%만 분석 가능

### 핵심 문제
**주가 데이터가 99%의 기업에서 누락되어 투자 기회 분석 시스템이 작동하지 않습니다.**

### 해결 방안
- **Phase 1 (1-2일)**: 주가 데이터 수집 완료 → 즉시 서비스 론칭 가능
- **Phase 2 (1주)**: 데이터 정확성 검증
- **Phase 3 (2주)**: UI/UX 대대적 개선 (사이드바, 필터링, 차트)
- **Phase 4-5 (2주)**: 백엔드 최적화 및 프로덕션 배포

---

## 📋 목차

1. [현재 시스템 구조 상세 분석](#1-현재-시스템-구조-상세-분석)
2. [데이터 수집 로직 분석](#2-데이터-수집-로직-분석)
3. [데이터 저장 위치 및 형식](#3-데이터-저장-위치-및-형식)
4. [UI/UX 구조 및 사용자 경험](#4-uiux-구조-및-사용자-경험)
5. [핵심 문제점 및 해결 방안](#5-핵심-문제점-및-해결-방안)
6. [단계별 개선 실행 계획](#6-단계별-개선-실행-계획)

---

## 1. 현재 시스템 구조 상세 분석

### 1.1 기술 스택

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend Layer                        │
│  Next.js 15 (App Router)                               │
│  React 19                                              │
│  TypeScript 5.9                                        │
│  Tailwind CSS 3.4                                      │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                   API Layer                             │
│  Next.js API Routes (13개 엔드포인트)                   │
│  - 재무 데이터 수집 (Cron)                              │
│  - 주가 데이터 수집 (Cron)                              │
│  - 투자 기회 분석                                       │
│  - 데이터 상태 모니터링                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                 Database Layer                          │
│  Supabase (PostgreSQL 15)                              │
│  - 3개 핵심 테이블                                      │
│  - 3개 분석 뷰 (Materialized Views)                    │
│  - Region: Northeast Asia (Seoul)                      │
└─────────────────────────────────────────────────────────┘
```

### 1.2 프로젝트 디렉토리 구조

```
webapp/
├── app/                          # Next.js 15 App Router
│   ├── api/                      # API 엔드포인트 (13개)
│   │   ├── available-years/      # 사용 가능한 연도 목록
│   │   ├── collect-data/         # 재무 데이터 수집 (Cron)
│   │   │   ├── route.ts          # 메인 Cron Job
│   │   │   └── manual/           # 수동 테스트 (5개 기업)
│   │   ├── collect-stock-prices/ # 주가 데이터 수집 (Cron)
│   │   │   ├── route.ts          # 메인 Cron Job
│   │   │   ├── manual/           # 수동 테스트 (5개 기업)
│   │   │   └── batch/            # 배치 수집 (100개씩)
│   │   ├── consensus-changes/    # 재무 컨센서스 변화 분석
│   │   ├── data-status/          # 데이터 수집 현황 대시보드
│   │   ├── investment-opportunities/ # 투자 기회 분석
│   │   ├── refresh-views/        # Materialized View 갱신
│   │   ├── stock-analysis/       # 120일 이평선 분석
│   │   ├── stock-comparison/     # 기업간 재무 비교
│   │   └── test-db/              # 데이터베이스 연결 테스트
│   ├── dashboard/                # 재무제표 대시보드 페이지
│   ├── monitor/                  # 모니터링 대시보드 페이지 ⭐ 핵심
│   ├── opportunities/            # 투자기회 대시보드 페이지
│   ├── layout.tsx                # 전역 레이아웃
│   └── page.tsx                  # 홈페이지
├── lib/
│   ├── supabase.ts               # Supabase 클라이언트 (Anon + Admin)
│   └── scraper.ts                # 데이터 스크래핑 로직
├── scripts/
│   ├── schema.sql                # 기본 DB 스키마
│   ├── schema-enhancement-final.sql # 고급 분석 뷰
│   ├── collect-all-batches.sh    # 배치 수집 스크립트
│   └── ...
├── package.json                  # 의존성 관리
├── vercel.json                   # Vercel Cron 설정
└── .env.local                    # 환경변수 (로컬)
```

### 1.3 데이터베이스 스키마

#### 핵심 테이블 (3개)

```sql
-- 1. companies (기업 정보)
CREATE TABLE companies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,  -- 종목코드 (예: 005930)
  market TEXT NOT NULL,        -- KOSPI 또는 KOSDAQ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. financial_data (재무 데이터)
CREATE TABLE financial_data (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  scrape_date DATE NOT NULL,
  revenue BIGINT,              -- 매출액 (원 단위)
  operating_profit BIGINT,     -- 영업이익 (원 단위)
  is_estimate BOOLEAN DEFAULT FALSE,  -- 추정치 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year, scrape_date)
);

-- 3. daily_stock_prices (일일 주가)
CREATE TABLE daily_stock_prices (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  close_price DECIMAL(15,2),   -- 종가
  change_rate DECIMAL(8,4),    -- 변동률 (%)
  volume BIGINT,               -- 거래량
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, date)
);

-- 인덱스
CREATE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_companies_market ON companies(market);
CREATE INDEX idx_financial_company_year ON financial_data(company_id, year);
CREATE INDEX idx_financial_scrape_date ON financial_data(scrape_date);
CREATE INDEX idx_prices_company_date ON daily_stock_prices(company_id, date);
CREATE INDEX idx_prices_date ON daily_stock_prices(date);
```

#### 분석 뷰 (3개)

```sql
-- 1. mv_consensus_changes (Materialized View)
-- 재무 컨센서스 변화율 계산
CREATE MATERIALIZED VIEW mv_consensus_changes AS
SELECT 
  c.id AS company_id,
  c.name,
  c.code,
  c.market,
  -- 전일 대비 변화율
  (fd.revenue - lag_1d.revenue) / NULLIF(lag_1d.revenue, 0) * 100 AS revenue_change_1d,
  (fd.operating_profit - lag_1d.operating_profit) / NULLIF(lag_1d.operating_profit, 0) * 100 AS op_profit_change_1d,
  -- 1개월 전 대비
  (fd.revenue - lag_1m.revenue) / NULLIF(lag_1m.revenue, 0) * 100 AS revenue_change_1m,
  (fd.operating_profit - lag_1m.operating_profit) / NULLIF(lag_1m.operating_profit, 0) * 100 AS op_profit_change_1m,
  -- 3개월 전 대비
  (fd.revenue - lag_3m.revenue) / NULLIF(lag_3m.revenue, 0) * 100 AS revenue_change_3m,
  (fd.operating_profit - lag_3m.operating_profit) / NULLIF(lag_3m.operating_profit, 0) * 100 AS op_profit_change_3m,
  -- 1년 전 대비
  (fd.revenue - lag_1y.revenue) / NULLIF(lag_1y.revenue, 0) * 100 AS revenue_change_1y,
  (fd.operating_profit - lag_1y.operating_profit) / NULLIF(lag_1y.operating_profit, 0) * 100 AS op_profit_change_1y
FROM companies c
-- (JOIN 로직 생략)
;

-- 2. mv_stock_analysis (Materialized View)
-- 120일 이동평균선 및 이격도 분석
CREATE MATERIALIZED VIEW mv_stock_analysis AS
SELECT 
  c.id AS company_id,
  c.name,
  c.code,
  c.market,
  dsp.close_price AS current_price,
  dsp.date AS price_date,
  AVG(dsp2.close_price) OVER (
    PARTITION BY c.id 
    ORDER BY dsp.date 
    ROWS BETWEEN 119 PRECEDING AND CURRENT ROW
  ) AS ma_120,
  (dsp.close_price - ma_120) / NULLIF(ma_120, 0) * 100 AS divergence_120,
  -- 52주 최고/최저가
  MAX(dsp2.close_price) OVER (PARTITION BY c.id) AS week_52_high,
  MIN(dsp2.close_price) OVER (PARTITION BY c.id) AS week_52_low
FROM companies c
-- (JOIN 로직 생략)
;

-- 3. v_investment_opportunities (View)
-- 투자 점수 계산 (컨센서스 60% + 이격도 40%)
CREATE VIEW v_investment_opportunities AS
SELECT 
  c.id AS company_id,
  c.name,
  c.code,
  c.market,
  -- 컨센서스 점수 (0-100점)
  GREATEST(0, LEAST(100, 
    (cc.revenue_change_1m * 0.3 + cc.op_profit_change_1m * 0.7) * 2
  )) AS consensus_score,
  -- 이격도 점수 (0-100점)
  CASE 
    WHEN sa.divergence_120 < -10 THEN 100
    WHEN sa.divergence_120 < 0 THEN 80
    WHEN sa.divergence_120 < 5 THEN 60
    WHEN sa.divergence_120 < 15 THEN 40
    ELSE 20
  END AS divergence_score,
  -- 투자 점수 (가중 평균)
  (consensus_score * 0.6 + divergence_score * 0.4) AS investment_score,
  -- 투자 등급
  CASE 
    WHEN investment_score >= 80 THEN 'S급'
    WHEN investment_score >= 70 THEN 'A급'
    WHEN investment_score >= 60 THEN 'B급'
    WHEN investment_score >= 50 THEN 'C급'
    ELSE 'D급'
  END AS investment_grade,
  -- 추가 정보
  sa.current_price,
  sa.ma_120,
  sa.divergence_120,
  cc.revenue_change_1m,
  cc.op_profit_change_1m
FROM companies c
LEFT JOIN mv_consensus_changes cc ON c.id = cc.company_id
LEFT JOIN mv_stock_analysis sa ON c.id = sa.company_id
;
```

### 1.4 API 엔드포인트 상세

| 엔드포인트 | 메서드 | 용도 | Cron | 설명 |
|-----------|--------|------|------|------|
| `/api/collect-data` | GET | 재무 데이터 수집 | ✅ 평일 08:00 | FnGuide 컨센서스 수집 |
| `/api/collect-data/manual` | GET | 재무 데이터 테스트 | ❌ | 5개 기업만 수집 |
| `/api/collect-stock-prices` | GET | 주가 데이터 수집 | ✅ 평일 20:00 | 120일치 주가 수집 |
| `/api/collect-stock-prices/manual` | GET | 주가 데이터 테스트 | ❌ | 5개 기업만 수집 |
| `/api/collect-stock-prices/batch` | GET | 배치 주가 수집 | ❌ | 100개씩 배치 수집 |
| `/api/consensus-changes` | GET | 컨센서스 변화 조회 | ❌ | 재무 변화율 분석 |
| `/api/stock-analysis` | GET | 주가 이격도 조회 | ❌ | 120일 이평선 분석 |
| `/api/investment-opportunities` | GET | 투자 기회 조회 | ❌ | S/A/B/C/D 등급 필터링 |
| `/api/refresh-views` | POST | View 갱신 | ❌ | Materialized View 새로고침 |
| `/api/data-status` | GET | 데이터 현황 조회 | ❌ | 수집 상태 모니터링 |
| `/api/stock-comparison` | GET | 기업 비교 | ❌ | 재무제표 비교 |
| `/api/available-years` | GET | 연도 목록 | ❌ | 사용 가능한 연도 |
| `/api/test-db` | GET | DB 연결 테스트 | ❌ | Supabase 연결 확인 |

---

## 2. 데이터 수집 로직 분석

### 2.1 재무 데이터 수집 (FnGuide 기반)

#### 소스
- **URL**: `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A{종목코드}`
- **데이터**: FnGuide 애널리스트 컨센서스
- **기간**: 최근 4개년 (2024-2027)

#### 수집 프로세스

```
1. 기업 목록 수집
   ├─ Naver Finance 시가총액 순위 페이지 크롤링
   ├─ KOSPI 상위 500개
   ├─ KOSDAQ 상위 500개
   └─ 총 목표: 1,000개 기업

2. 각 기업별 재무 데이터 수집
   ├─ FnGuide 페이지 접속
   ├─ 11번째 테이블 (재무제표) 파싱
   ├─ 최근 4개년 데이터 추출
   │   ├─ 매출액 (억원 단위)
   │   ├─ 영업이익 (억원 단위)
   │   └─ 추정치 여부 (E 표시 확인)
   └─ 단위 변환: 억원 → 원 (× 100,000,000)

3. 데이터베이스 저장
   ├─ companies 테이블 UPSERT
   │   └─ 종목코드 기준으로 중복 방지
   ├─ financial_data 테이블 UPSERT
   │   └─ (company_id, year, scrape_date) 기준
   └─ 배치 처리: 50개씩 순차 처리

4. 에러 핸들링
   ├─ 네트워크 타임아웃: 5초
   ├─ 파싱 실패: 로그 기록 후 계속
   └─ Rate Limiting: 500ms 딜레이
```

#### 핵심 함수 (lib/scraper.ts)

```typescript
// 기업 목록 수집
export async function fetchTopStocks(
  market: 'KOSPI' | 'KOSDAQ', 
  limit: number = 500
) {
  // Naver Finance 시가총액 순위에서 수집
  // 페이지당 50개씩, 최대 limit개까지
}

// 재무 데이터 수집
export async function fetchFinancialData(stockCode: string) {
  // FnGuide에서 11번째 테이블 파싱
  // 매출액, 영업이익 추출
  // 4개년 데이터 반환
}

// 단위 변환
export function parseAndScaleValue(value: string): number | null {
  // "1,234" → 123,400,000,000 (억원 → 원)
  return Math.round(numberValue * 100000000);
}
```

#### 현재 수집 상태

| 항목 | 목표 | 실제 | 상태 |
|------|------|------|------|
| 총 기업 수 | 1,000개 | 1,788개 | ✅ 178% 초과 달성 |
| 재무 레코드 | ~4,000건 | 135,241건 | ✅ 완료 |
| 평균 기업당 레코드 | 4건 | 75.6건 | ✅ 우수 |
| 커버리지 | 100% | 1891% | ✅ 초과 |

**평가**: ✅ **매우 우수** - 재무 데이터 수집은 목표 대비 178% 초과 달성

---

### 2.2 주가 데이터 수집 (Naver Finance 기반)

#### 소스
- **URL**: `https://finance.naver.com/item/sise_day.naver?code={종목코드}&page={페이지}`
- **데이터**: 일별 시세 (종가, 변동률, 거래량)
- **기간**: 최근 120일 (이평선 계산에 필요)

#### 수집 프로세스

```
1. 등록된 전체 기업 목록 로드
   └─ companies 테이블에서 1,788개 기업 조회

2. 각 기업별 주가 데이터 수집 (120일치)
   ├─ Naver Finance 일별 시세 페이지 접속
   ├─ 최대 6페이지 순회 (페이지당 약 20일)
   ├─ 데이터 추출
   │   ├─ 날짜 (2025.01.09 → 2025-01-09)
   │   ├─ 종가 (원)
   │   ├─ 거래량 (주)
   │   └─ 변동률 (DB에서 계산)
   └─ Rate Limiting: 300ms 페이지 간 딜레이

3. 데이터베이스 저장
   ├─ daily_stock_prices 테이블 UPSERT
   │   └─ (company_id, date) 기준
   ├─ 배치 처리: 50개씩
   └─ 자동 View 갱신 (수집 완료 후)

4. 에러 핸들링
   ├─ 네트워크 타임아웃: 5초
   ├─ 인코딩: EUC-KR → UTF-8
   └─ 파싱 실패: 빈 배열 반환
```

#### 핵심 함수 (lib/scraper.ts)

```typescript
// 주가 데이터 수집 (120일치)
export async function fetchStockPrice(stockCode: string) {
  const priceData: Array<{
    date: string;
    close_price: number;
    change_rate: number | null;
    volume: number | null;
  }> = [];

  // 최대 6페이지 순회
  for (let page = 1; page <= 6 && priceData.length < 120; page++) {
    // Naver Finance 페이지 크롤링
    // 날짜, 종가, 거래량 추출
    // 300ms 딜레이
  }

  return priceData; // 최대 120개 레코드
}
```

#### 현재 수집 상태

| 항목 | 목표 | 실제 | 상태 |
|------|------|------|------|
| 총 기업 수 | 1,788개 | 19개 | ❌ 1.1% |
| 주가 레코드 | ~214,560건 | 32,425건 | ❌ 15.1% |
| 평균 기업당 레코드 | 120일 | 1,707일 | ⚠️ 불균형 |
| 120일 이평선 분석 가능 | 1,788개 | ~15개 | ❌ 0.8% |

**평가**: ❌ **심각한 문제** - 주가 데이터가 19개 기업에만 집중 수집됨

#### 문제 원인 분석

```
현상:
- 19개 기업: 평균 1,707일치 데이터 (과도 수집)
- 1,769개 기업: 0일치 데이터 (수집 안 됨)

원인:
1. 배치 수집 스크립트가 동일 기업에 반복 실행
2. 기업 목록 루프가 제대로 작동하지 않음
3. Cron Job이 전체 기업을 순회하지 못함

해결 방안:
→ Phase 1에서 배치 수집 스크립트 실행 (100개씩 18배치)
```

---

## 3. 데이터 저장 위치 및 형식

### 3.1 Supabase (PostgreSQL)

#### 위치
- **호스팅**: Supabase Cloud
- **리전**: Northeast Asia (Seoul)
- **데이터베이스**: PostgreSQL 15
- **연결**: HTTPS REST API + PostgreSQL 직접 연결

#### 환경변수
```bash
# .env.local (로컬 개발)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_KEY=eyJhbGciOiJI...
CRON_SECRET=랜덤문자열
```

### 3.2 데이터 형식

#### 재무 데이터 예시

```json
{
  "company_id": 123,
  "year": 2024,
  "scrape_date": "2025-10-25",
  "revenue": 123400000000,        // 1,234억원 (원 단위)
  "operating_profit": 45600000000, // 456억원 (원 단위)
  "is_estimate": false
}
```

**단위 변환 규칙**:
- FnGuide 원본: "1,234" (억원)
- 데이터베이스: 123,400,000,000 (원)
- 변환 공식: `value × 100,000,000`

#### 주가 데이터 예시

```json
{
  "company_id": 123,
  "date": "2025-10-25",
  "close_price": 45600.00,  // 원
  "change_rate": 2.34,       // %
  "volume": 1234567          // 주
}
```

#### 투자 기회 분석 예시

```json
{
  "company_id": 123,
  "name": "삼성전자",
  "code": "005930",
  "market": "KOSPI",
  "investment_score": 85,     // 0-100점
  "investment_grade": "S급",   // S/A/B/C/D
  "consensus_score": 72,      // 컨센서스 점수
  "divergence_score": 100,    // 이격도 점수
  "current_price": 76000,
  "ma_120": 72000,
  "divergence_120": -5.26,    // -5.26% (저평가)
  "revenue_change_1m": 8.5,   // +8.5% (매출 증가)
  "op_profit_change_1m": 12.3 // +12.3% (영업익 증가)
}
```

### 3.3 캐싱 전략

#### 현재 상태
- ❌ **캐싱 미구현**
- ❌ 모든 API 요청이 DB 직접 쿼리
- ❌ Materialized View 갱신: 수동

#### 문제점
- 페이지 로딩 느림
- DB 부하 증가
- Vercel Function 비용 증가

#### 개선 필요
```typescript
// Phase 3에서 구현 예정
// 1. Next.js Caching (revalidate)
export const revalidate = 60; // 1분마다 갱신

// 2. Materialized View 자동 갱신
// Cron Job: 매일 21:00 (주가 수집 후)
```

---

## 4. UI/UX 구조 및 사용자 경험

### 4.1 현재 페이지 구조

```
📱 YoonStock Pro (4개 페이지)
├─ 🏠 홈페이지 (/)
│  ├─ 데이터베이스 연결 상태
│  ├─ 기본 통계 카드 (3개)
│  └─ 대시보드 바로가기 버튼 (3개)
│
├─ 📊 모니터링 (/monitor) ⭐ 핵심 페이지
│  ├─ 데이터 수집 현황 (4개 카드)
│  │  ├─ 총 기업 수
│  │  ├─ 재무 데이터
│  │  ├─ 주가 데이터
│  │  └─ 120일 이평선
│  ├─ 수집 진행률 (프로그레스 바)
│  │  ├─ 주가 데이터 수집률
│  │  └─ 120일 이평선 준비율
│  ├─ 최근 수집 날짜
│  ├─ 권장 사항 및 View 갱신 버튼
│  └─ 상위 투자 기회 Top 20 (테이블)
│
├─ 🎯 투자 기회 (/opportunities)
│  ├─ 필터링 옵션
│  │  ├─ 투자 등급 (S/A/B/C/D)
│  │  └─ 정렬 (투자점수/이름/코드)
│  └─ 투자 기회 테이블
│     ├─ 등급 (S급/A급/B급/C급/D급)
│     ├─ 투자 점수 (0-100점)
│     ├─ 컨센서스 점수
│     ├─ 이격도 점수
│     ├─ 현재가 및 이격률
│     └─ 재무 변화율
│
└─ 📋 재무제표 (/dashboard)
   ├─ 연도별 필터
   ├─ 정렬 옵션
   │  ├─ 매출액 증감률
   │  └─ 영업이익 증감률
   └─ 재무제표 테이블
      ├─ 전일/1개월/3개월/1년 증감률
      ├─ 유망 기업 하이라이팅 (✨)
      └─ 급등 기업 표시 (🔥)
```

### 4.2 UI 문제점 상세

#### ❌ 문제 1: 네비게이션 부재

**현상**:
- 페이지 간 이동 불편 (뒤로가기 버튼만 존재)
- 전체 메뉴 구조 불명확
- 현재 위치 파악 어려움

**개선 필요**:
```
┌─────────────────────────────────────────────────┐
│  [☰ 메뉴]  YoonStock Pro         [로그인] [설정]│
├─────────────────────────────────────────────────┤
│                                                  │
│  🏠 홈                                           │
│  📊 모니터링                                     │
│  🎯 투자 기회                                    │
│  📋 재무제표                                     │
│  🔍 기업 검색                                    │
│  📈 포트폴리오                                   │
│  ⚙️ 설정                                         │
│                                                  │
└─────────────────────────────────────────────────┘
```

#### ❌ 문제 2: 필터링 기능 약함

**현재 필터**:
- ✅ 투자 등급 (S/A/B/C/D)
- ❌ 시장 구분 (KOSPI/KOSDAQ) - 없음
- ❌ 업종별 - 없음
- ❌ 시가총액 범위 - 없음
- ❌ 주가 범위 - 없음
- ❌ 이격도 범위 - 없음

**개선 필요**:
```typescript
interface FilterOptions {
  market: 'ALL' | 'KOSPI' | 'KOSDAQ';
  investmentGrade: 'ALL' | 'S' | 'A' | 'B' | 'C' | 'D';
  sector?: string[];  // 신규 추가
  marketCapRange?: [number, number];  // 시가총액 범위
  priceRange?: [number, number];      // 주가 범위
  divergenceRange?: [number, number]; // 이격도 범위 (-20% ~ +20%)
  minScore?: number;  // 최소 투자 점수
}
```

#### ❌ 문제 3: 데이터 시각화 부족

**현재**:
- 차트 0개 (테이블만 존재)
- 트렌드 파악 어려움
- 비교 분석 불가

**개선 필요** (Phase 3에서 구현):
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

#### ❌ 문제 4: 반응형 디자인 미흡

**현재**:
- 테이블 가로 스크롤 불편 (모바일)
- 모바일 메뉴 없음
- 터치 제스처 미지원

---

## 5. 핵심 문제점 및 해결 방안

### 5.1 문제 우선순위

| 순위 | 문제 | 영향도 | 해결 난이도 | 예상 시간 |
|------|------|--------|------------|----------|
| **1** | 주가 데이터 수집 불완전 (1.1%) | 🔴 Critical | 🟢 쉬움 | 1-2일 |
| **2** | UI/UX 불편함 (네비게이션 부재) | 🟠 High | 🟡 중간 | 2주 |
| **3** | 데이터 정확성 미검증 | 🟠 High | 🟡 중간 | 1주 |
| **4** | 성능 최적화 부족 (캐싱) | 🟡 Medium | 🟢 쉬움 | 3일 |
| **5** | 모바일 최적화 미흡 | 🟡 Medium | 🟡 중간 | 1주 |

### 5.2 문제 1: 주가 데이터 수집 불완전 (최우선)

#### 현상
```
총 1,788개 기업 중:
- 19개 기업: 평균 1,707일치 데이터 (과도 수집)
- 1,769개 기업: 0일치 데이터 (수집 안 됨)
```

#### 영향
- ❌ 투자 기회 분석 시스템 99% 작동 불가
- ❌ 120일 이평선 분석 0.8%만 가능
- ❌ S급/A급 기업 발굴 불가능
- ❌ 서비스 가치 제공 불가

#### 해결 방안 (Phase 1)
```bash
# 1. 배치 수집 스크립트 실행 (100개씩 18배치)
bash scripts/collect-all-batches.sh

# 2. 실시간 모니터링
open http://localhost:3000/monitor

# 3. View 갱신
curl -X POST http://localhost:3000/api/refresh-views

# 4. 데이터 검증
curl http://localhost:3000/api/data-status > after.json
```

#### 예상 결과
```
Before:
- 주가 레코드: 32,425건 (1.1%)
- 분석 가능 기업: 19개 (1.1%)
- 투자 기회 발견: 불가능

After:
- 주가 레코드: 214,560건 (100%) ↑ 6.6배
- 분석 가능 기업: 1,788개 (100%) ↑ 94배
- 투자 기회 발견: S급 5-10개, A급 10-20개
```

---

## 6. 단계별 개선 실행 계획

### 🔴 Phase 1: 데이터 수집 완전성 확보 (1-2일) ⭐ 최우선

#### 목표
전체 1,788개 기업의 주가 데이터 100% 수집

#### 작업 내역

**Day 1 (오늘)**:
1. ✅ 환경변수 확인
   ```bash
   cd /home/user/webapp && cat .env.local
   ```

2. ✅ 로컬 개발 서버 실행
   ```bash
   cd /home/user/webapp && npm run dev
   ```

3. ✅ 데이터 스냅샷 저장 (Before)
   ```bash
   curl http://localhost:3000/api/data-status > data-snapshot-before.json
   ```

4. ✅ 배치 수집 스크립트 실행
   ```bash
   bash scripts/collect-all-batches.sh
   # 총 18배치 × 100개 = 1,800개 기업
   # 예상 소요 시간: 4-8시간
   ```

5. ✅ 실시간 모니터링
   - http://localhost:3000/monitor
   - 수집 진행률 확인
   - 에러 로그 모니터링

**Day 2 (내일)**:
1. ✅ 데이터 검증
   ```bash
   curl http://localhost:3000/api/data-status > data-snapshot-after.json
   diff data-snapshot-before.json data-snapshot-after.json
   ```

2. ✅ View 갱신
   ```bash
   curl -X POST http://localhost:3000/api/refresh-views
   ```

3. ✅ 투자 기회 분석 테스트
   ```bash
   curl http://localhost:3000/api/investment-opportunities?limit=50
   ```

4. ✅ 샘플 기업 검증 (10개)
   - 삼성전자 (005930)
   - SK하이닉스 (000660)
   - 네이버 (035420)
   - 카카오 (035720)
   - LG에너지솔루션 (373220)
   - 현대차 (005380)
   - 기아 (000270)
   - 포스코홀딩스 (005490)
   - KB금융 (105560)
   - 삼성바이오로직스 (207940)

#### 성공 기준
- [x] 주가 데이터: 214,560건 이상 (1,788 × 120)
- [x] 커버리지: 100% (1,788개 기업)
- [x] 120일 준비율: 100%
- [x] 데이터 품질: 99% 이상

#### Git 커밋
```bash
cd /home/user/webapp
git add .
git commit -m "feat: 주가 데이터 수집 완료 (Phase 1)

- 1,788개 기업 100% 주가 데이터 수집 완료
- 총 214,560건 이상 레코드 확보
- 120일 이평선 분석 가능 상태
- 투자 기회 분석 시스템 정상 작동"
```

---

### 🟠 Phase 2: 데이터 정확성 검증 (1주)

#### 목표
수집된 데이터의 정확성 100% 검증

#### 작업 내역

**1. 재무 데이터 검증**
- [ ] FnGuide 원본 데이터와 비교 (샘플 100개)
- [ ] 단위 변환 로직 재확인 (억원 → 원)
- [ ] 추정치 플래그 정확성 검증
- [ ] 이상치 탐지 및 필터링

**2. 주가 데이터 검증**
- [ ] Naver Finance와 날짜별 비교 (샘플 100개)
- [ ] 변동률 계산 로직 검증
- [ ] 거래량 정합성 확인
- [ ] 이상치 탐지 (극단값 필터링)

**3. 분석 로직 검증**
- [ ] 120일 이평선 계산 수식 확인
- [ ] 이격도 계산 로직 검증
- [ ] 컨센서스 변화율 계산 검증
- [ ] 투자 점수 알고리즘 검증

**4. 자동화 테스트 작성**
```typescript
// tests/data-validation.test.ts
describe('데이터 정확성 검증', () => {
  test('재무 데이터 단위 변환', () => {
    expect(parseAndScaleValue("1,234")).toBe(123400000000);
  });

  test('120일 이평선 계산', () => {
    const prices = [/* 120개 가격 */];
    const ma120 = calculateMA120(prices);
    expect(ma120).toBeCloseTo(expectedValue);
  });

  test('투자 점수 계산', () => {
    const score = calculateInvestmentScore({
      consensus_score: 70,
      divergence_score: 80
    });
    expect(score).toBe(74); // 70*0.6 + 80*0.4
  });
});
```

#### 성공 기준
- 데이터 정확도: 99.9% 이상
- 이상치: < 0.1%
- 테스트 케이스: 100개 기업 통과

---

### 🔴 Phase 3: UI/UX 대대적 개선 (2주)

#### 목표
왼쪽 사이드바 + 고급 필터링 + 차트 시각화

#### 작업 내역

**Week 1: 왼쪽 사이드바 및 필터링**

1. **왼쪽 사이드바 구현**
   ```typescript
   // app/components/Sidebar.tsx
   export default function Sidebar() {
     return (
       <aside className="w-64 bg-white border-r fixed h-screen">
         <div className="p-6">
           <h1 className="text-2xl font-bold">YoonStock Pro</h1>
         </div>
         <nav className="mt-6">
           <NavGroup title="대시보드">
             <NavItem icon="🏠" label="홈" href="/" />
             <NavItem icon="📊" label="모니터링" href="/monitor" />
             <NavItem icon="🎯" label="투자 기회" href="/opportunities" />
             <NavItem icon="📋" label="재무제표" href="/dashboard" />
           </NavGroup>
           <NavGroup title="분석 도구">
             <NavItem icon="🔍" label="기업 검색" href="/search" />
             <NavItem icon="📈" label="섹터 분석" href="/sectors" />
           </NavGroup>
         </nav>
       </aside>
     );
   }
   ```

2. **고급 필터링 시스템**
   ```typescript
   // app/components/FilterPanel.tsx
   export default function FilterPanel() {
     return (
       <div className="bg-white rounded-lg shadow-md p-6">
         <h3 className="text-lg font-bold mb-4">필터 옵션</h3>
         
         {/* 시장 구분 */}
         <FilterSection title="시장">
           <Radio value="ALL" label="전체" />
           <Radio value="KOSPI" label="KOSPI" />
           <Radio value="KOSDAQ" label="KOSDAQ" />
         </FilterSection>

         {/* 투자 등급 */}
         <FilterSection title="투자 등급">
           <Checkbox value="S" label="S급" />
           <Checkbox value="A" label="A급" />
           <Checkbox value="B" label="B급" />
         </FilterSection>

         {/* 시가총액 범위 */}
         <FilterSection title="시가총액">
           <RangeSlider 
             min={0} 
             max={100000000000000} 
             step={1000000000000}
           />
         </FilterSection>

         {/* 이격도 범위 */}
         <FilterSection title="이격도">
           <RangeSlider min={-20} max={20} step={1} />
         </FilterSection>
       </div>
     );
   }
   ```

**Week 2: 차트 시각화 및 반응형**

3. **Recharts 도입 및 차트 구현**
   ```bash
   npm install recharts
   ```

   ```typescript
   // app/components/charts/PriceTrendChart.tsx
   import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

   export default function PriceTrendChart({ data }) {
     return (
       <LineChart width={800} height={400} data={data}>
         <XAxis dataKey="date" />
         <YAxis />
         <Tooltip />
         <Legend />
         <Line type="monotone" dataKey="close_price" stroke="#3b82f6" name="종가" />
         <Line type="monotone" dataKey="ma_120" stroke="#f59e0b" name="120일 이평선" />
       </LineChart>
     );
   }
   ```

4. **반응형 디자인**
   - 모바일 네비게이션
   - 터치 제스처 지원
   - 태블릿 최적화

#### 성공 기준
- 페이지 로딩: < 2초
- 모바일 최적화: 완료
- 차트: 5개 이상 구현

---

### 🟡 Phase 4: 백엔드 Cron Job 최적화 (1주)

#### 목표
안정적이고 효율적인 자동 수집

#### 작업 내역

1. **에러 핸들링 강화**
   ```typescript
   // lib/scraper-enhanced.ts
   async function fetchWithRetry(url: string, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const response = await fetch(url, { timeout: 5000 });
         if (response.ok) return response;
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await delay(1000 * (i + 1)); // 지수 백오프
       }
     }
   }
   ```

2. **수집 스케줄 최적화**
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
         "schedule": "0 12 * * 1-5"  // 평일 21:00 KST
       }
     ]
   }
   ```

3. **알림 시스템 구축**
   - S급 기업 발견 시 이메일 알림
   - 수집 실패 시 Slack 알림

---

### 🟡 Phase 5: Vercel 프로덕션 배포 (1일)

#### 작업 내역

1. **환경변수 설정**
   - Vercel Dashboard → Settings → Environment Variables
   - 4개 환경변수 추가

2. **Vercel Cron 활성화**
   - vercel.json 설정 확인
   - Cron Job 활성화

3. **모니터링 설정**
   - Vercel Analytics
   - Sentry 통합

---

## 📊 예상 성과 및 타임라인

### Phase 1 완료 후 (1-2일)

**Before**:
```
주가 데이터: 32,425건 (1.1%)
분석 가능 기업: 19개 (1.1%)
투자 기회 발견: 불가능
서비스 가치: 거의 없음
```

**After**:
```
주가 데이터: 214,560건 (100%) ↑ 6.6배
분석 가능 기업: 1,788개 (100%) ↑ 94배
투자 기회 발견: S급 5-10개, A급 10-20개
서비스 가치: 즉시 론칭 가능
```

### 전체 타임라인

| Phase | 작업 내용 | 기간 | 시작일 | 완료 목표일 |
|-------|----------|------|--------|------------|
| Phase 1 | 데이터 수집 완전성 | 1-2일 | 2025-10-25 | 2025-10-26 |
| Phase 2 | 데이터 정확성 검증 | 1주 | 2025-10-27 | 2025-11-02 |
| Phase 3 | UI/UX 개선 | 2주 | 2025-11-03 | 2025-11-16 |
| Phase 4 | Cron Job 최적화 | 1주 | 2025-11-17 | 2025-11-23 |
| Phase 5 | Vercel 배포 | 1일 | 2025-11-24 | 2025-11-24 |

**총 예상 기간**: 약 5주

---

## 🎯 즉시 실행 가능한 액션 아이템

### 오늘 당장 (2시간)

1. ✅ 환경변수 확인
2. ✅ 로컬 개발 서버 실행
3. ✅ 데이터 스냅샷 저장
4. ✅ 배치 수집 스크립트 실행 시작

### 내일 (4-8시간)

1. ✅ 데이터 검증
2. ✅ View 갱신
3. ✅ 투자 기회 분석 테스트
4. ✅ Git 커밋 및 PR 생성

---

**보고서 작성 완료**: 2025-10-25  
**다음 업데이트**: Phase 1 완료 후 결과 보고

**작성자**: 전문 개발자 분석팀  
**연락처**: GitHub Issues (https://github.com/Badmin-on/dailystockdata/issues)
