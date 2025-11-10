-- ================================================================
-- UPDATE mv_consensus_changes VIEW - Add 1D and 1Y columns
-- ================================================================
-- Based on stock-comparison logic that finds closest available dates
-- ================================================================

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

-- Verification
SELECT
  '✅ Updated mv_consensus_changes view created!' as status;

-- Show sample with 1D and 1Y data
SELECT
  name,
  code,
  year,
  revenue_change_1d,
  op_profit_change_1d,
  revenue_change_1m,
  op_profit_change_1m,
  revenue_change_1y,
  op_profit_change_1y
FROM mv_consensus_changes
WHERE revenue_change_1d IS NOT NULL OR revenue_change_1y IS NOT NULL
ORDER BY revenue_change_1d DESC NULLS LAST
LIMIT 10;

-- Statistics
SELECT
  COUNT(*) as total_records,
  COUNT(revenue_change_1d) as has_1d_revenue,
  COUNT(op_profit_change_1d) as has_1d_op,
  COUNT(revenue_change_1m) as has_1m_revenue,
  COUNT(op_profit_change_1m) as has_1m_op,
  COUNT(revenue_change_1y) as has_1y_revenue,
  COUNT(op_profit_change_1y) as has_1y_op
FROM mv_consensus_changes;
