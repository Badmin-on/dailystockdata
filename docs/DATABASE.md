# 💾 Database Schema & Design

YoonStock Pro의 데이터베이스 구조, Materialized Views, 인덱스 전략을 설명합니다.

## 📋 Database Overview

- **Database**: Supabase PostgreSQL 15.x
- **Region**: ap-northeast-2 (Seoul)
- **Storage**: ~500MB (Free Tier)
- **Total Records**: ~132,000+ rows
- **Tables**: 3개 (companies, financial_data, daily_stock_prices)
- **Materialized Views**: 2개 (mv_consensus_changes, mv_stock_analysis)
- **Normal Views**: 1개 (v_investment_opportunities)

## 🗂️ Table Schemas

### 1. companies (기업 정보)

**Purpose**: KOSPI/KOSDAQ 상장 기업의 기본 정보 저장

```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,  -- 종목코드 (예: 005930)
    name VARCHAR(100) NOT NULL,        -- 회사명 (예: 삼성전자)
    market VARCHAR(20),                -- 시장구분 (KOSPI/KOSDAQ)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_companies_market ON companies(market);
```

**Sample Data**:
```
id  | code   | name       | market
----|--------|------------|--------
1   | 005930 | 삼성전자   | KOSPI
2   | 000660 | SK하이닉스 | KOSPI
3   | 035720 | 카카오     | KOSDAQ
```

**Record Count**: 1,131개 (KOSPI 500 + KOSDAQ 500 + α)

### 2. financial_data (재무제표)

**Purpose**: FnGuide에서 수집한 재무 데이터 (매출액, 영업이익)

```sql
CREATE TABLE financial_data (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,              -- 연도 (2024-2027)
    quarter VARCHAR(2),                 -- 분기 (Q1/Q2/Q3/Q4 또는 NULL)
    revenue BIGINT,                     -- 매출액 (원 단위)
    operating_profit BIGINT,            -- 영업이익 (원 단위)
    is_estimate BOOLEAN DEFAULT FALSE,  -- 추정치 여부
    collected_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, year, quarter)
);

-- Indexes
CREATE INDEX idx_financial_company_year ON financial_data(company_id, year);
CREATE INDEX idx_financial_year ON financial_data(year);
CREATE INDEX idx_financial_estimate ON financial_data(is_estimate);
```

**Sample Data**:
```
company_id | year | quarter | revenue      | operating_profit | is_estimate
-----------|------|---------|--------------|------------------|------------
1          | 2024 | NULL    | 2580000000000| 305000000000    | FALSE
1          | 2025 | NULL    | 2750000000000| 350000000000    | TRUE
1          | 2026 | NULL    | 2900000000000| 380000000000    | TRUE
```

**Record Count**: ~131,674개
**Data Range**: 2024-2027년 (4개년)
**Unit Conversion**: FnGuide 억원 → DB 원 단위 (×100,000,000)

### 3. daily_stock_prices (일별 주가)

**Purpose**: 네이버 금융에서 수집한 일별 주가 데이터

```sql
CREATE TABLE daily_stock_prices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,                 -- 거래일 (YYYY-MM-DD)
    close_price NUMERIC(12, 2),         -- 종가
    change_rate NUMERIC(10, 2),         -- 변동률 (%)
    volume BIGINT,                      -- 거래량
    collected_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, date)
);

-- Indexes
CREATE INDEX idx_stock_prices_company_date ON daily_stock_prices(company_id, date DESC);
CREATE INDEX idx_stock_prices_date ON daily_stock_prices(date DESC);
```

**Sample Data**:
```
company_id | date       | close_price | change_rate | volume
-----------|------------|-------------|-------------|--------
1          | 2025-11-05 | 71500.00    | -1.38       | 8234567
1          | 2025-11-04 | 72500.00    | +2.11       | 9876543
```

**Record Count**: ~120,000+ (120일 × 1,000 기업)
**Update Frequency**: 매일 오후 7:00 KST (GitHub Actions)

## 🔄 Materialized Views

Materialized Views는 복잡한 계산을 미리 수행하여 캐시에 저장함으로써 API 응답 속도를 5-10배 향상시킵니다.

### 1. mv_consensus_changes (컨센서스 변화 분석)

**Purpose**: 재무 컨센서스의 전일/1개월/3개월/1년 대비 변화율 계산

