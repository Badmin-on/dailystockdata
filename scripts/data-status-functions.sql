-- Data Status Analysis Functions
-- 데이터 수집 현황 분석을 위한 PostgreSQL 함수

SET search_path TO public;

-- ============================================
-- 1. 주가 데이터 수집 통계 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.get_price_collection_stats()
RETURNS TABLE (
  company_id INT,
  company_name TEXT,
  company_code TEXT,
  market TEXT,
  price_count BIGINT,
  latest_date DATE,
  earliest_date DATE,
  days_collected INT,
  has_120day_data BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as company_id,
    c.name as company_name,
    c.code as company_code,
    c.market,
    COUNT(dsp.date)::BIGINT as price_count,
    MAX(dsp.date) as latest_date,
    MIN(dsp.date) as earliest_date,
    (MAX(dsp.date) - MIN(dsp.date))::INT as days_collected,
    (COUNT(dsp.date) >= 120) as has_120day_data
  FROM public.companies c
  LEFT JOIN public.daily_stock_prices dsp ON dsp.company_id = c.id
  WHERE dsp.close_price IS NOT NULL
  GROUP BY c.id, c.name, c.code, c.market
  ORDER BY price_count DESC;
END;
$$;

-- ============================================
-- 2. 120일 데이터 보유 기업 조회
-- ============================================

CREATE OR REPLACE FUNCTION public.get_companies_with_120day_data()
RETURNS TABLE (
  company_id INT,
  company_name TEXT,
  company_code TEXT,
  market TEXT,
  price_count BIGINT,
  latest_date DATE,
  ma_120_calculated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH price_counts AS (
    SELECT
      dsp.company_id,
      COUNT(*) as cnt,
      MAX(dsp.date) as max_date
    FROM public.daily_stock_prices dsp
    WHERE dsp.close_price IS NOT NULL
    GROUP BY dsp.company_id
    HAVING COUNT(*) >= 120
  )
  SELECT
    c.id as company_id,
    c.name as company_name,
    c.code as company_code,
    c.market,
    pc.cnt as price_count,
    pc.max_date as latest_date,
    (public.calculate_ma_120(c.id, pc.max_date) IS NOT NULL) as ma_120_calculated
  FROM public.companies c
  JOIN price_counts pc ON pc.company_id = c.id
  ORDER BY pc.cnt DESC, c.id;
END;
$$;

-- ============================================
-- 3. 재무 데이터 최신성 확인
-- ============================================

CREATE OR REPLACE FUNCTION public.get_financial_freshness()
RETURNS TABLE (
  company_id INT,
  company_name TEXT,
  company_code TEXT,
  market TEXT,
  latest_scrape_date DATE,
  total_records BIGINT,
  years_covered TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as company_id,
    c.name as company_name,
    c.code as company_code,
    c.market,
    MAX(fd.scrape_date)::DATE as latest_scrape_date,
    COUNT(*)::BIGINT as total_records,
    ARRAY_AGG(DISTINCT fd.year::TEXT ORDER BY fd.year::TEXT) as years_covered
  FROM public.companies c
  JOIN public.financial_data fd ON fd.company_id = c.id
  GROUP BY c.id, c.name, c.code, c.market
  ORDER BY MAX(fd.scrape_date) DESC;
END;
$$;

-- ============================================
-- 4. 투자 기회 발굴 가능 기업 조회
-- ============================================

CREATE OR REPLACE FUNCTION public.get_investable_companies()
RETURNS TABLE (
  company_id INT,
  company_name TEXT,
  company_code TEXT,
  market TEXT,
  has_financial_data BOOLEAN,
  has_price_data BOOLEAN,
  has_120day_data BOOLEAN,
  can_calculate_investment_score BOOLEAN,
  latest_price_date DATE,
  latest_financial_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH price_summary AS (
    SELECT
      company_id,
      COUNT(*) as price_count,
      MAX(date) as latest_price
    FROM public.daily_stock_prices
    WHERE close_price IS NOT NULL
    GROUP BY company_id
  ),
  financial_summary AS (
    SELECT
      company_id,
      MAX(scrape_date)::DATE as latest_financial
    FROM public.financial_data
    GROUP BY company_id
  )
  SELECT
    c.id as company_id,
    c.name as company_name,
    c.code as company_code,
    c.market,
    (fs.company_id IS NOT NULL) as has_financial_data,
    (ps.company_id IS NOT NULL) as has_price_data,
    (ps.price_count >= 120) as has_120day_data,
    (fs.company_id IS NOT NULL AND ps.price_count >= 120) as can_calculate_investment_score,
    ps.latest_price as latest_price_date,
    fs.latest_financial as latest_financial_date
  FROM public.companies c
  LEFT JOIN price_summary ps ON ps.company_id = c.id
  LEFT JOIN financial_summary fs ON fs.company_id = c.id
  ORDER BY
    (fs.company_id IS NOT NULL AND ps.price_count >= 120) DESC,
    ps.price_count DESC NULLS LAST,
    c.id;
END;
$$;

-- ============================================
-- 5. 데이터 수집 진행률 대시보드
-- ============================================

CREATE OR REPLACE FUNCTION public.get_collection_dashboard()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  total_companies INT;
  companies_with_financial INT;
  companies_with_prices INT;
  companies_with_120day INT;
  companies_fully_ready INT;
  avg_price_records NUMERIC;
  latest_price_date DATE;
  latest_financial_date DATE;
BEGIN
  -- 기본 통계
  SELECT COUNT(*) INTO total_companies FROM public.companies;

  SELECT COUNT(DISTINCT company_id) INTO companies_with_financial FROM public.financial_data;

  SELECT COUNT(DISTINCT company_id) INTO companies_with_prices FROM public.daily_stock_prices;

  SELECT COUNT(*)
  INTO companies_with_120day
  FROM (
    SELECT company_id
    FROM public.daily_stock_prices
    WHERE close_price IS NOT NULL
    GROUP BY company_id
    HAVING COUNT(*) >= 120
  ) sub;

  SELECT COUNT(*)
  INTO companies_fully_ready
  FROM (
    SELECT c.id
    FROM public.companies c
    JOIN (
      SELECT company_id
      FROM public.financial_data
      GROUP BY company_id
    ) f ON f.company_id = c.id
    JOIN (
      SELECT company_id
      FROM public.daily_stock_prices
      WHERE close_price IS NOT NULL
      GROUP BY company_id
      HAVING COUNT(*) >= 120
    ) p ON p.company_id = c.id
  ) ready;

  SELECT AVG(cnt)::NUMERIC(10,2)
  INTO avg_price_records
  FROM (
    SELECT company_id, COUNT(*) as cnt
    FROM public.daily_stock_prices
    GROUP BY company_id
  ) counts;

  SELECT MAX(date) INTO latest_price_date FROM public.daily_stock_prices;
  SELECT MAX(scrape_date)::DATE INTO latest_financial_date FROM public.financial_data;

  -- JSON 결과 생성
  result := json_build_object(
    'total_companies', total_companies,
    'companies_with_financial', companies_with_financial,
    'companies_with_prices', companies_with_prices,
    'companies_with_120day', companies_with_120day,
    'companies_fully_ready', companies_fully_ready,
    'avg_price_records_per_company', avg_price_records,
    'latest_price_date', latest_price_date,
    'latest_financial_date', latest_financial_date,
    'financial_coverage_rate', ROUND((companies_with_financial::NUMERIC / NULLIF(total_companies, 0) * 100), 2),
    'price_coverage_rate', ROUND((companies_with_prices::NUMERIC / NULLIF(total_companies, 0) * 100), 2),
    'ma120_ready_rate', ROUND((companies_with_120day::NUMERIC / NULLIF(total_companies, 0) * 100), 2),
    'fully_ready_rate', ROUND((companies_fully_ready::NUMERIC / NULLIF(total_companies, 0) * 100), 2),
    'estimated_days_to_completion', GREATEST(0, 120 - COALESCE(avg_price_records, 0))
  );

  RETURN result;
END;
$$;

-- ============================================
-- 권한 설정
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_price_collection_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_companies_with_120day_data() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_freshness() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_investable_companies() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_collection_dashboard() TO anon, authenticated, service_role;

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ 데이터 현황 분석 함수 생성 완료!';
  RAISE NOTICE '📊 생성된 함수:';
  RAISE NOTICE '  - get_price_collection_stats(): 주가 데이터 수집 통계';
  RAISE NOTICE '  - get_companies_with_120day_data(): 120일 데이터 보유 기업';
  RAISE NOTICE '  - get_financial_freshness(): 재무 데이터 최신성';
  RAISE NOTICE '  - get_investable_companies(): 투자 분석 가능 기업';
  RAISE NOTICE '  - get_collection_dashboard(): 수집 진행률 대시보드';
END $$;
