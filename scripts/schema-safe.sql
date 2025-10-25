-- YoonStock Database Schema for Supabase (SAFE VERSION)
-- 기존 객체가 있어도 안전하게 실행 가능
-- 실행 방법: Supabase SQL Editor에서 전체 복사 후 실행

SET search_path TO public;

-- ============================================
-- 1. 기존 Policy 삭제 (있으면)
-- ============================================

DROP POLICY IF EXISTS "Public read access for companies" ON companies;
DROP POLICY IF EXISTS "Public read access for financial_data" ON financial_data;
DROP POLICY IF EXISTS "Public read access for daily_stock_prices" ON daily_stock_prices;
DROP POLICY IF EXISTS "Service role insert companies" ON companies;
DROP POLICY IF EXISTS "Service role insert financial_data" ON financial_data;
DROP POLICY IF EXISTS "Service role insert stock_prices" ON daily_stock_prices;

-- ============================================
-- 2. 기업 정보 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(6) UNIQUE NOT NULL,
    market VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 재무 데이터 테이블 (매출액, 영업이익)
-- ============================================

CREATE TABLE IF NOT EXISTS financial_data (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    year INT NOT NULL,
    scrape_date DATE NOT NULL,
    revenue BIGINT,
    operating_profit BIGINT,
    is_estimate BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_financial_record UNIQUE (company_id, year, scrape_date)
);

-- ============================================
-- 4. 일일 주가 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS daily_stock_prices (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    close_price DECIMAL(12,2),
    change_rate DECIMAL(10,2),
    volume BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_daily_price UNIQUE (company_id, date)
);

-- ============================================
-- 5. 인덱스 생성 (쿼리 성능 최적화)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);
CREATE INDEX IF NOT EXISTS idx_companies_market ON companies(market);

CREATE INDEX IF NOT EXISTS idx_financial_company ON financial_data(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_scrape_date ON financial_data(scrape_date);
CREATE INDEX IF NOT EXISTS idx_financial_year ON financial_data(year);

CREATE INDEX IF NOT EXISTS idx_stock_prices_company ON daily_stock_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON daily_stock_prices(date);

-- ============================================
-- 6. Row Level Security (RLS) 활성화
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stock_prices ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. 모든 사용자 읽기 권한 (익명 포함)
-- ============================================

CREATE POLICY "Public read access for companies"
    ON companies FOR SELECT
    USING (true);

CREATE POLICY "Public read access for financial_data"
    ON financial_data FOR SELECT
    USING (true);

CREATE POLICY "Public read access for daily_stock_prices"
    ON daily_stock_prices FOR SELECT
    USING (true);

-- ============================================
-- 8. Service Role만 쓰기 권한 (자동화 스크립트용)
-- ============================================

CREATE POLICY "Service role insert companies"
    ON companies FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role insert financial_data"
    ON financial_data FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role insert stock_prices"
    ON daily_stock_prices FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- 9. 업데이트 트리거 (updated_at 자동 갱신)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ YoonStock 데이터베이스 스키마 생성 완료!';
    RAISE NOTICE '📊 생성된 테이블: companies, financial_data, daily_stock_prices';
    RAISE NOTICE '🔐 RLS 정책: 읽기 공개, 쓰기 Service Role 전용';
    RAISE NOTICE '';
    RAISE NOTICE '📋 테이블 현황:';
END;
$$;

-- 테이블 데이터 확인
SELECT
    'companies' as table_name,
    COUNT(*) as record_count
FROM companies
UNION ALL
SELECT
    'financial_data',
    COUNT(*)
FROM financial_data
UNION ALL
SELECT
    'daily_stock_prices',
    COUNT(*)
FROM daily_stock_prices
ORDER BY table_name;
