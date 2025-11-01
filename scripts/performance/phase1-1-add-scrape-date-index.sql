-- ============================================
-- Phase 1-1: scrape_date 인덱스 추가
-- ============================================
-- 목적: stock-comparison 페이지 날짜 조회 속도 개선
-- 예상 효과: 2-3초 → 200-500ms (5-15배 개선)
-- 리스크: 매우 낮음
-- 롤백: 하단의 롤백 SQL 실행
-- ============================================

-- 현재 인덱스 확인 (참고용)
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'financial_data'
ORDER BY indexname;

-- ============================================
-- 인덱스 추가 (서비스 중단 없이 생성)
-- ============================================

-- scrape_date 인덱스 (내림차순 정렬 최적화)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_data_scrape_date
ON financial_data(scrape_date DESC);

-- 생성 완료 확인
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_financial_data_scrape_date';

-- ============================================
-- 롤백 SQL (문제 발생 시 실행)
-- ============================================
-- DROP INDEX CONCURRENTLY IF EXISTS idx_financial_data_scrape_date;
