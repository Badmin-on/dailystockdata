-- ================================================================
-- CHECK AND REFRESH MATERIALIZED VIEWS
-- ================================================================
-- Run this after data normalization is complete
-- ================================================================

-- Step 1: Check which materialized views exist
SELECT 
  'Existing Materialized Views' as info,
  schemaname,
  matviewname
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- Step 2: If mv_consensus_changes exists, refresh it
-- Check if the view exists first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'mv_consensus_changes'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consensus_changes;
    RAISE NOTICE 'mv_consensus_changes refreshed successfully';
  ELSE
    RAISE NOTICE 'mv_consensus_changes does not exist - skipping';
  END IF;
END $$;

-- Step 3: If mv_stock_analysis exists, refresh it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'mv_stock_analysis'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;
    RAISE NOTICE 'mv_stock_analysis refreshed successfully';
  ELSE
    RAISE NOTICE 'mv_stock_analysis does not exist - skipping';
  END IF;
END $$;

-- Step 4: Verify the fix by checking consensus changes
SELECT 
  'Consensus Changes Sample' as info,
  c.name as company_name,
  c.code,
  cc.reference_date,
  cc.revenue_change_1m,
  cc.op_profit_change_1m
FROM mv_consensus_changes cc
JOIN companies c ON c.id = cc.company_id
WHERE cc.revenue_change_1m IS NOT NULL
  AND cc.op_profit_change_1m IS NOT NULL
  AND cc.revenue_change_1m != -100
  AND cc.revenue_change_1m != 100
ORDER BY ABS(cc.revenue_change_1m) DESC
LIMIT 10;

-- Step 5: Check stock analysis scores
SELECT 
  'Stock Analysis Sample' as info,
  c.name as company_name,
  c.code,
  sa.consensus_score,
  sa.price_score,
  sa.total_score,
  sa.price_deviation
FROM mv_stock_analysis sa
JOIN companies c ON c.id = sa.company_id
WHERE sa.consensus_score IS NOT NULL
ORDER BY sa.total_score DESC
LIMIT 10;

-- Step 6: Show score distribution (should NOT be all 100 or 0)
SELECT 
  'Score Distribution Check' as info,
  CASE 
    WHEN consensus_score = 0 THEN '0 points'
    WHEN consensus_score < 30 THEN '1-29 points'
    WHEN consensus_score < 60 THEN '30-59 points'
    WHEN consensus_score < 80 THEN '60-79 points'
    WHEN consensus_score < 100 THEN '80-99 points'
    WHEN consensus_score = 100 THEN '100 points'
    ELSE 'NULL'
  END as score_range,
  COUNT(*) as company_count
FROM mv_stock_analysis
GROUP BY 
  CASE 
    WHEN consensus_score = 0 THEN '0 points'
    WHEN consensus_score < 30 THEN '1-29 points'
    WHEN consensus_score < 60 THEN '30-59 points'
    WHEN consensus_score < 80 THEN '60-79 points'
    WHEN consensus_score < 100 THEN '80-99 points'
    WHEN consensus_score = 100 THEN '100 points'
    ELSE 'NULL'
  END
ORDER BY score_range;

SELECT '✅ All checks complete!' as status;
