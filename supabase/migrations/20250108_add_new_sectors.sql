-- 새로운 섹터 추가: 메타버스, 2차전지, 로봇, 우주항공·드론

-- 1. 새 섹터 생성
INSERT INTO public.etf_sectors (name, description, display_order, growth_outlook, color_code) VALUES
('메타버스', '가상현실(VR), 증강현실(AR), 메타버스 플랫폼, 디지털 트윈 등 가상세계 구축 기술', 5, '매우 높음', '#8B5CF6'),
('2차전지·전기차', '리튬이온 배터리, 전기차, 배터리 소재·부품, 충전 인프라 등 친환경 모빌리티 생태계', 6, '매우 높음', '#84CC16'),
('로봇·자동화', '산업용 로봇, 서비스 로봇, 휴머노이드, 자동화 설비 등 로봇공학 전반', 7, '높음', '#F97316'),
('우주항공·드론', '위성, 로켓, 우주탐사, 드론, 도심항공모빌리티(UAM) 등 항공우주 산업', 8, '높음', '#06B6D4')
ON CONFLICT (name) DO NOTHING;

-- 2. ETF 할당

DO $$
DECLARE
  sector_metaverse INTEGER;
  sector_battery INTEGER;
  sector_robot INTEGER;
  sector_space INTEGER;
  sector_hydrogen INTEGER; -- 기존 수소경제 섹터
BEGIN
  -- 섹터 ID 가져오기
  SELECT id INTO sector_metaverse FROM public.etf_sectors WHERE name = '메타버스';
  SELECT id INTO sector_battery FROM public.etf_sectors WHERE name = '2차전지·전기차';
  SELECT id INTO sector_robot FROM public.etf_sectors WHERE name = '로봇·자동화';
  SELECT id INTO sector_space FROM public.etf_sectors WHERE name = '우주항공·드론';
  SELECT id INTO sector_hydrogen FROM public.etf_sectors WHERE name = '수소경제';

  -- 메타버스 섹터 (현재 DB에 직접적인 메타버스 ETF 없음)
  -- 향후 추가 예정

  -- 2차전지·전기차 섹터 (기존 수소경제에서 이동)

  -- KODEX 2차전지산업 (305720)
  UPDATE public.companies
  SET sector_id = sector_battery, growth_score = 85,
      investment_thesis = '2차전지 산업 전반 투자, 전기차 시대 핵심 에너지원'
  WHERE code = '305720';

  -- KODEX 2차전지산업레버리지 (462330)
  UPDATE public.companies
  SET sector_id = sector_battery, growth_score = 80,
      investment_thesis = '2차전지 산업 레버리지 투자, 고성장 섹터'
  WHERE code = '462330';

  -- TIGER 2차전지TOP10 (364980)
  UPDATE public.companies
  SET sector_id = sector_battery, growth_score = 88,
      investment_thesis = '2차전지 업계 상위 10개 기업 집중 투자'
  WHERE code = '364980';

  -- TIGER 2차전지소재Fn (462010)
  UPDATE public.companies
  SET sector_id = sector_battery, growth_score = 83,
      investment_thesis = '2차전지 소재 산업 투자, 밸류체인 핵심'
  WHERE code = '462010';

  -- TIGER 2차전지테마 (305540)
  UPDATE public.companies
  SET sector_id = sector_battery, growth_score = 84,
      investment_thesis = '2차전지 테마 전반 투자'
  WHERE code = '305540';

  -- ACE 테슬라밸류체인액티브 (457480)
  UPDATE public.companies
  SET sector_id = sector_battery, growth_score = 90,
      investment_thesis = '테슬라 밸류체인 투자, 전기차 생태계 선도'
  WHERE code = '457480';

  -- TIGER 차이나전기차SOLACTIVE (371460)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_battery, growth_score = 82,
      investment_thesis = '중국 전기차 시장 투자, 글로벌 전기차 성장'
  WHERE code = '371460';

  -- 로봇·자동화 섹터

  -- TIGER 차이나휴머노이드로봇 (0053L0)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_robot, growth_score = 88,
      investment_thesis = '중국 휴머노이드 로봇 산업 투자, 차세대 로봇공학'
  WHERE code = '0053L0';

  -- 우주항공·드론 섹터

  -- SOL 조선TOP3플러스 (466920)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_space, growth_score = 78,
      investment_thesis = '조선 산업 상위 3개 기업 투자, 고부가가치 선박'
  WHERE code = '466920';

  -- TIGER 조선TOP10 (494670)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_space, growth_score = 80,
      investment_thesis = '조선 산업 상위 10개 기업 투자, 글로벌 조선 경쟁력'
  WHERE code = '494670';

  -- 수소경제 섹터 설명 업데이트 (2차전지가 빠져나가므로)
  UPDATE public.etf_sectors
  SET description = '수소 생산, 저장, 운송, 활용 기술 및 수소연료전지 관련 친환경 에너지 섹터'
  WHERE name = '수소경제';

  RAISE NOTICE '✅ 새로운 섹터 추가 완료!';
  RAISE NOTICE '섹터 5 (메타버스): 0개 ETF (향후 추가 예정)';
  RAISE NOTICE '섹터 6 (2차전지·전기차): 7개 ETF';
  RAISE NOTICE '섹터 7 (로봇·자동화): 1개 ETF';
  RAISE NOTICE '섹터 8 (우주항공·드론): 2개 ETF (조선 포함)';

END $$;

-- 전체 섹터 결과 확인
SELECT
  s.name as 섹터명,
  s.growth_outlook as 성장전망,
  COUNT(c.id) as ETF수,
  STRING_AGG(c.name, ', ' ORDER BY c.name) as ETF목록
FROM public.etf_sectors s
LEFT JOIN public.companies c ON c.sector_id = s.id AND c.is_etf = TRUE
GROUP BY s.id, s.name, s.growth_outlook
ORDER BY s.display_order;