```sql
CREATE MATERIALIZED VIEW mv_consensus_changes AS
WITH latest_data AS (
    SELECT
        f.company_id,
        c.code,
        c.name,
        f.year,
        f.revenue,
        f.operating_profit,
        f.collected_at,
        ROW_NUMBER() OVER (PARTITION BY f.company_id ORDER BY f.collected_at DESC) as rn
    FROM financial_data f
    JOIN companies c ON f.company_id = c.id
    WHERE f.is_estimate = TRUE  -- 추정치만 사용
),
changes AS (
    SELECT
        company_id,
        code,
        name,
        year,
        revenue,
        operating_profit,
        collected_at,

        -- 전일 대비 증감률
        LAG(revenue, 1) OVER (PARTITION BY company_id ORDER BY collected_at) as prev_day_revenue,
        LAG(operating_profit, 1) OVER (PARTITION BY company_id ORDER BY collected_at) as prev_day_op,

        -- 1개월 전 대비 증감률 (30일)
        LAG(revenue, 30) OVER (PARTITION BY company_id ORDER BY collected_at) as prev_month_revenue,
        LAG(operating_profit, 30) OVER (PARTITION BY company_id ORDER BY collected_at) as prev_month_op,

        -- 3개월 전 대비 증감률 (90일)
        LAG(revenue, 90) OVER (PARTITION BY company_id ORDER BY collected_at) as prev_3month_revenue,
        LAG(operating_profit, 90) OVER (PARTITION BY company_id ORDER BY collected_at) as prev_3month_op,

        -- 1년 전 대비 증감률 (365일)
        LAG(revenue, 365) OVER (PARTITION BY company_id ORDER BY collected_at) as prev_year_revenue,
        LAG(operating_profit, 365) OVER (PARTITION BY company_id ORDER BY collected_at) as prev_year_op
    FROM latest_data
    WHERE rn = 1  -- 최신 데이터만
)
SELECT
    company_id,
    code,
    name,
    year,
    revenue,
    operating_profit,

    -- 전일 대비 변화율 (%)
    ROUND((revenue - prev_day_revenue) * 100.0 / NULLIF(prev_day_revenue, 0), 2) as revenue_change_1d,
    ROUND((operating_profit - prev_day_op) * 100.0 / NULLIF(prev_day_op, 0), 2) as op_change_1d,

    -- 1개월 대비 변화율 (%)
    ROUND((revenue - prev_month_revenue) * 100.0 / NULLIF(prev_month_revenue, 0), 2) as revenue_change_1m,
    ROUND((operating_profit - prev_month_op) * 100.0 / NULLIF(prev_month_op, 0), 2) as op_change_1m,

    -- 3개월 대비 변화율 (%)
    ROUND((revenue - prev_3month_revenue) * 100.0 / NULLIF(prev_3month_revenue, 0), 2) as revenue_change_3m,
    ROUND((operating_profit - prev_3month_op) * 100.0 / NULLIF(prev_3month_op, 0), 2) as op_change_3m,

    -- 1년 대비 변화율 (%)
    ROUND((revenue - prev_year_revenue) * 100.0 / NULLIF(prev_year_revenue, 0), 2) as revenue_change_1y,
    ROUND((operating_profit - prev_year_op) * 100.0 / NULLIF(prev_year_op, 0), 2) as op_change_1y,

    collected_at
FROM changes;

-- Indexes for faster queries
CREATE INDEX idx_mv_consensus_company ON mv_consensus_changes(company_id);
CREATE INDEX idx_mv_consensus_changes ON mv_consensus_changes(revenue_change_1m DESC, op_change_1m DESC);
```

**Refresh Strategy**: GitHub Actions에서 매일 오전 7시 (FnGuide 수집 후)

**Performance Impact**:
- Without MV: ~5-10초 (LAG 연산 실시간 계산)
- With MV: <1초 (미리 계산된 결과 조회)

### 2. mv_stock_analysis (주가 분석)

**Purpose**: 120일 이동평균선, 이격도, 52주 최고/최저가 계산

