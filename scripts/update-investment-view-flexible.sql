-- ================================================================
-- Update v_investment_opportunities with flexible date matching
-- ================================================================
-- 3M도 활성화하고 1D/1Y 컬럼 노출
-- ================================================================

DROP VIEW IF EXISTS v_investment_opportunities CASCADE;

CREATE OR REPLACE VIEW v_investment_opportunities AS
WITH scored_opportunities AS (
    SELECT
        c.company_id,
        c.code,
        c.name,
        c.year,
        c.market,

        -- 재무 데이터
        c.current_revenue,
        c.current_op_profit,

        -- 변화율 (모두 mv_consensus_changes에서 가져옴)
        c.revenue_change_1d,
        c.op_profit_change_1d,
        c.revenue_change_1m,
        c.op_profit_change_1m,

        -- 3M 계산 (mv_consensus_changes에 없으면 NULL)
        -- 나중에 mv에 추가할 수 있음
        NULL::DECIMAL(10,2) as revenue_change_3m,
        NULL::DECIMAL(10,2) as op_profit_change_3m,

        c.revenue_change_1y,
        c.op_profit_change_1y,

        -- 비교 날짜 정보 (디버깅용)
        c.current_date,
        c.prev_day_date,
        c.one_month_date,
        c.one_year_date,

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

    -- 변화율 (1D, 1M, 3M, 1Y)
    revenue_change_1d,
    op_profit_change_1d,
    revenue_change_1m,
    op_profit_change_1m,
    revenue_change_3m,
    op_profit_change_3m,
    revenue_change_1y,
    op_profit_change_1y,

    -- 주가 데이터
    current_price,
    change_rate,
    ma_120,
    divergence_120,
    week_52_high,
    week_52_low,
    position_in_52w_range,

    -- 점수
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

SELECT '✅ v_investment_opportunities 업데이트 완료!' as status;

-- 샘플 확인
SELECT
  name,
  code,
  investment_grade,
  investment_score,
  revenue_change_1d,
  revenue_change_1m,
  revenue_change_1y
FROM v_investment_opportunities
ORDER BY investment_score DESC
LIMIT 10;
