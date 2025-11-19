-- ============================================
-- Migration 001: Naver Finance 데이터 구조 추가
-- 작성일: 2025-11-19
-- 목적: 기존 financial_data 테이블과 병행하여 확장 데이터 저장
-- ============================================

-- 1. 확장 재무 데이터 테이블 생성
CREATE TABLE IF NOT EXISTS financial_data_extended (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year INT NOT NULL,
    scrape_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- 손익계산서 (기존 2개 + 순이익 추가)
    revenue BIGINT,                     -- 매출액
    operating_profit BIGINT,            -- 영업이익
    net_income BIGINT,                  -- 🆕 순이익 (PER 계산용)

    -- 수익성 지표
    operating_margin DECIMAL(10,2),     -- 🆕 영업이익률
    net_margin DECIMAL(10,2),           -- 🆕 순이익률
    roe DECIMAL(10,2),                  -- 🆕 ROE (자기자본이익률)

    -- 주당 지표
    eps DECIMAL(10,2),                  -- 🆕 주당순이익
    per DECIMAL(10,2),                  -- 🆕 주가수익비율
    bps DECIMAL(10,2),                  -- 🆕 주당순자산
    pbr DECIMAL(10,2),                  -- 🆕 주가순자산비율

    -- 재무상태표
    total_assets BIGINT,                -- 🆕 총자산
    total_liabilities BIGINT,           -- 🆕 총부채
    total_equity BIGINT,                -- 🆕 자본총계
    debt_ratio DECIMAL(10,2),           -- 🆕 부채비율

    -- 현금흐름 (향후 확장)
    operating_cash_flow BIGINT,         -- 🆕 영업활동현금흐름
    investing_cash_flow BIGINT,         -- 🆕 투자활동현금흐름
    financing_cash_flow BIGINT,         -- 🆕 재무활동현금흐름
    free_cash_flow BIGINT,              -- 🆕 잉여현금흐름

    -- 메타데이터
    is_estimate BOOLEAN DEFAULT FALSE,   -- 컨센서스 여부
    data_source VARCHAR(20) DEFAULT 'naver',  -- 데이터 출처
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 중복 방지 제약
    CONSTRAINT unique_financial_extended
    UNIQUE (company_id, year, scrape_date, data_source)
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_fin_ext_company_year
    ON financial_data_extended(company_id, year);

CREATE INDEX IF NOT EXISTS idx_fin_ext_scrape_date
    ON financial_data_extended(scrape_date);

CREATE INDEX IF NOT EXISTS idx_fin_ext_estimate
    ON financial_data_extended(is_estimate);

CREATE INDEX IF NOT EXISTS idx_fin_ext_source
    ON financial_data_extended(data_source);

CREATE INDEX IF NOT EXISTS idx_fin_ext_composite
    ON financial_data_extended(company_id, year, is_estimate);

-- 3. RLS (Row Level Security) 정책 - 기존과 동일
ALTER TABLE financial_data_extended ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON financial_data_extended
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON financial_data_extended
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. 데이터 마이그레이션 함수 (FnGuide → Naver 형식 변환)
CREATE OR REPLACE FUNCTION migrate_fnguide_to_extended()
RETURNS TABLE (
    migrated_count INT,
    error_count INT,
    last_error TEXT
) AS $$
DECLARE
    v_migrated INT := 0;
    v_errors INT := 0;
    v_last_error TEXT := '';
BEGIN
    INSERT INTO financial_data_extended (
        company_id, year, scrape_date,
        revenue, operating_profit,
        is_estimate, data_source
    )
    SELECT
        company_id, year, scrape_date,
        revenue, operating_profit,
        is_estimate, 'fnguide'
    FROM financial_data
    ON CONFLICT (company_id, year, scrape_date, data_source) DO NOTHING;

    GET DIAGNOSTICS v_migrated = ROW_COUNT;

    RETURN QUERY SELECT v_migrated, v_errors, v_last_error;
END;
$$ LANGUAGE plpgsql;

-- 5. 테스트 데이터 검증 함수
CREATE OR REPLACE FUNCTION validate_extended_data()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    detail TEXT
) AS $$
BEGIN
    -- Check 1: 총 레코드 수
    RETURN QUERY
    SELECT
        'Total Records'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
        'Count: ' || COUNT(*)::TEXT
    FROM financial_data_extended;

    -- Check 2: NULL 값 비율 (수정: FLOAT → NUMERIC)
    RETURN QUERY
    SELECT
        'NULL Revenue Rate'::TEXT,
        CASE WHEN (COUNT(*) FILTER (WHERE revenue IS NULL)::NUMERIC / NULLIF(COUNT(*), 0)) < 0.1
             THEN '✅ PASS' ELSE '⚠️ WARNING' END,
        'NULL Rate: ' || ROUND((COUNT(*) FILTER (WHERE revenue IS NULL)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2)::TEXT || '%'
    FROM financial_data_extended
    WHERE company_id IS NOT NULL;

    -- Check 3: 데이터 출처 분포
    RETURN QUERY
    SELECT
        'Data Source Distribution'::TEXT,
        '✅ PASS'::TEXT,
        data_source || ': ' || COUNT(*)::TEXT
    FROM financial_data_extended
    GROUP BY data_source;

END;
$$ LANGUAGE plpgsql;

-- 6. 설명 추가 (문서화)
COMMENT ON TABLE financial_data_extended IS 'Naver Finance 확장 재무 데이터 (16개 지표)';
COMMENT ON COLUMN financial_data_extended.data_source IS 'naver, fnguide, dart 중 하나';
COMMENT ON FUNCTION migrate_fnguide_to_extended() IS 'FnGuide 데이터를 확장 테이블로 마이그레이션';
COMMENT ON FUNCTION validate_extended_data() IS '확장 데이터 테이블 검증';

-- ============================================
-- 실행 완료 메시지
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 001 완료';
    RAISE NOTICE '📊 financial_data_extended 테이블 생성됨';
    RAISE NOTICE '🔍 인덱스 5개 생성됨';
    RAISE NOTICE '🔒 RLS 정책 활성화됨';
    RAISE NOTICE '🛠️ 헬퍼 함수 2개 생성됨';
    RAISE NOTICE '';
    RAISE NOTICE '📝 다음 단계:';
    RAISE NOTICE '1. 검증: SELECT * FROM validate_extended_data();';
    RAISE NOTICE '2. 마이그레이션: SELECT * FROM migrate_fnguide_to_extended();';
END $$;
