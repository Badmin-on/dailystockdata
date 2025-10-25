-- ================================================================
-- SIMPLE VIEW CREATE (NO COMPLEX ORDER BY)
-- ================================================================
-- 가장 간단하고 안전한 버전
-- ================================================================

-- Step 1: Drop and recreate mv_consensus_changes
DROP MATERIALIZED VIEW IF EXISTS mv_consensus_changes CASCADE;

CREATE MATERIALIZED VIEW mv_consensus_changes AS
WITH latest_date AS (
  SELECT MAX(scrape_date) as max_date
  FROM financial_data
),
date_series AS (
  SELECT
    COALESCE((SELECT max_date FROM latest_date), CURRENT_DATE) as current_date,
    COALESCE((SELECT max_date FROM latest_date), CURRENT_DATE) - INTERVAL '1 month' as one_month_ago
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
  CROSS JOIN date_series ds
  WHERE fd.scrape_date = ds.current_date
),
one_month_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit
  FROM financial_data
  CROSS JOIN date_series ds
  WHERE scrape_date <= ds.one_month_ago
    AND scrape_date >= ds.one_month_ago - INTERVAL '7 days'
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
  om.revenue as one_month_revenue,
  om.operating_profit as one_month_op_profit,
  CASE
    WHEN om.revenue IS NOT NULL AND om.revenue <> 0 AND cc.current_revenue IS NOT NULL
    THEN ((cc.current_revenue - om.revenue)::DECIMAL / NULLIF(ABS(om.revenue), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1m,
  CASE
    WHEN om.operating_profit IS NOT NULL AND om.operating_profit <> 0 AND cc.current_op_profit IS NOT NULL
    THEN ((cc.current_op_profit - om.operating_profit)::DECIMAL / NULLIF(ABS(om.operating_profit), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1m
FROM current_consensus cc
LEFT JOIN one_month_consensus om ON om.company_id = cc.company_id AND om.year = cc.year;

CREATE UNIQUE INDEX idx_mv_consensus_unique ON mv_consensus_changes(company_id, year);

-- Step 2: Create mv_stock_analysis
DROP MATERIALIZED VIEW IF EXISTS mv_stock_analysis CASCADE;

CREATE MATERIALIZED VIEW mv_stock_analysis AS
WITH latest_prices AS (
  SELECT
    dsp.company_id,
    c.name,
    c.code,
    c.market,
    dsp.date as latest_date,
    dsp.close_price as current_price,
    ROW_NUMBER() OVER (PARTITION BY dsp.company_id ORDER BY dsp.date DESC) as rn
  FROM daily_stock_prices dsp
  JOIN companies c ON c.id = dsp.company_id
  WHERE dsp.close_price IS NOT NULL
),
current_prices AS (
  SELECT * FROM latest_prices WHERE rn = 1
),
consensus_scores AS (
  SELECT
    company_id,
    AVG(revenue_change_1m) as avg_revenue_change,
    AVG(op_profit_change_1m) as avg_op_change,
    CASE
      WHEN AVG(revenue_change_1m) >= 5.0 THEN 100
      WHEN AVG(revenue_change_1m) >= 2.0 THEN 80
      WHEN AVG(revenue_change_1m) >= 0.5 THEN 60
      WHEN AVG(revenue_change_1m) >= 0.0 THEN 40
      WHEN AVG(revenue_change_1m) >= -2.0 THEN 20
      ELSE 0
    END as consensus_score
  FROM mv_consensus_changes
  WHERE revenue_change_1m IS NOT NULL
  GROUP BY company_id
)
SELECT
  cp.company_id,
  cp.name,
  cp.code,
  cp.market,
  cp.current_price,
  cp.latest_date,
  cs.avg_revenue_change as revenue_growth_1month,
  cs.avg_op_change as op_profit_growth_1month,
  cs.consensus_score,
  0 as price_deviation,
  cs.consensus_score as total_score
FROM current_prices cp
LEFT JOIN consensus_scores cs ON cs.company_id = cp.company_id;

CREATE UNIQUE INDEX idx_mv_stock_analysis_unique ON mv_stock_analysis(company_id);

-- Step 3: Show results
SELECT 
  '✅ Views created successfully!' as status,
  (SELECT COUNT(*) FROM mv_consensus_changes) as consensus_records,
  (SELECT COUNT(*) FROM mv_stock_analysis) as analysis_records;

-- Step 4: Sample data
SELECT
  name,
  code,
  revenue_growth_1month,
  op_profit_growth_1month,
  consensus_score
FROM mv_stock_analysis
WHERE revenue_growth_1month IS NOT NULL
ORDER BY consensus_score DESC
LIMIT 10;

-- Step 5: Simple score distribution
SELECT
  consensus_score,
  COUNT(*) as count
FROM mv_stock_analysis
GROUP BY consensus_score
ORDER BY consensus_score NULLS FIRST;
