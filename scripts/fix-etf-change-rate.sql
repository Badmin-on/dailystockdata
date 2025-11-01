-- ============================================
-- ETF 등락률 데이터 수정 스크립트
-- ============================================
-- 목적: daily_stock_prices 테이블의 잘못된 ETF change_rate 수정
-- 문제: change_rate에 전일 종가가 저장되어 있음
-- 해결: 올바른 등락률 = (당일종가 - 전일종가) / 전일종가 * 100
-- ============================================

-- Step 1: 임시 테이블로 올바른 등락률 계산
DROP TABLE IF EXISTS temp_etf_change_rates;

CREATE TEMP TABLE temp_etf_change_rates AS
WITH etf_companies AS (
  -- ETF 종목만 선택
  SELECT id FROM companies WHERE is_etf = TRUE
),
price_with_prev AS (
  -- 각 종목의 전일 종가 계산
  SELECT
    dsp.company_id,
    dsp.date,
    dsp.close_price as current_price,
    LAG(dsp.close_price) OVER (
      PARTITION BY dsp.company_id
      ORDER BY dsp.date
    ) as prev_price,
    dsp.change_rate as old_change_rate
  FROM daily_stock_prices dsp
  INNER JOIN etf_companies ec ON ec.id = dsp.company_id
  WHERE dsp.close_price IS NOT NULL
)
SELECT
  company_id,
  date,
  current_price,
  prev_price,
  old_change_rate,
  -- 올바른 등락률 계산
  CASE
    WHEN prev_price IS NULL THEN NULL
    WHEN prev_price = 0 THEN NULL
    ELSE ROUND(((current_price - prev_price) / prev_price * 100)::NUMERIC, 2)
  END as correct_change_rate,
  -- 절대 등락금액
  CASE
    WHEN prev_price IS NULL THEN NULL
    ELSE (current_price - prev_price)
  END as change_amount
FROM price_with_prev;

-- Step 2: 데이터 검증 (수정 전 확인용)
SELECT
  '검증: ETF 등락률 수정 대상' as info,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE old_change_rate IS NOT NULL AND old_change_rate > 100) as abnormal_records,
  ROUND(AVG(ABS(old_change_rate))::NUMERIC, 2) as avg_old_change_rate,
  ROUND(AVG(ABS(correct_change_rate))::NUMERIC, 2) as avg_correct_change_rate
FROM temp_etf_change_rates
WHERE correct_change_rate IS NOT NULL;

-- Step 3: 샘플 데이터 확인 (상위 10개)
SELECT
  c.name,
  c.code,
  t.date,
  t.current_price,
  t.prev_price,
  t.old_change_rate as old_rate,
  t.correct_change_rate as new_rate,
  t.change_amount
FROM temp_etf_change_rates t
JOIN companies c ON c.id = t.company_id
WHERE t.correct_change_rate IS NOT NULL
ORDER BY t.date DESC, c.code
LIMIT 10;

-- ============================================
-- ⚠️ 주의: 아래 UPDATE 문은 실제 데이터를 변경합니다
-- 위의 검증 결과를 확인한 후 실행하세요
-- ============================================

-- Step 4: daily_stock_prices 테이블 업데이트
-- 주석을 해제하고 실행:

/*
UPDATE daily_stock_prices dsp
SET change_rate = t.correct_change_rate
FROM temp_etf_change_rates t
WHERE dsp.company_id = t.company_id
  AND dsp.date = t.date
  AND t.correct_change_rate IS NOT NULL;

-- 업데이트 결과 확인
SELECT
  '업데이트 완료' as status,
  COUNT(*) as updated_records
FROM temp_etf_change_rates
WHERE correct_change_rate IS NOT NULL;
*/

-- Step 5: 업데이트 후 검증
/*
SELECT
  c.name,
  c.code,
  dsp.date,
  dsp.close_price,
  dsp.change_rate,
  LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as prev_price
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = TRUE
  AND dsp.date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY dsp.date DESC, c.code
LIMIT 20;
*/

-- Step 6: Materialized View 갱신
/*
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;

SELECT
  '뷰 갱신 완료' as status,
  COUNT(*) as total_records
FROM mv_stock_analysis
WHERE company_id IN (SELECT id FROM companies WHERE is_etf = TRUE);
*/

-- ============================================
-- 롤백 방법 (문제 발생 시)
-- ============================================
-- 백업이 있다면: 백업에서 복원
-- 백업이 없다면: change_rate를 NULL로 설정 후 재수집 필요
/*
UPDATE daily_stock_prices dsp
SET change_rate = NULL
FROM companies c
WHERE dsp.company_id = c.id
  AND c.is_etf = TRUE;
*/
