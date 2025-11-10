-- ============================================
-- Materialized View 문제 분석 쿼리
-- ============================================

-- 1. 현재 mv_stock_analysis 상태 확인
SELECT
  '📊 Step 1: Materialized View 존재 여부' as step;

SELECT
  matviewname as view_name,
  schemaname as schema,
  ispopulated as is_populated,
  hasindexes as has_indexes
FROM pg_matviews
WHERE matviewname = 'mv_stock_analysis';

-- 2. UNIQUE INDEX 확인 (CONCURRENTLY 갱신에 필요)
SELECT
  '🔍 Step 2: UNIQUE INDEX 확인' as step;

SELECT
  indexname as index_name,
  indexdef as index_definition
FROM pg_indexes
WHERE tablename = 'mv_stock_analysis';

-- 3. 현재 데이터 건수 및 최신 날짜
SELECT
  '📋 Step 3: 현재 데이터 상태' as step;

SELECT
  COUNT(*) as total_records,
  MAX(latest_date) as most_recent_date,
  MIN(latest_date) as oldest_date,
  COUNT(DISTINCT company_id) as company_count
FROM mv_stock_analysis;

-- 4. daily_stock_prices와 비교 (갱신 필요 여부)
SELECT
  '⚠️ Step 4: 갱신 필요 여부 확인' as step;

WITH latest_price_date AS (
  SELECT MAX(date) as max_date
  FROM daily_stock_prices
),
mv_latest_date AS (
  SELECT MAX(latest_date) as max_date
  FROM mv_stock_analysis
)
SELECT
  lp.max_date as 실제_최신_데이터,
  mv.max_date as MV_최신_데이터,
  CASE
    WHEN lp.max_date > mv.max_date THEN '⚠️ 갱신 필요!'
    WHEN lp.max_date = mv.max_date THEN '✅ 최신 상태'
    ELSE '❓ 확인 필요'
  END as 상태
FROM latest_price_date lp, mv_latest_date mv;

-- 5. 일반 View로 전환 시 성능 예측
SELECT
  '⚡ Step 5: 일반 View 성능 예측' as step;

EXPLAIN ANALYZE
SELECT
  company_id,
  name,
  code,
  current_price,
  change_rate
FROM mv_stock_analysis
LIMIT 100;

-- 진단 결과
DO $$
DECLARE
    has_unique_index BOOLEAN;
    is_outdated BOOLEAN;
    record_count INTEGER;
BEGIN
    -- UNIQUE INDEX 확인
    SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'mv_stock_analysis'
          AND indexdef LIKE '%UNIQUE%'
    ) INTO has_unique_index;

    -- 오래된 데이터 확인
    SELECT
        CASE WHEN MAX(mv.latest_date) < (SELECT MAX(date) FROM daily_stock_prices)
        THEN TRUE ELSE FALSE END
    INTO is_outdated
    FROM mv_stock_analysis mv;

    -- 레코드 수
    SELECT COUNT(*) INTO record_count FROM mv_stock_analysis;

    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 Materialized View 진단 결과';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 기본 정보:';
    RAISE NOTICE '  - 레코드 수: %', record_count;
    RAISE NOTICE '  - UNIQUE INDEX: %', CASE WHEN has_unique_index THEN '✅ 있음' ELSE '❌ 없음' END;
    RAISE NOTICE '  - 데이터 상태: %', CASE WHEN is_outdated THEN '⚠️ 오래됨' ELSE '✅ 최신' END;
    RAISE NOTICE '';
    RAISE NOTICE '💡 권장 사항:';

    IF NOT has_unique_index THEN
        RAISE NOTICE '  ⚠️ UNIQUE INDEX가 없어 CONCURRENTLY 갱신 불가';
        RAISE NOTICE '  → 해결책 1: UNIQUE INDEX 생성';
        RAISE NOTICE '  → 해결책 2: DROP & CREATE 방식 사용';
        RAISE NOTICE '  → 해결책 3: 일반 View로 변경';
    END IF;

    IF record_count < 10000 THEN
        RAISE NOTICE '  💡 레코드가 적음 (< 10,000건)';
        RAISE NOTICE '  → 일반 View로 변경 고려';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
