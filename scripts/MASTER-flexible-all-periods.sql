-- ================================================================
-- MASTER: Flexible Date Matching for All Periods (1D/1M/3M/1Y)
-- ================================================================
-- 유연한 날짜 매칭으로 모든 기간 지원
-- - 정확한 날짜 간격 불필요
-- - 가장 가까운 실제 날짜 사용
-- - 데이터 없으면 가장 오래된 날짜 사용
-- ================================================================

-- ==================== STEP 1: mv_consensus_changes ====================

DROP MATERIALIZED VIEW IF EXISTS mv_consensus_changes CASCADE;

CREATE MATERIALIZED VIEW mv_consensus_changes AS
WITH all_dates AS (
  SELECT DISTINCT scrape_date
  FROM financial_data
  ORDER BY scrape_date DESC
),
date_references AS (
  SELECT
    (SELECT scrape_date FROM all_dates LIMIT 1) as current_date,

    -- 1D: 두 번째로 최근 날짜
    (SELECT scrape_date FROM all_dates OFFSET 1 LIMIT 1) as prev_day,

    -- 1M: ~30일 전 가장 가까운 날짜
    (
      SELECT scrape_date
      FROM all_dates
      WHERE scrape_date < (SELECT scrape_date FROM all_dates LIMIT 1)
      ORDER BY ABS(EXTRACT(epoch FROM (
        scrape_date - ((SELECT scrape_date FROM all_dates LIMIT 1) - INTERVAL '30 days')
      ))) ASC
      LIMIT 1
    ) as one_month_ago,

    -- 3M: ~90일 전 가장 가까운 날짜
    (
      SELECT scrape_date
      FROM all_dates
      WHERE scrape_date < (SELECT scrape_date FROM all_dates LIMIT 1)
      ORDER BY ABS(EXTRACT(epoch FROM (
        scrape_date - ((SELECT scrape_date FROM all_dates LIMIT 1) - INTERVAL '90 days')
      ))) ASC
      LIMIT 1
    ) as three_months_ago,

    -- 1Y: ~365일 전 가장 가까운 날짜
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
    company_id, year, revenue, operating_profit, scrape_date
  FROM financial_data
  CROSS JOIN date_references dr
  WHERE scrape_date = dr.prev_day
  ORDER BY company_id, year, scrape_date DESC
),
one_month_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id, year, revenue, operating_profit, scrape_date
  FROM financial_data
  CROSS JOIN date_references dr
  WHERE scrape_date = dr.one_month_ago
  ORDER BY company_id, year, scrape_date DESC
),
three_months_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id, year, revenue, operating_profit, scrape_date
  FROM financial_data
  CROSS JOIN date_references dr
  WHERE scrape_date = dr.three_months_ago
  ORDER BY company_id, year, scrape_date DESC
),
one_year_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id, year, revenue, operating_profit, scrape_date
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

  -- 기준 데이터 (디버깅용)
  pd.revenue as prev_day_revenue,
  pd.operating_profit as prev_day_op_profit,
  pd.scrape_date as prev_day_date,

  om.revenue as one_month_revenue,
  om.operating_profit as one_month_op_profit,
  om.scrape_date as one_month_date,

  tm.revenue as three_months_revenue,
  tm.operating_profit as three_months_op_profit,
  tm.scrape_date as three_months_date,

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

  -- 3M 변화율
  CASE
    WHEN tm.revenue IS NOT NULL AND tm.revenue <> 0 AND cc.current_revenue IS NOT NULL
    THEN ((cc.current_revenue - tm.revenue)::DECIMAL / NULLIF(ABS(tm.revenue), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_3m,

  CASE
    WHEN tm.operating_profit IS NOT NULL AND tm.operating_profit <> 0 AND cc.current_op_profit IS NOT NULL
    THEN ((cc.current_op_profit - tm.operating_profit)::DECIMAL / NULLIF(ABS(tm.operating_profit), 0) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_3m,

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
LEFT JOIN three_months_consensus tm ON tm.company_id = cc.company_id AND tm.year = cc.year
LEFT JOIN one_year_consensus oy ON oy.company_id = cc.company_id AND oy.year = cc.year;

CREATE UNIQUE INDEX idx_mv_consensus_unique ON mv_consensus_changes(company_id, year);

SELECT '✅ Step 1: mv_consensus_changes 생성 완료' as status;

-- ==================== STEP 2: v_investment_opportunities ====================

DROP VIEW IF EXISTS v_investment_opportunities CASCADE;

CREATE OR REPLACE VIEW v_investment_opportunities AS
WITH scored_opportunities AS (
    SELECT
        c.company_id, c.code, c.name, c.year, c.market,
        c.current_revenue, c.current_op_profit,

        -- 모든 변화율
        c.revenue_change_1d, c.op_profit_change_1d,
        c.revenue_change_1m, c.op_profit_change_1m,
        c.revenue_change_3m, c.op_profit_change_3m,
        c.revenue_change_1y, c.op_profit_change_1y,

        -- 주가 데이터
        s.current_price, s.change_rate, s.ma_120, s.divergence_120,
        s.week_52_high, s.week_52_low, s.position_in_52w_range,

        -- 컨센서스 점수
        GREATEST(
            CASE
                WHEN c.revenue_change_1m >= 30 THEN 100
                WHEN c.revenue_change_1m >= 20 THEN 80
                WHEN c.revenue_change_1m >= 10 THEN 60
                WHEN c.revenue_change_1m >= 5 THEN 40
                WHEN c.revenue_change_1m > 0 THEN 20
                ELSE 0
            END,
            CASE
                WHEN c.op_profit_change_1m >= 30 THEN 100
                WHEN c.op_profit_change_1m >= 20 THEN 80
                WHEN c.op_profit_change_1m >= 10 THEN 60
                WHEN c.op_profit_change_1m >= 5 THEN 40
                WHEN c.op_profit_change_1m > 0 THEN 20
                ELSE 0
            END
        )::INTEGER as consensus_score_calc,

        -- 이격도 점수
        CASE
            WHEN s.divergence_120 BETWEEN -10 AND 0 THEN 100
            WHEN s.divergence_120 BETWEEN 0 AND 5 THEN 90
            WHEN s.divergence_120 BETWEEN 5 AND 10 THEN 75
            WHEN s.divergence_120 BETWEEN 10 AND 15 THEN 60
            WHEN s.divergence_120 BETWEEN 15 AND 20 THEN 40
            WHEN s.divergence_120 BETWEEN 20 AND 30 THEN 20
            ELSE 0
        END::INTEGER as divergence_score_calc,

        c.current_date as last_updated

    FROM mv_consensus_changes c
    LEFT JOIN mv_stock_analysis s ON c.company_id = s.company_id
    WHERE c.year >= EXTRACT(YEAR FROM CURRENT_DATE)
)
SELECT
    company_id, code, name, year, market,
    current_revenue, current_op_profit,

    revenue_change_1d, op_profit_change_1d,
    revenue_change_1m, op_profit_change_1m,
    revenue_change_3m, op_profit_change_3m,
    revenue_change_1y, op_profit_change_1y,

    current_price, change_rate, ma_120, divergence_120,
    week_52_high, week_52_low, position_in_52w_range,

    consensus_score_calc as consensus_score,
    divergence_score_calc as divergence_score,

    ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) as investment_score,

    CASE
        WHEN ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) >= 80 THEN 'S'
        WHEN ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) >= 70 THEN 'A'
        WHEN ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) >= 60 THEN 'B'
        ELSE 'C'
    END as investment_grade,

    last_updated

