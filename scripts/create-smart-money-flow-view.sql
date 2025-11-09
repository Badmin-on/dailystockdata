-- ============================================
-- Smart Money Flow View 생성
-- ============================================
-- 목적: 컨센서스 개선 + 저평가 + 거래량 증가 조합 감지
-- 기준: RVOL >= 1.2, divergence_120 BETWEEN -10 AND 5, consensus_score >= 40
-- ============================================

-- Step 1: 기존 View 확인
SELECT '📊 Step 1: 기존 v_smart_money_flow View 확인' as step;

SELECT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'v_smart_money_flow'
) as view_exists;

-- Step 2: View 생성
SELECT '✨ Step 2: v_smart_money_flow View 생성' as step;

CREATE OR REPLACE VIEW v_smart_money_flow AS
WITH volume_metrics AS (
  SELECT
    company_id,
    date,
    volume,
    close_price as close,
    LAG(close_price) OVER (PARTITION BY company_id ORDER BY date) as prev_close,
    AVG(volume) OVER (PARTITION BY company_id ORDER BY date ROWS 19 PRECEDING) as vol_avg_20d,
    AVG(volume) OVER (PARTITION BY company_id ORDER BY date ROWS 4 PRECEDING) as vol_avg_5d
  FROM daily_stock_prices
  WHERE date >= CURRENT_DATE - INTERVAL '40 days'
    AND volume IS NOT NULL
    AND close_price IS NOT NULL
),
latest_metrics AS (
  SELECT DISTINCT ON (company_id)
    company_id,
    date,
    volume,
    vol_avg_20d,
    vol_avg_5d,
    CASE
      WHEN vol_avg_20d > 0 THEN ROUND((vol_avg_5d / vol_avg_20d)::NUMERIC, 2)
      ELSE NULL
    END as rvol
  FROM volume_metrics
  WHERE vol_avg_20d IS NOT NULL
  ORDER BY company_id, date DESC
),
accumulation_prep AS (
  SELECT
    company_id,
    date,
    close,
    prev_close,
    volume,
    LAG(volume) OVER (PARTITION BY company_id ORDER BY date) as prev_volume
  FROM volume_metrics
  WHERE date >= CURRENT_DATE - INTERVAL '10 days'
),
accumulation_days AS (
  SELECT
    company_id,
    COUNT(*) FILTER (
      WHERE close > prev_close AND volume > prev_volume
    ) as acc_days_10d
  FROM accumulation_prep
  GROUP BY company_id
),
prev_5_days_avg AS (
  SELECT
    company_id,
    AVG(volume) as prev_5d_avg
  FROM (
    SELECT DISTINCT ON (company_id, date)
      company_id,
      volume,
      date
    FROM daily_stock_prices
    WHERE date >= CURRENT_DATE - INTERVAL '15 days'
      AND date < CURRENT_DATE - INTERVAL '5 days'
      AND volume IS NOT NULL
    ORDER BY company_id, date DESC
  ) sub
  GROUP BY company_id
)
SELECT
  io.company_id,
  io.name,
  io.code,
  io.market,
  io.current_price,
  io.change_rate,
  io.ma_120,
  io.divergence_120,
  io.current_revenue,
  io.current_op_profit,
  io.revenue_change_1m,
  io.op_profit_change_1m,
  io.consensus_score,
  io.divergence_score,
  io.investment_score as base_investment_score,

  -- 거래량 지표
  lm.rvol,
  lm.vol_avg_20d,
  lm.vol_avg_5d,
  lm.volume as latest_volume,
  p5.prev_5d_avg as prev_5d_avg_volume,
  ad.acc_days_10d,

  -- 거래량 증가율 (최근 5일 vs 이전 5일)
  CASE
    WHEN p5.prev_5d_avg > 0
    THEN ROUND(((lm.vol_avg_5d - p5.prev_5d_avg) / p5.prev_5d_avg * 100)::NUMERIC, 2)
    ELSE NULL
  END as volume_trend_pct,

  -- 거래량 점수 (0-100)
  GREATEST(0, LEAST(100,
    CASE
      WHEN lm.rvol >= 2.0 THEN 100
      WHEN lm.rvol >= 1.5 THEN 80
      WHEN lm.rvol >= 1.3 THEN 60
      WHEN lm.rvol >= 1.2 THEN 40
      WHEN lm.rvol >= 1.0 THEN 20
      ELSE 0
    END
  )) as volume_score,

  -- 스마트 머니 종합 점수 (컨센서스 40% + 이격도 30% + 거래량 30%)
  ROUND(
    io.consensus_score * 0.4 +
    io.divergence_score * 0.3 +
    GREATEST(0, LEAST(100,
      CASE
        WHEN lm.rvol >= 2.0 THEN 100
        WHEN lm.rvol >= 1.5 THEN 80
        WHEN lm.rvol >= 1.3 THEN 60
        WHEN lm.rvol >= 1.2 THEN 40
        WHEN lm.rvol >= 1.0 THEN 20
        ELSE 0
      END
    )) * 0.3,
    2
  ) as smart_money_score,

  -- 거래량 패턴 태그
  CASE
    WHEN lm.rvol >= 2.0 AND ad.acc_days_10d >= 7 THEN 'Strong Accumulation'
    WHEN lm.rvol >= 1.5 AND lm.rvol < 2.0 THEN 'Moderate Flow'
    WHEN lm.rvol >= 1.2 AND lm.rvol < 1.5 THEN 'Increasing Interest'
    WHEN lm.rvol < 0.6 THEN 'Volume Dry Up'
    ELSE 'Normal'
  END as volume_pattern,

  -- 등급 (S/A/B/C)
  CASE
    WHEN ROUND(
      io.consensus_score * 0.4 +
      io.divergence_score * 0.3 +
      GREATEST(0, LEAST(100,
        CASE
          WHEN lm.rvol >= 2.0 THEN 100
          WHEN lm.rvol >= 1.5 THEN 80
          WHEN lm.rvol >= 1.3 THEN 60
          WHEN lm.rvol >= 1.2 THEN 40
          WHEN lm.rvol >= 1.0 THEN 20
          ELSE 0
        END
      )) * 0.3,
      2
    ) >= 80 THEN 'S'
    WHEN ROUND(
      io.consensus_score * 0.4 +
      io.divergence_score * 0.3 +
      GREATEST(0, LEAST(100,
        CASE
          WHEN lm.rvol >= 2.0 THEN 100
          WHEN lm.rvol >= 1.5 THEN 80
          WHEN lm.rvol >= 1.3 THEN 60
          WHEN lm.rvol >= 1.2 THEN 40
          WHEN lm.rvol >= 1.0 THEN 20
          ELSE 0
        END
      )) * 0.3,
      2
    ) >= 60 THEN 'A'
    WHEN ROUND(
      io.consensus_score * 0.4 +
      io.divergence_score * 0.3 +
      GREATEST(0, LEAST(100,
        CASE
          WHEN lm.rvol >= 2.0 THEN 100
          WHEN lm.rvol >= 1.5 THEN 80
          WHEN lm.rvol >= 1.3 THEN 60
          WHEN lm.rvol >= 1.2 THEN 40
          WHEN lm.rvol >= 1.0 THEN 20
          ELSE 0
        END
      )) * 0.3,
      2
    ) >= 40 THEN 'B'
    ELSE 'C'
  END as grade,

  lm.date as last_updated

