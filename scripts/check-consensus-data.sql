-- ============================================
-- mv_consensus_changes 테이블 구조 및 데이터 확인
-- ============================================

-- Step 1: 테이블 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mv_consensus_changes'
ORDER BY ordinal_position;

-- Step 2: 샘플 데이터 확인 (1개)
SELECT *
FROM mv_consensus_changes
LIMIT 1;

-- Step 3: 1D, 1Y 데이터 존재 여부 확인
SELECT
    COUNT(*) as total_records,
    COUNT(revenue_change_1d) FILTER (WHERE revenue_change_1d IS NOT NULL) as revenue_1d_count,
    COUNT(op_profit_change_1d) FILTER (WHERE op_profit_change_1d IS NOT NULL) as op_1d_count,
    COUNT(revenue_change_1y) FILTER (WHERE revenue_change_1y IS NOT NULL) as revenue_1y_count,
    COUNT(op_profit_change_1y) FILTER (WHERE op_profit_change_1y IS NOT NULL) as op_1y_count
FROM mv_consensus_changes;

-- Step 4: 1D 데이터가 있는 샘플 (있다면)
SELECT
    company_id,
    name,
    code,
    revenue_change_1d,
    op_profit_change_1d,
    revenue_change_1m,
    op_profit_change_1m
FROM mv_consensus_changes
WHERE revenue_change_1d IS NOT NULL
   OR op_profit_change_1d IS NOT NULL
LIMIT 5;
