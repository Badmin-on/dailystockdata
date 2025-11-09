-- 간단한 ETF 등락률 확인 쿼리
-- 문제가 있는 ETF 3개의 최근 데이터 확인

SELECT
  c.name as 종목명,
  c.code as 종목코드,
  dsp.date as 날짜,
  dsp.close_price as 종가,
  dsp.change_rate as 저장된_등락률,
  -- 전일 종가 계산
  LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as 전일종가,
  -- 올바른 등락률 계산 = (당일종가 - 전일종가) / 전일종가 * 100
  ROUND(
    ((dsp.close_price - LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date))
     / NULLIF(LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date), 0) * 100)::NUMERIC,
    2
  ) as 올바른_등락률
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.code IN ('091160', '396500', '381170')  -- KODEX 반도체, TIGER 반도체TOP10, TIGER 미국테크TOP10
  AND dsp.date >= CURRENT_DATE - INTERVAL '5 days'
ORDER BY c.code, dsp.date DESC
LIMIT 15;
