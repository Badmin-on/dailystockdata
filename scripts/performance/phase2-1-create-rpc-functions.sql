-- ============================================
-- Phase 2-1: RPC 함수 생성 (코드 변경 없음)
-- ============================================
-- 목적: API 최적화를 위한 DB 함수 준비
-- 리스크: 0% (함수만 생성, 사용 안 함)
-- 롤백: 하단의 DROP FUNCTION 실행
-- ============================================

-- ============================================
-- 함수 1: 날짜 리스트 조회 최적화
-- ============================================
-- 현재: 페이지네이션 루프 (1-2초)
-- 개선: DISTINCT 쿼리 (50-100ms)
-- ============================================

CREATE OR REPLACE FUNCTION get_unique_scrape_dates(limit_count INT DEFAULT 100)
RETURNS TABLE(scrape_date DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT fd.scrape_date
  FROM financial_data fd
  ORDER BY fd.scrape_date DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 성능 힌트 추가
COMMENT ON FUNCTION get_unique_scrape_dates IS '날짜 리스트 조회 최적화 함수 (페이지네이션 대체)';

-- ============================================
-- 함수 2: 주가 이격도 계산 최적화
-- ============================================
-- 현재: JavaScript에서 배치 계산 (40-50초)
-- 개선: PostgreSQL Window Function (1-2초)
-- ============================================

CREATE OR REPLACE FUNCTION calculate_price_deviations_batch(
  company_ids INT[],
  reference_date DATE
)
RETURNS TABLE(
  company_id INT,
  current_price NUMERIC,
  ma_120 NUMERIC,
  deviation_120 NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_prices AS (
    -- 각 회사별 최신 주가 데이터 조회
    SELECT
      dsp.company_id,
      dsp.close_price,
      dsp.date,
      ROW_NUMBER() OVER (
        PARTITION BY dsp.company_id
        ORDER BY dsp.date DESC
      ) as rn
    FROM daily_stock_prices dsp
    WHERE dsp.company_id = ANY(company_ids)
      AND dsp.date <= reference_date
      AND dsp.close_price IS NOT NULL
  ),
  latest_prices AS (
    -- 최신 데이터만 선택
    SELECT
      company_id,
      close_price as current_price,
      date
    FROM ranked_prices
    WHERE rn = 1
  ),
  ma_120_calc AS (
    -- 120일 이평선 계산 (Window Function)
    SELECT
      rp.company_id,
      AVG(rp.close_price) as ma_120,
      COUNT(*) as data_count
    FROM ranked_prices rp
    WHERE rp.rn <= 120
    GROUP BY rp.company_id
  )
  SELECT
    lp.company_id,
    lp.current_price,
    CASE
      WHEN mc.data_count >= 120 THEN ROUND(mc.ma_120::NUMERIC, 2)
      ELSE NULL
    END as ma_120,
    CASE
      WHEN mc.data_count >= 120 AND mc.ma_120 > 0
      THEN ROUND(((lp.current_price / mc.ma_120) * 100 - 100)::NUMERIC, 2)
      ELSE NULL
    END as deviation_120
  FROM latest_prices lp
  LEFT JOIN ma_120_calc mc ON lp.company_id = mc.company_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 성능 힌트 추가
COMMENT ON FUNCTION calculate_price_deviations_batch IS '주가 이격도 배치 계산 최적화 (Window Function 사용)';

-- ============================================
-- 함수 테스트 (선택사항)
-- ============================================

-- 날짜 리스트 함수 테스트
SELECT * FROM get_unique_scrape_dates(10);

-- 주가 계산 함수 테스트 (샘플 회사 1개)
SELECT * FROM calculate_price_deviations_batch(
  ARRAY[1]::INT[],  -- company_id 1번으로 테스트
  CURRENT_DATE
);

-- ============================================
-- 롤백 SQL (문제 발생 시 실행)
-- ============================================
-- DROP FUNCTION IF EXISTS get_unique_scrape_dates(INT);
-- DROP FUNCTION IF EXISTS calculate_price_deviations_batch(INT[], DATE);
