-- ============================================
-- ETF 플래그 일괄 업데이트
-- ============================================
-- 목적: etf_provider가 있는 모든 종목을 is_etf = TRUE로 설정
-- 영향: ETF 모니터링 페이지만 (다른 기능 영향 없음)
-- ============================================

-- Step 1: 현재 상태 확인
SELECT '📊 Step 1: 현재 상태 확인' as step;

SELECT
    COUNT(*) FILTER (WHERE etf_provider IS NOT NULL) as "ETF_총개수",
    COUNT(*) FILTER (WHERE etf_provider IS NOT NULL AND is_etf = TRUE) as "is_etf_TRUE",
    COUNT(*) FILTER (WHERE etf_provider IS NOT NULL AND is_etf IS DISTINCT FROM TRUE) as "업데이트_대상"
FROM companies;

-- Step 2: 업데이트 대상 샘플 확인
SELECT '📋 Step 2: 업데이트 대상 샘플 (처음 10개)' as step;

SELECT
    code,
    name,
    etf_provider,
    is_etf as "현재_is_etf"
FROM companies
WHERE etf_provider IS NOT NULL
  AND is_etf IS DISTINCT FROM TRUE
ORDER BY etf_provider, name
LIMIT 10;

-- Step 3: 업데이트 실행
SELECT '✨ Step 3: is_etf 플래그 업데이트 실행' as step;

UPDATE companies
SET is_etf = TRUE
WHERE etf_provider IS NOT NULL
  AND is_etf IS DISTINCT FROM TRUE;

-- Step 4: 업데이트 결과 확인
SELECT '✅ Step 4: 업데이트 결과 확인' as step;

SELECT
    COUNT(*) FILTER (WHERE etf_provider IS NOT NULL) as "ETF_총개수",
    COUNT(*) FILTER (WHERE is_etf = TRUE) as "is_etf_TRUE",
    COUNT(*) FILTER (WHERE etf_provider IS NOT NULL AND is_etf IS DISTINCT FROM TRUE) as "남은_미설정"
FROM companies;

-- Step 5: 운용사별 통계
SELECT '📈 Step 5: 운용사별 ETF 개수' as step;

SELECT
    etf_provider as "운용사",
    COUNT(*) as "ETF_개수"
FROM companies
WHERE is_etf = TRUE
GROUP BY etf_provider
ORDER BY COUNT(*) DESC;

-- Step 6: 섹터 할당 상태 확인
SELECT '🏷️  Step 6: 섹터 할당 상태' as step;

SELECT
    COUNT(*) FILTER (WHERE etf_sector IS NOT NULL) as "섹터_할당됨",
    COUNT(*) FILTER (WHERE etf_sector IS NULL) as "섹터_미할당"
FROM companies
WHERE is_etf = TRUE;

-- 완료 메시지
DO $$
DECLARE
    total_etfs INTEGER;
    with_sector INTEGER;
    without_sector INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_etfs FROM companies WHERE is_etf = TRUE;
    SELECT COUNT(*) INTO with_sector FROM companies WHERE is_etf = TRUE AND etf_sector IS NOT NULL;
    SELECT COUNT(*) INTO without_sector FROM companies WHERE is_etf = TRUE AND etf_sector IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ETF 플래그 업데이트 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 결과:';
    RAISE NOTICE '  - 전체 ETF: % 개', total_etfs;
    RAISE NOTICE '  - 섹터 할당됨: % 개', with_sector;
    RAISE NOTICE '  - 섹터 미할당: % 개', without_sector;
    RAISE NOTICE '';
    RAISE NOTICE '✨ 다음 단계:';
    RAISE NOTICE '  1. 브라우저에서 /etf-monitoring 페이지 새로고침';
    RAISE NOTICE '  2. Hard Refresh (Ctrl+Shift+R 또는 Cmd+Shift+R)';
    RAISE NOTICE '  3. ETF 개수 확인: 15개 → %개로 증가', total_etfs;
    RAISE NOTICE '';
    IF without_sector > 0 THEN
        RAISE NOTICE '⚠️  주의: %개 ETF가 아직 섹터 미할당', without_sector;
        RAISE NOTICE '   (섹터 할당은 선택사항)';
    END IF;
    RAISE NOTICE '========================================';
END $$;
