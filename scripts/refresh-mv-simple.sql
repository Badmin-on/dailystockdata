-- ============================================
-- Materialized View 갱신 (간단 버전)
-- ============================================
-- CONCURRENTLY 없이 일반 갱신
-- 주의: 갱신 중 잠시 데이터 접근 불가
-- ============================================

-- Step 1: 갱신 전 현황
SELECT
  COUNT(*) as 갱신전_레코드수,
  MAX(latest_date) as 갱신전_최신날짜
FROM mv_stock_analysis;

-- Step 2: Materialized View 갱신
REFRESH MATERIALIZED VIEW mv_stock_analysis;

-- Step 3: 갱신 후 확인
SELECT
  COUNT(*) as 갱신후_레코드수,
  MAX(latest_date) as 갱신후_최신날짜
FROM mv_stock_analysis;

-- Step 4: ETF 샘플 확인
SELECT
  c.name as 종목명,
  sa.current_price as 현재가,
  sa.change_rate as 등락률,
  sa.divergence_120 as 이격도120,
  sa.latest_date as 데이터날짜
FROM mv_stock_analysis sa
JOIN companies c ON c.id = sa.company_id
WHERE c.is_etf = TRUE
ORDER BY c.code
LIMIT 10;

SELECT '✅ 갱신 완료!' as result;
