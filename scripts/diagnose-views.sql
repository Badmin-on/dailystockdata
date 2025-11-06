-- Diagnostic SQL for Troubleshooting View Issues
-- 실행 방법: Supabase SQL Editor에서 한 줄씩 실행하며 결과 확인

-- ========================================
-- Step 1: Materialized Views 존재 확인
-- ========================================
SELECT
    matviewname,
    schemaname,
    ispopulated,  -- true면 데이터가 채워져 있음
    matviewowner
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- ========================================
-- Step 2: mv_consensus_changes 컬럼 구조 확인
-- ========================================
SELECT
    column_name,
    data_type,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mv_consensus_changes'
ORDER BY ordinal_position;

-- ========================================
-- Step 3: mv_stock_analysis 컬럼 구조 확인
-- ========================================
SELECT
    column_name,
    data_type,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mv_stock_analysis'
ORDER BY ordinal_position;

-- ========================================
-- Step 4: 현재 v_investment_opportunities 정의 확인
-- ========================================
SELECT definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'v_investment_opportunities';

-- ========================================
-- Step 5: Materialized Views 데이터 샘플 확인
-- ========================================
-- mv_consensus_changes 샘플 (최근 5개)
SELECT * FROM mv_consensus_changes LIMIT 5;

-- mv_stock_analysis 샘플 (최근 5개)
SELECT * FROM mv_stock_analysis LIMIT 5;

-- ========================================
-- Step 6: Materialized Views 마지막 갱신 시간 확인
-- ========================================
SELECT
    schemaname,
    matviewname,
    last_refresh
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname IN ('mv_consensus_changes', 'mv_stock_analysis');

-- ========================================
-- Step 7: 현재 View 데이터 확인
-- ========================================
SELECT COUNT(*) as total_opportunities
FROM v_investment_opportunities;

SELECT * FROM v_investment_opportunities LIMIT 5;

-- ========================================
-- Step 8: 동적 년도 필터 테스트
-- ========================================
-- 현재 년도 확인
SELECT EXTRACT(YEAR FROM CURRENT_DATE) as current_year;

-- 현재 년도 데이터 확인
SELECT
    year,
    COUNT(*) as count
FROM mv_consensus_changes
GROUP BY year
ORDER BY year;

-- ========================================
-- 진단 결과 요약
-- ========================================
DO $$
DECLARE
    mv_consensus_exists BOOLEAN;
    mv_stock_exists BOOLEAN;
    view_exists BOOLEAN;
    current_yr INTEGER;
BEGIN
    -- Materialized Views 존재 확인
    SELECT EXISTS(SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_consensus_changes') INTO mv_consensus_exists;
    SELECT EXISTS(SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_stock_analysis') INTO mv_stock_exists;

    -- Normal View 존재 확인
    SELECT EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'v_investment_opportunities') INTO view_exists;

    -- 현재 년도
    SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER INTO current_yr;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '진단 결과 요약';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'mv_consensus_changes: %', CASE WHEN mv_consensus_exists THEN '✅ 존재' ELSE '❌ 없음' END;
    RAISE NOTICE 'mv_stock_analysis: %', CASE WHEN mv_stock_exists THEN '✅ 존재' ELSE '❌ 없음' END;
    RAISE NOTICE 'v_investment_opportunities: %', CASE WHEN view_exists THEN '✅ 존재' ELSE '❌ 없음' END;
    RAISE NOTICE '';
    RAISE NOTICE '현재 년도: %', current_yr;
    RAISE NOTICE '동적 필터 조건: year >= %', current_yr;
    RAISE NOTICE '';
    RAISE NOTICE '위 단계별 결과를 확인하여 문제를 진단하세요.';
    RAISE NOTICE '========================================';
END $$;
