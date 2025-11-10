-- ============================================
-- Update v_investment_opportunities View
-- ============================================
-- Add 1D and 1Y columns to the view
-- ============================================

DROP VIEW IF EXISTS v_investment_opportunities CASCADE;

CREATE OR REPLACE VIEW v_investment_opportunities AS
WITH scored_opportunities AS (
    SELECT
        c.company_id,
        c.code,
        c.name,
        c.year,
        c.market,

        -- 재무 데이터 (1D, 1M, 3M, 1Y 모두 포함)
        c.current_revenue,
        c.current_op_profit,

        -- 1D 변화율 (신규 추가)
        c.revenue_change_1d,
        c.op_profit_change_1d,

        -- 1M 변화율 (기존)
        c.revenue_change_1m,
        c.op_profit_change_1m,

        -- 3M 변화율 (기존)
        c.revenue_change_3m,
        c.op_profit_change_3m,

        -- 1Y 변화율 (신규 추가)
        c.revenue_change_1y,
        c.op_profit_change_1y,

        -- 주가 데이터
        s.current_price,
        s.change_rate,
        s.ma_120,
        s.divergence_120,
        s.week_52_high,
        s.week_52_low,
        s.position_in_52w_range,

        -- 컨센서스 변화 점수 (0-100) - 1M 기준
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

        -- 이격도 점수 (0-100)
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
    WHERE c.year >= EXTRACT(YEAR FROM CURRENT_DATE)  -- 동적 년도 필터
)
SELECT
    company_id,
    code,
    name,
    year,
    market,
    current_revenue,
    current_op_profit,

    -- 1D 변화율 (신규 컬럼)
    revenue_change_1d,
    op_profit_change_1d,

    -- 1M 변화율 (기존)
    revenue_change_1m,
    op_profit_change_1m,

    -- 3M 변화율 (기존)
    revenue_change_3m,
    op_profit_change_3m,

    -- 1Y 변화율 (신규 컬럼)
    revenue_change_1y,
    op_profit_change_1y,

    current_price,
    change_rate,
    ma_120,
    divergence_120,
    week_52_high,
    week_52_low,
    position_in_52w_range,

    -- 점수 (0-100 범위)
    consensus_score_calc as consensus_score,
    divergence_score_calc as divergence_score,

    -- 투자 점수 (컨센서스 60% + 이격도 40%)
    ROUND(
        (consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC,
        2
    ) as investment_score,

    -- 투자 등급 (S/A/B/C)
    CASE
        WHEN ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) >= 80 THEN 'S'
        WHEN ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) >= 70 THEN 'A'
        WHEN ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) >= 60 THEN 'B'
        ELSE 'C'
    END as investment_grade,

    last_updated
FROM scored_opportunities
ORDER BY ROUND((consensus_score_calc * 0.6 + divergence_score_calc * 0.4)::NUMERIC, 2) DESC;

-- 권한 설정
GRANT SELECT ON v_investment_opportunities TO anon, authenticated;

-- 완료 메시지
SELECT
  '✅ v_investment_opportunities view updated with 1D and 1Y columns!' as status;

-- 샘플 데이터 확인
SELECT
  name,
  code,
  revenue_change_1d,
  op_profit_change_1d,
  revenue_change_1m,
  revenue_change_1y,
  op_profit_change_1y
FROM v_investment_opportunities
WHERE revenue_change_1d IS NOT NULL OR revenue_change_1y IS NOT NULL
LIMIT 10;
