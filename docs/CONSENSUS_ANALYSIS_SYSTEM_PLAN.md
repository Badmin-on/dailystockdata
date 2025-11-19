# 컨센서스 기반 밸류에이션 동적 분석 시스템 - 전체 구현 계획

**작성일**: 2025-11-19
**프로젝트명**: YoonStock Pro - Consensus Valuation Dynamics
**목적**: EPS(실적) vs PER(밸류에이션) 변화 분리 추적 및 저평가 구간 자동 탐지

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [현재 상태 분석](#2-현재-상태-분석)
3. [전체 아키텍처](#3-전체-아키텍처)
4. [데이터베이스 설계](#4-데이터베이스-설계)
5. [계산 로직 상세](#5-계산-로직-상세)
6. [Phase별 구현 계획](#6-phase별-구현-계획)
7. [API 설계](#7-api-설계)
8. [UI/UX 설계](#8-uiux-설계)
9. [테스트 전략](#9-테스트-전략)
10. [위험 요소 및 대응](#10-위험-요소-및-대응)

---

## 1. 시스템 개요

### 1.1 핵심 가치 제안

**문제**: 기존 주식 분석은 EPS(실적)와 PER(밸류에이션)을 개별적으로 봄
**해결**: 두 지표의 **변화율 차이**를 추적하여 투자 기회 자동 탐지

**타겟 시나리오**:
```
시나리오 1: "찐성장" (Q2 영역)
- EPS: 2025년 1,000원 → 2026년 1,500원 (+50%)
- PER: 2025년 20배 → 2026년 18배 (-10%)
→ 실적은 성장하는데 밸류에이션은 낮아짐 = 저평가 진입

시나리오 2: "턴어라운드"
- EPS: 2025년 -500원 → 2026년 +200원 (적자→흑자)
→ 계산 불가능하지만 별도 태그로 추적

시나리오 3: "과열 경고" (Q1 영역)
- EPS: +10% vs PER: +40%
→ 실적 대비 주가가 너무 올라감
```

### 1.2 핵심 지표 3가지

#### FVB (Fundamental vs Valuation Balance)
```typescript
FVB = ln(EPS_Ratio) - ln(PER_Ratio)
```
- **양수**: 실적 성장 > 밸류에이션 상승 (저평가 심화)
- **음수**: 밸류에이션 상승 > 실적 성장 (고평가)
- **0 근처**: 균형 상태

#### HGS (Healthy Growth Score)
```typescript
HGS = EPS_Growth% - MAX(PER_Growth%, 0)
```
- PER 하락(디레이팅) 시: 벌점 없음 → 높은 점수
- PER 상승 시: 성장률에서 차감 → 점수 낮아짐

#### RRS (Re-Rating Risk Score)
```typescript
RRS = PER_Growth% - MAX(EPS_Growth%, 0)
```
- 실적 없이 PER만 오르면 점수 급등 → 과열 경고

### 1.3 4분면 전략

```
       PER ↑ (리레이팅)
    Q3     |     Q1
  (테마주) |  (성장주)
    -------|-------
    Q4     |     Q2 ⭐
  (침체)   | (찐성장)
       PER ↓ (디레이팅)
           EPS →
```

**Q2 (Target Zone)**: EPS↑ + PER↓
- 실적 개선 중이지만 시장이 저평가
- 가치투자 최적 타이밍

---

## 2. 현재 상태 분석

### 2.1 기존 인프라

✅ **완료된 작업**:
- Naver Finance 스크래퍼 구현 (872개 종목)
- `financial_data_extended` 테이블 (3,476개 레코드)
- 11개 재무 지표 수집 (EPS, PER, ROE 등)
- 컨센서스 플래그 (`is_estimate`)

**기존 테이블 구조**:
```sql
financial_data_extended (
  company_id, year, scrape_date,
  eps, per, roe, revenue, operating_profit, ...
  is_estimate BOOLEAN,  -- 컨센서스 여부
  data_source VARCHAR   -- 'naver'
)
```

### 2.2 데이터 현황

**수집 데이터**:
- 종목 수: 872개 (일반 주식)
- 연도 범위: 2022, 2023, 2024, 2025(E)
- 컨센서스: 2025년은 `is_estimate = true`
- 수집 빈도: **현재 1회 수집** (추후 매일 수집 필요)

**데이터 품질**:
- EPS/PER 필수 지표: ✅ 포함
- NULL 비율: 일부 존재 (ETF 제외 시 거의 없음)
- 이상치: 적자 종목, 극소값 존재

### 2.3 기술 스택

- **Backend**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Frontend**: React 19, TypeScript
- **Charts**: Recharts (현재 사용 중)
- **Data Fetching**: Axios

---

## 3. 전체 아키텍처

### 3.1 시스템 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Daily Batch Job                       │
│  (매일 새벽 3시 실행 or Vercel Cron)                    │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  1. Naver Finance 스크래핑                              │
│     - 872개 종목 재무 데이터 수집                        │
│     - financial_data_extended 저장                      │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  2. Consensus Calculation Engine                        │
│     ┌─────────────────────────────────────────┐        │
│     │ Step 1: Edge Case Detection             │        │
│     │  - 적자 종목 필터링                     │        │
│     │  - 턴어라운드 감지                      │        │
│     │  - 극소값 제외                          │        │
│     └─────────────┬───────────────────────────┘        │
│                   ↓                                      │
│     ┌─────────────────────────────────────────┐        │
│     │ Step 2: Metric Calculation              │        │
│     │  - FVB, HGS, RRS 계산                   │        │
│     │  - Quadrant 분류 (Q1-Q4)               │        │
│     └─────────────┬───────────────────────────┘        │
│                   ↓                                      │
│     ┌─────────────────────────────────────────┐        │
│     │ Step 3: Trend Analysis                  │        │
│     │  - 전일/1주/1개월 변화량 계산          │        │
│     │  - 태그 생성 (HEALTHY_GROWTH 등)       │        │
│     └─────────────┬───────────────────────────┘        │
│                   ↓                                      │
│     ┌─────────────────────────────────────────┐        │
│     │ Step 4: DB Insert                       │        │
│     │  - consensus_metric_daily               │        │
│     │  - consensus_diff_log                   │        │
│     └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│                    API Layer                             │
│  /api/consensus/metrics      - 메트릭 조회              │
│  /api/consensus/quadrant     - 4분면 데이터             │
│  /api/consensus/trends       - 트렌드 분석              │
│  /api/consensus/company/:id  - 종목 상세                │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│                  Frontend Pages                          │
│  /consensus-analysis                                     │
│    - 메인 대시보드 (그리드 + 필터)                     │
│    - 4분면 산점도                                        │
│  /consensus-analysis/[ticker]                            │
│    - 종목 상세 페이지                                    │
│    - 트렌드 차트 + 주가 오버레이                        │
└─────────────────────────────────────────────────────────┘
```

### 3.2 데이터 흐름

```
[Daily 3AM]
Naver Scraper → financial_data_extended (Raw Data)
                         ↓
             Calculation Engine (Batch)
                         ↓
              ┌──────────┴───────────┐
              ↓                      ↓
  consensus_metric_daily    consensus_diff_log
  (계산된 지표)             (변화량 + 태그)
              └──────────┬───────────┘
                         ↓
                    [API Query]
                         ↓
                    Frontend UI
```

---

## 4. 데이터베이스 설계

### 4.1 새 테이블 2개 상세 설계

#### Table 1: `consensus_metric_daily`

**목적**: 매일 계산된 지표와 상태를 저장

```sql
CREATE TABLE consensus_metric_daily (
    -- Primary Keys
    snapshot_date    DATE NOT NULL,           -- 계산 일자 (2024-11-19)
    ticker           VARCHAR(10) NOT NULL,    -- 종목 코드 (005930)
    company_id       INT NOT NULL,            -- companies.id FK
    target_y1        INT NOT NULL,            -- 기준 연도 (2025)
    target_y2        INT NOT NULL,            -- 비교 연도 (2026)

    -- Status & Metadata
    calc_status      VARCHAR(20),             -- NORMAL, TURNAROUND, DEFICIT, ERROR
    calc_error       TEXT,                    -- 에러 메시지 (있는 경우)

    -- Raw Data Snapshot (원본 보관)
    eps_y1           DECIMAL(18,2),           -- 2025년 EPS
    eps_y2           DECIMAL(18,2),           -- 2026년 EPS
    per_y1           DECIMAL(18,2),           -- 2025년 PER
    per_y2           DECIMAL(18,2),           -- 2026년 PER

    -- Growth Rates (기본 변화율)
    eps_growth_pct   DECIMAL(10,2),           -- EPS 성장률 (%)
    per_growth_pct   DECIMAL(10,2),           -- PER 변화율 (%)

    -- Core Metrics (핵심 지표)
    fvb_score        DECIMAL(10,4),           -- Fundamental vs Valuation Balance
    hgs_score        DECIMAL(10,2),           -- Healthy Growth Score
    rrs_score        DECIMAL(10,2),           -- Re-Rating Risk Score

    -- Quadrant Classification (4분면)
    quad_position    VARCHAR(30),             -- Q1_GROWTH_RERATING, Q2_GROWTH_DERATING, etc.
    quad_x           DECIMAL(10,2),           -- X좌표 (EPS 성장률)
    quad_y           DECIMAL(10,2),           -- Y좌표 (PER 변화율)

    -- Timestamps
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (snapshot_date, ticker, target_y1, target_y2),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indexes for Performance
CREATE INDEX idx_consensus_metric_date ON consensus_metric_daily(snapshot_date);
CREATE INDEX idx_consensus_metric_ticker ON consensus_metric_daily(ticker);
CREATE INDEX idx_consensus_metric_status ON consensus_metric_daily(calc_status);
CREATE INDEX idx_consensus_metric_quad ON consensus_metric_daily(quad_position);
CREATE INDEX idx_consensus_metric_fvb ON consensus_metric_daily(fvb_score) WHERE calc_status = 'NORMAL';
CREATE INDEX idx_consensus_metric_hgs ON consensus_metric_daily(hgs_score) WHERE calc_status = 'NORMAL';
```

**특징**:
- `snapshot_date`로 히스토리 관리 (시계열 분석 가능)
- `calc_status`로 예외 상황 명확히 구분
- 원본 데이터(eps_y1 등)도 보관하여 재계산 가능

#### Table 2: `consensus_diff_log`

**목적**: 기간별 변화량 및 자동 생성 태그 저장

```sql
CREATE TABLE consensus_diff_log (
    -- Primary Keys
    snapshot_date    DATE NOT NULL,
    ticker           VARCHAR(10) NOT NULL,
    company_id       INT NOT NULL,
    target_y1        INT,
    target_y2        INT,

    -- Daily Change (전일 대비)
    fvb_diff_d1      DECIMAL(10,4),           -- FVB 전일 변화량
    hgs_diff_d1      DECIMAL(10,2),           -- HGS 전일 변화량
    rrs_diff_d1      DECIMAL(10,2),           -- RRS 전일 변화량
    quad_shift_d1    VARCHAR(20),             -- Q1->Q2 등

    -- Weekly Change (1주 전 대비)
    fvb_diff_w1      DECIMAL(10,4),
    hgs_diff_w1      DECIMAL(10,2),
    rrs_diff_w1      DECIMAL(10,2),

    -- Monthly Change (1개월 전 대비)
    fvb_diff_m1      DECIMAL(10,4),
    hgs_diff_m1      DECIMAL(10,2),
    rrs_diff_m1      DECIMAL(10,2),
    quad_shift_m1    VARCHAR(20),

    -- Auto-Generated Tags (자동 태그)
    signal_tags      TEXT[],                  -- ['HEALTHY_DERATING', 'TURNAROUND', ...]
    tag_count        INT DEFAULT 0,           -- 태그 개수 (필터링 용이)

    -- Score Trends (점수 추세)
    fvb_trend        VARCHAR(10),             -- IMPROVING, DECLINING, STABLE
    hgs_trend        VARCHAR(10),

    -- Alert Flags (경고 플래그)
    is_overheat      BOOLEAN DEFAULT FALSE,   -- RRS > 30
    is_target_zone   BOOLEAN DEFAULT FALSE,   -- Q2 영역
    is_turnaround    BOOLEAN DEFAULT FALSE,   -- 턴어라운드 종목

    -- Timestamps
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (snapshot_date, ticker, target_y1, target_y2),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_consensus_diff_date ON consensus_diff_log(snapshot_date);
CREATE INDEX idx_consensus_diff_ticker ON consensus_diff_log(ticker);
CREATE INDEX idx_consensus_diff_tags ON consensus_diff_log USING GIN (signal_tags);
CREATE INDEX idx_consensus_diff_flags ON consensus_diff_log(is_target_zone, is_turnaround);
```

**특징**:
- 변화량을 3가지 기간(D1, W1, M1)으로 추적
- PostgreSQL Array 타입으로 다중 태그 저장
- Boolean 플래그로 빠른 필터링 지원

### 4.2 기존 테이블과의 관계

```
companies
    ↓ (1:N)
financial_data_extended  ← 원본 Raw 데이터 (Naver 스크래핑)
    ↓ (계산)
consensus_metric_daily   ← 계산된 지표
    ↓ (비교)
consensus_diff_log       ← 변화량 및 태그
```

---

## 5. 계산 로직 상세

### 5.1 전체 흐름

```typescript
function calculateConsensusMetrics(snapshotDate: Date) {
  // Step 1: Raw 데이터 로드
  const rawData = await loadFinancialData(snapshotDate);

  // Step 2: 연도 페어링 (2025 vs 2026)
  const pairs = createYearPairs(rawData, [2025, 2026]);

  // Step 3: 각 종목별 계산
  for (const pair of pairs) {
    // 3-1. Edge Case 감지
    const status = detectEdgeCase(pair);

    if (status === 'NORMAL') {
      // 3-2. 지표 계산
      const metrics = calculateMetrics(pair);

      // 3-3. DB 저장
      await saveMetric(snapshotDate, pair.ticker, metrics);
    } else {
      // 3-4. 예외 처리 (태그만 생성)
      await saveException(snapshotDate, pair.ticker, status);
    }
  }

  // Step 4: 변화량 계산 (과거 데이터와 비교)
  await calculateDiffs(snapshotDate);

  // Step 5: 태그 생성
  await generateTags(snapshotDate);
}
```

### 5.2 Edge Case Detection (예외 처리)

```typescript
function detectEdgeCase(pair: YearPair): CalcStatus {
  const { eps_y1, eps_y2, per_y1, per_y2 } = pair;

  // Case 1: 데이터 없음
  if (!eps_y1 || !eps_y2 || !per_y1 || !per_y2) {
    return 'ERROR';
  }

  // Case 2: PER 이상치 (0 이하 또는 너무 큼)
  if (per_y1 <= 0 || per_y2 <= 0 || per_y1 > 1000 || per_y2 > 1000) {
    return 'ERROR';
  }

  // Case 3: 턴어라운드 (적자 → 흑자)
  if (eps_y1 <= 0 && eps_y2 > 0) {
    return 'TURNAROUND';
  }

  // Case 4: 적자 지속 또는 흑자 → 적자
  if (eps_y1 <= 0 || eps_y2 <= 0) {
    return 'DEFICIT';
  }

  // Case 5: 극소값 (EPS < 10원)
  if (Math.abs(eps_y1) < 10 || Math.abs(eps_y2) < 10) {
    return 'ERROR'; // 너무 작아서 비율 계산 무의미
  }

  // Case 6: 이상치 성장률 (1000% 이상)
  const growthRate = ((eps_y2 - eps_y1) / eps_y1) * 100;
  if (Math.abs(growthRate) > 1000) {
    return 'ERROR'; // 비현실적인 성장률
  }

  return 'NORMAL';
}
```

**처리 방식**:
- `NORMAL`: 계산 진행
- `TURNAROUND`: 계산 Skip, 태그만 생성 (`signal_tags = ['TURNAROUND']`)
- `DEFICIT`: 계산 Skip, 무시
- `ERROR`: 로그 남기고 Skip

### 5.3 Core Metrics Calculation

```typescript
interface Metrics {
  eps_growth_pct: number;
  per_growth_pct: number;
  fvb_score: number;
  hgs_score: number;
  rrs_score: number;
  quad_position: string;
  quad_x: number;
  quad_y: number;
}

function calculateMetrics(pair: YearPair): Metrics {
  const { eps_y1, eps_y2, per_y1, per_y2 } = pair;

  // 1. 기본 비율
  const epsRatio = eps_y2 / eps_y1;
  const perRatio = per_y2 / per_y1;

  // 2. 성장률 (%)
  const epsGrowthPct = (epsRatio - 1) * 100;
  const perGrowthPct = (perRatio - 1) * 100;

  // 3. FVB (Fundamental vs Valuation Balance)
  // ln(EPS_Ratio) - ln(PER_Ratio)
  const fvbScore = Math.log(epsRatio) - Math.log(perRatio);

  // 4. HGS (Healthy Growth Score)
  // EPS 성장률 - MAX(PER 성장률, 0)
  const hgsScore = epsGrowthPct - Math.max(perGrowthPct, 0);

  // 5. RRS (Re-Rating Risk Score)
  // PER 변화율 - MAX(EPS 성장률, 0)
  const rrsScore = perGrowthPct - Math.max(epsGrowthPct, 0);

  // 6. Quadrant 분류
  const quadPosition = classifyQuadrant(epsGrowthPct, perGrowthPct);

  return {
    eps_growth_pct: round(epsGrowthPct, 2),
    per_growth_pct: round(perGrowthPct, 2),
    fvb_score: round(fvbScore, 4),
    hgs_score: round(hgsScore, 2),
    rrs_score: round(rrsScore, 2),
    quad_position: quadPosition,
    quad_x: round(epsGrowthPct, 2),
    quad_y: round(perGrowthPct, 2),
  };
}

function classifyQuadrant(epsGrowth: number, perGrowth: number): string {
  if (epsGrowth >= 0 && perGrowth >= 0) {
    return 'Q1_GROWTH_RERATING';      // 성장 + 리레이팅
  } else if (epsGrowth >= 0 && perGrowth < 0) {
    return 'Q2_GROWTH_DERATING';      // 성장 + 디레이팅 ⭐ Target
  } else if (epsGrowth < 0 && perGrowth >= 0) {
    return 'Q3_DECLINE_RERATING';     // 역성장 + 리레이팅 (테마)
  } else {
    return 'Q4_DECLINE_DERATING';     // 역성장 + 디레이팅 (침체)
  }
}
```

### 5.4 Diff Calculation (변화량 계산)

```typescript
async function calculateDiffs(snapshotDate: Date) {
  const today = await getMetrics(snapshotDate);
  const yesterday = await getMetrics(addDays(snapshotDate, -1));
  const lastWeek = await getMetrics(addDays(snapshotDate, -7));
  const lastMonth = await getMetrics(addDays(snapshotDate, -30));

  for (const ticker of today.keys()) {
    const todayMetric = today.get(ticker);
    const yesterdayMetric = yesterday.get(ticker);
    const lastWeekMetric = lastWeek.get(ticker);
    const lastMonthMetric = lastMonth.get(ticker);

    const diff: DiffLog = {
      snapshot_date: snapshotDate,
      ticker,

      // Daily diff
      fvb_diff_d1: yesterdayMetric
        ? todayMetric.fvb_score - yesterdayMetric.fvb_score
        : null,
      hgs_diff_d1: yesterdayMetric
        ? todayMetric.hgs_score - yesterdayMetric.hgs_score
        : null,
      quad_shift_d1: yesterdayMetric
        ? `${yesterdayMetric.quad_position}->${todayMetric.quad_position}`
        : null,

      // Weekly diff
      fvb_diff_w1: lastWeekMetric
        ? todayMetric.fvb_score - lastWeekMetric.fvb_score
        : null,

      // Monthly diff
      fvb_diff_m1: lastMonthMetric
        ? todayMetric.fvb_score - lastMonthMetric.fvb_score
        : null,
      quad_shift_m1: lastMonthMetric &&
                     lastMonthMetric.quad_position !== todayMetric.quad_position
        ? `${lastMonthMetric.quad_position}->${todayMetric.quad_position}`
        : null,
    };

    await saveDiff(diff);
  }
}
```

### 5.5 Tag Generation (자동 태그 생성)

```typescript
function generateTags(metric: Metric, diff: DiffLog): string[] {
  const tags: string[] = [];

  // Tag 1: HEALTHY_DERATING (Q2 영역 + FVB 양수)
  if (metric.quad_position === 'Q2_GROWTH_DERATING' && metric.fvb_score > 0.2) {
    tags.push('HEALTHY_DERATING');
  }

  // Tag 2: STRUCTURAL_IMPROVEMENT (FVB 지속 개선)
  if (diff.fvb_diff_m1 && diff.fvb_diff_m1 > 0.1) {
    tags.push('STRUCTURAL_IMPROVEMENT');
  }

  // Tag 3: OVERHEAT_WARNING (과열)
  if (metric.rrs_score > 30) {
    tags.push('OVERHEAT_WARNING');
  }

  // Tag 4: TURNAROUND (턴어라운드)
  if (metric.calc_status === 'TURNAROUND') {
    tags.push('TURNAROUND_CANDIDATE');
  }

  // Tag 5: HIGH_GROWTH (고성장)
  if (metric.eps_growth_pct > 50 && metric.hgs_score > 30) {
    tags.push('HIGH_GROWTH');
  }

  // Tag 6: VALUE_TRAP (가치 함정 주의)
  if (metric.quad_position === 'Q4_DECLINE_DERATING' && diff.fvb_diff_m1 < -0.2) {
    tags.push('VALUE_TRAP_WARNING');
  }

  // Tag 7: MOMENTUM_SHIFT (모멘텀 전환)
  if (diff.quad_shift_d1 && diff.quad_shift_d1.includes('Q4->Q2')) {
    tags.push('MOMENTUM_SHIFT');
  }

  return tags;
}
```

---

## 6. Phase별 구현 계획

### Phase 0: 준비 단계 (1일)

**목표**: 개발 환경 정리 및 브랜치 전략

- [ ] 새 브랜치 생성: `feature/consensus-analysis`
- [ ] 문서 정리: 이 계획서를 프로젝트에 추가
- [ ] 의존성 확인: Recharts 버전, PostgreSQL 함수 지원 확인
- [ ] 테스트 데이터 준비: 샘플 종목 10개 선정

**체크포인트**: 브랜치 생성 완료, 문서 커밋

---

### Phase 1: DB 스키마 구축 (1일)

**목표**: 2개 테이블 생성 및 초기 데이터 검증

#### 1.1 SQL 스크립트 작성
```
scripts/
  migration-002-consensus-tables.sql  (테이블 생성)
  migration-002-validation.sql        (검증 쿼리)
```

#### 1.2 Supabase 실행
- SQL Editor에서 스크립트 실행
- 테이블 생성 확인
- Index 성능 확인

#### 1.3 TypeScript 타입 정의
```typescript
// lib/supabase.ts에 추가
export interface ConsensusMetricDaily {
  snapshot_date: string;
  ticker: string;
  company_id: number;
  target_y1: number;
  target_y2: number;
  calc_status: 'NORMAL' | 'TURNAROUND' | 'DEFICIT' | 'ERROR';
  eps_y1: number | null;
  eps_y2: number | null;
  per_y1: number | null;
  per_y2: number | null;
  eps_growth_pct: number | null;
  per_growth_pct: number | null;
  fvb_score: number | null;
  hgs_score: number | null;
  rrs_score: number | null;
  quad_position: string | null;
  quad_x: number | null;
  quad_y: number | null;
}

export interface ConsensusDiffLog {
  snapshot_date: string;
  ticker: string;
  company_id: number;
  fvb_diff_d1: number | null;
  hgs_diff_d1: number | null;
  quad_shift_d1: string | null;
  fvb_diff_m1: number | null;
  signal_tags: string[];
  is_overheat: boolean;
  is_target_zone: boolean;
  is_turnaround: boolean;
}
```

**체크포인트**:
- [ ] 테이블 2개 생성 확인
- [ ] Index 5개 이상 생성 확인
- [ ] TypeScript 타입 컴파일 오류 없음

---

### Phase 2: 계산 엔진 구현 (2-3일)

**목표**: 배치 스크립트로 지표 계산 로직 구현

#### 2.1 파일 구조
```
lib/
  consensus/
    calculator.ts           (핵심 계산 로직)
    edge-case-detector.ts   (예외 처리)
    tag-generator.ts        (태그 생성)
    types.ts                (공통 타입)

scripts/
  calculate-consensus.ts    (배치 실행 스크립트)
  test-calculation.ts       (테스트 스크립트)
```

#### 2.2 구현 순서
1. **calculator.ts** - 기본 계산 로직
   - `calculateMetrics()` 함수
   - `classifyQuadrant()` 함수

2. **edge-case-detector.ts** - 예외 처리
   - `detectEdgeCase()` 함수
   - 적자/턴어라운드/극소값 감지

3. **tag-generator.ts** - 태그 생성
   - 7가지 태그 로직 구현
   - 우선순위 정렬

4. **calculate-consensus.ts** - 메인 배치
   - 전체 흐름 통합
   - 에러 핸들링
   - 로깅

#### 2.3 테스트 시나리오
```typescript
// test-calculation.ts
const testCases = [
  {
    name: '정상 성장 (Q2)',
    ticker: '005930',
    eps_y1: 5000, eps_y2: 7000,  // +40%
    per_y1: 20, per_y2: 18,      // -10%
    expected: {
      quad: 'Q2_GROWTH_DERATING',
      fvb: '> 0',
      tags: ['HEALTHY_DERATING']
    }
  },
  {
    name: '턴어라운드',
    ticker: '000000',
    eps_y1: -500, eps_y2: 200,
    expected: {
      calc_status: 'TURNAROUND',
      tags: ['TURNAROUND_CANDIDATE']
    }
  },
  // ... 10개 시나리오
];
```

**체크포인트**:
- [ ] 10개 테스트 케이스 100% 통과
- [ ] Edge case 처리 확인
- [ ] 태그 생성 정확도 확인

---

### Phase 3: API 개발 (2일)

**목표**: 4개 API 엔드포인트 구현

#### 3.1 API 목록

**1. GET `/api/consensus/metrics`**
```typescript
// 메트릭 조회 (필터링, 정렬, 페이징)
interface QueryParams {
  date?: string;              // snapshot_date
  target_y1?: number;         // 2025
  target_y2?: number;         // 2026
  quad?: string[];            // ['Q2_GROWTH_DERATING']
  tags?: string[];            // ['HEALTHY_DERATING']
  min_fvb?: number;           // 0.2
  min_hgs?: number;           // 20
  sort_by?: string;           // fvb_score, hgs_score
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;             // default 50
}

interface Response {
  data: ConsensusMetricDaily[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}
```

**2. GET `/api/consensus/quadrant`**
```typescript
// 4분면 산점도용 데이터
interface Response {
  data: {
    ticker: string;
    company_name: string;
    quad_x: number;           // EPS 성장률
    quad_y: number;           // PER 변화율
    quad_position: string;
    fvb_score: number;
    hgs_score: number;
    signal_tags: string[];
  }[];
  stats: {
    q1_count: number;
    q2_count: number;
    q3_count: number;
    q4_count: number;
  };
}
```

**3. GET `/api/consensus/trends`**
```typescript
// 트렌드 분석 (변화량)
interface QueryParams {
  ticker: string;
  period?: 'D1' | 'W1' | 'M1';
}

interface Response {
  ticker: string;
  current: ConsensusMetricDaily;
  history: {
    date: string;
    fvb_score: number;
    hgs_score: number;
    rrs_score: number;
    quad_position: string;
  }[];
  diffs: ConsensusDiffLog;
}
```

**4. GET `/api/consensus/company/:ticker`**
```typescript
// 종목 상세 정보
interface Response {
  company: Company;
  latest_metric: ConsensusMetricDaily;
  history: ConsensusMetricDaily[];  // 최근 90일
  tags: string[];
  alerts: {
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'danger';
  }[];
}
```

#### 3.2 구현 예시

```typescript
// app/api/consensus/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const quad = searchParams.getAll('quad');
  const tags = searchParams.getAll('tags');
  const minFvb = parseFloat(searchParams.get('min_fvb') || '-999');
  const sortBy = searchParams.get('sort_by') || 'fvb_score';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabaseAdmin
    .from('consensus_metric_daily')
    .select(`
      *,
      companies!inner(id, name, code)
    `, { count: 'exact' })
    .eq('snapshot_date', date)
    .eq('calc_status', 'NORMAL')
    .gte('fvb_score', minFvb);

  // Quad 필터
  if (quad.length > 0) {
    query = query.in('quad_position', quad);
  }

  // 정렬
  query = query.order(sortBy, { ascending: false });

  // 페이징
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Tags 필터 (PostgreSQL Array는 클라이언트에서 필터링)
  let filteredData = data;
  if (tags.length > 0) {
    const diffQuery = await supabaseAdmin
      .from('consensus_diff_log')
      .select('ticker')
      .eq('snapshot_date', date)
      .contains('signal_tags', tags);

    const tickersWithTags = new Set(diffQuery.data?.map(d => d.ticker) || []);
    filteredData = data.filter(d => tickersWithTags.has(d.ticker));
  }

  return NextResponse.json({
    data: filteredData,
    pagination: {
      total: count || 0,
      page,
      pages: Math.ceil((count || 0) / limit),
    },
  });
}
```

**체크포인트**:
- [ ] 4개 API 모두 구현
- [ ] Postman/Thunder Client로 테스트
- [ ] 응답 속도 < 500ms
- [ ] 에러 핸들링 완료

---

### Phase 4: Frontend UI 구현 (3-4일)

**목표**: 메인 대시보드 + 종목 상세 페이지

#### 4.1 페이지 구조

```
app/
  consensus-analysis/
    page.tsx                    (메인 대시보드)
    [ticker]/
      page.tsx                  (종목 상세)

    components/
      ConsensusFilters.tsx      (필터 패널)
      ConsensusGrid.tsx         (데이터 그리드)
      QuadrantChart.tsx         (4분면 산점도)
      TrendChart.tsx            (트렌드 차트)
      TagBadge.tsx              (태그 배지)
```

#### 4.2 메인 대시보드 (page.tsx)

```tsx
'use client';

import { useState, useEffect } from 'react';
import ConsensusFilters from './components/ConsensusFilters';
import ConsensusGrid from './components/ConsensusGrid';
import QuadrantChart from './components/QuadrantChart';

export default function ConsensusAnalysisPage() {
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    quad: [],
    tags: [],
    minFvb: 0,
    sortBy: 'fvb_score',
  });

  const [data, setData] = useState([]);
  const [quadrantData, setQuadrantData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters]);

  async function fetchData() {
    setLoading(true);

    // API 호출
    const params = new URLSearchParams(filters);
    const [metricsRes, quadRes] = await Promise.all([
      fetch(`/api/consensus/metrics?${params}`),
      fetch(`/api/consensus/quadrant?date=${filters.date}`),
    ]);

    const metrics = await metricsRes.json();
    const quad = await quadRes.json();

    setData(metrics.data);
    setQuadrantData(quad.data);
    setLoading(false);
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        컨센서스 밸류에이션 분석
      </h1>

      {/* 필터 패널 */}
      <ConsensusFilters
        filters={filters}
        onFilterChange={setFilters}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* 4분면 차트 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">4분면 분석</h2>
          <QuadrantChart data={quadrantData} />
        </div>

        {/* 통계 카드 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">분포 통계</h2>
          {/* 간단한 통계 표시 */}
        </div>
      </div>

      {/* 데이터 그리드 */}
      <div className="mt-6">
        <ConsensusGrid
          data={data}
          loading={loading}
          onSort={(field) => setFilters({...filters, sortBy: field})}
        />
      </div>
    </div>
  );
}
```

#### 4.3 QuadrantChart 컴포넌트

```tsx
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface QuadrantChartProps {
  data: {
    ticker: string;
    quad_x: number;
    quad_y: number;
    quad_position: string;
    hgs_score: number;
  }[];
}

export default function QuadrantChart({ data }: QuadrantChartProps) {
  const getColor = (quad: string) => {
    switch (quad) {
      case 'Q1_GROWTH_RERATING': return '#fbbf24';    // 노랑
      case 'Q2_GROWTH_DERATING': return '#10b981';    // 초록 (Target)
      case 'Q3_DECLINE_RERATING': return '#f59e0b';   // 주황
      case 'Q4_DECLINE_DERATING': return '#ef4444';   // 빨강
      default: return '#6b7280';
    }
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />

        {/* X축: EPS 성장률 */}
        <XAxis
          type="number"
          dataKey="quad_x"
          name="EPS 성장률"
          unit="%"
          domain={[-50, 100]}
        />

        {/* Y축: PER 변화율 */}
        <YAxis
          type="number"
          dataKey="quad_y"
          name="PER 변화율"
          unit="%"
          domain={[-50, 100]}
        />

        {/* 기준선 (0,0) */}
        <ReferenceLine x={0} stroke="#9ca3af" strokeDasharray="3 3" />
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />

        {/* Q2 영역 강조 (우하단) */}
        <rect
          x="50%"
          y="50%"
          width="50%"
          height="50%"
          fill="#d1fae5"
          opacity={0.3}
        />

        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-white p-3 border rounded shadow-lg">
                  <p className="font-bold">{data.ticker}</p>
                  <p>EPS 성장률: {data.quad_x.toFixed(1)}%</p>
                  <p>PER 변화율: {data.quad_y.toFixed(1)}%</p>
                  <p>HGS: {data.hgs_score.toFixed(1)}</p>
                </div>
              );
            }
            return null;
          }}
        />

        <Scatter data={data} fill="#8884d8">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getColor(entry.quad_position)}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
```

#### 4.4 ConsensusGrid 컴포넌트

```tsx
interface ConsensusGridProps {
  data: any[];
  loading: boolean;
  onSort: (field: string) => void;
}

export default function ConsensusGrid({ data, loading, onSort }: ConsensusGridProps) {
  if (loading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              종목명
            </th>
            <th
              className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('eps_growth_pct')}
            >
              EPS 성장률
            </th>
            <th
              className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('per_growth_pct')}
            >
              PER 변화율
            </th>
            <th
              className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('fvb_score')}
            >
              FVB
            </th>
            <th
              className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('hgs_score')}
            >
              HGS
            </th>
            <th className="px-6 py-3 text-center">
              4분면
            </th>
            <th className="px-6 py-3 text-center">
              태그
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row) => (
            <tr
              key={row.ticker}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => window.location.href = `/consensus-analysis/${row.ticker}`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">
                  {row.companies?.name}
                </div>
                <div className="text-sm text-gray-500">
                  {row.ticker}
                </div>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className={row.eps_growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {row.eps_growth_pct?.toFixed(1)}%
                </span>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className={row.per_growth_pct >= 0 ? 'text-red-600' : 'text-green-600'}>
                  {row.per_growth_pct?.toFixed(1)}%
                </span>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end">
                  <div
                    className="h-2 rounded mr-2"
                    style={{
                      width: `${Math.min(Math.abs(row.fvb_score) * 50, 100)}px`,
                      backgroundColor: row.fvb_score > 0 ? '#10b981' : '#ef4444'
                    }}
                  />
                  {row.fvb_score?.toFixed(2)}
                </div>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className={row.hgs_score > 20 ? 'font-bold text-green-600' : ''}>
                  {row.hgs_score?.toFixed(1)}
                </span>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  row.quad_position === 'Q2_GROWTH_DERATING'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {row.quad_position?.replace('_', ' ')}
                </span>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-center">
                {/* 태그는 별도 조회 필요 */}
                <span className="text-sm text-gray-500">-</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**체크포인트**:
- [ ] 메인 페이지 렌더링 확인
- [ ] 4분면 차트 정상 작동
- [ ] 필터 기능 정상 작동
- [ ] 모바일 반응형 확인
- [ ] 성능 테스트 (50개 종목 렌더링 < 1초)

---

### Phase 5: 배치 자동화 (1일)

**목표**: 매일 자동 실행되는 배치 작업 설정

#### 5.1 Vercel Cron Job 설정

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-consensus",
      "schedule": "0 3 * * *"  // 매일 새벽 3시 (KST 12시)
    }
  ]
}
```

```typescript
// app/api/cron/daily-consensus/route.ts
import { NextResponse } from 'next/server';
import { scrapeAllCompanies } from '@/lib/scraper-naver';
import { calculateConsensusMetrics } from '@/lib/consensus/calculator';

export async function GET(request: Request) {
  // Vercel Cron Secret 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();

    // Step 1: Naver 스크래핑
    console.log('[Cron] Starting Naver scraping...');
    const scrapeResults = await scrapeAllCompanies();
    console.log(`[Cron] Scraped ${scrapeResults.length} companies`);

    // Step 2: 컨센서스 지표 계산
    console.log('[Cron] Calculating consensus metrics...');
    const today = new Date().toISOString().split('T')[0];
    const calcResults = await calculateConsensusMetrics(today);
    console.log(`[Cron] Calculated ${calcResults.success_count} metrics`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      scrape_count: scrapeResults.length,
      calc_count: calcResults.success_count,
      elapsed_seconds: elapsed,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cron] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

#### 5.2 수동 실행 스크립트

```bash
# scripts/run-daily-batch.sh
#!/bin/bash

echo "🚀 Daily Consensus Batch 시작"
echo "날짜: $(date)"

# 1. Naver 스크래핑
echo "📊 Step 1: Naver 스크래핑..."
npx tsx -r dotenv/config scripts/scrape-all-companies.ts dotenv_config_path=.env.local

# 2. 컨센서스 계산
echo "🧮 Step 2: 지표 계산..."
npx tsx -r dotenv/config scripts/calculate-consensus.ts dotenv_config_path=.env.local

echo "✅ 배치 완료"
```

**체크포인트**:
- [ ] Vercel Cron 설정 완료
- [ ] 수동 실행 스크립트 테스트
- [ ] 실행 시간 < 10분
- [ ] 에러 알림 설정

---

### Phase 6: 테스트 & 최적화 (2일)

**목표**: 전체 시스템 통합 테스트 및 성능 최적화

#### 6.1 테스트 체크리스트

**단위 테스트**:
- [ ] calculator.ts 함수별 테스트
- [ ] edge-case-detector.ts 10가지 시나리오
- [ ] tag-generator.ts 7가지 태그 로직

**통합 테스트**:
- [ ] 배치 실행 → DB 저장 → API 조회 → Frontend 렌더링
- [ ] 100개 종목 전체 흐름 테스트
- [ ] 에러 복구 시나리오

**성능 테스트**:
- [ ] API 응답 속도 < 500ms
- [ ] 4분면 차트 렌더링 < 1초
- [ ] 배치 실행 시간 < 10분

#### 6.2 최적화 포인트

**DB 최적화**:
```sql
-- Materialized View (선택적)
CREATE MATERIALIZED VIEW consensus_summary AS
SELECT
  snapshot_date,
  quad_position,
  COUNT(*) as count,
  AVG(fvb_score) as avg_fvb,
  AVG(hgs_score) as avg_hgs
FROM consensus_metric_daily
WHERE calc_status = 'NORMAL'
GROUP BY snapshot_date, quad_position;

-- 자동 REFRESH (매일 배치 후)
REFRESH MATERIALIZED VIEW consensus_summary;
```

**API 캐싱**:
```typescript
// Next.js Route Handler Caching
export const revalidate = 3600; // 1시간 캐싱
```

**Frontend 최적화**:
- React.memo() 적용
- useMemo() for 차트 데이터
- Virtual Scrolling for 큰 그리드

**체크포인트**:
- [ ] 모든 테스트 통과
- [ ] 성능 목표 달성
- [ ] 에러율 < 1%

---

## 7. API 설계

### 7.1 API 엔드포인트 요약

| Method | Endpoint | 설명 | 응답 속도 목표 |
|--------|----------|------|----------------|
| GET | `/api/consensus/metrics` | 메트릭 조회 (필터링) | < 500ms |
| GET | `/api/consensus/quadrant` | 4분면 데이터 | < 300ms |
| GET | `/api/consensus/trends` | 트렌드 분석 | < 400ms |
| GET | `/api/consensus/company/:ticker` | 종목 상세 | < 600ms |
| GET | `/api/cron/daily-consensus` | 배치 실행 | < 10분 |

### 7.2 에러 응답 포맷

```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Example
{
  "error": "Invalid date format",
  "code": "INVALID_PARAM",
  "details": { "param": "date", "value": "2024-13-01" },
  "timestamp": "2024-11-19T10:30:00Z"
}
```

---

## 8. UI/UX 설계

### 8.1 정보 아키텍처

```
홈페이지
  ├─ 기존 페이지들
  └─ 컨센서스 분석 (NEW)
      ├─ 메인 대시보드
      │   ├─ 필터 패널
      │   ├─ 4분면 차트
      │   ├─ 통계 카드
      │   └─ 데이터 그리드
      └─ 종목 상세
          ├─ 기본 정보
          ├─ 트렌드 차트
          ├─ 주가 오버레이
          └─ 태그 히스토리
```

### 8.2 색상 체계

```css
/* Q1: 성장+리레이팅 */
--q1-color: #fbbf24;  /* 노랑 */

/* Q2: 성장+디레이팅 (Target) */
--q2-color: #10b981;  /* 초록 */
--q2-bg: #d1fae5;     /* 연한 초록 (배경) */

/* Q3: 역성장+리레이팅 */
--q3-color: #f59e0b;  /* 주황 */

/* Q4: 역성장+디레이팅 */
--q4-color: #ef4444;  /* 빨강 */

/* 태그 */
--tag-healthy: #10b981;
--tag-turnaround: #3b82f6;
--tag-overheat: #ef4444;
```

### 8.3 반응형 디자인

- **Desktop**: 4분면 차트 + 그리드 2열
- **Tablet**: 차트 1열, 그리드 1열
- **Mobile**: 차트 스크롤, 그리드 카드형

---

## 9. 테스트 전략

### 9.1 테스트 피라미드

```
       ┌─────────┐
       │  E2E    │  (10%)  - Playwright
       ├─────────┤
       │ Integr. │  (30%)  - API Tests
       ├─────────┤
       │  Unit   │  (60%)  - Jest
       └─────────┘
```

### 9.2 주요 테스트 케이스

**Edge Cases** (우선순위 높음):
1. 적자 종목 (EPS < 0)
2. 턴어라운드 (EPS: - → +)
3. 극소값 (EPS < 10원)
4. PER 이상치 (> 1000배)
5. NULL 데이터
6. 성장률 1000% 이상

**정상 케이스**:
1. Q1-Q4 각 분면별 계산
2. FVB, HGS, RRS 경계값
3. 태그 생성 로직
4. 변화량 계산

---

## 10. 위험 요소 및 대응

### 10.1 기술적 위험

| 위험 | 영향도 | 발생확률 | 대응 전략 |
|------|--------|----------|-----------|
| Naver API 차단 | 높음 | 중간 | Rate limiting, IP 분산 |
| 배치 실행 시간 초과 | 중간 | 낮음 | 병렬 처리, 청크 분할 |
| DB 성능 저하 | 중간 | 중간 | Index 최적화, Materialized View |
| Frontend 렌더링 느림 | 낮음 | 낮음 | Virtual Scrolling, Pagination |

### 10.2 비즈니스 위험

| 위험 | 대응 |
|------|------|
| 지표 해석 오류 | 명확한 문서화, 샘플 케이스 제공 |
| 사용자 혼란 | 온보딩 가이드, 툴팁 |
| 데이터 신뢰성 | 원본 데이터 보관, 계산 로직 투명화 |

---

## 11. 구현 타임라인

### 전체 일정: **10-12일**

```
Week 1 (Day 1-5):
  Day 1: Phase 0 (준비)
  Day 2: Phase 1 (DB 스키마)
  Day 3-4: Phase 2 (계산 엔진)
  Day 5: Phase 3 시작 (API 개발)

Week 2 (Day 6-10):
  Day 6: Phase 3 완료 (API)
  Day 7-9: Phase 4 (Frontend)
  Day 10: Phase 5 (배치 자동화)

Week 3 (Day 11-12):
  Day 11-12: Phase 6 (테스트 & 최적화)

배포: Day 13
```

### 체크포인트 (Milestone)

- **M1** (Day 2): DB 스키마 생성 완료
- **M2** (Day 4): 계산 로직 10개 테스트 통과
- **M3** (Day 6): API 4개 모두 작동
- **M4** (Day 9): 메인 대시보드 렌더링 성공
- **M5** (Day 12): 전체 통합 테스트 통과
- **M6** (Day 13): Production 배포

---

## 12. 성공 지표 (KPI)

### 기술 지표
- [ ] 배치 성공률 > 99%
- [ ] API 응답 속도 < 500ms
- [ ] Frontend 렌더링 < 1초
- [ ] 데이터 정확도 100%

### 비즈니스 지표
- [ ] 일일 활성 사용자 > 50명
- [ ] 평균 세션 시간 > 5분
- [ ] Q2 종목 발굴 > 10개/일

---

## 13. 참고 자료

### 문서
- 원본 요구사항: `C:\Users\nebad\Downloads\개발자에게 전달할.docx`
- DB 설계: `scripts/migration-002-consensus-tables.sql`
- API 명세: Swagger/OpenAPI (추후 생성)

### 코드 베이스
- 기존 스크래퍼: `lib/scraper-naver.ts`
- 기존 DB: `lib/supabase.ts`
- 기존 차트: `app/stock-comparison/page.tsx` (Recharts 사용 예시)

---

## 부록 A: 샘플 데이터

### 테스트용 종목 10개

| 종목코드 | 종목명 | EPS 2025 | EPS 2026 | PER 2025 | PER 2026 | 예상 Quad |
|----------|--------|----------|----------|----------|----------|-----------|
| 005930 | 삼성전자 | 5000 | 7000 | 20 | 18 | Q2 |
| 000660 | SK하이닉스 | 3000 | 4500 | 15 | 16 | Q1 |
| 035420 | NAVER | 2000 | 2200 | 30 | 25 | Q2 |
| 005380 | 현대차 | 8000 | 9000 | 8 | 7 | Q2 |
| 051910 | LG화학 | 5000 | 6000 | 12 | 14 | Q1 |
| 006400 | 삼성SDI | -500 | 200 | N/A | 25 | TURNAROUND |
| 068270 | 셀트리온 | 3000 | 2800 | 20 | 22 | Q3 |
| 035720 | 카카오 | 1000 | 800 | 40 | 35 | Q4 |
| 028260 | 삼성물산 | 5000 | 5500 | 10 | 15 | Q1 |
| 000270 | 기아 | 7000 | 8000 | 6 | 5 | Q2 |

---

## 부록 B: SQL 샘플 쿼리

### 유용한 쿼리 모음

```sql
-- 1. Q2 영역 종목 조회 (찐성장)
SELECT
  c.name,
  cmd.ticker,
  cmd.eps_growth_pct,
  cmd.per_growth_pct,
  cmd.fvb_score,
  cmd.hgs_score
FROM consensus_metric_daily cmd
JOIN companies c ON cmd.company_id = c.id
WHERE cmd.snapshot_date = CURRENT_DATE
  AND cmd.quad_position = 'Q2_GROWTH_DERATING'
  AND cmd.fvb_score > 0.2
ORDER BY cmd.hgs_score DESC
LIMIT 20;

-- 2. 턴어라운드 종목 조회
SELECT
  c.name,
  cmd.ticker,
  cmd.eps_y1,
  cmd.eps_y2
FROM consensus_metric_daily cmd
JOIN companies c ON cmd.company_id = c.id
WHERE cmd.snapshot_date = CURRENT_DATE
  AND cmd.calc_status = 'TURNAROUND'
ORDER BY cmd.eps_y2 DESC;

-- 3. FVB 개선 종목 (1개월 대비)
SELECT
  c.name,
  cmd.ticker,
  cmd.fvb_score as current_fvb,
  cdl.fvb_diff_m1 as fvb_change
FROM consensus_metric_daily cmd
JOIN companies c ON cmd.company_id = c.id
JOIN consensus_diff_log cdl ON
  cmd.snapshot_date = cdl.snapshot_date AND
  cmd.ticker = cdl.ticker
WHERE cmd.snapshot_date = CURRENT_DATE
  AND cdl.fvb_diff_m1 > 0.1
ORDER BY cdl.fvb_diff_m1 DESC
LIMIT 20;

-- 4. 과열 경고 종목 (RRS > 30)
SELECT
  c.name,
  cmd.ticker,
  cmd.eps_growth_pct,
  cmd.per_growth_pct,
  cmd.rrs_score
FROM consensus_metric_daily cmd
JOIN companies c ON cmd.company_id = c.id
JOIN consensus_diff_log cdl ON
  cmd.snapshot_date = cdl.snapshot_date AND
  cmd.ticker = cdl.ticker
WHERE cmd.snapshot_date = CURRENT_DATE
  AND cdl.is_overheat = true
ORDER BY cmd.rrs_score DESC;

-- 5. 4분면 분포 통계
SELECT
  quad_position,
  COUNT(*) as count,
  AVG(fvb_score) as avg_fvb,
  AVG(hgs_score) as avg_hgs,
  AVG(rrs_score) as avg_rrs
FROM consensus_metric_daily
WHERE snapshot_date = CURRENT_DATE
  AND calc_status = 'NORMAL'
GROUP BY quad_position
ORDER BY count DESC;
```

---

**문서 버전**: 1.0
**최종 수정**: 2025-11-19
**작성자**: Claude Code AI
**승인**: 대기 중
