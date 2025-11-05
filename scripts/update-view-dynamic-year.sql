-- Update v_investment_opportunities View with Dynamic Year Filter
-- 실행 방법: Supabase SQL Editor에서 복사 후 실행
-- 목적: 매년 자동으로 현재 년도 이상만 표시하도록 변경

-- 기존 View 삭제
DROP VIEW IF EXISTS v_investment_opportunities;

-- 동적 년도 필터가 적용된 View 재생성
CREATE VIEW v_investment_opportunities AS
WITH scored_opportunities AS (
    SELECT
        c.company_id,
        c.code,
        c.name,
        c.year,

        -- 재무 데이터
        c.revenue,
        c.operating_profit,
        c.revenue_change_1m,
        c.op_change_1m,
        c.revenue_change_3m,
        c.op_change_3m,

        -- 주가 데이터
        s.close_price,
        s.change_rate,
        s.ma_120,
        s.divergence_rate,
        s.week_52_high,
        s.week_52_low,
        s.position_in_52w_range,

        -- 투자 점수 계산 (컨센서스 60% + 이격도 40%)
        ROUND(
            (
                -- 컨센서스 점수 (60%)
                (COALESCE(c.revenue_change_1m, 0) * 0.3 +
                 COALESCE(c.op_change_1m, 0) * 0.3) * 0.6
                +
                -- 이격도 점수 (40%) - 저평가일수록 높은 점수
                (CASE
                    WHEN s.divergence_rate < -10 THEN 40  -- 매우 저평가
                    WHEN s.divergence_rate < 0 THEN 30    -- 저평가
                    WHEN s.divergence_rate < 5 THEN 20    -- 적정가
                    WHEN s.divergence_rate < 15 THEN 10   -- 고평가
                    ELSE 0                                 -- 과열
                END)
            ), 2
        ) as investment_score,

        c.collected_at as last_updated
    FROM mv_consensus_changes c
    LEFT JOIN mv_stock_analysis s ON c.company_id = s.company_id
    WHERE c.year >= EXTRACT(YEAR FROM CURRENT_DATE)  -- 🔥 동적 년도 필터!
)
SELECT
    company_id,
    code,
    name,
    year,
    revenue,
    operating_profit,
    revenue_change_1m,
    op_change_1m,
    revenue_change_3m,
    op_change_3m,
    close_price,
    change_rate,
    ma_120,
    divergence_rate,
    week_52_high,
    week_52_low,
    position_in_52w_range,
    investment_score,

    -- 투자 등급 (S/A/B/C)
    CASE
        WHEN investment_score >= 80 THEN 'S'
        WHEN investment_score >= 70 THEN 'A'
        WHEN investment_score >= 60 THEN 'B'
        ELSE 'C'
    END as investment_grade,

    last_updated
FROM scored_opportunities
ORDER BY investment_score DESC;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ v_investment_opportunities View 업데이트 완료!';
    RAISE NOTICE '📅 동적 년도 필터 적용: year >= EXTRACT(YEAR FROM CURRENT_DATE)';
    RAISE NOTICE '🔄 매년 1월 1일 자동으로 필터가 업데이트됩니다';
    RAISE NOTICE '';
    RAISE NOTICE '현재 년도: %', EXTRACT(YEAR FROM CURRENT_DATE);
    RAISE NOTICE '필터 조건: year >= %', EXTRACT(YEAR FROM CURRENT_DATE);
END $$;
