-- ============================================
-- 모든 종목 change_rate 재계산 스크립트
-- ============================================
-- 목적: daily_stock_prices 테이블의 모든 change_rate 수정
-- 대상: 일반 주식 + ETF (모든 종목)
-- 문제: change_rate에 원화 금액(전일대비 가격차)이 저장되어 있음
-- 해결: 올바른 등락률(%) = (당일종가 - 전일종가) / 전일종가 * 100
-- ============================================

-- Step 1: 수정 전 현황 확인
SELECT
  '📊 수정 전 현황 (모든 종목)' as step;

SELECT
  COUNT(*) as 전체_레코드수,
  COUNT(*) FILTER (WHERE change_rate IS NOT NULL AND ABS(change_rate) > 50) as 비정상_레코드수,
  COUNT(*) FILTER (WHERE change_rate IS NOT NULL AND ABS(change_rate) <= 30) as 정상_범위_레코드수,
  ROUND(AVG(ABS(change_rate))::NUMERIC, 2) as 평균_절대값
FROM daily_stock_prices
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  AND change_rate IS NOT NULL;

-- Step 2: 모든 종목 데이터 수정 실행
SELECT
  '🔄 모든 종목 change_rate 재계산 중...' as step;

WITH corrected_rates AS (
  -- 올바른 등락률 계산 (모든 종목)
  SELECT
    dsp.id as price_id,
    dsp.company_id,
    dsp.date,
    dsp.close_price as current_price,
    LAG(dsp.close_price) OVER (
      PARTITION BY dsp.company_id
      ORDER BY dsp.date
    ) as prev_price,
    dsp.change_rate as old_change_rate,
    -- 올바른 등락률 계산
    CASE
      WHEN LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) IS NULL THEN NULL
      WHEN LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) = 0 THEN NULL
      ELSE ROUND(
        ((dsp.close_price - LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date))
         / LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) * 100)::NUMERIC,
        2
      )
    END as correct_change_rate
  FROM daily_stock_prices dsp
  WHERE dsp.close_price IS NOT NULL
)
UPDATE daily_stock_prices dsp
SET change_rate = cr.correct_change_rate
FROM corrected_rates cr
WHERE dsp.id = cr.price_id
  AND cr.correct_change_rate IS NOT NULL
  AND dsp.change_rate IS DISTINCT FROM cr.correct_change_rate;

-- Step 3: 수정 결과 확인
SELECT
  '✅ 수정 완료!' as step;

SELECT
  COUNT(*) as 전체_레코드수,
  COUNT(*) FILTER (WHERE change_rate IS NOT NULL AND ABS(change_rate) > 50) as 비정상_레코드수_남음,
  COUNT(*) FILTER (WHERE change_rate IS NOT NULL AND ABS(change_rate) <= 30) as 정상_범위_레코드수,
  ROUND(AVG(ABS(change_rate))::NUMERIC, 2) as 평균_절대값,
  ROUND(MIN(change_rate)::NUMERIC, 2) as 최소값,
  ROUND(MAX(change_rate)::NUMERIC, 2) as 최대값
FROM daily_stock_prices
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  AND change_rate IS NOT NULL;

-- Step 4: 샘플 데이터 확인 (수정 후)
SELECT
  '📋 샘플 데이터 (수정 후)' as step;

-- 일반 주식 샘플
SELECT
  '일반 주식 샘플' as 구분,
  c.name as 종목명,
  c.code as 종목코드,
  dsp.date as 날짜,
  dsp.close_price as 종가,
  dsp.change_rate as 등락률,
  LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as 전일종가
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = FALSE
  AND dsp.date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY dsp.date DESC, c.code
LIMIT 5;

-- ETF 샘플
SELECT
  'ETF 샘플' as 구분,
  c.name as 종목명,
  c.code as 종목코드,
  dsp.date as 날짜,
  dsp.close_price as 종가,
  dsp.change_rate as 등락률,
  LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as 전일종가
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = TRUE
  AND dsp.date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY dsp.date DESC, c.code
LIMIT 5;

-- 완료 메시지
DO $$
DECLARE
    total_fixed INTEGER;
    abnormal_remaining INTEGER;
BEGIN
    -- 수정된 레코드 수 계산
    SELECT COUNT(*) INTO total_fixed
    FROM daily_stock_prices
    WHERE change_rate IS NOT NULL
      AND date >= CURRENT_DATE - INTERVAL '30 days';

    SELECT COUNT(*) INTO abnormal_remaining
    FROM daily_stock_prices
    WHERE change_rate IS NOT NULL
      AND ABS(change_rate) > 50
      AND date >= CURRENT_DATE - INTERVAL '30 days';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 모든 종목 change_rate 재계산 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 처리 결과:';
    RAISE NOTICE '  - 최근 30일 레코드 수: % 건', total_fixed;
    RAISE NOTICE '  - 비정상 범위 남은 레코드: % 건', abnormal_remaining;
    RAISE NOTICE '';

    IF abnormal_remaining = 0 THEN
        RAISE NOTICE '✅ 모든 데이터가 정상 범위(±50%% 이내)입니다!';
    ELSE
        RAISE NOTICE '⚠️ 비정상 범위 레코드가 남아있습니다. 추가 확인 필요.';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '다음 단계:';
    RAISE NOTICE '1. Trigger 생성 (create-change-rate-trigger-all.sql)';
    RAISE NOTICE '2. Materialized View 갱신 (refresh-mv-stock-analysis.sql)';
    RAISE NOTICE '3. 화면에서 정상 표시 확인';
    RAISE NOTICE '';
END $$;
