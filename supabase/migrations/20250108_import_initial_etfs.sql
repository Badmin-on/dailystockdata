-- PDF 기준 초기 ETF 데이터 임포트
-- 4개 섹터, 21개 ETF

-- 섹터는 이미 20250108_etf_sector_management.sql에서 생성됨
-- 여기서는 ETF 종목 할당만 수행

-- 섹터 ID 확인용 임시 변수
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

  -- 1. 4차 산업 혁명·혁신기술 (3개 ETF)

  -- KODEX 4차산업 (361270)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_4th_ind,
    growth_score = 85,
    investment_thesis = '인공지능, 로봇공학, 사물인터넷, 자율주행차, 3D프린팅 등 4차 산업혁명을 이끄는 핵심 기술 기업에 투자'
  WHERE code = '361270';

  -- ACE 4차산업인더스트리 (408050)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_4th_ind,
    growth_score = 80,
    investment_thesis = '4차 산업 혁명 관련 인더스트리 섹터 투자, 혁신 기술 기업 중심 포트폴리오'
  WHERE code = '408050';

  -- TIGER 인공지능 (432420)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_4th_ind,
    growth_score = 90,
    investment_thesis = 'AI 핵심 기술 및 응용 분야 선도 기업 투자, 인공지능 생태계 전반 커버'
  WHERE code = '432420';

  -- 2. 2030 AI 시대 – AI 전력·인프라 (10개 ETF)

  -- TIGER AI PLUS (445450)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 92,
    investment_thesis = 'AI 시대 필수 인프라인 반도체, 클라우드, 데이터센터 등 핵심 기업 집중 투자'
  WHERE code = '445450';

  -- TIGER AI HBM (472130)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 95,
    investment_thesis = 'AI 가속기용 고대역폭 메모리(HBM) 제조 및 공급사 투자, AI 성능 향상의 핵심'
  WHERE code = '472130';

  -- TIGER 전력생산 (360750)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 75,
    investment_thesis = '데이터센터 전력 수요 증가에 따른 전력 생산 기업 투자, AI 인프라 전력 공급'
  WHERE code = '360750';

  -- KODEX 전기전자 (140160)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 70,
    investment_thesis = '전기전자 산업 전반 투자, AI 하드웨어 생태계 지원'
  WHERE code = '140160';

  -- KODEX 전력공기가스 (278650)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 72,
    investment_thesis = '전력, 공기, 가스 등 유틸리티 섹터 투자, 데이터센터 필수 인프라'
  WHERE code = '278650';

  -- KINDEX 한국전력공사 (447430)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 68,
    investment_thesis = '한국전력 중심 전력 공급 기업 투자, 국가 전력망 안정성 확보'
  WHERE code = '447430';

  -- ACE 전력기술 (424320)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 78,
    investment_thesis = '전력 기술 혁신 기업 투자, 스마트 그리드 및 에너지 효율화 기술'
  WHERE code = '424320';

  -- KODEX 태양광에너지 (462330)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 73,
    investment_thesis = '재생에너지 전환 핵심인 태양광 산업 투자, 친환경 AI 인프라 지원'
  WHERE code = '462330';

  -- TIGER 글로벌메가트렌드 (448260)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 82,
    investment_thesis = '글로벌 메가트렌드 선도 기업 투자, AI, 클라우드, 핀테크 등 미래 산업'
  WHERE code = '448260';

  -- SOL 글로벌테크TOP10 (371460)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_ai_infra,
    growth_score = 88,
    investment_thesis = '글로벌 빅테크 상위 10개 기업 집중 투자, AI 생태계 리더 중심'
  WHERE code = '371460';

  -- 3. 수소경제 (4개 ETF)

  -- TIGER 수소경제 (436810)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_hydrogen,
    growth_score = 80,
    investment_thesis = '수소 생산, 저장, 운송, 활용 전 밸류체인 투자, 친환경 에너지 전환 핵심'
  WHERE code = '436810';

  -- SOL 수소경제 (451060)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_hydrogen,
    growth_score = 78,
    investment_thesis = '수소경제 인프라 구축 및 관련 기술 기업 투자'
  WHERE code = '451060';

  -- HANARO Fn수소경제테마 (457690)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_hydrogen,
    growth_score = 75,
    investment_thesis = '수소경제 테마 중심 투자, 정책 수혜 기업 포함'
  WHERE code = '457690';

  -- KODEX 수소경제테마 (439580)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_hydrogen,
    growth_score = 82,
    investment_thesis = '수소경제 전반 테마 투자, 연료전지, 수소차 등 핵심 기업 포함'
  WHERE code = '439580';

  -- 4. 디지털 헬스케어·의료 AI (3개 ETF) - 정정된 내용 (실제 아래 3개 종목이 맞음)

  -- KODEX 헬스케어 (266360)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_health,
    growth_score = 85,
    investment_thesis = '헬스케어 산업 전반 투자, 제약, 바이오, 의료기기 등 종합 포트폴리오'
  WHERE code = '266360';

  -- TIGER 헬스케어 (228790)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_health,
    growth_score = 83,
    investment_thesis = '헬스케어 섹터 대표 기업 투자, 고령화 사회 수혜'
  WHERE code = '228790';

  -- ACE 건강산업 (463440)
  UPDATE public.companies
  SET
    is_etf = TRUE,
    sector_id = sector_health,
    growth_score = 80,
    investment_thesis = '건강 산업 전반 투자, 웰니스, 디지털 헬스 등 신시장 포함'
  WHERE code = '463440';

  RAISE NOTICE '✅ 21개 ETF를 4개 섹터에 할당 완료!';
  RAISE NOTICE '섹터 1 (4차 산업): 3개 ETF';
  RAISE NOTICE '섹터 2 (AI 인프라): 10개 ETF';
  RAISE NOTICE '섹터 3 (수소경제): 4개 ETF';
  RAISE NOTICE '섹터 4 (헬스케어): 3개 ETF';

END $$;

-- 할당 결과 확인
SELECT
  s.name as 섹터명,
  COUNT(c.id) as ETF수,
  STRING_AGG(c.name || ' (' || c.code || ')', ', ' ORDER BY c.name) as ETF목록
FROM public.etf_sectors s
LEFT JOIN public.companies c ON c.sector_id = s.id AND c.is_etf = TRUE
GROUP BY s.id, s.name
ORDER BY s.display_order;
