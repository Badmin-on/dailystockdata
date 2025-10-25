-- Fix Investment Score Calculation
-- 문제: GREATEST 사용으로 인해 한쪽만 좋아도 100점 받는 문제
-- 해결: 평균 사용 + 두 값 모두 양수일 때만 높은 점수

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

    -- 매출 점수 계산
    COALESCE(
      CASE
        WHEN revenue_change_1m >= 30 THEN 100
        WHEN revenue_change_1m >= 20 THEN 80
        WHEN revenue_change_1m >= 10 THEN 60
        WHEN revenue_change_1m >= 5 THEN 40
        WHEN revenue_change_1m > 0 THEN 20
        ELSE 0
      END, 0
    ) as revenue_score,
    
    -- 영업이익 점수 계산
    COALESCE(
      CASE
        WHEN op_profit_change_1m >= 30 THEN 100
        WHEN op_profit_change_1m >= 20 THEN 80
        WHEN op_profit_change_1m >= 10 THEN 60
        WHEN op_profit_change_1m >= 5 THEN 40
        WHEN op_profit_change_1m > 0 THEN 20
        ELSE 0
      END, 0
    ) as op_profit_score,

    -- 컨센서스 점수: 평균 사용 (둘 다 좋아야 높은 점수)
    (
      COALESCE(
        CASE
          WHEN revenue_change_1m >= 30 THEN 100
          WHEN revenue_change_1m >= 20 THEN 80
          WHEN revenue_change_1m >= 10 THEN 60
          WHEN revenue_change_1m >= 5 THEN 40
          WHEN revenue_change_1m > 0 THEN 20
          ELSE 0
        END, 0
      ) + 
      COALESCE(
        CASE
          WHEN op_profit_change_1m >= 30 THEN 100
          WHEN op_profit_change_1m >= 20 THEN 80
          WHEN op_profit_change_1m >= 10 THEN 60
          WHEN op_profit_change_1m >= 5 THEN 40
          WHEN op_profit_change_1m > 0 THEN 20
          ELSE 0
        END, 0
      )
    ) / 2.0 as consensus_score
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

    COALESCE(
      CASE
        WHEN divergence_120 BETWEEN -10 AND 0 THEN 100
        WHEN divergence_120 BETWEEN 0 AND 5 THEN 90
        WHEN divergence_120 BETWEEN 5 AND 10 THEN 75
        WHEN divergence_120 BETWEEN 10 AND 15 THEN 60
        WHEN divergence_120 BETWEEN 15 AND 20 THEN 40
        WHEN divergence_120 BETWEEN 20 AND 30 THEN 20
        ELSE 0
      END, 0
    )::INTEGER as divergence_score
  FROM public.mv_stock_analysis
)
SELECT
  cs.company_id,
  cs.name,
  cs.code,
  cs.market,
  cs.year,
  cs.is_estimate,

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

  ds.current_price,
  ds.ma_120,
  ds.divergence_120,
  ds.week_52_high,
  ds.week_52_low,
  ds.position_in_52w_range,

  ROUND(cs.consensus_score)::INTEGER as consensus_score,
  ds.divergence_score,

  ROUND(cs.consensus_score * 0.6 + ds.divergence_score * 0.4)::INTEGER as investment_score,

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

-- 변경사항 확인
SELECT 
  name,
  code,
  revenue_change_1m,
  op_profit_change_1m,
  consensus_score,
  divergence_score,
  investment_score,
  investment_grade
FROM public.v_investment_opportunities
LIMIT 10;
