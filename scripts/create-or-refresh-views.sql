-- ================================================================
-- CREATE OR REFRESH MATERIALIZED VIEWS
-- ================================================================
-- This script will:
-- 1. Check if views exist
-- 2. If not, create them
-- 3. If yes, refresh them
-- ================================================================

-- Step 1: Check existing views
SELECT 
  '📋 Step 1: Checking existing views...' as status;

SELECT 
  matviewname as view_name,
  'EXISTS' as status
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname IN ('mv_consensus_changes', 'mv_stock_analysis');

-- Step 2: Drop and recreate mv_consensus_changes
SELECT 
  '🔄 Step 2: Creating mv_consensus_changes...' as status;

DROP MATERIALIZED VIEW IF EXISTS mv_consensus_changes CASCADE;

CREATE MATERIALIZED VIEW mv_consensus_changes AS
WITH latest_date AS (
  SELECT MAX(scrape_date) as max_date
  FROM financial_data
),
date_series AS (
  SELECT
    COALESCE((SELECT max_date FROM latest_date), CURRENT_DATE) as current_date,
    COALESCE((SELECT max_date FROM latest_date), CURRENT_DATE) - INTERVAL '1 day' as prev_day,
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

CREATE UNIQUE INDEX idx_mv_consensus_unique
  ON mv_consensus_changes(company_id, year);

SELECT 
  '✅ mv_consensus_changes created!' as status,
  COUNT(*) as total_records
FROM mv_consensus_changes;

-- Step 3: Create mv_stock_analysis
SELECT 
  '🔄 Step 3: Creating mv_stock_analysis...' as status;

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
  0 as price_deviation,  -- Simplified - will calculate separately
  cs.consensus_score as total_score
FROM current_prices cp
LEFT JOIN consensus_scores cs ON cs.company_id = cp.company_id;

CREATE UNIQUE INDEX idx_mv_stock_analysis_unique
  ON mv_stock_analysis(company_id);

SELECT 
  '✅ mv_stock_analysis created!' as status,
  COUNT(*) as total_records
FROM mv_stock_analysis;

-- Step 4: Verification - Show sample data
SELECT 
  '📊 Step 4: Sample Results' as status;

SELECT
  name,
  code,
  revenue_growth_1month,
  op_profit_growth_1month,
  consensus_score,
  total_score
FROM mv_stock_analysis
WHERE revenue_growth_1month IS NOT NULL
ORDER BY consensus_score DESC
LIMIT 10;

-- Step 5: Score distribution
SELECT 
  '📈 Step 5: Score Distribution' as status;

SELECT
  CASE 
    WHEN consensus_score IS NULL THEN 'NULL'
    WHEN consensus_score = 0 THEN '0 points'
    WHEN consensus_score < 30 THEN '1-29 points'
    WHEN consensus_score < 60 THEN '30-59 points'
    WHEN consensus_score < 80 THEN '60-79 points'
    WHEN consensus_score = 100 THEN '100 points'
    ELSE 'Other'
  END as score_range,
  COUNT(*) as count
FROM mv_stock_analysis
GROUP BY 
  CASE 
    WHEN consensus_score IS NULL THEN 'NULL'
    WHEN consensus_score = 0 THEN '0 points'
    WHEN consensus_score < 30 THEN '1-29 points'
    WHEN consensus_score < 60 THEN '30-59 points'
    WHEN consensus_score < 80 THEN '60-79 points'
    WHEN consensus_score = 100 THEN '100 points'
    ELSE 'Other'
  END
ORDER BY 
  CASE score_range
    WHEN 'NULL' THEN 0
    WHEN '0 points' THEN 1
    WHEN '1-29 points' THEN 2
    WHEN '30-59 points' THEN 3
    WHEN '60-79 points' THEN 4
    WHEN '100 points' THEN 5
    ELSE 6
  END;

-- Final message
SELECT 
  '🎉 All Done!' as status,
  'Views created and populated successfully' as message,
  'Check the results above for verification' as note;
