-- ================================================================
-- REFRESH MATERIALIZED VIEWS (IF THEY EXIST)
-- ================================================================
--
-- Run this AFTER fix-data-scale-simple.sql
-- This will refresh the views to use the normalized data
--
-- ================================================================

-- Step 1: Check if materialized views exist
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- Step 2: Refresh mv_consensus_changes (if exists)
-- Uncomment if the view exists:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consensus_changes;

-- Step 3: Refresh mv_stock_analysis (if exists)
-- Uncomment if the view exists:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;

-- Step 4: Show sample from mv_stock_analysis (if exists)
-- Uncomment if you want to see results:
-- SELECT 
--   c.name,
--   c.code,
--   sa.consensus_score,
--   sa.price_deviation
-- FROM mv_stock_analysis sa
-- JOIN companies c ON c.id = sa.company_id
-- LIMIT 10;

SELECT '✅ Check pg_matviews table above to see if views exist' as status,
       'Uncomment REFRESH commands if views are listed' as next_step;
