-- ============================================
-- Phase 2 최적화: get_date_comparison() Function (LANGUAGE SQL 버전)
-- 목적: 2개 대용량 쿼리 + 클라이언트 계산 → 1개 Function 호출
-- 예상 성능: 1000ms → 150-250ms (75-85% 개선)
-- 수정: LANGUAGE plpgsql → sql (변수 충돌 해결)
-- ============================================

-- 기존 Function 삭제
DROP FUNCTION IF EXISTS get_date_comparison(TEXT, TEXT, TEXT, INT, NUMERIC, TEXT, INT);

-- 새로운 Function 생성 (LANGUAGE SQL)
CREATE OR REPLACE FUNCTION get_date_comparison(
  p_start_date TEXT,
  p_end_date TEXT,
  p_metric TEXT,
  p_year INT DEFAULT NULL,
  p_min_growth NUMERIC DEFAULT -1000,
  p_sort_order TEXT DEFAULT 'DESC',
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  company_id INT,
  company_name TEXT,
  company_code TEXT,
  market TEXT,
  year INT,
  start_value NUMERIC,
  end_value NUMERIC,
  growth_rate NUMERIC,
  absolute_change NUMERIC,
  is_loss_to_profit BOOLEAN,
  start_is_estimate BOOLEAN,
  end_is_estimate BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  WITH start_data AS (
    SELECT
      fd.company_id,
      fd.year,
      CASE
        WHEN p_metric = 'revenue' THEN fd.revenue
        ELSE fd.operating_profit
      END as metric_value,
      fd.is_estimate,
      c.name as company_name,
      c.code as company_code,
      c.market
    FROM financial_data fd
    INNER JOIN companies c ON fd.company_id = c.id
    WHERE fd.scrape_date = p_start_date::DATE
      AND CASE
        WHEN p_metric = 'revenue' THEN fd.revenue
        ELSE fd.operating_profit
      END IS NOT NULL
      AND CASE
        WHEN p_metric = 'revenue' THEN fd.revenue
        ELSE fd.operating_profit
      END != 0
      AND (p_year IS NULL OR fd.year = p_year)
  ),
  end_data AS (
    SELECT
      fd.company_id,
      fd.year,
      CASE
        WHEN p_metric = 'revenue' THEN fd.revenue
        ELSE fd.operating_profit
      END as metric_value,
      fd.is_estimate
    FROM financial_data fd
    WHERE fd.scrape_date = p_end_date::DATE
      AND CASE
        WHEN p_metric = 'revenue' THEN fd.revenue
        ELSE fd.operating_profit
      END IS NOT NULL
      AND (p_year IS NULL OR fd.year = p_year)
      AND fd.company_id IN (SELECT company_id FROM start_data)
  ),
  comparison AS (
    SELECT
      s.company_id,
      s.company_name,
      s.company_code,
      s.market,
      s.year,
      s.metric_value as start_value,
      e.metric_value as end_value,
      CASE
        WHEN s.metric_value = e.metric_value THEN NULL
        WHEN s.metric_value > 0 THEN
          ((e.metric_value - s.metric_value) / s.metric_value) * 100
        WHEN s.metric_value < 0 THEN
          ((e.metric_value - s.metric_value) / ABS(s.metric_value)) * 100
        ELSE NULL
      END as growth_rate,
      (e.metric_value - s.metric_value) as absolute_change,
      (s.metric_value < 0 AND e.metric_value > 0) as is_loss_to_profit,
      s.is_estimate as start_is_estimate,
      e.is_estimate as end_is_estimate
    FROM start_data s
    INNER JOIN end_data e ON s.company_id = e.company_id AND s.year = e.year
  )
  SELECT
    c.company_id,
    c.company_name,
    c.company_code,
    c.market,
    c.year,
    c.start_value,
    c.end_value,
    ROUND(c.growth_rate::NUMERIC, 2) as growth_rate,
    c.absolute_change,
    c.is_loss_to_profit,
    c.start_is_estimate,
    c.end_is_estimate
  FROM comparison c
  WHERE c.growth_rate IS NOT NULL
    AND c.growth_rate >= p_min_growth
  ORDER BY
    CASE
      WHEN p_sort_order = 'ASC' THEN c.growth_rate
      ELSE NULL
    END ASC,
    CASE
      WHEN p_sort_order = 'DESC' THEN c.growth_rate
      ELSE NULL
    END DESC
  LIMIT p_limit;
$$;

-- 권한 설정
GRANT EXECUTE ON FUNCTION get_date_comparison(TEXT, TEXT, TEXT, INT, NUMERIC, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_date_comparison(TEXT, TEXT, TEXT, INT, NUMERIC, TEXT, INT) TO anon;

-- 테스트 쿼리
-- SELECT * FROM get_date_comparison(
--   '2025-07-09',
--   '2025-11-15',
--   'operating_profit',
--   NULL,
--   -1000,
--   'DESC',
--   10
-- );
