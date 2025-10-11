-- 데이터 수집 전 스냅샷 쿼리
-- 수집 전 상태를 기록하여 나중에 비교 가능

-- 실행 방법: Supabase SQL Editor에서 실행

-- 1. 현재 데이터 통계
SELECT
  'companies' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as earliest_record,
  MAX(updated_at) as latest_record
FROM companies

UNION ALL

SELECT
  'financial_data' as table_name,
  COUNT(*) as total_records,
  MIN(scrape_date) as earliest_record,
  MAX(scrape_date) as latest_record
FROM financial_data

UNION ALL

SELECT
  'daily_stock_prices' as table_name,
  COUNT(*) as total_records,
  MIN(date) as earliest_record,
  MAX(date) as latest_record
FROM daily_stock_prices;

-- 2. 주가 데이터 기업별 현황
SELECT
  c.id,
  c.code,
  c.name,
  c.market,
  COUNT(dsp.id) as price_count,
  MIN(dsp.date) as earliest_price,
  MAX(dsp.date) as latest_price
FROM companies c
LEFT JOIN daily_stock_prices dsp ON dsp.company_id = c.id
GROUP BY c.id, c.code, c.name, c.market
ORDER BY price_count DESC;

-- 3. 중복 데이터 확인
SELECT
  company_id,
  date,
  COUNT(*) as duplicate_count
FROM daily_stock_prices
GROUP BY company_id, date
HAVING COUNT(*) > 1;

-- 4. NULL 값 확인
SELECT
  COUNT(*) as total_records,
  COUNT(close_price) as non_null_close,
  COUNT(*) - COUNT(close_price) as null_close,
  COUNT(volume) as non_null_volume,
  COUNT(*) - COUNT(volume) as null_volume
FROM daily_stock_prices;
