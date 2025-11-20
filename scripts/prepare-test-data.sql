-- ============================================================================
-- Phase 0: Test Data Preparation
-- ============================================================================
-- Purpose: Select 10 representative stocks for testing consensus calculations
-- Criteria:
--   1. Complete 4-year data (2023-2026E)
--   2. Diverse scenarios (growth, decline, turnaround)
--   3. Mix of company sizes and industries
-- ============================================================================

-- Step 1: Identify stocks with complete data
-- ============================================================================
WITH complete_stocks AS (
  SELECT
    c.id,
    c.name,
    c.code,
    COUNT(DISTINCT f.fiscal_year) as year_count,
    MIN(f.fiscal_year) as min_year,
    MAX(f.fiscal_year) as max_year,
    -- Check data completeness
    COUNT(*) FILTER (WHERE f.eps IS NOT NULL AND f.per IS NOT NULL) as valid_records,
    -- Calculate basic metrics for 2024 vs 2025
    MAX(CASE WHEN f.fiscal_year = 2024 AND f.is_estimate THEN f.eps END) as eps_2024,
    MAX(CASE WHEN f.fiscal_year = 2025 AND f.is_estimate THEN f.eps END) as eps_2025,
    MAX(CASE WHEN f.fiscal_year = 2024 AND f.is_estimate THEN f.per END) as per_2024,
    MAX(CASE WHEN f.fiscal_year = 2025 AND f.is_estimate THEN f.per END) as per_2025
  FROM companies c
  INNER JOIN financial_data_extended f ON c.id = f.company_id
  WHERE f.is_estimate = true  -- Only consensus estimates
  GROUP BY c.id, c.name, c.code
  HAVING
    COUNT(DISTINCT f.fiscal_year) = 4  -- Must have all 4 years
    AND MIN(f.fiscal_year) = 2023
    AND MAX(f.fiscal_year) = 2026
    AND COUNT(*) FILTER (WHERE f.eps IS NOT NULL AND f.per IS NOT NULL) = 4
),

-- Step 2: Categorize stocks by growth characteristics
-- ============================================================================
categorized_stocks AS (
  SELECT
    *,
    -- Calculate growth rates
    CASE
      WHEN eps_2024 > 0 AND eps_2025 > 0 THEN
        ROUND(((eps_2025 - eps_2024) / eps_2024 * 100)::numeric, 2)
      ELSE NULL
    END as eps_growth_pct,
    CASE
      WHEN per_2024 > 0 AND per_2025 > 0 THEN
        ROUND(((per_2025 - per_2024) / per_2024 * 100)::numeric, 2)
      ELSE NULL
    END as per_growth_pct,
    -- Categorize scenarios
    CASE
      WHEN eps_2024 <= 0 AND eps_2025 > 0 THEN 'TURNAROUND'
      WHEN eps_2024 <= 0 OR eps_2025 <= 0 THEN 'DEFICIT'
      WHEN eps_2025 > eps_2024 THEN 'GROWTH'
      ELSE 'DECLINE'
    END as scenario_type,
    -- Market cap proxy (using revenue as rough indicator)
    CASE
      WHEN eps_2025 * per_2025 > 10000000000 THEN 'LARGE'  -- > 100억
      WHEN eps_2025 * per_2025 > 1000000000 THEN 'MID'     -- > 10억
      ELSE 'SMALL'
    END as company_size
  FROM complete_stocks
  WHERE eps_2024 IS NOT NULL
    AND eps_2025 IS NOT NULL
    AND per_2024 IS NOT NULL
    AND per_2025 IS NOT NULL
    AND per_2024 > 0
    AND per_2025 > 0
    AND per_2024 < 1000  -- Exclude extreme PER
    AND per_2025 < 1000
)

-- Step 3: Select 10 diverse test stocks
-- ============================================================================
-- Target distribution:
--   - 4 GROWTH stocks (normal growth scenarios)
--   - 2 HIGH_GROWTH stocks (EPS growth > 50%)
--   - 2 DECLINE stocks (negative growth)
--   - 1 TURNAROUND stock (deficit → profit)
--   - 1 DEFICIT stock (for edge case testing)
-- ============================================================================