FROM scored_opportunities
ORDER BY ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) DESC;

GRANT SELECT ON v_investment_opportunities TO anon, authenticated;

SELECT '✅ Step 2: v_investment_opportunities 업데이트 완료' as status;

-- ==================== STEP 3: 검증 ====================

SELECT '📅 날짜 매칭 정보' as info;

SELECT
  (SELECT scrape_date FROM (SELECT DISTINCT scrape_date FROM financial_data ORDER BY scrape_date DESC LIMIT 1) s) as 최신날짜,
  (SELECT scrape_date FROM (SELECT DISTINCT scrape_date FROM financial_data ORDER BY scrape_date DESC OFFSET 1 LIMIT 1) s) as "1D_기준",
  (SELECT COUNT(DISTINCT scrape_date) FROM financial_data) as 총날짜수;

SELECT '📊 샘플 데이터 (Top 10)' as info;

SELECT
  name, code, investment_grade, investment_score,
  revenue_change_1d, revenue_change_1m, revenue_change_3m, revenue_change_1y
FROM v_investment_opportunities
ORDER BY investment_score DESC
LIMIT 10;

SELECT '📈 통계' as info;

SELECT
  COUNT(*) as total,
  COUNT(revenue_change_1d) FILTER (WHERE revenue_change_1d IS NOT NULL AND revenue_change_1d <> 0) as has_1d,
  COUNT(revenue_change_1m) FILTER (WHERE revenue_change_1m IS NOT NULL AND revenue_change_1m <> 0) as has_1m,
  COUNT(revenue_change_3m) FILTER (WHERE revenue_change_3m IS NOT NULL AND revenue_change_3m <> 0) as has_3m,
  COUNT(revenue_change_1y) FILTER (WHERE revenue_change_1y IS NOT NULL AND revenue_change_1y <> 0) as has_1y
FROM v_investment_opportunities;

SELECT '🎯 등급 분포' as info;

SELECT
  investment_grade,
  COUNT(*) as count
FROM v_investment_opportunities
GROUP BY investment_grade
ORDER BY investment_grade;

SELECT '🎉 완료!' as status;
