-- ============================================
-- ETF 등락률 문제 진단 스크립트
-- ============================================
-- 목적: change_rate 컬럼의 실제 데이터 확인
-- ============================================

-- Step 1: ETF 종목 확인
SELECT
  '📋 Step 1: ETF 종목 확인' as step;

SELECT
  id,
  name,
  code
FROM companies
WHERE is_etf = TRUE
ORDER BY name
LIMIT 10;

-- Step 2: 문제가 있는 ETF의 최근 주가 데이터 확인
SELECT
  '🔍 Step 2: 문제 ETF들의 최근 주가 데이터' as step;

SELECT
  c.name,
  c.code,
  dsp.date,
  dsp.close_price,
  dsp.change_rate,
  -- 실제 등락률 계산 (전일 종가 대비)
  LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as prev_close,
  CASE
    WHEN LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) IS NULL THEN NULL
    WHEN LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) = 0 THEN NULL
    ELSE ROUND(
      ((dsp.close_price - LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date))
       / LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) * 100)::NUMERIC,
      2
    )
  END as correct_change_rate
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.code IN ('091160', '396500', '381170')  -- KODEX 반도체, TIGER 반도체TOP10, TIGER 미국테크TOP10
  AND dsp.date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY c.code, dsp.date DESC;

-- Step 3: change_rate와 close_price 비교 분석
SELECT
  '📊 Step 3: change_rate == prev_close_price?' as step;

WITH price_comparison AS (
  SELECT
    c.name,
    c.code,
    dsp.date,
    dsp.close_price as current_price,
    dsp.change_rate as stored_change_rate,
    LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as prev_close_price,
    ABS(dsp.change_rate - LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date)) as diff
  FROM daily_stock_prices dsp
  JOIN companies c ON c.id = dsp.company_id
  WHERE c.is_etf = TRUE
    AND dsp.date >= CURRENT_DATE - INTERVAL '3 days'
)
SELECT
  name,
  code,
  date,
  current_price,
  stored_change_rate,
  prev_close_price,
  CASE
    WHEN diff < 1 THEN '✅ change_rate = prev_close (버그 확인!)'
    ELSE '❓ change_rate ≠ prev_close'
  END as diagnosis
FROM price_comparison
WHERE prev_close_price IS NOT NULL
ORDER BY code, date DESC
LIMIT 20;

-- Step 4: 통계 분석
SELECT
  '📈 Step 4: 전체 ETF change_rate 통계' as step;

SELECT
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE change_rate IS NULL) as null_count,
  COUNT(*) FILTER (WHERE change_rate < -100) as abnormal_negative,
  COUNT(*) FILTER (WHERE change_rate > 100) as abnormal_positive,
  COUNT(*) FILTER (WHERE change_rate BETWEEN -10 AND 10) as normal_range,
  ROUND(AVG(ABS(change_rate))::NUMERIC, 2) as avg_abs_change_rate,
  ROUND(MIN(change_rate)::NUMERIC, 2) as min_change_rate,
  ROUND(MAX(change_rate)::NUMERIC, 2) as max_change_rate
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = TRUE
  AND dsp.date >= CURRENT_DATE - INTERVAL '7 days';

-- 결론
SELECT
  '🎯 진단 완료!' as result,
  'change_rate 컬럼에 전일 종가가 저장되어 있는지 확인하세요' as instruction;
