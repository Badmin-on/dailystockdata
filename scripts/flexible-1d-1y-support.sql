-- ================================================================
-- FLEXIBLE 1D/1Y Support - Realistic Date Matching
-- ================================================================
-- 유연한 날짜 매칭:
-- - 1D: 가장 최근 2개 날짜 비교
-- - 1M: ~30일 전에 가장 가까운 날짜
-- - 1Y: ~365일 전에 가장 가까운 날짜 (없으면 가장 오래된 날짜)
-- ================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_consensus_changes CASCADE;

CREATE MATERIALIZED VIEW mv_consensus_changes AS
WITH all_dates AS (
  -- 모든 고유 날짜를 내림차순으로
  SELECT DISTINCT scrape_date
  FROM financial_data
  ORDER BY scrape_date DESC
),
date_references AS (
  SELECT
    -- 최신 날짜
    (SELECT scrape_date FROM all_dates LIMIT 1) as current_date,

    -- 1D: 두 번째로 최근 날짜 (가장 가까운 이전 날짜)
    (SELECT scrape_date FROM all_dates OFFSET 1 LIMIT 1) as prev_day,

    -- 1M: ~30일 전에 가장 가까운 날짜
    (
      SELECT scrape_date
      FROM all_dates
      WHERE scrape_date < (SELECT scrape_date FROM all_dates LIMIT 1)
      ORDER BY ABS(EXTRACT(epoch FROM (
        scrape_date - ((SELECT scrape_date FROM all_dates LIMIT 1) - INTERVAL '30 days')
      ))) ASC
      LIMIT 1
    ) as one_month_ago,

    -- 1Y: ~365일 전에 가장 가까운 날짜 (없으면 가장 오래된 날짜)
    (
      SELECT scrape_date
      FROM all_dates
      WHERE scrape_date < (SELECT scrape_date FROM all_dates LIMIT 1)
      ORDER BY ABS(EXTRACT(epoch FROM (
        scrape_date - ((SELECT scrape_date FROM all_dates LIMIT 1) - INTERVAL '365 days')
      ))) ASC
      LIMIT 1
    ) as one_year_ago
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
  CROSS JOIN date_references dr
  WHERE fd.scrape_date = dr.current_date
),
prev_day_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit,
    scrape_date
  FROM financial_data
  CROSS JOIN date_references dr
  WHERE scrape_date = dr.prev_day
  ORDER BY company_id, year, scrape_date DESC
),
one_month_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit,
    scrape_date
  FROM financial_data
  CROSS JOIN date_references dr
  WHERE scrape_date = dr.one_month_ago
  ORDER BY company_id, year, scrape_date DESC
),
one_year_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit,
    scrape_date
  FROM financial_data
  CROSS JOIN date_references dr
  WHERE scrape_date = dr.one_year_ago
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

  -- 1D 기준 데이터
  pd.revenue as prev_day_revenue,
  pd.operating_profit as prev_day_op_profit,
  pd.scrape_date as prev_day_date,

  -- 1M 기준 데이터
  om.revenue as one_month_revenue,
  om.operating_profit as one_month_op_profit,
  om.scrape_date as one_month_date,

  -- 1Y 기준 데이터
  oy.revenue as one_year_revenue,
  oy.operating_profit as one_year_op_profit,
  oy.scrape_date as one_year_date,

  -- 1D 변화율
  CASE
    WHEN pd.revenue IS NOT NULL AND pd.revenue <> 0 AND cc.current_revenue IS NOT NULL
    THEN ((cc.current_revenue - pd.revenue)::DECIMAL / NULLIF(ABS(pd.revenue), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1d,

  CASE
    WHEN pd.operating_profit IS NOT NULL AND pd.operating_profit <> 0 AND cc.current_op_profit IS NOT NULL
    THEN ((cc.current_op_profit - pd.operating_profit)::DECIMAL / NULLIF(ABS(pd.operating_profit), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1d,

  -- 1M 변화율
  CASE
    WHEN om.revenue IS NOT NULL AND om.revenue <> 0 AND cc.current_revenue IS NOT NULL
    THEN ((cc.current_revenue - om.revenue)::DECIMAL / NULLIF(ABS(om.revenue), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1m,

  CASE
    WHEN om.operating_profit IS NOT NULL AND om.operating_profit <> 0 AND cc.current_op_profit IS NOT NULL
    THEN ((cc.current_op_profit - om.operating_profit)::DECIMAL / NULLIF(ABS(om.operating_profit), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1m,

  -- 1Y 변화율
  CASE
    WHEN oy.revenue IS NOT NULL AND oy.revenue <> 0 AND cc.current_revenue IS NOT NULL
    THEN ((cc.current_revenue - oy.revenue)::DECIMAL / NULLIF(ABS(oy.revenue), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1y,

  CASE
    WHEN oy.operating_profit IS NOT NULL AND oy.operating_profit <> 0 AND cc.current_op_profit IS NOT NULL
    THEN ((cc.current_op_profit - oy.operating_profit)::DECIMAL / NULLIF(ABS(oy.operating_profit), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1y

FROM current_consensus cc
LEFT JOIN prev_day_consensus pd ON pd.company_id = cc.company_id AND pd.year = cc.year
LEFT JOIN one_month_consensus om ON om.company_id = cc.company_id AND om.year = cc.year
LEFT JOIN one_year_consensus oy ON oy.company_id = cc.company_id AND oy.year = cc.year;

-- 인덱스 생성
CREATE UNIQUE INDEX idx_mv_consensus_unique
  ON mv_consensus_changes(company_id, year);

-- 검증 쿼리
SELECT '✅ mv_consensus_changes 생성 완료!' as status;

SELECT
  '📊 날짜 매칭 정보:' as info,
  (SELECT scrape_date FROM (SELECT DISTINCT scrape_date FROM financial_data ORDER BY scrape_date DESC LIMIT 1) s) as 최신날짜,
  (SELECT scrape_date FROM (SELECT DISTINCT scrape_date FROM financial_data ORDER BY scrape_date DESC OFFSET 1 LIMIT 1) s) as "1D_기준",
  current_date - INTERVAL '30 days' as "1M_목표",
  current_date - INTERVAL '365 days' as "1Y_목표";

-- 샘플 데이터
SELECT
  name,
  code,
  current_date,
  prev_day_date,
  one_month_date,
  one_year_date,
  revenue_change_1d,
  revenue_change_1m,
  revenue_change_1y
FROM mv_consensus_changes
WHERE revenue_change_1d IS NOT NULL OR revenue_change_1m IS NOT NULL
ORDER BY revenue_change_1d DESC NULLS LAST
LIMIT 10;

-- 통계
SELECT
  COUNT(*) as total_records,
  COUNT(prev_day_date) FILTER (WHERE prev_day_date IS NOT NULL) as has_1d_date,
  COUNT(revenue_change_1d) FILTER (WHERE revenue_change_1d IS NOT NULL AND revenue_change_1d <> 0) as has_1d_data,
  COUNT(one_month_date) FILTER (WHERE one_month_date IS NOT NULL) as has_1m_date,
  COUNT(revenue_change_1m) FILTER (WHERE revenue_change_1m IS NOT NULL AND revenue_change_1m <> 0) as has_1m_data,
  COUNT(one_year_date) FILTER (WHERE one_year_date IS NOT NULL) as has_1y_date,
  COUNT(revenue_change_1y) FILTER (WHERE revenue_change_1y IS NOT NULL AND revenue_change_1y <> 0) as has_1y_data
FROM mv_consensus_changes;
