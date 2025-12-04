-- 최근 scrape_date 확인
SELECT DISTINCT scrape_date 
FROM financial_data_extended 
ORDER BY scrape_date DESC 
LIMIT 10;

-- 특정 회사(삼성전자)의 최근 데이터 확인
SELECT scrape_date, year, revenue, operating_profit
FROM financial_data_extended
WHERE company_id = (SELECT id FROM companies WHERE code = '005930' LIMIT 1)
  AND year = 2025
ORDER BY scrape_date DESC
LIMIT 10;

-- 날짜별 데이터 개수 확인
SELECT scrape_date, COUNT(*) as count
FROM financial_data_extended
WHERE year = 2025
GROUP BY scrape_date
ORDER BY scrape_date DESC
LIMIT 10;
