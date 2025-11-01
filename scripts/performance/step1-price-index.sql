-- ============================================
-- Step 1: 주가 데이터 복합 인덱스 추가
-- ============================================
-- 목적: stock-comparison 주가 계산 속도 개선
-- 현재: 52초 소요 (주가 계산 40-50초)
-- 예상: 35-40초로 개선 (10-15초 단축)
-- 리스크: 매우 낮음
-- 롤백: 하단의 롤백 SQL 실행
-- ============================================

-- 복합 인덱스 생성 (company_id + date)
-- 이 인덱스는 calculatePriceDeviations 함수의 배치 쿼리를 최적화합니다
CREATE INDEX IF NOT EXISTS idx_daily_prices_company_date
ON daily_stock_prices(company_id, date DESC);

-- 생성 완료 확인
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_daily_prices_company_date';

-- ============================================
-- 롤백 SQL (문제 발생 시 실행)
-- ============================================
-- DROP INDEX IF EXISTS idx_daily_prices_company_date;