FROM v_investment_opportunities io
LEFT JOIN latest_metrics lm ON io.company_id = lm.company_id
LEFT JOIN accumulation_days ad ON io.company_id = ad.company_id
LEFT JOIN prev_5_days_avg p5 ON io.company_id = p5.company_id
WHERE lm.rvol >= 1.2  -- 거래량 20% 이상 증가
  AND io.divergence_120 BETWEEN -10 AND 5  -- 저평가 ~ 적정가
  AND io.consensus_score >= 40  -- 컨센서스 개선
  AND io.market IS NOT NULL  -- 상장폐지 제외
ORDER BY
  ROUND(
    io.consensus_score * 0.4 +
    io.divergence_score * 0.3 +
    GREATEST(0, LEAST(100,
      CASE
        WHEN lm.rvol >= 2.0 THEN 100
        WHEN lm.rvol >= 1.5 THEN 80
        WHEN lm.rvol >= 1.3 THEN 60
        WHEN lm.rvol >= 1.2 THEN 40
        WHEN lm.rvol >= 1.0 THEN 20
        ELSE 0
      END
    )) * 0.3,
    2
  ) DESC;

-- Step 3: View 생성 확인
SELECT '✅ Step 3: View 생성 확인' as step;

SELECT COUNT(*) as total_companies
FROM v_smart_money_flow;

-- Step 4: 등급별 통계
SELECT '📊 Step 4: 등급별 통계' as step;

SELECT
    grade as 등급,
    COUNT(*) as 기업수,
    ROUND(AVG(smart_money_score), 2) as 평균점수,
    ROUND(AVG(rvol), 2) as 평균RVOL,
    ROUND(AVG(divergence_120), 2) as 평균이격도
FROM v_smart_money_flow
GROUP BY grade
ORDER BY grade;

-- Step 5: 거래량 패턴별 통계
SELECT '📈 Step 5: 거래량 패턴별 통계' as step;

SELECT
    volume_pattern as 패턴,
    COUNT(*) as 기업수,
    ROUND(AVG(rvol), 2) as 평균RVOL,
    ROUND(AVG(acc_days_10d), 2) as 평균누적일수
FROM v_smart_money_flow
GROUP BY volume_pattern
ORDER BY 기업수 DESC;

-- Step 6: Top 10 기업
SELECT '🏆 Step 6: Smart Money Flow Top 10' as step;

SELECT
    name as 기업명,
    code as 종목코드,
    grade as 등급,
    smart_money_score as 스마트머니점수,
    rvol as RVOL,
    volume_pattern as 패턴,
    divergence_120 as 이격도,
    consensus_score as 컨센서스점수
FROM v_smart_money_flow
ORDER BY smart_money_score DESC
LIMIT 10;

-- 완료 메시지
DO $$
DECLARE
    total_companies INTEGER;
    s_grade INTEGER;
    a_grade INTEGER;
    strong_acc INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_companies FROM v_smart_money_flow;
    SELECT COUNT(*) INTO s_grade FROM v_smart_money_flow WHERE grade = 'S';
    SELECT COUNT(*) INTO a_grade FROM v_smart_money_flow WHERE grade = 'A';
    SELECT COUNT(*) INTO strong_acc FROM v_smart_money_flow WHERE volume_pattern = 'Strong Accumulation';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Smart Money Flow View 생성 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 결과:';
    RAISE NOTICE '  - 전체 발굴 기업: % 개', total_companies;
    RAISE NOTICE '  - S급 기회: % 개', s_grade;
    RAISE NOTICE '  - A급 기회: % 개', a_grade;
    RAISE NOTICE '  - Strong Accumulation: % 개', strong_acc;
    RAISE NOTICE '';
    RAISE NOTICE '✨ 다음 단계:';
    RAISE NOTICE '  1. API 엔드포인트 생성 (/api/smart-money-flow)';
    RAISE NOTICE '  2. 프론트엔드 페이지 구현 (/smart-money-flow)';
    RAISE NOTICE '  3. 차트 컴포넌트 통합 (Chart.js)';
    RAISE NOTICE '';
END $$;
