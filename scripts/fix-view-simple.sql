-- 간단한 투자 기회 View (비교 데이터 없이도 작동)
-- 문제: 과거 데이터가 없어서 증감률 계산 불가
-- 해결: 증감률이 NULL이면 0점 처리, 절대값으로 판단

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

    -- 매출 점수 (NULL이면 0점)
    CASE
      WHEN revenue_change_1m IS NULL THEN 0
      WHEN revenue_change_1m >= 30 THEN 100
      WHEN revenue_change_1m >= 20 THEN 80
      WHEN revenue_change_1m >= 10 THEN 60
      WHEN revenue_change_1m >= 5 THEN 40
      WHEN revenue_change_1m > 0 THEN 20
      ELSE 0
    END as revenue_score,
    
    -- 영업이익 점수 (NULL이면 0점)
    CASE
      WHEN op_profit_change_1m IS NULL THEN 0
      WHEN op_profit_change_1m >= 30 THEN 100
      WHEN op_profit_change_1m >= 20 THEN 80
      WHEN op_profit_change_1m >= 10 THEN 60
      WHEN op_profit_change_1m >= 5 THEN 40
      WHEN op_profit_change_1m > 0 THEN 20
      ELSE 0
    END as op_profit_score,

    -- 컨센서스 점수: 평균 (NULL이면 0점)
    (
      CASE
        WHEN revenue_change_1m IS NULL THEN 0
        WHEN revenue_change_1m >= 30 THEN 100
        WHEN revenue_change_1m >= 20 THEN 80
        WHEN revenue_change_1m >= 10 THEN 60
        WHEN revenue_change_1m >= 5 THEN 40
        WHEN revenue_change_1m > 0 THEN 20
        ELSE 0
      END + 
      CASE
        WHEN op_profit_change_1m IS NULL THEN 0
        WHEN op_profit_change_1m >= 30 THEN 100
        WHEN op_profit_change_1m >= 20 THEN 80
        WHEN op_profit_change_1m >= 10 THEN 60
        WHEN op_profit_change_1m >= 5 THEN 40
        WHEN op_profit_change_1m > 0 THEN 20
        ELSE 0
      END
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

    -- 이격도 점수 (NULL이면 0점)
    CASE
      WHEN divergence_120 IS NULL THEN 0
      WHEN divergence_120 BETWEEN -10 AND 0 THEN 100
      WHEN divergence_120 BETWEEN 0 AND 5 THEN 90
      WHEN divergence_120 BETWEEN 5 AND 10 THEN 75
      WHEN divergence_120 BETWEEN 10 AND 15 THEN 60
      WHEN divergence_120 BETWEEN 15 AND 20 THEN 40
      WHEN divergence_120 BETWEEN 20 AND 30 THEN 20
      WHEN divergence_120 < -10 THEN 80  -- 큰 저평가도 좋은 기회
      ELSE 0
    END as divergence_score
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

  -- 투자 점수: 가격 분석에 더 큰 가중치 (재무 데이터가 부족하므로)
  ROUND(cs.consensus_score * 0.3 + ds.divergence_score * 0.7)::INTEGER as investment_score,

  CASE
    WHEN (cs.consensus_score * 0.3 + ds.divergence_score * 0.7) >= 80 THEN 'S급'
    WHEN (cs.consensus_score * 0.3 + ds.divergence_score * 0.7) >= 70 THEN 'A급'
    WHEN (cs.consensus_score * 0.3 + ds.divergence_score * 0.7) >= 60 THEN 'B급'
    WHEN (cs.consensus_score * 0.3 + ds.divergence_score * 0.7) >= 50 THEN 'C급'
    ELSE 'D급'
  END as investment_grade

FROM consensus_scores cs
LEFT JOIN divergence_scores ds ON ds.company_id = cs.company_id
-- 주가 데이터만 있어도 보여주기 (재무 데이터는 선택사항)
WHERE ds.divergence_score > 0
ORDER BY investment_score DESC;

COMMENT ON VIEW public.v_investment_opportunities IS '투자 기회 발굴 View - 과거 비교 데이터가 없어도 작동 가능';
