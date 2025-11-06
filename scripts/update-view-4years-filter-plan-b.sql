-- Update v_investment_opportunities View with 4-Year Dynamic Filter (Plan B)
-- 실제 Supabase View 구조에 맞춘 업데이트
-- 목적: Year, Year+1, Year+2, Year+3 (총 4년)만 표시
-- 실행 방법: Supabase SQL Editor에서 전체 복사 후 실행

-- 기존 View 삭제
DROP VIEW IF EXISTS v_investment_opportunities CASCADE;

-- 4년 동적 필터가 적용된 View 재생성 (차선책)
CREATE VIEW v_investment_opportunities AS
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
        GREATEST(
            COALESCE(
                CASE
                    WHEN revenue_change_1m >= 30 THEN 100
                    WHEN revenue_change_1m >= 20 THEN 80
                    WHEN revenue_change_1m >= 10 THEN 60
                    WHEN revenue_change_1m >= 5 THEN 40
                    WHEN revenue_change_1m > 0 THEN 20
                    ELSE 0
                END, 0),
            COALESCE(
                CASE
                    WHEN op_profit_change_1m >= 30 THEN 100
                    WHEN op_profit_change_1m >= 20 THEN 80
                    WHEN op_profit_change_1m >= 10 THEN 60
                    WHEN op_profit_change_1m >= 5 THEN 40
                    WHEN op_profit_change_1m > 0 THEN 20
                    ELSE 0
                END, 0)
        ) AS consensus_score
    FROM mv_consensus_changes
    -- 🔥 4년 동적 필터 (차선책): Year부터 Year+3까지 (총 4년)
    WHERE year BETWEEN
        EXTRACT(YEAR FROM CURRENT_DATE)
        AND
        EXTRACT(YEAR FROM CURRENT_DATE) + 3
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
                WHEN divergence_120 >= -10 AND divergence_120 <= 0 THEN 100
                WHEN divergence_120 >= 0 AND divergence_120 <= 5 THEN 90
                WHEN divergence_120 >= 5 AND divergence_120 <= 10 THEN 75
                WHEN divergence_120 >= 10 AND divergence_120 <= 15 THEN 60
                WHEN divergence_120 >= 15 AND divergence_120 <= 20 THEN 40
                WHEN divergence_120 >= 20 AND divergence_120 <= 30 THEN 20
                ELSE 0
            END, 0) AS divergence_score
    FROM mv_stock_analysis
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
    cs.consensus_score,
    ds.divergence_score,
    ((cs.consensus_score::numeric * 0.6) + (ds.divergence_score::numeric * 0.4))::integer AS investment_score,
    CASE
        WHEN ((cs.consensus_score::numeric * 0.6) + (ds.divergence_score::numeric * 0.4)) >= 80 THEN 'S급'
        WHEN ((cs.consensus_score::numeric * 0.6) + (ds.divergence_score::numeric * 0.4)) >= 70 THEN 'A급'
        WHEN ((cs.consensus_score::numeric * 0.6) + (ds.divergence_score::numeric * 0.4)) >= 60 THEN 'B급'
        WHEN ((cs.consensus_score::numeric * 0.6) + (ds.divergence_score::numeric * 0.4)) >= 50 THEN 'C급'
        ELSE 'D급'
    END AS investment_grade
FROM consensus_scores cs
LEFT JOIN divergence_scores ds ON ds.company_id = cs.company_id
WHERE (cs.consensus_score > 0 OR ds.divergence_score > 0)
ORDER BY (((cs.consensus_score::numeric * 0.6) + (ds.divergence_score::numeric * 0.4))::integer) DESC;

-- 완료 메시지
DO $$
DECLARE
    current_yr INTEGER;
BEGIN
    SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER INTO current_yr;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ v_investment_opportunities View 업데이트 완료! (차선책)';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📅 4년 동적 필터 적용: Year ~ Year+3';
    RAISE NOTICE '🔄 매년 1월 1일 0시 자동으로 필터 업데이트';
    RAISE NOTICE '';
    RAISE NOTICE '현재 년도: %', current_yr;
    RAISE NOTICE '필터 범위: % ~ % (총 4년)', current_yr, current_yr + 3;
    RAISE NOTICE '';
    RAISE NOTICE '년도별 예시:';
    RAISE NOTICE '  - 2025년: 2025, 2026, 2027, 2028 표시';
    RAISE NOTICE '  - 2026년: 2026, 2027, 2028, 2029 표시';
    RAISE NOTICE '  - 2027년: 2027, 2028, 2029, 2030 표시';
    RAISE NOTICE '';
    RAISE NOTICE '변경 사항:';
    RAISE NOTICE '  - BEFORE: 모든 년도 표시 (2024~2028, 총 5년)';
    RAISE NOTICE '  - AFTER: % ~ % 만 표시 (총 4년)', current_yr, current_yr + 3;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  참고: 과거 년도(%) 데이터는 숨겨집니다', current_yr - 1;
    RAISE NOTICE '';
    RAISE NOTICE '검증 쿼리:';
    RAISE NOTICE '  SELECT year, COUNT(*) as count';
    RAISE NOTICE '  FROM v_investment_opportunities';
    RAISE NOTICE '  GROUP BY year';
    RAISE NOTICE '  ORDER BY year;';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
