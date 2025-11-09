-- ============================================
-- Materialized View 갱신 스크립트
-- ============================================
-- 목적: change_rate 수정 후 mv_stock_analysis 갱신
-- ============================================

-- Step 1: 갱신 전 현황
SELECT
  '📊 갱신 전 mv_stock_analysis 현황' as step;

SELECT
  COUNT(*) as 전체_종목수,
  COUNT(*) FILTER (WHERE company_id IN (SELECT id FROM companies WHERE is_etf = TRUE)) as ETF_종목수,
  MAX(latest_date) as 최신_데이터_날짜
FROM mv_stock_analysis;

-- Step 2: Materialized View 갱신
SELECT
  '🔄 mv_stock_analysis 갱신 중...' as step;

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;

-- Step 3: 갱신 후 확인
SELECT
  '✅ 갱신 완료!' as step;

SELECT
  COUNT(*) as 전체_종목수,
  COUNT(*) FILTER (WHERE company_id IN (SELECT id FROM companies WHERE is_etf = TRUE)) as ETF_종목수,
  MAX(latest_date) as 최신_데이터_날짜
FROM mv_stock_analysis;

-- Step 4: ETF 등락률 샘플 확인 (v_etf_details 뷰 사용)
SELECT
  '📋 ETF 등락률 샘플 (v_etf_details 뷰)' as step;

SELECT
  name as 종목명,
  code as 종목코드,
  current_price as 현재가,
  change_rate as 등락률,
  divergence_120 as 이격도120,
  position_in_52w_range as 위치52주,
  investment_score as 투자점수
FROM v_etf_details
WHERE change_rate IS NOT NULL
ORDER BY code
LIMIT 10;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Materialized View 갱신 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '  - ETF 모니터링 페이지 접속';
  RAISE NOTICE '  - 등락률이 정상 범위(±10% 이내)로 표시되는지 확인';
  RAISE NOTICE '';
END $$;
