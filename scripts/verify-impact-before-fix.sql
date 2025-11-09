-- ============================================
-- 수정 전 영향 범위 검증 쿼리
-- ============================================
-- 목적: 일반 주식 데이터가 영향받지 않음을 확인
-- ============================================

-- 1. 일반 주식 vs ETF 종목 수 확인
SELECT
  '📊 종목 구분 현황' as step;

SELECT
  CASE WHEN is_etf = TRUE THEN 'ETF' ELSE '일반 주식' END as 구분,
  COUNT(*) as 종목수
FROM companies
GROUP BY is_etf
ORDER BY is_etf;

-- 2. 일반 주식의 change_rate 정상 범위 확인
SELECT
  '✅ 일반 주식 등락률 정상 범위 확인' as step;

SELECT
  COUNT(*) as 전체_레코드수,
  COUNT(*) FILTER (WHERE change_rate IS NOT NULL) as 등락률_있는_레코드,
  COUNT(*) FILTER (WHERE ABS(change_rate) <= 30) as 정상_범위_레코드,
  COUNT(*) FILTER (WHERE ABS(change_rate) > 30) as 비정상_범위_레코드,
  ROUND(AVG(ABS(change_rate))::NUMERIC, 2) as 평균_절대_등락률
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = FALSE  -- ✅ 일반 주식만
  AND dsp.date >= CURRENT_DATE - INTERVAL '7 days'
  AND dsp.change_rate IS NOT NULL;

-- 3. ETF의 change_rate 비정상 범위 확인
SELECT
  '⚠️ ETF 등락률 비정상 범위 확인' as step;

SELECT
  COUNT(*) as 전체_레코드수,
  COUNT(*) FILTER (WHERE change_rate IS NOT NULL) as 등락률_있는_레코드,
  COUNT(*) FILTER (WHERE ABS(change_rate) <= 30) as 정상_범위_레코드,
  COUNT(*) FILTER (WHERE ABS(change_rate) > 30) as 비정상_범위_레코드,
  ROUND(AVG(ABS(change_rate))::NUMERIC, 2) as 평균_절대_등락률
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = TRUE  -- ⚠️ ETF만
  AND dsp.date >= CURRENT_DATE - INTERVAL '7 days'
  AND dsp.change_rate IS NOT NULL;

-- 4. 일반 주식 샘플 데이터 확인 (상위 10개)
SELECT
  '📋 일반 주식 샘플 (수정 전)' as step;

SELECT
  c.name as 종목명,
  c.code as 종목코드,
  dsp.date as 날짜,
  dsp.close_price as 종가,
  dsp.change_rate as 등락률
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = FALSE
  AND dsp.date >= CURRENT_DATE - INTERVAL '3 days'
  AND dsp.change_rate IS NOT NULL
ORDER BY dsp.date DESC, c.code
LIMIT 10;

-- 검증 결과
DO $$
DECLARE
    stock_normal INTEGER;
    stock_abnormal INTEGER;
    etf_normal INTEGER;
    etf_abnormal INTEGER;
BEGIN
    -- 일반 주식 통계
    SELECT
        COUNT(*) FILTER (WHERE ABS(change_rate) <= 30),
        COUNT(*) FILTER (WHERE ABS(change_rate) > 30)
    INTO stock_normal, stock_abnormal
    FROM daily_stock_prices dsp
    JOIN companies c ON c.id = dsp.company_id
    WHERE c.is_etf = FALSE
      AND dsp.date >= CURRENT_DATE - INTERVAL '7 days'
      AND dsp.change_rate IS NOT NULL;

    -- ETF 통계
    SELECT
        COUNT(*) FILTER (WHERE ABS(change_rate) <= 30),
        COUNT(*) FILTER (WHERE ABS(change_rate) > 30)
    INTO etf_normal, etf_abnormal
    FROM daily_stock_prices dsp
    JOIN companies c ON c.id = dsp.company_id
    WHERE c.is_etf = TRUE
      AND dsp.date >= CURRENT_DATE - INTERVAL '7 days'
      AND dsp.change_rate IS NOT NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 수정 전 영향 범위 검증 결과';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '일반 주식:';
    RAISE NOTICE '  - 정상 범위(±30%% 이내): % 건', stock_normal;
    RAISE NOTICE '  - 비정상 범위(±30%% 초과): % 건 ← 이게 0이면 정상!', stock_abnormal;
    RAISE NOTICE '';
    RAISE NOTICE 'ETF:';
    RAISE NOTICE '  - 정상 범위(±30%% 이내): % 건', etf_normal;
    RAISE NOTICE '  - 비정상 범위(±30%% 초과): % 건 ← 이게 많으면 수정 필요!', etf_abnormal;
    RAISE NOTICE '';

    IF stock_abnormal = 0 THEN
        RAISE NOTICE '✅ 일반 주식 데이터는 정상입니다!';
        RAISE NOTICE '✅ 수정 작업은 ETF만 영향을 줍니다!';
    ELSE
        RAISE NOTICE '⚠️ 일반 주식에도 비정상 데이터가 있습니다!';
        RAISE NOTICE '⚠️ 추가 조사가 필요합니다!';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