```sql
CREATE MATERIALIZED VIEW mv_stock_analysis AS
WITH stock_ma AS (
    SELECT
        dsp.company_id,
        c.code,
        c.name,
        dsp.date,
        dsp.close_price,
        dsp.change_rate,
        dsp.volume,

        -- 120일 이동평균선
        AVG(dsp.close_price) OVER (
            PARTITION BY dsp.company_id
            ORDER BY dsp.date
            ROWS BETWEEN 119 PRECEDING AND CURRENT ROW
        ) as ma_120,

        -- 52주 최고가
        MAX(dsp.close_price) OVER (
            PARTITION BY dsp.company_id
            ORDER BY dsp.date
            ROWS BETWEEN 364 PRECEDING AND CURRENT ROW
        ) as week_52_high,

        -- 52주 최저가
        MIN(dsp.close_price) OVER (
            PARTITION BY dsp.company_id
            ORDER BY dsp.date
            ROWS BETWEEN 364 PRECEDING AND CURRENT ROW
        ) as week_52_low,

        ROW_NUMBER() OVER (PARTITION BY dsp.company_id ORDER BY dsp.date DESC) as rn
    FROM daily_stock_prices dsp
    JOIN companies c ON dsp.company_id = c.id
)
SELECT
    company_id,
    code,
    name,
    date,
    close_price,
    change_rate,
    volume,
    ma_120,

    -- 이격도 (%) = (현재가 - 120일 이평선) / 120일 이평선 × 100
    ROUND((close_price - ma_120) * 100.0 / NULLIF(ma_120, 0), 2) as divergence_rate,

    week_52_high,
    week_52_low,

    -- 52주 최고가 대비 현재 위치 (%)
    ROUND((close_price - week_52_low) * 100.0 / NULLIF(week_52_high - week_52_low, 0), 2) as position_in_52w_range
FROM stock_ma
WHERE rn = 1;  -- 최신 데이터만

-- Indexes
CREATE INDEX idx_mv_stock_company ON mv_stock_analysis(company_id);
CREATE INDEX idx_mv_stock_divergence ON mv_stock_analysis(divergence_rate);
```

**Refresh Strategy**: GitHub Actions에서 매일 오후 7시 (주가 수집 후)

**Performance Impact**:
- Without MV: ~3-5초 (Window Function 실시간 계산)
- With MV: <1초 (미리 계산된 결과 조회)

## 👁️ Normal Views

### v_investment_opportunities (투자 기회 발굴)

**Purpose**: 컨센서스 변화 + 주가 이격도 기반 투자 점수 계산

```sql
CREATE VIEW v_investment_opportunities AS
WITH scored_opportunities AS (
    SELECT
        c.company_id,
        c.code,
        c.name,
        c.year,

        -- 재무 데이터
        c.revenue,
        c.operating_profit,
        c.revenue_change_1m,
        c.op_change_1m,
        c.revenue_change_3m,
        c.op_change_3m,

        -- 주가 데이터
        s.close_price,
        s.change_rate,
        s.ma_120,
        s.divergence_rate,
        s.week_52_high,
        s.week_52_low,
        s.position_in_52w_range,

        -- 투자 점수 계산 (컨센서스 60% + 이격도 40%)
        ROUND(
            (
                -- 컨센서스 점수 (60%)
                (COALESCE(c.revenue_change_1m, 0) * 0.3 +
                 COALESCE(c.op_change_1m, 0) * 0.3) * 0.6
                +
                -- 이격도 점수 (40%) - 저평가일수록 높은 점수
                (CASE
                    WHEN s.divergence_rate < -10 THEN 40  -- 매우 저평가
                    WHEN s.divergence_rate < 0 THEN 30    -- 저평가
                    WHEN s.divergence_rate < 5 THEN 20    -- 적정가
                    WHEN s.divergence_rate < 15 THEN 10   -- 고평가
                    ELSE 0                                 -- 과열
                END)
            ), 2
        ) as investment_score,

        c.collected_at as last_updated
    FROM mv_consensus_changes c
    LEFT JOIN mv_stock_analysis s ON c.company_id = s.company_id
    WHERE c.year >= EXTRACT(YEAR FROM CURRENT_DATE)  -- 🔥 동적 년도 필터 (매년 자동 업데이트)
)
SELECT
    company_id,
    code,
    name,
    year,
    revenue,
    operating_profit,
    revenue_change_1m,
    op_change_1m,
    revenue_change_3m,
    op_change_3m,
    close_price,
    change_rate,
    ma_120,
    divergence_rate,
    week_52_high,
    week_52_low,
    position_in_52w_range,
    investment_score,

    -- 투자 등급 (S/A/B/C)
    CASE
        WHEN investment_score >= 80 THEN 'S'
        WHEN investment_score >= 70 THEN 'A'
        WHEN investment_score >= 60 THEN 'B'
        ELSE 'C'
    END as investment_grade,

    last_updated
FROM scored_opportunities
ORDER BY investment_score DESC;
```

**Performance**: Sub-second (Materialized Views 덕분에 빠른 JOIN)

**Dynamic Year Filter**:
- 현재: `year >= EXTRACT(YEAR FROM CURRENT_DATE)` (2025년이면 2025 이상만 표시)
- 2026년: 자동으로 2026 이상만 표시
- 2027년: 자동으로 2027 이상만 표시
- **매년 1월 1일 0시에 자동으로 필터가 업데이트됩니다** (수동 작업 불필요)

## 🔧 Maintenance Operations

### Refreshing Materialized Views

**Manual Refresh** (Supabase SQL Editor):
```sql
REFRESH MATERIALIZED VIEW mv_consensus_changes;
REFRESH MATERIALIZED VIEW mv_stock_analysis;
```

