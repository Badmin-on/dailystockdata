-- ============================================
-- Rollback: Regular View를 Materialized View로 복구
-- ============================================
-- 목적: 문제 발생 시 원래 MV로 복구
-- 사용: MV → View 전환 후 문제가 있을 경우만 실행
-- ============================================

-- Step 1: 현재 View 제거
SELECT
  '🔄 Step 1: 현재 Regular View 삭제' as step;

DROP VIEW IF EXISTS mv_stock_analysis CASCADE;

-- Step 2: Materialized View 재생성 (기존 구조)
SELECT
  '✨ Step 2: Materialized View 재생성' as step;

CREATE MATERIALIZED VIEW mv_stock_analysis AS
WITH latest_prices AS (
    SELECT DISTINCT ON (company_id)
        company_id,
        date as latest_date,
        close_price as current_price,
        change_rate,
        volume
    FROM daily_stock_prices
    WHERE close_price IS NOT NULL
    ORDER BY company_id, date DESC
),
price_120d AS (
    SELECT
        company_id,
        AVG(close_price) as ma_120
    FROM (
        SELECT DISTINCT ON (company_id, date)
            company_id,
            close_price,
            date
        FROM daily_stock_prices
        WHERE close_price IS NOT NULL
          AND date >= CURRENT_DATE - INTERVAL '120 days'
        ORDER BY company_id, date DESC, close_price DESC
    ) sub
    GROUP BY company_id
),
week_52_stats AS (
    SELECT
        company_id,
        MAX(close_price) as week_52_high,
        MIN(close_price) as week_52_low
    FROM daily_stock_prices
    WHERE close_price IS NOT NULL
      AND date >= CURRENT_DATE - INTERVAL '52 weeks'
    GROUP BY company_id
)
SELECT
    c.id as company_id,
    c.name,
    c.code,
    c.market,
    lp.latest_date,
    lp.current_price,
    lp.change_rate,
    lp.volume,
    p120.ma_120,
    CASE
        WHEN p120.ma_120 IS NOT NULL AND p120.ma_120 > 0
        THEN ROUND(((lp.current_price - p120.ma_120) / p120.ma_120 * 100)::NUMERIC, 2)
        ELSE NULL
    END as divergence_120,
    w52.week_52_high,
    w52.week_52_low,
    CASE
        WHEN w52.week_52_high IS NOT NULL AND w52.week_52_low IS NOT NULL
             AND w52.week_52_high > w52.week_52_low
        THEN ROUND(((lp.current_price - w52.week_52_low) / (w52.week_52_high - w52.week_52_low) * 100)::NUMERIC, 2)
        ELSE NULL
    END as position_in_52w_range
FROM companies c
LEFT JOIN latest_prices lp ON c.id = lp.company_id
LEFT JOIN price_120d p120 ON c.id = p120.company_id
LEFT JOIN week_52_stats w52 ON c.id = w52.company_id
WHERE lp.current_price IS NOT NULL;

-- Step 3: 권한 설정
GRANT SELECT ON mv_stock_analysis TO anon, authenticated;

-- Step 4: 복구 완료 확인
SELECT
  '✅ Step 3: 복구 완료 확인' as step;

SELECT
    COUNT(*) as record_count,
    MAX(latest_date) as latest_date
FROM mv_stock_analysis;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Materialized View 복구 완료';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ 주의: GitHub Actions 워크플로우도 원래대로 복구해야 합니다.';
    RAISE NOTICE '   → .github/workflows/stock-data-cron.yml';
    RAISE NOTICE '';
    RAISE NOTICE '다음 단계:';
    RAISE NOTICE '  1. GitHub Actions에서 MV 갱신 단계 복구';
    RAISE NOTICE '  2. 수동으로 MV 갱신 필요: REFRESH MATERIALIZED VIEW mv_stock_analysis;';
    RAISE NOTICE '';
END $$;
