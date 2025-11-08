-- 실제 DB에 있는 ETF로 섹터 할당
-- 4개 섹터에 적합한 ETF 선택

DO $$
DECLARE
  sector_4th_ind INTEGER;
  sector_ai_infra INTEGER;
  sector_hydrogen INTEGER;
  sector_health INTEGER;
BEGIN
  -- 섹터 ID 가져오기
  SELECT id INTO sector_4th_ind FROM public.etf_sectors WHERE name = '4차 산업 혁명·혁신기술';
  SELECT id INTO sector_ai_infra FROM public.etf_sectors WHERE name = '2030 AI 시대 – AI 전력·인프라';
  SELECT id INTO sector_hydrogen FROM public.etf_sectors WHERE name = '수소경제';
  SELECT id INTO sector_health FROM public.etf_sectors WHERE name = '디지털 헬스케어·의료 AI';

  -- 1. 4차 산업 혁명·혁신기술 섹터 (AI, 반도체 관련)

  -- KODEX AI반도체 (395160)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_4th_ind, growth_score = 90,
      investment_thesis = 'AI 반도체 산업 전반 투자, 인공지능 혁명의 핵심 인프라'
  WHERE code = '395160';

  -- TIGER 반도체 (091230)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_4th_ind, growth_score = 85,
      investment_thesis = '반도체 산업 대표 기업 투자, 4차 산업혁명 핵심 기술'
  WHERE code = '091230';

  -- TIGER 반도체TOP10 (396500)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_4th_ind, growth_score = 88,
      investment_thesis = '반도체 업계 상위 10개 기업 집중 투자'
  WHERE code = '396500';

  -- KODEX 반도체 (091160)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_4th_ind, growth_score = 87,
      investment_thesis = '국내 반도체 대표 종목 투자'
  WHERE code = '091160';

  -- SOL AI반도체소부장 (455850)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_4th_ind, growth_score = 92,
      investment_thesis = 'AI 반도체 소재·부품·장비 생태계 투자'
  WHERE code = '455850';

  -- 2. 2030 AI 시대 – AI 전력·인프라 섹터

  -- KODEX AI전력핵심설비 (487240)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 95,
      investment_thesis = 'AI 데이터센터 전력 공급 핵심 설비 투자'
  WHERE code = '487240';

  -- KODEX 미국AI전력핵심인프라 (487230)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 94,
      investment_thesis = '미국 AI 전력 인프라 투자, 글로벌 AI 생태계 지원'
  WHERE code = '487230';

  -- KODEX 미국AI테크TOP10타겟커버드콜 (483280)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 88,
      investment_thesis = '미국 AI 빅테크 상위 10개 기업 투자'
  WHERE code = '483280';

  -- TIGER 미국필라델피아AI반도체나스닥 (497570)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 93,
      investment_thesis = '나스닥 AI 반도체 지수 투자, 글로벌 AI 칩 리더'
  WHERE code = '497570';

  -- TIGER 미국필라델피아반도체나스닥 (381180)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 91,
      investment_thesis = '나스닥 필라델피아 반도체 지수 투자'
  WHERE code = '381180';

  -- KODEX 미국반도체 (390390)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 90,
      investment_thesis = '미국 반도체 대표 기업 투자'
  WHERE code = '390390';

  -- ACE 글로벌반도체TOP4 Plus (446770)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 92,
      investment_thesis = '글로벌 반도체 상위 4개 기업 집중 투자'
  WHERE code = '446770';

  -- TIGER 미국테크TOP10 INDXX (381170)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 89,
      investment_thesis = '미국 빅테크 상위 10개 기업 투자, AI 생태계 리더'
  WHERE code = '381170';

  -- ACE 미국빅테크TOP7 Plus (465580)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 91,
      investment_thesis = '미국 빅테크 상위 7개 기업 집중 투자'
  WHERE code = '465580';

  -- KODEX 미국빅테크10(H) (314250)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_ai_infra, growth_score = 90,
      investment_thesis = '미국 빅테크 상위 10개 기업 투자 (환헷지)'
  WHERE code = '314250';

  -- 3. 수소경제 섹터 (2차전지로 대체 - 친환경 에너지)

  -- KODEX 2차전지산업 (305720)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_hydrogen, growth_score = 80,
      investment_thesis = '2차전지 산업 전반 투자, 친환경 에너지 전환 핵심'
  WHERE code = '305720';

  -- KODEX 2차전지산업레버리지 (462330)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_hydrogen, growth_score = 75,
      investment_thesis = '2차전지 산업 레버리지 투자, 고성장 섹터'
  WHERE code = '462330';

  -- TIGER 2차전지TOP10 (364980)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_hydrogen, growth_score = 82,
      investment_thesis = '2차전지 업계 상위 10개 기업 집중 투자'
  WHERE code = '364980';

  -- TIGER 2차전지소재Fn (462010)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_hydrogen, growth_score = 78,
      investment_thesis = '2차전지 소재 산업 투자, 밸류체인 핵심'
  WHERE code = '462010';

  -- TIGER 2차전지테마 (305540)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_hydrogen, growth_score = 79,
      investment_thesis = '2차전지 테마 전반 투자'
  WHERE code = '305540';

  -- ACE 테슬라밸류체인액티브 (457480)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_hydrogen, growth_score = 83,
      investment_thesis = '테슬라 밸류체인 투자, 전기차 생태계'
  WHERE code = '457480';

  -- 4. 디지털 헬스케어·의료 AI 섹터

  -- TIGER 화장품 (228790)
  UPDATE public.companies
  SET is_etf = TRUE, sector_id = sector_health, growth_score = 75,
      investment_thesis = '뷰티 헬스케어 산업 투자, K-뷰티 글로벌 성장'
  WHERE code = '228790';

  -- (추가 헬스케어 ETF가 DB에 없어서 화장품만 할당)

  RAISE NOTICE '✅ 실제 DB 기준 ETF 섹터 할당 완료!';
  RAISE NOTICE '섹터 1 (4차 산업): 5개 ETF (AI 반도체 중심)';
  RAISE NOTICE '섹터 2 (AI 인프라): 10개 ETF (AI 전력·빅테크)';
  RAISE NOTICE '섹터 3 (수소경제): 6개 ETF (2차전지로 대체)';
  RAISE NOTICE '섹터 4 (헬스케어): 1개 ETF (화장품)';
  RAISE NOTICE '총 22개 ETF 할당';

END $$;

-- 할당 결과 확인
SELECT
  s.name as 섹터명,
  s.growth_outlook as 성장전망,
  COUNT(c.id) as ETF수,
  STRING_AGG(c.name || ' (' || c.code || ')', ', ' ORDER BY c.name) as ETF목록
FROM public.etf_sectors s
LEFT JOIN public.companies c ON c.sector_id = s.id AND c.is_etf = TRUE
GROUP BY s.id, s.name, s.growth_outlook
ORDER BY s.display_order;
