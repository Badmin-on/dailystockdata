-- ================================================================
-- SAFE VIEW REFRESH - No assumptions about column structure
-- ================================================================

-- Step 1: Check if materialized views exist
SELECT 
  '📋 Existing Materialized Views' as info,
  schemaname,
  matviewname,
  'Found!' as status
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- Step 2: Get column information for mv_consensus_changes (if exists)
SELECT 
  '🔍 mv_consensus_changes columns' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mv_consensus_changes'
ORDER BY ordinal_position;

-- Step 3: Get column information for mv_stock_analysis (if exists)
SELECT 
  '🔍 mv_stock_analysis columns' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mv_stock_analysis'
ORDER BY ordinal_position;

-- Step 4: Refresh mv_consensus_changes (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'mv_consensus_changes'
  ) THEN
    RAISE NOTICE 'Refreshing mv_consensus_changes...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consensus_changes;
    RAISE NOTICE '✅ mv_consensus_changes refreshed successfully';
  ELSE
    RAISE NOTICE 'ℹ️  mv_consensus_changes does not exist - skipping';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error refreshing mv_consensus_changes: %', SQLERRM;
END $$;

-- Step 5: Refresh mv_stock_analysis (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'mv_stock_analysis'
  ) THEN
    RAISE NOTICE 'Refreshing mv_stock_analysis...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;
    RAISE NOTICE '✅ mv_stock_analysis refreshed successfully';
  ELSE
    RAISE NOTICE 'ℹ️  mv_stock_analysis does not exist - skipping';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error refreshing mv_stock_analysis: %', SQLERRM;
END $$;

-- Step 6: Simple data verification - Check if normalization worked
SELECT 
  '📊 Data Normalization Check' as info,
  scrape_date,
  COUNT(*) as record_count,
  AVG(revenue) as avg_revenue,
  MIN(revenue) as min_revenue,
  MAX(revenue) as max_revenue
FROM financial_data
WHERE year = '2024'
  AND revenue IS NOT NULL
GROUP BY scrape_date
ORDER BY scrape_date DESC
LIMIT 5;

-- Step 7: Check recent vs old data scale
SELECT 
  '🔍 Scale Comparison' as info,
  CASE 
    WHEN scrape_date >= '2025-10-25' THEN 'NEW (should be smaller)'
    ELSE 'OLD (should be normalized)'
  END as data_type,
  scrape_date,
  company_id,
  year,
  revenue,
  operating_profit
FROM financial_data
WHERE company_id IN (1, 2, 3)  -- First 3 companies
  AND year = '2024'
  AND scrape_date IN (
    (SELECT MAX(scrape_date) FROM financial_data),
    (SELECT MAX(scrape_date) FROM financial_data WHERE scrape_date < '2025-10-25')
  )
ORDER BY company_id, scrape_date DESC;

-- Step 8: Final status
SELECT 
  '✅ Refresh Complete!' as status,
  'Check the results above' as next_step,
  'If views exist, they have been refreshed' as note;
