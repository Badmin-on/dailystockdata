-- ============================================
-- Step 3: 추가 인덱스 생성 및 통계 갱신
-- ============================================
-- 목적: stock-comparison 및 전체 API 속도 개선
-- 현재: 약 41-42초 (Step 1 후)
-- 예상: 30-35초로 개선 (추가 7-12초 단축)
-- 리스크: 매우 낮음
-- 롤백: 하단의 롤백 SQL 실행
-- ============================================

-- 인덱스 1: financial_data의 company_id + scrape_date 복합 인덱스
-- 목적: 특정 회사의 최신 재무 데이터 조회 최적화
CREATE INDEX IF NOT EXISTS idx_financial_data_company_scrape
ON financial_data(company_id, scrape_date DESC);

-- 인덱스 2: financial_data의 year 인덱스
-- 목적: 연도별 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_financial_data_year
ON financial_data(year DESC);

-- 통계 정보 갱신 (쿼리 플래너 최적화)
-- PostgreSQL이 인덱스를 효율적으로 사용하도록 최신 통계 제공
ANALYZE financial_data;
ANALYZE daily_stock_prices;

-- 생성된 인덱스 확인
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (indexrelname LIKE 'idx_financial_data%' OR indexrelname LIKE 'idx_daily_prices%')
ORDER BY relname, indexrelname;

-- ============================================
-- 롤백 SQL (문제 발생 시 실행)
-- ============================================
-- DROP INDEX IF EXISTS idx_financial_data_company_scrape;
-- DROP INDEX IF EXISTS idx_financial_data_year;
