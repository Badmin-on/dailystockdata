-- ============================================
-- Fix Smart Money Flow 중복 문제
-- ============================================
-- 문제: 같은 회사가 여러 연도로 중복 표시
-- 해결: DISTINCT ON (company_id)로 회사당 최고 점수 1개만 선택
-- ============================================

-- Step 1: 현재 상태 확인
SELECT '📊 Step 1: 현재 중복 상태 확인' as step;

SELECT
    COUNT(*) as "총_레코드",
    COUNT(DISTINCT code) as "고유_회사_수"
FROM v_smart_money_flow;

-- Step 2: View 재생성
SELECT '✨ Step 2: v_smart_money_flow 재생성 (중복 제거)' as step;

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
),
-- 중복 제거: 회사당 최고 investment_score 1개만 선택
unique_opportunities AS (
  SELECT DISTINCT ON (company_id)
    company_id,
    name,
    code,
    market,
    year,
    current_price,
    change_rate,
    ma_120,
    divergence_120,
    current_revenue,
    current_op_profit,
    revenue_change_1m,
    op_profit_change_1m,
    consensus_score,
    divergence_score,
    investment_score
  FROM v_investment_opportunities
  ORDER BY company_id, investment_score DESC, year DESC
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

FROM unique_opportunities io  -- ← 중복 제거된 CTE 사용
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

-- Step 3: 결과 확인
SELECT '✅ Step 3: 수정 후 상태 확인' as step;

SELECT
    COUNT(*) as "총_레코드",
    COUNT(DISTINCT code) as "고유_회사_수",
    CASE
        WHEN COUNT(*) = COUNT(DISTINCT code) THEN '✅ 중복 없음'
        ELSE '⚠️ 중복 존재'
    END as "상태"
FROM v_smart_money_flow;

-- Step 4: 등급별 통계
SELECT '📊 Step 4: 등급별 통계' as step;

SELECT
    grade as "등급",
    COUNT(*) as "개수",
    ROUND(AVG(smart_money_score), 2) as "평균_점수",
    ROUND(AVG(rvol), 2) as "평균_RVOL"
FROM v_smart_money_flow
GROUP BY grade
ORDER BY grade;

-- 완료 메시지
DO $$
DECLARE
    total_count INTEGER;
    unique_count INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(DISTINCT code)
    INTO total_count, unique_count
    FROM v_smart_money_flow;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Smart Money Flow 중복 제거 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 결과:';
    RAISE NOTICE '  - 전체 레코드: %개', total_count;
    RAISE NOTICE '  - 고유 회사: %개', unique_count;

    IF total_count = unique_count THEN
        RAISE NOTICE '  - 상태: ✅ 중복 없음';
    ELSE
        RAISE NOTICE '  - 상태: ⚠️ 중복 %개 존재', (total_count - unique_count);
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✨ 다음 단계:';
    RAISE NOTICE '  1. 브라우저에서 /smart-money-flow 페이지 새로고침';
    RAISE NOTICE '  2. Hard Refresh (Ctrl+Shift+R)';
    RAISE NOTICE '  3. 중복 제거 확인';
    RAISE NOTICE '========================================';
END $$;