-- A. High-growth stocks (2 stocks)
(
  SELECT
    id, code, name, scenario_type, company_size,
    eps_2024, eps_2025, eps_growth_pct,
    per_2024, per_2025, per_growth_pct,
    'HIGH_GROWTH' as test_category,
    'EPS growth > 50%' as test_reason
  FROM categorized_stocks
  WHERE scenario_type = 'GROWTH'
    AND eps_growth_pct > 50
  ORDER BY eps_growth_pct DESC
  LIMIT 2
)

UNION ALL

-- B. Normal growth stocks (4 stocks)
(
  SELECT
    id, code, name, scenario_type, company_size,
    eps_2024, eps_2025, eps_growth_pct,
    per_2024, per_2025, per_growth_pct,
    'NORMAL_GROWTH' as test_category,
    'Steady growth 10-50%' as test_reason
  FROM categorized_stocks
  WHERE scenario_type = 'GROWTH'
    AND eps_growth_pct BETWEEN 10 AND 50
  ORDER BY eps_growth_pct DESC
  LIMIT 4
)

UNION ALL

-- C. Declining stocks (2 stocks)
(
  SELECT
    id, code, name, scenario_type, company_size,
    eps_2024, eps_2025, eps_growth_pct,
    per_2024, per_2025, per_growth_pct,
    'DECLINE' as test_category,
    'Negative EPS growth' as test_reason
  FROM categorized_stocks
  WHERE scenario_type = 'DECLINE'
  ORDER BY eps_growth_pct ASC
  LIMIT 2
)

UNION ALL

-- D. Turnaround candidate (1 stock)
(
  SELECT
    id, code, name, scenario_type, company_size,
    eps_2024, eps_2025, eps_growth_pct,
    per_2024, per_2025, per_growth_pct,
    'TURNAROUND' as test_category,
    'Deficit to profit' as test_reason
  FROM categorized_stocks
  WHERE scenario_type = 'TURNAROUND'
  ORDER BY eps_2025 DESC
  LIMIT 1
)

UNION ALL

-- E. Deficit stock (1 stock for edge case)
(
  SELECT
    id, code, name, scenario_type, company_size,
    eps_2024, eps_2025, eps_growth_pct,
    per_2024, per_2025, per_growth_pct,
    'DEFICIT' as test_category,
    'Both years deficit' as test_reason
  FROM categorized_stocks
  WHERE scenario_type = 'DEFICIT'
  LIMIT 1
)

ORDER BY test_category, eps_growth_pct DESC;


-- ============================================================================
-- Validation Queries
-- ============================================================================

-- After selecting test stocks, validate their complete data:
-- Replace {ticker} with actual stock codes from above query

/*
-- Example validation for a single stock:
SELECT
  c.code,
  c.name,
  f.fiscal_year,
  f.is_estimate,
  f.eps,
  f.per,
  f.revenue,
  f.operating_profit,
  f.net_income
FROM companies c
INNER JOIN financial_data_extended f ON c.id = f.company_id
WHERE c.code = '{ticker}'
  AND f.is_estimate = true
ORDER BY f.fiscal_year;
*/


-- ============================================================================
-- Export Test Data (for documentation)
-- ============================================================================

-- Once test stocks are selected, document them in Phase 0 completion:
--
-- Test Stocks Selected:
-- 1. {code} - {name} - HIGH_GROWTH
-- 2. {code} - {name} - HIGH_GROWTH
-- 3. {code} - {name} - NORMAL_GROWTH
-- 4. {code} - {name} - NORMAL_GROWTH
-- 5. {code} - {name} - NORMAL_GROWTH
-- 6. {code} - {name} - NORMAL_GROWTH
-- 7. {code} - {name} - DECLINE
-- 8. {code} - {name} - DECLINE
-- 9. {code} - {name} - TURNAROUND
-- 10. {code} - {name} - DEFICIT
-- ============================================================================
