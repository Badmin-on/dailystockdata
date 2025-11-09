-- ============================================
-- ETF 종목 is_etf 플래그 수정
-- ============================================
-- 목적: ETF 패턴 종목들을 is_etf=TRUE로 일괄 업데이트
-- 대상: KODEX, TIGER, ACE, RISE, SOL, HANARO로 시작하는 종목
-- ============================================

-- Step 1: 현재 상태 확인
SELECT '📊 Step 1: 현재 is_etf 상태 확인' as step;

SELECT
    '현재 is_etf=TRUE 종목' as 구분,
    COUNT(*) as 개수
FROM companies
WHERE is_etf = TRUE;

-- Step 2: ETF 패턴 종목 확인
SELECT '🔍 Step 2: ETF 패턴 종목 확인' as step;

SELECT
    CASE
        WHEN name LIKE 'KODEX%' THEN 'KODEX'
        WHEN name LIKE 'TIGER%' THEN 'TIGER'
        WHEN name LIKE 'ACE%' THEN 'ACE'
        WHEN name LIKE 'RISE%' THEN 'RISE'
        WHEN name LIKE 'SOL%' THEN 'SOL'
        WHEN name LIKE 'HANARO%' THEN 'HANARO'
        WHEN name LIKE 'KBSTAR%' THEN 'KBSTAR'
        ELSE '기타'
    END as ETF운용사,
    COUNT(*) as 전체개수,
    COUNT(CASE WHEN is_etf = TRUE THEN 1 END) as is_etf_TRUE,
    COUNT(CASE WHEN is_etf = FALSE OR is_etf IS NULL THEN 1 END) as is_etf_FALSE
FROM companies
WHERE name LIKE 'KODEX%'
   OR name LIKE 'TIGER%'
   OR name LIKE 'ACE%'
   OR name LIKE 'RISE%'
   OR name LIKE 'SOL%'
   OR name LIKE 'HANARO%'
   OR name LIKE 'KBSTAR%'
GROUP BY ETF운용사
ORDER BY 전체개수 DESC;

-- Step 3: is_etf=TRUE로 업데이트
SELECT '✨ Step 3: is_etf=TRUE 업데이트 실행' as step;

UPDATE companies
SET is_etf = TRUE,
    updated_at = NOW()
WHERE (
    name LIKE 'KODEX%'
    OR name LIKE 'TIGER%'
    OR name LIKE 'ACE%'
    OR name LIKE 'RISE%'
    OR name LIKE 'SOL%'
    OR name LIKE 'HANARO%'
    OR name LIKE 'KBSTAR%'
)
AND (is_etf = FALSE OR is_etf IS NULL);

-- Step 4: etf_provider 설정 (컬럼이 있는 경우)
SELECT '🏢 Step 4: etf_provider 설정' as step;

UPDATE companies
SET etf_provider = CASE
    WHEN name LIKE 'KODEX%' THEN 'KODEX'
    WHEN name LIKE 'TIGER%' THEN 'TIGER'
    WHEN name LIKE 'ACE%' THEN 'ACE'
    WHEN name LIKE 'RISE%' THEN 'RISE'
    WHEN name LIKE 'SOL%' THEN 'SOL'
    WHEN name LIKE 'HANARO%' THEN 'HANARO'
    WHEN name LIKE 'KBSTAR%' THEN 'KBSTAR'
END,
updated_at = NOW()
WHERE is_etf = TRUE
  AND (
    name LIKE 'KODEX%'
    OR name LIKE 'TIGER%'
    OR name LIKE 'ACE%'
    OR name LIKE 'RISE%'
    OR name LIKE 'SOL%'
    OR name LIKE 'HANARO%'
    OR name LIKE 'KBSTAR%'
  );

-- Step 5: 업데이트 결과 확인
SELECT '✅ Step 5: 업데이트 결과 확인' as step;

SELECT
    '업데이트 후 is_etf=TRUE 종목' as 구분,
    COUNT(*) as 개수
FROM companies
WHERE is_etf = TRUE;

-- 운용사별 통계
SELECT
    etf_provider as 운용사,
    COUNT(*) as ETF개수,
    COUNT(CASE WHEN sector_id IS NOT NULL THEN 1 END) as 섹터할당,
    COUNT(CASE WHEN sector_id IS NULL THEN 1 END) as 섹터미할당
FROM companies
WHERE is_etf = TRUE
GROUP BY etf_provider
ORDER BY ETF개수 DESC;

-- Step 6: View 데이터 확인
SELECT '📋 Step 6: View 데이터 확인' as step;

SELECT
    'v_etf_details' as view_name,
    COUNT(*) as record_count
FROM v_etf_details;

SELECT
    sector_name as 섹터,
    etf_count as ETF수
FROM v_etf_sector_stats
ORDER BY etf_count DESC;

-- 완료 메시지
DO $$
DECLARE
    total_etfs INTEGER;
    with_sector INTEGER;
    without_sector INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_etfs FROM companies WHERE is_etf = TRUE;
    SELECT COUNT(*) INTO with_sector FROM companies WHERE is_etf = TRUE AND sector_id IS NOT NULL;
    SELECT COUNT(*) INTO without_sector FROM companies WHERE is_etf = TRUE AND sector_id IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ETF is_etf 플래그 수정 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 결과:';
    RAISE NOTICE '  - 전체 ETF: % 개', total_etfs;
    RAISE NOTICE '  - 섹터 할당: % 개', with_sector;
    RAISE NOTICE '  - 섹터 미할당: % 개', without_sector;
    RAISE NOTICE '';
    RAISE NOTICE '다음 단계:';
    IF without_sector > 0 THEN
        RAISE NOTICE '  ⚠️ % 개 ETF의 섹터 할당 필요', without_sector;
        RAISE NOTICE '  → 수동으로 섹터 할당 또는 자동 매칭 스크립트 실행';
    ELSE
        RAISE NOTICE '  ✅ 모든 ETF가 섹터에 할당되었습니다';
    END IF;
    RAISE NOTICE '';
END $$;
