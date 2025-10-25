-- ================================================================
-- FIX DATA SCALE MISMATCH
-- ================================================================
--
-- Problem: Old data (before 2025-10-25) is stored in 원 (won)
--          New data (2025-10-25+) is stored in 억원 (hundred millions)
--          Scale difference: 100,000,000x
--
-- Solution: Divide old data by 100,000,000 to normalize to 억원
--
-- ================================================================

-- Step 1: Create backup table (recommended)
CREATE TABLE IF NOT EXISTS financial_data_backup AS 
SELECT * FROM financial_data 
WHERE scrape_date < '2025-10-25';

-- Step 2: Check count of records to be updated
SELECT 
  'Records to update' as description,
  COUNT(*) as count,
  MIN(scrape_date) as min_date,
  MAX(scrape_date) as max_date
FROM financial_data 
WHERE scrape_date < '2025-10-25';

-- Step 3: Update old data - divide by 100,000,000
UPDATE financial_data
SET 
  revenue = CASE 
    WHEN revenue IS NOT NULL THEN revenue / 100000000.0
    ELSE NULL 
  END,
  operating_profit = CASE 
    WHEN operating_profit IS NOT NULL THEN operating_profit / 100000000.0
    ELSE NULL 
  END
WHERE scrape_date < '2025-10-25';

-- Step 4: Verify the fix (compare before and after)
SELECT 
  'After normalization' as status,
  scrape_date,
  year,
  company_id,
  revenue,
  operating_profit
FROM financial_data
WHERE company_id = 1  -- Samsung Electronics
  AND year = '2024'
ORDER BY scrape_date DESC
LIMIT 5;

-- Step 5: Refresh materialized views to recalculate with normalized data
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consensus_changes;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;

-- Step 6: Show sample results
SELECT 
  c.name,
  c.code,
  sa.revenue_growth_1month,
  sa.op_profit_growth_1month,
  sa.consensus_score,
  sa.price_deviation
FROM mv_stock_analysis sa
JOIN companies c ON c.id = sa.company_id
WHERE sa.revenue_growth_1month IS NOT NULL
  AND sa.op_profit_growth_1month IS NOT NULL
ORDER BY sa.consensus_score DESC
LIMIT 10;
