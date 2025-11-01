-- ============================================
-- ETF 데이터 검증 스크립트 (실행 전 확인용)
-- ============================================
-- 목적: 현재 상태 확인 및 수정 필요성 검증
-- 실행: Supabase SQL Editor에 복사하여 실행
-- ============================================

-- 1. ETF 등락률 현황 확인
SELECT
  '1. ETF 등락률 샘플 (최근 3일)' as section;

SELECT
  c.name,
  c.code,
  c.etf_provider,
  dsp.date,
  dsp.close_price,
  dsp.change_rate as stored_rate,
  LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as prev_close,
  CASE
    WHEN LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) IS NULL THEN NULL
    WHEN LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) = 0 THEN NULL
    ELSE ROUND(((dsp.close_price - LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date))
           / LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) * 100)::NUMERIC, 2)
  END as correct_rate
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = TRUE
  AND dsp.date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY dsp.date DESC, c.code
LIMIT 20;

-- 2. 문제 데이터 통계
SELECT
  '2. 비정상 등락률 통계' as section;

SELECT
  COUNT(*) as total_etf_records,
  COUNT(*) FILTER (WHERE dsp.change_rate > 100) as abnormal_high,
  COUNT(*) FILTER (WHERE dsp.change_rate < -100) as abnormal_low,
  ROUND(AVG(dsp.change_rate)::NUMERIC, 2) as avg_stored_rate,
  MIN(dsp.change_rate) as min_rate,
  MAX(dsp.change_rate) as max_rate
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = TRUE
  AND dsp.date >= CURRENT_DATE - INTERVAL '30 days';

-- 3. ETF 기본 정보
SELECT
  '3. ETF 기본 정보' as section;

SELECT
  COUNT(*) as total_etfs,
  COUNT(*) FILTER (WHERE etf_provider IS NOT NULL) as has_provider,
  -- COUNT(*) FILTER (WHERE etf_sector IS NOT NULL) as has_sector,  -- etf_sector 컬럼 생성 전에는 주석 처리
  STRING_AGG(DISTINCT etf_provider, ', ') as providers
FROM companies
WHERE is_etf = TRUE;

-- 4. 운용사별 ETF 개수
SELECT
  '4. 운용사별 ETF 개수' as section;

SELECT
  etf_provider,
  COUNT(*) as count
FROM companies
WHERE is_etf = TRUE
GROUP BY etf_provider
ORDER BY count DESC;

-- 5. mv_stock_analysis 뷰의 ETF 데이터
SELECT
  '5. mv_stock_analysis 뷰의 ETF 등락률 샘플' as section;

SELECT
  name,
  code,
  current_price,
  change_rate,
  ma_120,
  divergence_120,
  latest_date
FROM mv_stock_analysis
WHERE company_id IN (SELECT id FROM companies WHERE is_etf = TRUE)
ORDER BY change_rate DESC
LIMIT 10;

-- ============================================
-- 분석 결과 해석
-- ============================================
--
-- ✅ 정상 상태:
--    - stored_rate와 correct_rate가 -10% ~ +10% 범위에서 유사
--    - abnormal_high가 0에 가까움
--    - avg_stored_rate가 -5 ~ +5 범위
--
-- ❌ 문제 상태 (현재):
--    - stored_rate가 수만 ~ 수십만 (전일 종가로 추정)
--    - correct_rate가 -5 ~ +5 (정상 범위)
--    - abnormal_high가 대부분
--    - avg_stored_rate가 수만 이상
--
-- ============================================
