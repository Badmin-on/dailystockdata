-- ============================================
-- ETF 등락률 데이터 수정 스크립트 (실행용)
-- ============================================
-- 목적: daily_stock_prices 테이블의 잘못된 ETF change_rate 수정
-- 문제: change_rate에 원화 금액(전일대비 가격차)이 저장되어 있음
-- 해결: 올바른 등락률(%) = (당일종가 - 전일종가) / 전일종가 * 100
-- ============================================

-- Step 1: 수정 전 현황 확인
SELECT
  '📊 수정 전 현황' as step,
  COUNT(*) as 전체_레코드수,
  COUNT(*) FILTER (WHERE change_rate IS NOT NULL AND ABS(change_rate) > 50) as 비정상_레코드수,
  ROUND(AVG(ABS(change_rate))::NUMERIC, 2) as 평균_절대값
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = TRUE
  AND dsp.date >= CURRENT_DATE - INTERVAL '30 days';

-- Step 2: ETF 데이터 수정 실행
WITH etf_companies AS (
  -- ETF 종목만 선택
  SELECT id FROM companies WHERE is_etf = TRUE
),
corrected_rates AS (
  -- 올바른 등락률 계산
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
  INNER JOIN etf_companies ec ON ec.id = dsp.company_id
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
  '✅ 수정 완료!' as step,
  COUNT(*) as 전체_레코드수,
  COUNT(*) FILTER (WHERE change_rate IS NOT NULL AND ABS(change_rate) > 50) as 비정상_레코드수_남음,
  ROUND(AVG(ABS(change_rate))::NUMERIC, 2) as 평균_절대값,
  ROUND(MIN(change_rate)::NUMERIC, 2) as 최소값,
  ROUND(MAX(change_rate)::NUMERIC, 2) as 최대값
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = TRUE
  AND dsp.date >= CURRENT_DATE - INTERVAL '30 days'
  AND change_rate IS NOT NULL;

-- Step 4: 샘플 데이터 확인 (수정 후)
SELECT
  '📋 샘플 데이터 (수정 후)' as step;

SELECT
  c.name as 종목명,
  c.code as 종목코드,
  dsp.date as 날짜,
  dsp.close_price as 종가,
  dsp.change_rate as 등락률,
  LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as 전일종가
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.code IN ('091160', '396500', '381170')
  AND dsp.date >= CURRENT_DATE - INTERVAL '5 days'
ORDER BY c.code, dsp.date DESC
LIMIT 15;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ETF change_rate 데이터 수정 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. 스크래퍼 코드 수정';
  RAISE NOTICE '2. Materialized View 갱신';
  RAISE NOTICE '3. 화면에서 정상 표시 확인';
  RAISE NOTICE '';
END $$;