**Automated Refresh** (GitHub Actions):
```bash
psql "postgresql://postgres:${SUPABASE_SERVICE_KEY}@db.${DB_HOST}:5432/postgres" \
  -c "REFRESH MATERIALIZED VIEW mv_consensus_changes;" \
  -c "REFRESH MATERIALIZED VIEW mv_stock_analysis;"
```

**Refresh Timing**:
- `mv_consensus_changes`: 매일 오전 7:30 KST (FnGuide 수집 후)
- `mv_stock_analysis`: 매일 오후 7:30 KST (주가 수집 후)

### Checking View Freshness

```sql
-- 마지막 갱신 시간 확인
SELECT
    schemaname,
    matviewname,
    last_refresh
FROM pg_matviews
WHERE matviewname IN ('mv_consensus_changes', 'mv_stock_analysis');
```

### Data Cleanup

```sql
-- 120일 이상 오래된 주가 데이터 삭제 (선택사항)
DELETE FROM daily_stock_prices
WHERE date < NOW() - INTERVAL '120 days';

-- 오래된 재무 데이터 아카이빙 (선택사항)
-- 현재는 4개년만 유지하므로 불필요
```

## 📊 Query Patterns

### Common Queries

**1. 특정 기업의 최신 투자 점수 조회**:
```sql
SELECT * FROM v_investment_opportunities
WHERE code = '005930'
LIMIT 1;
```

**2. S급 투자 기회 목록**:
```sql
SELECT * FROM v_investment_opportunities
WHERE investment_grade = 'S'
ORDER BY investment_score DESC
LIMIT 20;
```

**3. 컨센서스 급상승 기업 (1개월 대비)**:
```sql
SELECT * FROM mv_consensus_changes
WHERE revenue_change_1m > 10 OR op_change_1m > 10
ORDER BY op_change_1m DESC
LIMIT 20;
```

**4. 저평가 주식 (이격도 -10% 이하)**:
```sql
SELECT * FROM mv_stock_analysis
WHERE divergence_rate < -10
ORDER BY divergence_rate ASC
LIMIT 20;
```

**5. 특정 기업의 120일 주가 차트 데이터**:
```sql
SELECT date, close_price, change_rate, volume
FROM daily_stock_prices
WHERE company_id = (SELECT id FROM companies WHERE code = '005930')
ORDER BY date DESC
LIMIT 120;
```

## 🔐 Security & Access Control

### Row Level Security (RLS)

**Current Status**: Disabled (공개 데이터)

**Future Consideration**: 사용자 인증 추가 시 RLS 활성화
```sql
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stock_prices ENABLE ROW LEVEL SECURITY;

-- 예시: 공개 읽기 정책
CREATE POLICY "Public read access" ON financial_data
FOR SELECT USING (true);
```

### Connection Security

- **SSL**: Enforced by default (Supabase)
- **Connection String**: `sslmode=require`
- **API Keys**: Environment variables로 관리

## 📈 Performance Optimization

### Index Strategy

**Primary Keys**: 자동 인덱스 (SERIAL)
**Foreign Keys**: 자동 인덱스 (REFERENCES)
**Custom Indexes**:
- `companies.code` (UNIQUE) - 종목코드 검색
- `daily_stock_prices(company_id, date DESC)` - 최신 주가 조회
- `financial_data(company_id, year)` - 연도별 재무 조회

### Query Optimization Tips

1. **Materialized Views 활용**: 복잡한 계산은 MV에서 미리 수행
2. **인덱스 활용**: WHERE 절에 인덱스 컬럼 사용
3. **LIMIT 사용**: 대량 데이터 조회 시 페이지네이션
4. **Date Range**: 최근 데이터만 조회 (`date > NOW() - INTERVAL '120 days'`)

### Monitoring Queries

```sql
-- 테이블 크기 확인
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 인덱스 사용률 확인
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 🚨 Common Issues

### Issue 1: Stale Data in Views
**Symptom**: Website shows old data despite new data in raw tables
**Cause**: Materialized Views not refreshed
**Solution**: Run `REFRESH MATERIALIZED VIEW` or wait for GitHub Actions

### Issue 2: Slow Query Performance
**Symptom**: API responses take >3 seconds
**Cause**: Missing Materialized Views or indexes
**Solution**: Ensure MVs are created and refreshed regularly

### Issue 3: Duplicate Key Errors
**Symptom**: `ERROR: duplicate key value violates unique constraint`
**Cause**: Scraper trying to insert data that already exists
**Solution**: Use `UPSERT` (INSERT ... ON CONFLICT) instead of INSERT
