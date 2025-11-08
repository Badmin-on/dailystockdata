-- ETF 섹터 관리 시스템
-- 동적으로 섹터를 생성/수정/삭제하고 ETF를 섹터에 할당할 수 있는 시스템

-- 1. ETF 섹터 테이블 생성
CREATE TABLE IF NOT EXISTS public.etf_sectors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  growth_outlook VARCHAR(50), -- '매우 높음', '높음', '중립', '낮음'
  color_code VARCHAR(20), -- UI에서 섹터별 색상 구분
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Companies 테이블에 ETF 관련 컬럼 추가
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES public.etf_sectors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_etf BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS growth_score INTEGER DEFAULT 50 CHECK (growth_score >= 0 AND growth_score <= 100),
ADD COLUMN IF NOT EXISTS investment_thesis TEXT; -- 투자 논리/설명

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_companies_sector_id ON public.companies(sector_id);
CREATE INDEX IF NOT EXISTS idx_companies_is_etf ON public.companies(is_etf);
CREATE INDEX IF NOT EXISTS idx_etf_sectors_display_order ON public.etf_sectors(display_order);

-- 4. 초기 4개 섹터 데이터 삽입 (PDF 기준)
INSERT INTO public.etf_sectors (name, description, display_order, growth_outlook, color_code) VALUES
('4차 산업 혁명·혁신기술', '인공지능, 로봇공학, 사물인터넷, 자율주행차, 3D프린팅 등 4차 산업혁명을 이끄는 핵심 기술 섹터', 1, '매우 높음', '#4F46E5'),
('2030 AI 시대 – AI 전력·인프라', 'AI 시대의 필수 인프라인 전력 공급, 데이터센터, 반도체, 네트워크 장비 등 AI 생태계 지원 섹터', 2, '매우 높음', '#EC4899'),
('수소경제', '친환경 에너지 전환의 핵심인 수소 생산, 저장, 운송, 활용 기술 관련 섹터', 3, '높음', '#10B981'),
('디지털 헬스케어·의료 AI', '원격 의료, AI 진단, 웰니스 기술, 디지털 치료제 등 헬스케어 디지털 혁신 섹터', 4, '높음', '#F59E0B')
ON CONFLICT (name) DO NOTHING;

-- 5. ETF 섹터별 통계 뷰 생성
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

-- 6. 개별 ETF 상세 정보 뷰 생성
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

-- 7. Refresh 함수에 ETF 관련 뷰 추가 (기존 함수 업데이트)
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_consensus_changes;
  REFRESH MATERIALIZED VIEW mv_stock_analysis;
  -- ETF 뷰는 일반 뷰라서 자동 갱신됨 (materialized 아님)
  RAISE NOTICE '✅ Materialized Views refreshed successfully!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 섹터 관리 함수들

-- 섹터 생성
CREATE OR REPLACE FUNCTION public.create_etf_sector(
  p_name VARCHAR(100),
  p_description TEXT,
  p_growth_outlook VARCHAR(50),
  p_color_code VARCHAR(20)
)
RETURNS INTEGER AS $$
DECLARE
  v_sector_id INTEGER;
  v_max_order INTEGER;
BEGIN
  -- 최대 display_order 찾기
  SELECT COALESCE(MAX(display_order), 0) + 1 INTO v_max_order
  FROM public.etf_sectors;

  -- 섹터 삽입
  INSERT INTO public.etf_sectors (name, description, growth_outlook, color_code, display_order)
  VALUES (p_name, p_description, p_growth_outlook, p_color_code, v_max_order)
  RETURNING id INTO v_sector_id;

  RETURN v_sector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 섹터 업데이트
CREATE OR REPLACE FUNCTION public.update_etf_sector(
  p_sector_id INTEGER,
  p_name VARCHAR(100),
  p_description TEXT,
  p_growth_outlook VARCHAR(50),
  p_color_code VARCHAR(20)
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.etf_sectors
  SET
    name = p_name,
    description = p_description,
    growth_outlook = p_growth_outlook,
    color_code = p_color_code,
    updated_at = NOW()
  WHERE id = p_sector_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ETF를 섹터에 할당
CREATE OR REPLACE FUNCTION public.assign_etf_to_sector(
  p_company_id INTEGER,
  p_sector_id INTEGER,
  p_growth_score INTEGER DEFAULT NULL,
  p_investment_thesis TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.companies
  SET
    sector_id = p_sector_id,
    is_etf = TRUE,
    growth_score = COALESCE(p_growth_score, growth_score, 50),
    investment_thesis = COALESCE(p_investment_thesis, investment_thesis)
  WHERE id = p_company_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 권한 설정
GRANT SELECT ON public.etf_sectors TO authenticated, anon;
GRANT SELECT ON public.v_etf_sector_stats TO authenticated, anon;
GRANT SELECT ON public.v_etf_details TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_etf_sector TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_etf_sector TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_etf_to_sector TO authenticated;

-- 완료
COMMENT ON TABLE public.etf_sectors IS 'ETF 섹터 분류 테이블 - 동적 관리 가능';
COMMENT ON VIEW public.v_etf_sector_stats IS 'ETF 섹터별 통계 및 투자 점수';
COMMENT ON VIEW public.v_etf_details IS 'ETF 개별 종목 상세 정보 및 투자 점수';
