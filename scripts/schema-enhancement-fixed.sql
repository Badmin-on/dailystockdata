-- YoonStock Pro - Enhanced Schema (FIXED VERSION)
-- 스키마 경로 문제 해결

-- ============================================
-- 0. 스키마 경로 설정 (중요!)
-- ============================================
SET search_path TO public;

-- ============================================
-- 1. 120일 이동평균 계산 함수 (스키마 명시)
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_ma_120(p_company_id INT, p_date DATE)
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
SECURITY DEFINER  -- 함수 소유자 권한으로 실행
SET search_path = public
AS $$
DECLARE
  v_ma_120 DECIMAL(12,2);
BEGIN
  SELECT AVG(close_price)::DECIMAL(12,2)
  INTO v_ma_120
  FROM (
    SELECT close_price
    FROM public.daily_stock_prices
    WHERE company_id = p_company_id
      AND date <= p_date
      AND close_price IS NOT NULL
    ORDER BY date DESC
    LIMIT 120
  ) subquery;

  RETURN v_ma_120;
END;
$$;

-- ============================================
-- 2. 이격도 계산 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_divergence(
  p_current_price DECIMAL(12,2),
  p_ma_120 DECIMAL(12,2)
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_ma_120 IS NULL OR p_ma_120 = 0 THEN
    RETURN NULL;
  END IF;

  RETURN ((p_current_price - p_ma_120) / p_ma_120 * 100)::DECIMAL(10,2);
END;
$$;

-- ============================================
-- 3. 재무 컨센서스 변화율 Materialized View
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_consensus_changes AS
WITH latest_date AS (
  SELECT MAX(scrape_date) as max_date
  FROM public.financial_data
),
date_series AS (
  SELECT
    (SELECT max_date FROM latest_date) as current_date,
    (SELECT max_date FROM latest_date) - INTERVAL '1 day' as prev_day,
    (SELECT max_date FROM latest_date) - INTERVAL '1 month' as one_month_ago,
    (SELECT max_date FROM latest_date) - INTERVAL '3 months' as three_months_ago,
    (SELECT max_date FROM latest_date) - INTERVAL '1 year' as one_year_ago
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
    fd.is_estimate,
    fd.scrape_date
  FROM public.financial_data fd
  JOIN public.companies c ON c.id = fd.company_id
  CROSS JOIN date_series ds
  WHERE fd.scrape_date = ds.current_date
),
prev_day_consensus AS (
  SELECT
    company_id,
    year,
    revenue,
    operating_profit
  FROM public.financial_data
  WHERE scrape_date = (SELECT prev_day FROM date_series)
),
one_month_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit
  FROM public.financial_data
  WHERE scrape_date <= (SELECT one_month_ago FROM date_series)
    AND scrape_date >= (SELECT one_month_ago FROM date_series) - INTERVAL '7 days'
  ORDER BY company_id, year, scrape_date DESC
),
three_month_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit
  FROM public.financial_data
  WHERE scrape_date <= (SELECT three_months_ago FROM date_series)
    AND scrape_date >= (SELECT three_months_ago FROM date_series) - INTERVAL '7 days'
  ORDER BY company_id, year, scrape_date DESC
),
one_year_consensus AS (
  SELECT DISTINCT ON (company_id, year)
    company_id,
    year,
    revenue,
    operating_profit
  FROM public.financial_data
  WHERE scrape_date <= (SELECT one_year_ago FROM date_series)
    AND scrape_date >= (SELECT one_year_ago FROM date_series) - INTERVAL '7 days'
  ORDER BY company_id, year, scrape_date DESC
)
SELECT
  cc.company_id,
  cc.name,
  cc.code,
  cc.market,
  cc.year,
  cc.is_estimate,
  cc.scrape_date as current_date,

  -- 현재 컨센서스
  cc.current_revenue,
  cc.current_op_profit,

  -- 전일 대비
  pd.revenue as prev_day_revenue,
  pd.operating_profit as prev_day_op_profit,
  CASE
    WHEN pd.revenue IS NOT NULL AND pd.revenue != 0
    THEN ((cc.current_revenue - pd.revenue)::DECIMAL / ABS(pd.revenue) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1d,
  CASE
    WHEN pd.operating_profit IS NOT NULL AND pd.operating_profit != 0
    THEN ((cc.current_op_profit - pd.operating_profit)::DECIMAL / ABS(pd.operating_profit) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1d,

  -- 1개월 전 대비
  om.revenue as one_month_revenue,
  om.operating_profit as one_month_op_profit,
  CASE
    WHEN om.revenue IS NOT NULL AND om.revenue != 0
    THEN ((cc.current_revenue - om.revenue)::DECIMAL / ABS(om.revenue) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1m,
  CASE
    WHEN om.operating_profit IS NOT NULL AND om.operating_profit != 0
    THEN ((cc.current_op_profit - om.operating_profit)::DECIMAL / ABS(om.operating_profit) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1m,

  -- 3개월 전 대비
  tm.revenue as three_month_revenue,
  tm.operating_profit as three_month_op_profit,
  CASE
    WHEN tm.revenue IS NOT NULL AND tm.revenue != 0
    THEN ((cc.current_revenue - tm.revenue)::DECIMAL / ABS(tm.revenue) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_3m,
  CASE
    WHEN tm.operating_profit IS NOT NULL AND tm.operating_profit != 0
    THEN ((cc.current_op_profit - tm.operating_profit)::DECIMAL / ABS(tm.operating_profit) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_3m,

  -- 1년 전 대비
  oy.revenue as one_year_revenue,
  oy.operating_profit as one_year_op_profit,
  CASE
    WHEN oy.revenue IS NOT NULL AND oy.revenue != 0
    THEN ((cc.current_revenue - oy.revenue)::DECIMAL / ABS(oy.revenue) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as revenue_change_1y,
  CASE
    WHEN oy.operating_profit IS NOT NULL AND oy.operating_profit != 0
    THEN ((cc.current_op_profit - oy.operating_profit)::DECIMAL / ABS(oy.operating_profit) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as op_profit_change_1y

FROM current_consensus cc
LEFT JOIN prev_day_consensus pd ON pd.company_id = cc.company_id AND pd.year = cc.year
LEFT JOIN one_month_consensus om ON om.company_id = cc.company_id AND om.year = cc.year
LEFT JOIN three_month_consensus tm ON tm.company_id = cc.company_id AND tm.year = cc.year
LEFT JOIN one_year_consensus oy ON oy.company_id = cc.company_id AND oy.year = cc.year;

-- 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_consensus_unique
  ON public.mv_consensus_changes(company_id, year);
CREATE INDEX IF NOT EXISTS idx_mv_consensus_changes
  ON public.mv_consensus_changes(revenue_change_1m DESC, op_profit_change_1m DESC);

-- ============================================
-- 4. 주가 분석 Materialized View
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_stock_analysis AS
WITH latest_prices AS (
  SELECT
    dsp.company_id,
    c.name,
    c.code,
    c.market,
    dsp.date as latest_date,
    dsp.close_price as current_price,
    dsp.change_rate,
    dsp.volume,
    ROW_NUMBER() OVER (PARTITION BY dsp.company_id ORDER BY dsp.date DESC) as rn
  FROM public.daily_stock_prices dsp
  JOIN public.companies c ON c.id = dsp.company_id
  WHERE dsp.close_price IS NOT NULL
),
ma_calculations AS (
  SELECT
    lp.company_id,
    lp.name,
    lp.code,
    lp.market,
    lp.latest_date,
    lp.current_price,
    lp.change_rate,
    lp.volume,
    public.calculate_ma_120(lp.company_id, lp.latest_date) as ma_120
  FROM latest_prices lp
  WHERE lp.rn = 1
),
week_52_data AS (
  SELECT
    company_id,
    MAX(close_price) as week_52_high,
    MIN(close_price) as week_52_low
  FROM public.daily_stock_prices
  WHERE date >= CURRENT_DATE - INTERVAL '52 weeks'
    AND close_price IS NOT NULL
  GROUP BY company_id
)
SELECT
  mc.company_id,
  mc.name,
  mc.code,
  mc.market,
  mc.latest_date,
  mc.current_price,
  mc.change_rate,
  mc.volume,
  mc.ma_120,
  public.calculate_divergence(mc.current_price, mc.ma_120) as divergence_120,
  w52.week_52_high,
  w52.week_52_low,
  CASE
    WHEN w52.week_52_high IS NOT NULL AND w52.week_52_high > 0
    THEN ((mc.current_price - w52.week_52_low)::DECIMAL / (w52.week_52_high - w52.week_52_low) * 100)::DECIMAL(10,2)
    ELSE NULL
  END as position_in_52w_range
FROM ma_calculations mc
LEFT JOIN week_52_data w52 ON w52.company_id = mc.company_id;

-- 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_stock_analysis_unique
  ON public.mv_stock_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_mv_stock_divergence
  ON public.mv_stock_analysis(divergence_120);

-- ============================================
-- 5. 투자 점수 계산 View
-- ============================================

CREATE OR REPLACE VIEW public.v_investment_opportunities AS
WITH consensus_scores AS (
  SELECT
    company_id,
    name,
    code,
    market,
    year,
    is_estimate,
    current_revenue,
    current_op_profit,
    revenue_change_1d,
    op_profit_change_1d,
    revenue_change_1m,
    op_profit_change_1m,
    revenue_change_3m,
    op_profit_change_3m,
    revenue_change_1y,
    op_profit_change_1y,

    -- 컨센서스 변화 점수
    GREATEST(
      CASE
        WHEN revenue_change_1m >= 30 THEN 100
        WHEN revenue_change_1m >= 20 THEN 80
        WHEN revenue_change_1m >= 10 THEN 60
        WHEN revenue_change_1m >= 5 THEN 40
        WHEN revenue_change_1m > 0 THEN 20
        ELSE 0
      END,
      CASE
        WHEN op_profit_change_1m >= 30 THEN 100
        WHEN op_profit_change_1m >= 20 THEN 80
        WHEN op_profit_change_1m >= 10 THEN 60
        WHEN op_profit_change_1m >= 5 THEN 40
        WHEN op_profit_change_1m > 0 THEN 20
        ELSE 0
      END
    )::INTEGER as consensus_score
  FROM public.mv_consensus_changes
),
divergence_scores AS (
  SELECT
    company_id,
    current_price,
    ma_120,
    divergence_120,
    week_52_high,
    week_52_low,
    position_in_52w_range,

    -- 이격도 점수
    CASE
      WHEN divergence_120 BETWEEN -10 AND 0 THEN 100
      WHEN divergence_120 BETWEEN 0 AND 5 THEN 90
      WHEN divergence_120 BETWEEN 5 AND 10 THEN 75
      WHEN divergence_120 BETWEEN 10 AND 15 THEN 60
      WHEN divergence_120 BETWEEN 15 AND 20 THEN 40
      WHEN divergence_120 BETWEEN 20 AND 30 THEN 20
      ELSE 0
    END::INTEGER as divergence_score
  FROM public.mv_stock_analysis
)
SELECT
  cs.company_id,
  cs.name,
  cs.code,
  cs.market,
  cs.year,
  cs.is_estimate,

  -- 재무 데이터
  cs.current_revenue,
  cs.current_op_profit,
  cs.revenue_change_1d,
  cs.op_profit_change_1d,
  cs.revenue_change_1m,
  cs.op_profit_change_1m,
  cs.revenue_change_3m,
  cs.op_profit_change_3m,
  cs.revenue_change_1y,
  cs.op_profit_change_1y,

  -- 주가 데이터
  ds.current_price,
  ds.ma_120,
  ds.divergence_120,
  ds.week_52_high,
  ds.week_52_low,
  ds.position_in_52w_range,

  -- 점수
  cs.consensus_score,
  ds.divergence_score,

  -- 종합 투자 점수
  (cs.consensus_score * 0.6 + ds.divergence_score * 0.4)::INTEGER as investment_score,

  -- 투자 등급
  CASE
    WHEN (cs.consensus_score * 0.6 + ds.divergence_score * 0.4) >= 80 THEN 'S급'
    WHEN (cs.consensus_score * 0.6 + ds.divergence_score * 0.4) >= 70 THEN 'A급'
    WHEN (cs.consensus_score * 0.6 + ds.divergence_score * 0.4) >= 60 THEN 'B급'
    WHEN (cs.consensus_score * 0.6 + ds.divergence_score * 0.4) >= 50 THEN 'C급'
    ELSE 'D급'
  END as investment_grade

FROM consensus_scores cs
LEFT JOIN divergence_scores ds ON ds.company_id = cs.company_id
WHERE cs.consensus_score > 0 OR ds.divergence_score > 0
ORDER BY investment_score DESC;

-- ============================================
-- 6. View 갱신 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.refresh_all_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_consensus_changes;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_stock_analysis;
END;
$$;

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ YoonStock Pro 스키마 확장 완료!';
  RAISE NOTICE '📊 생성된 객체:';
  RAISE NOTICE '  - 함수: calculate_ma_120(), calculate_divergence()';
  RAISE NOTICE '  - Materialized View: mv_consensus_changes, mv_stock_analysis';
  RAISE NOTICE '  - View: v_investment_opportunities';
  RAISE NOTICE '  - 갱신 함수: refresh_all_views()';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 다음 단계:';
  RAISE NOTICE '  1. SELECT refresh_all_views(); -- 초기 데이터 생성';
  RAISE NOTICE '  2. SELECT * FROM v_investment_opportunities LIMIT 10; -- 결과 확인';
END $$;
