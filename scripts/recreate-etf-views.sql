-- ============================================
-- ETF 관련 View 재생성
-- ============================================
-- 목적: MV → View 전환 후 CASCADE 삭제된 ETF 뷰 복구
-- 참조: supabase/migrations/20250108_etf_sector_management.sql
-- ============================================

-- Step 1: 기존 뷰 삭제 (존재할 경우)
SELECT '🗑️ Step 1: 기존 View 삭제' as step;

DROP VIEW IF EXISTS v_etf_sector_stats CASCADE;
DROP VIEW IF EXISTS v_etf_details CASCADE;

-- Step 2: ETF 섹터별 통계 뷰 재생성
SELECT '✨ Step 2: v_etf_sector_stats 재생성' as step;

CREATE OR REPLACE VIEW public.v_etf_sector_stats AS
SELECT
  s.id as sector_id,
  s.name as sector_name,
  s.description,
  s.growth_outlook,
  s.color_code,
  COUNT(c.id) as etf_count,
  AVG(sa.current_price) as avg_current_price,
  AVG(sa.ma_120) as avg_ma_120,
  AVG(sa.divergence_120) as avg_divergence,
  AVG(sa.position_in_52w_range) as avg_position_in_52w_range,
  AVG(c.growth_score) as avg_growth_score,
  -- 섹터 전체 투자 신호 (평균 divergence 기준)
  CASE
    WHEN AVG(sa.divergence_120) <= -10 THEN '매우 저평가'
    WHEN AVG(sa.divergence_120) <= -5 THEN '저평가'
    WHEN AVG(sa.divergence_120) <= 5 THEN '적정가'
    WHEN AVG(sa.divergence_120) <= 10 THEN '고평가'
    ELSE '매우 고평가'
  END as sector_valuation,
  -- 섹터 투자 점수 (0-100)
  GREATEST(0, LEAST(100,
    CASE
      WHEN AVG(sa.divergence_120) IS NULL THEN 50
      ELSE (50 - AVG(sa.divergence_120))::INTEGER
    END
  )) as sector_investment_score
FROM public.etf_sectors s
LEFT JOIN public.companies c ON c.sector_id = s.id AND c.is_etf = TRUE
LEFT JOIN public.mv_stock_analysis sa ON sa.company_id = c.id
GROUP BY s.id, s.name, s.description, s.growth_outlook, s.color_code
ORDER BY s.display_order;

-- Step 3: 개별 ETF 상세 정보 뷰 재생성
SELECT '✨ Step 3: v_etf_details 재생성' as step;

CREATE OR REPLACE VIEW public.v_etf_details AS
SELECT
  c.id,
  c.code,
  c.name,
  c.market,
  c.is_etf,
  c.sector_id,
  s.name as sector_name,
  s.color_code as sector_color,
  c.growth_score,
  c.investment_thesis,
  sa.current_price,
  sa.change_rate,
  sa.volume,
  sa.ma_120,
  sa.divergence_120,
  sa.week_52_high,
  sa.week_52_low,
  sa.position_in_52w_range,
  sa.latest_date,
  -- 개별 ETF 투자 신호
  CASE
    WHEN sa.divergence_120 <= -15 THEN '🟢 매우 저평가'
    WHEN sa.divergence_120 <= -10 THEN '🟢 저평가'
    WHEN sa.divergence_120 <= -5 THEN '🟡 약간 저평가'
    WHEN sa.divergence_120 <= 5 THEN '⚪ 적정가'
    WHEN sa.divergence_120 <= 10 THEN '🟡 약간 고평가'
    WHEN sa.divergence_120 <= 15 THEN '🔴 고평가'
    ELSE '🔴 매우 고평가'
  END as valuation_signal,
  -- 52주 밴드 포지션 신호
  CASE
    WHEN sa.position_in_52w_range <= 20 THEN '🟢 저점 근처'
    WHEN sa.position_in_52w_range <= 40 THEN '🟡 중하단'
    WHEN sa.position_in_52w_range <= 60 THEN '⚪ 중간'
    WHEN sa.position_in_52w_range <= 80 THEN '🟡 중상단'
    ELSE '🔴 고점 근처'
  END as position_signal,
  -- 종합 투자 점수 (0-100)
  GREATEST(0, LEAST(100,
    (
      -- Divergence 점수 (40%)
      CASE
        WHEN sa.divergence_120 IS NULL THEN 50
        ELSE (50 - sa.divergence_120)
      END * 0.4 +
      -- 52주 역포지션 점수 (30%) - 낮을수록 좋음
      CASE
        WHEN sa.position_in_52w_range IS NULL THEN 50
        ELSE (100 - sa.position_in_52w_range)
      END * 0.3 +
      -- 성장 점수 (30%)
      COALESCE(c.growth_score, 50) * 0.3
    )::INTEGER
  )) as investment_score
FROM public.companies c
LEFT JOIN public.etf_sectors s ON s.id = c.sector_id
LEFT JOIN public.mv_stock_analysis sa ON sa.company_id = c.id
WHERE c.is_etf = TRUE
ORDER BY investment_score DESC;

-- Step 4: 권한 설정
GRANT SELECT ON v_etf_sector_stats TO anon, authenticated;
GRANT SELECT ON v_etf_details TO anon, authenticated;

-- Step 5: 복구 완료 확인
SELECT '✅ Step 4: 복구 완료 확인' as step;

SELECT
    'v_etf_sector_stats' as view_name,
    COUNT(*) as record_count
FROM v_etf_sector_stats;

SELECT
    'v_etf_details' as view_name,
    COUNT(*) as record_count
FROM v_etf_details
LIMIT 5;

-- Step 6: 샘플 데이터 확인
SELECT '📋 Step 5: 샘플 데이터 확인' as step;

-- 섹터 통계 샘플
SELECT
    sector_name as 섹터명,
    etf_count as ETF수,
    sector_valuation as 평가,
    sector_investment_score as 투자점수
FROM v_etf_sector_stats
LIMIT 5;

-- ETF 상세 샘플
SELECT
    name as 종목명,
    sector_name as 섹터,
    current_price as 현재가,
    change_rate as 등락률,
    investment_score as 투자점수
FROM v_etf_details
ORDER BY investment_score DESC
LIMIT 5;

-- 완료 메시지
DO $$
DECLARE
    sector_count INTEGER;
    etf_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO sector_count FROM v_etf_sector_stats;
    SELECT COUNT(*) INTO etf_count FROM v_etf_details;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ETF 관련 View 재생성 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 결과:';
    RAISE NOTICE '  - v_etf_sector_stats: % 개 섹터', sector_count;
    RAISE NOTICE '  - v_etf_details: % 개 ETF', etf_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 복구된 View:';
    RAISE NOTICE '  ✅ v_etf_sector_stats (섹터별 통계)';
    RAISE NOTICE '  ✅ v_etf_details (ETF 상세 정보)';
    RAISE NOTICE '';
    RAISE NOTICE '다음 단계:';
    RAISE NOTICE '  1. ETF 모니터링 화면에서 정상 작동 확인';
    RAISE NOTICE '  2. 화면 새로고침 후 데이터 표시 확인';
    RAISE NOTICE '';
END $$;
