-- ============================================
-- change_rate 자동 계산 Function & Trigger 생성
-- ============================================
-- 목적: 모든 종목 데이터 삽입/수정 시 change_rate가 null이면 자동 계산
-- 대상: 일반 주식 + ETF (모든 종목)
-- 계산식: (당일종가 - 전일종가) / 전일종가 * 100
-- ============================================

-- Step 1: 전일 종가 기준 등락률 계산 함수
CREATE OR REPLACE FUNCTION calculate_change_rate()
RETURNS TRIGGER AS $$
DECLARE
    prev_close_price DECIMAL(12,2);
BEGIN
    -- change_rate가 이미 있으면 계산 생략
    IF NEW.change_rate IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 전일 종가 조회
    SELECT close_price INTO prev_close_price
    FROM daily_stock_prices
    WHERE company_id = NEW.company_id
      AND date < NEW.date
      AND close_price IS NOT NULL
    ORDER BY date DESC
    LIMIT 1;

    -- 전일 종가가 있으면 등락률 계산
    IF prev_close_price IS NOT NULL AND prev_close_price > 0 AND NEW.close_price IS NOT NULL THEN
        NEW.change_rate := ROUND(
            ((NEW.close_price - prev_close_price) / prev_close_price * 100)::NUMERIC,
            2
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Trigger 생성 (INSERT 또는 UPDATE 시 자동 실행)
DROP TRIGGER IF EXISTS auto_calculate_change_rate ON daily_stock_prices;

CREATE TRIGGER auto_calculate_change_rate
    BEFORE INSERT OR UPDATE ON daily_stock_prices
    FOR EACH ROW
    EXECUTE FUNCTION calculate_change_rate();

-- Step 3: 기존 NULL 값들 업데이트 (Trigger 테스트) - 모든 종목
WITH corrected_rates AS (
  SELECT
    dsp.id as price_id,
    ROUND(
      ((dsp.close_price - LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date))
       / NULLIF(LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date), 0) * 100)::NUMERIC,
      2
    ) as correct_change_rate
  FROM daily_stock_prices dsp
  WHERE dsp.close_price IS NOT NULL
    AND dsp.change_rate IS NULL
)
UPDATE daily_stock_prices dsp
SET change_rate = cr.correct_change_rate
FROM corrected_rates cr
WHERE dsp.id = cr.price_id
  AND cr.correct_change_rate IS NOT NULL;

-- 완료 메시지
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM daily_stock_prices dsp
    WHERE dsp.change_rate IS NULL
      AND dsp.date >= CURRENT_DATE - INTERVAL '30 days';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ change_rate 자동 계산 Trigger 생성 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Trigger 동작:';
    RAISE NOTICE '  - 대상: 모든 종목 (일반 주식 + ETF)';
    RAISE NOTICE '  - INSERT/UPDATE 시 change_rate가 NULL이면 자동 계산';
    RAISE NOTICE '  - 계산식: (당일종가 - 전일종가) / 전일종가 * 100';
    RAISE NOTICE '';
    RAISE NOTICE '📊 현재 상태:';
    RAISE NOTICE '  - 최근 30일 중 NULL 레코드: % 건', null_count;
    RAISE NOTICE '';
    RAISE NOTICE '다음 단계:';
    RAISE NOTICE '  1. Materialized View 갱신 (refresh-mv-stock-analysis.sql)';
    RAISE NOTICE '  2. 화면에서 정상 표시 확인';
    RAISE NOTICE '';
END $$;
