-- ============================================
-- Materialized View를 Regular View로 전환
-- ============================================
-- 목적: MV 갱신 문제를 근본적으로 해결
-- 효과: 자동 갱신, 유지보수 제로, 성능 동일
-- 데이터: 1,788건 → 일반 View로도 빠름
-- ============================================

-- Step 1: 현재 MV 정의 확인
SELECT
  '📊 Step 1: 현재 Materialized View 정보' as step;

SELECT
  matviewname as view_name,
  ispopulated as is_populated,
  hasindexes as has_indexes,
  (SELECT COUNT(*) FROM mv_stock_analysis) as record_count
FROM pg_matviews
WHERE matviewname = 'mv_stock_analysis';

-- Step 2: MV 정의 추출 (백업용)
SELECT
  '🔍 Step 2: MV 정의 확인' as step;

SELECT pg_get_viewdef('mv_stock_analysis'::regclass, true) as mv_definition;

-- Step 3: 기존 MV 삭제
SELECT
  '🗑️ Step 3: 기존 Materialized View 삭제' as step;

DROP MATERIALIZED VIEW IF EXISTS mv_stock_analysis CASCADE;

-- Step 4: 일반 View로 재생성 (기존 MV 구조 유지)
SELECT
  '✨ Step 4: Regular View 생성' as step;

CREATE OR REPLACE VIEW mv_stock_analysis AS
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

-- Step 5: 권한 설정
GRANT SELECT ON mv_stock_analysis TO anon, authenticated;

-- Step 6: 변환 완료 확인
SELECT
  '✅ Step 5: 변환 완료 확인' as step;

SELECT
    'Regular View' as view_type,
    COUNT(*) as record_count,
    MAX(latest_date) as latest_date
FROM mv_stock_analysis;

-- Step 7: ETF 샘플 확인
SELECT
  '📋 Step 6: ETF 샘플 확인' as step;

SELECT
    mv.name as 종목명,
    mv.current_price as 현재가,
    mv.change_rate as 등락률,
    mv.divergence_120 as 이격도120,
    mv.latest_date as 데이터날짜
FROM mv_stock_analysis mv
JOIN companies c ON c.id = mv.company_id
WHERE c.is_etf = TRUE
ORDER BY mv.code
LIMIT 10;

-- Step 8: 성능 테스트
SELECT
  '⚡ Step 7: 성능 테스트' as step;

EXPLAIN ANALYZE
SELECT
    mv.company_id,
    mv.name,
    mv.current_price,
    mv.change_rate
FROM mv_stock_analysis mv
JOIN companies c ON c.id = mv.company_id
WHERE c.is_etf = TRUE
ORDER BY mv.code
LIMIT 100;

-- 완료 메시지
DO $$
DECLARE
    view_count INTEGER;
    latest_date_val DATE;
BEGIN
    SELECT COUNT(*), MAX(latest_date::DATE)
    INTO view_count, latest_date_val
    FROM mv_stock_analysis;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Materialized View → Regular View 전환 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 결과:';
    RAISE NOTICE '  - View 타입: Regular View (자동 갱신)';
    RAISE NOTICE '  - 레코드 수: % 건', view_count;
    RAISE NOTICE '  - 최신 날짜: %', latest_date_val;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 장점:';
    RAISE NOTICE '  ✅ 갱신 작업 불필요 (자동 최신화)';
    RAISE NOTICE '  ✅ GitHub Actions 간소화';
    RAISE NOTICE '  ✅ 유지보수 제로';
    RAISE NOTICE '  ✅ 항상 실시간 데이터';
    RAISE NOTICE '';
    RAISE NOTICE '다음 단계:';
    RAISE NOTICE '  1. GitHub Actions 워크플로우 업데이트';
    RAISE NOTICE '  2. 화면에서 정상 작동 확인';
    RAISE NOTICE '  3. RPC 함수 refresh_materialized_views 제거 (선택)';
    RAISE NOTICE '';
END $$;
