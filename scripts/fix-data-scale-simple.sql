-- ================================================================
-- FIX DATA SCALE MISMATCH - SIMPLIFIED VERSION
-- ================================================================
--
-- Problem: Old data in 원 (won), new data in 억원 (hundred millions)
-- Solution: Divide old data by 100,000,000
--
-- ================================================================

-- Step 1: Check current data (BEFORE fix)
SELECT 
  'BEFORE FIX - Check data scale' as status,
  scrape_date,
  year,
  revenue,
  operating_profit
FROM financial_data
WHERE company_id = 1  -- Samsung Electronics
  AND year = '2024'
ORDER BY scrape_date DESC
LIMIT 3;

-- Step 2: Count records to be updated
SELECT 
  'Records to update' as description,
  COUNT(*) as count,
  MIN(scrape_date) as min_date,
  MAX(scrape_date) as max_date
FROM financial_data 
WHERE scrape_date < '2025-10-25';

-- Step 3: Create backup table
DROP TABLE IF EXISTS financial_data_backup;
CREATE TABLE financial_data_backup AS 
SELECT * FROM financial_data 
WHERE scrape_date < '2025-10-25';

SELECT 'Backup created' as status, COUNT(*) as backup_count 
FROM financial_data_backup;

-- Step 4: Update old data - divide by 100,000,000
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

-- Step 5: Verify the fix (AFTER update)
SELECT 
  'AFTER FIX - Check normalized data' as status,
  scrape_date,
  year,
  revenue,
  operating_profit
FROM financial_data
WHERE company_id = 1  -- Samsung Electronics
  AND year = '2024'
ORDER BY scrape_date DESC
LIMIT 3;

-- Step 6: Compare before and after for verification
SELECT 
  'Comparison: Old vs New data format' as status,
  fd_new.scrape_date as new_date,
  fd_new.revenue as new_revenue,
  fd_old.scrape_date as old_date,
  fd_old.revenue as old_revenue_normalized,
  CASE 
    WHEN fd_old.revenue IS NOT NULL AND fd_new.revenue IS NOT NULL 
    THEN ABS(fd_new.revenue - fd_old.revenue) < 1000
    ELSE NULL
  END as values_similar
FROM financial_data fd_new
JOIN financial_data fd_old ON fd_old.company_id = fd_new.company_id 
  AND fd_old.year = fd_new.year
WHERE fd_new.company_id = 1
  AND fd_new.year = '2024'
  AND fd_new.scrape_date = '2025-10-25'
  AND fd_old.scrape_date = '2025-10-23'
LIMIT 1;

-- Step 7: Success message
SELECT 
  '✅ Data normalization complete!' as status,
  'Next step: Refresh materialized views if they exist' as next_action;
