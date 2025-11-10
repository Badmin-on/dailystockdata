-- ================================================================
-- MASTER SCRIPT: Add 1D and 1Y Support to Investment Opportunities
-- ================================================================
-- This script:
-- 1. Updates mv_consensus_changes to calculate 1D and 1Y changes
-- 2. Updates v_investment_opportunities to expose 1D and 1Y columns
-- ================================================================

-- ================== STEP 1: Update mv_consensus_changes ==================

SELECT '🔄 Step 1: Updating mv_consensus_changes with 1D and 1Y columns...' as status;

DROP MATERIALIZED VIEW IF EXISTS mv_consensus_changes CASCADE;

CREATE MATERIALIZED VIEW mv_consensus_changes AS
WITH latest_date AS (
  SELECT MAX(scrape_date) as max_date
  FROM financial_data
),
all_dates AS (
  -- Get all unique scrape dates ordered descending
  SELECT DISTINCT scrape_date
  FROM financial_data
  ORDER BY scrape_date DESC
),
date_references AS (
  SELECT
    (SELECT max_date FROM latest_date) as current_date,
    -- 1D: Second most recent date
    (SELECT scrape_date FROM all_dates OFFSET 1 LIMIT 1) as prev_day,
    -- 1M: Find closest to 30 days ago (within ±7 days)
    (
      SELECT scrape_date
      FROM all_dates
      WHERE scrape_date <= (SELECT max_date FROM latest_date) - INTERVAL '30 days'
        AND scrape_date >= (SELECT max_date FROM latest_date) - INTERVAL '37 days'
      ORDER BY scrape_date DESC
      LIMIT 1
    ) as one_month_ago,
    -- 1Y: Find closest to 360 days ago (within ±14 days)
    (
      SELECT scrape_date
      FROM all_dates
      WHERE scrape_date <= (SELECT max_date FROM latest_date) - INTERVAL '360 days'
        AND scrape_date >= (SELECT max_date FROM latest_date) - INTERVAL '374 days'
      ORDER BY scrape_date DESC
      LIMIT 1
    ) as one_year_ago
),
current_consensus AS (
  SELECT
    fd.company_id,
    c.name,
    c.code,
    c.market,
    fd.year,
    fd.revenue as current_revenue,
    fd.operating_profit as current_op_profit,
    fd.scrape_date
  FROM financial_data fd
  JOIN companies c ON c.id = fd.company_id
  CROSS JOIN date_references dr
  WHERE fd.scrape_date = dr.current_date
),
prev_day_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit
  FROM financial_data
  CROSS JOIN date_references dr
  WHERE scrape_date = dr.prev_day
  ORDER BY company_id, year, scrape_date DESC
),
one_month_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit
  FROM financial_data
  CROSS JOIN date_references dr
  WHERE scrape_date = dr.one_month_ago
  ORDER BY company_id, year, scrape_date DESC
),
one_year_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit
  FROM financial_data
  CROSS JOIN date_references dr
  WHERE scrape_date = dr.one_year_ago
  ORDER BY company_id, year, scrape_date DESC
)
SELECT
  cc.company_id,
  cc.name,
  cc.code,
  cc.market,
  cc.year,
  cc.scrape_date as current_date,
  cc.current_revenue,
  cc.current_op_profit,

  -- 1D data
  pd.revenue as prev_day_revenue,
  pd.operating_profit as prev_day_op_profit,

  -- 1M data
  om.revenue as one_month_revenue,
  om.operating_profit as one_month_op_profit,

  -- 1Y data
  oy.revenue as one_year_revenue,
  oy.operating_profit as one_year_op_profit,

  -- 1D changes
  CASE
    WHEN pd.revenue IS NOT NULL AND pd.revenue <> 0 AND cc.current_revenue IS NOT NULL
    THEN ((cc.current_revenue - pd.revenue)::DECIMAL / NULLIF(ABS(pd.revenue), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1d,
  CASE
    WHEN pd.operating_profit IS NOT NULL AND pd.operating_profit <> 0 AND cc.current_op_profit IS NOT NULL
    THEN ((cc.current_op_profit - pd.operating_profit)::DECIMAL / NULLIF(ABS(pd.operating_profit), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1d,

  -- 1M changes
  CASE
    WHEN om.revenue IS NOT NULL AND om.revenue <> 0 AND cc.current_revenue IS NOT NULL
    THEN ((cc.current_revenue - om.revenue)::DECIMAL / NULLIF(ABS(om.revenue), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1m,
  CASE
    WHEN om.operating_profit IS NOT NULL AND om.operating_profit <> 0 AND cc.current_op_profit IS NOT NULL
    THEN ((cc.current_op_profit - om.operating_profit)::DECIMAL / NULLIF(ABS(om.operating_profit), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1m,

  -- 1Y changes
  CASE
    WHEN oy.revenue IS NOT NULL AND oy.revenue <> 0 AND cc.current_revenue IS NOT NULL
    THEN ((cc.current_revenue - oy.revenue)::DECIMAL / NULLIF(ABS(oy.revenue), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1y,
  CASE
    WHEN oy.operating_profit IS NOT NULL AND oy.operating_profit <> 0 AND cc.current_op_profit IS NOT NULL
    THEN ((cc.current_op_profit - oy.operating_profit)::DECIMAL / NULLIF(ABS(oy.operating_profit), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1y

FROM current_consensus cc
LEFT JOIN prev_day_consensus pd ON pd.company_id = cc.company_id AND pd.year = cc.year
LEFT JOIN one_month_consensus om ON om.company_id = cc.company_id AND om.year = cc.year
LEFT JOIN one_year_consensus oy ON oy.company_id = cc.company_id AND oy.year = cc.year;

-- Create unique index
CREATE UNIQUE INDEX idx_mv_consensus_unique
  ON mv_consensus_changes(company_id, year);

SELECT '✅ Step 1 completed: mv_consensus_changes updated!' as status;

-- ================== STEP 2: Update v_investment_opportunities ==================

SELECT '🔄 Step 2: Updating v_investment_opportunities view...' as status;

DROP VIEW IF EXISTS v_investment_opportunities CASCADE;

CREATE OR REPLACE VIEW v_investment_opportunities AS
WITH scored_opportunities AS (
    SELECT
        c.company_id,
        c.code,
        c.name,
        c.year,
        c.market,

        -- 재무 데이터 (1D, 1M, 3M, 1Y 모두 포함)
        c.current_revenue,
        c.current_op_profit,

        -- 1D 변화율 (신규 추가)
        c.revenue_change_1d,
        c.op_profit_change_1d,

        -- 1M 변화율 (기존)
        c.revenue_change_1m,
        c.op_profit_change_1m,

        -- 3M 변화율 (기존 - NULL일 수 있음)
        NULL::DECIMAL(10,2) as revenue_change_3m,
        NULL::DECIMAL(10,2) as op_profit_change_3m,

        -- 1Y 변화율 (신규 추가)
        c.revenue_change_1y,
        c.op_profit_change_1y,

        -- 주가 데이터
        s.current_price,
        s.change_rate,
        s.ma_120,
        s.divergence_120,
        s.week_52_high,
        s.week_52_low,
        s.position_in_52w_range,

        -- 컨센서스 변화 점수 (0-100) - 1M 기준
        GREATEST(
            CASE
                WHEN c.revenue_change_1m >= 30 THEN 100
                WHEN c.revenue_change_1m >= 20 THEN 80
                WHEN c.revenue_change_1m >= 10 THEN 60
                WHEN c.revenue_change_1m >= 5 THEN 40
                WHEN c.revenue_change_1m > 0 THEN 20
                ELSE 0
            END,
            CASE
                WHEN c.op_profit_change_1m >= 30 THEN 100
                WHEN c.op_profit_change_1m >= 20 THEN 80
                WHEN c.op_profit_change_1m >= 10 THEN 60
                WHEN c.op_profit_change_1m >= 5 THEN 40
                WHEN c.op_profit_change_1m > 0 THEN 20
                ELSE 0
            END
        )::INTEGER as consensus_score_calc,

        -- 이격도 점수 (0-100)
        CASE
            WHEN s.divergence_120 BETWEEN -10 AND 0 THEN 100
            WHEN s.divergence_120 BETWEEN 0 AND 5 THEN 90
            WHEN s.divergence_120 BETWEEN 5 AND 10 THEN 75
            WHEN s.divergence_120 BETWEEN 10 AND 15 THEN 60
            WHEN s.divergence_120 BETWEEN 15 AND 20 THEN 40
            WHEN s.divergence_120 BETWEEN 20 AND 30 THEN 20
            ELSE 0
        END::INTEGER as divergence_score_calc,

        c.current_date as last_updated
    FROM mv_consensus_changes c
    LEFT JOIN mv_stock_analysis s ON c.company_id = s.company_id
    WHERE c.year >= EXTRACT(YEAR FROM CURRENT_DATE)  -- 동적 년도 필터
)
SELECT
    company_id,
    code,
    name,
    year,
    market,
    current_revenue,
    current_op_profit,

    -- 1D 변화율 (신규 컬럼)
    revenue_change_1d,
    op_profit_change_1d,

    -- 1M 변화율 (기존)
    revenue_change_1m,
    op_profit_change_1m,

    -- 3M 변화율 (기존)
    revenue_change_3m,
    op_profit_change_3m,

    -- 1Y 변화율 (신규 컬럼)
    revenue_change_1y,
    op_profit_change_1y,

    current_price,
    change_rate,
    ma_120,
    divergence_120,
    week_52_high,
    week_52_low,
    position_in_52w_range,

    -- 점수 (0-100 범위)
    consensus_score_calc as consensus_score,
    divergence_score_calc as divergence_score,

    -- 투자 점수 (컨센서스 60% + 이격도 40%)
    ROUND(
        (consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC,
        2
    ) as investment_score,

    -- 투자 등급 (S/A/B/C)
    CASE
        WHEN ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) >= 80 THEN 'S'
        WHEN ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) >= 70 THEN 'A'
        WHEN ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) >= 60 THEN 'B'
        ELSE 'C'
    END as investment_grade,

    last_updated
FROM scored_opportunities
ORDER BY ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) DESC;

-- 권한 설정
GRANT SELECT ON v_investment_opportunities TO anon, authenticated;

SELECT '✅ Step 2 completed: v_investment_opportunities updated!' as status;

-- ================== STEP 3: Verification ==================

SELECT '📊 Step 3: Verifying the updates...' as status;

-- Sample data
SELECT
  name,
  code,
  revenue_change_1d,
  op_profit_change_1d,
  revenue_change_1m,
  revenue_change_1y,
  op_profit_change_1y
FROM v_investment_opportunities
WHERE revenue_change_1d IS NOT NULL OR revenue_change_1y IS NOT NULL
ORDER BY revenue_change_1d DESC NULLS LAST
LIMIT 10;

-- Statistics
SELECT
  COUNT(*) as total_records,
  COUNT(revenue_change_1d) FILTER (WHERE revenue_change_1d IS NOT NULL) as has_1d_revenue,
  COUNT(op_profit_change_1d) FILTER (WHERE op_profit_change_1d IS NOT NULL) as has_1d_op,
  COUNT(revenue_change_1m) FILTER (WHERE revenue_change_1m IS NOT NULL) as has_1m_revenue,
  COUNT(revenue_change_1y) FILTER (WHERE revenue_change_1y IS NOT NULL) as has_1y_revenue,
  COUNT(op_profit_change_1y) FILTER (WHERE op_profit_change_1y IS NOT NULL) as has_1y_op
FROM v_investment_opportunities;

SELECT '🎉 All done! Investment opportunities page now supports 1D and 1Y data!' as status;
