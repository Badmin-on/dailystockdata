-- ============================================
-- v_investment_opportunities View 재생성
-- ============================================
-- 목적: MV → View 전환 후 삭제된 investment opportunities View 복구
-- 수정: 컬럼 이름을 mv_stock_analysis 구조에 맞게 수정
-- ============================================

-- 기존 View 삭제
DROP VIEW IF EXISTS v_investment_opportunities CASCADE;

-- View 재생성 (컬럼 이름 수정 적용)
CREATE OR REPLACE VIEW v_investment_opportunities AS
WITH scored_opportunities AS (
    SELECT
        c.company_id,
        c.code,
        c.name,
        c.year,
        c.market,

        -- 재무 데이터 (실제 컬럼명 사용)
        c.current_revenue,
        c.current_op_profit,
        c.revenue_change_1m,
        c.op_profit_change_1m,
        c.revenue_change_3m,
        c.op_profit_change_3m,

        -- 주가 데이터 (컬럼 이름 수정!)
        s.current_price,           -- close_price → current_price
        s.change_rate,
        s.ma_120,
        s.divergence_120,          -- divergence_rate → divergence_120
        s.week_52_high,
        s.week_52_low,
        s.position_in_52w_range,

        -- 컨센서스 변화 점수 (0-100) - 구간별 점수화
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
    revenue_change_1m,
    op_profit_change_1m,
    revenue_change_3m,
    op_profit_change_3m,
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
DO $$
DECLARE
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM v_investment_opportunities;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ v_investment_opportunities View 재생성 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 결과:';
    RAISE NOTICE '  - 레코드 수: % 건', view_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔧 수정 사항:';
    RAISE NOTICE '  - close_price → current_price';
    RAISE NOTICE '  - divergence_rate → divergence_120';
    RAISE NOTICE '  - consensus_score, divergence_score 컬럼 추가';
    RAISE NOTICE '';
    RAISE NOTICE '📅 동적 년도 필터 적용: year >= %', EXTRACT(YEAR FROM CURRENT_DATE);
    RAISE NOTICE '';
END $$;
