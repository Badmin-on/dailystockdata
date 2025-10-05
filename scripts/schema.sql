-- YoonStock Database Schema for Supabase
-- 실행 방법: Supabase SQL Editor에서 전체 복사 후 실행

-- 1. 기업 정보 테이블
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(6) UNIQUE NOT NULL,
    market VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 재무 데이터 테이블 (매출액, 영업이익)
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

-- 3. 일일 주가 테이블
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

-- 인덱스 생성 (쿼리 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);
CREATE INDEX IF NOT EXISTS idx_companies_market ON companies(market);

CREATE INDEX IF NOT EXISTS idx_financial_company ON financial_data(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_scrape_date ON financial_data(scrape_date);
CREATE INDEX IF NOT EXISTS idx_financial_year ON financial_data(year);

CREATE INDEX IF NOT EXISTS idx_stock_prices_company ON daily_stock_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON daily_stock_prices(date);

-- Row Level Security (RLS) 비활성화 (공개 대시보드)
-- 프로덕션 환경에서는 RLS 활성화 권장
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stock_prices ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 권한 (익명 포함)
CREATE POLICY "Public read access for companies"
    ON companies FOR SELECT
    USING (true);

CREATE POLICY "Public read access for financial_data"
    ON financial_data FOR SELECT
    USING (true);

CREATE POLICY "Public read access for daily_stock_prices"
    ON daily_stock_prices FOR SELECT
    USING (true);

-- Service Role만 쓰기 권한 (자동화 스크립트용)
CREATE POLICY "Service role insert companies"
    ON companies FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role insert financial_data"
    ON financial_data FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role insert stock_prices"
    ON daily_stock_prices FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 업데이트 트리거 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ YoonStock 데이터베이스 스키마 생성 완료!';
    RAISE NOTICE '📊 생성된 테이블: companies, financial_data, daily_stock_prices';
    RAISE NOTICE '🔐 RLS 정책: 읽기 공개, 쓰기 Service Role 전용';
END $$;
