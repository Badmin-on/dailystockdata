-- ============================================
-- ETF 섹터 분류 기능 추가
-- ============================================
-- 목적: ETF를 섹터별로 분류하여 모니터링 강화
-- 단계: 1) 컬럼 추가, 2) 섹터 분류, 3) 인덱스 생성
-- ============================================

-- Step 1: companies 테이블에 etf_sector 컬럼 추가
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS etf_sector VARCHAR(50);

-- Step 2: ETF 이름 기반 섹터 자동 분류
UPDATE companies
SET etf_sector = CASE
  -- 반도체 섹터
  WHEN name LIKE '%반도체%' THEN '반도체'
  WHEN name LIKE '%칩%' OR name LIKE '%CHIP%' THEN '반도체'

  -- 2차전지 섹터
  WHEN name LIKE '%2차전지%' OR name LIKE '%배터리%' THEN '2차전지'
  WHEN name LIKE '%BATTERY%' THEN '2차전지'

  -- 바이오/헬스케어
  WHEN name LIKE '%바이오%' OR name LIKE '%BIO%' THEN '바이오/헬스케어'
  WHEN name LIKE '%헬스케어%' OR name LIKE '%제약%' THEN '바이오/헬스케어'

  -- IT/소프트웨어
  WHEN name LIKE '%IT%' OR name LIKE '%소프트웨어%' THEN 'IT/소프트웨어'
  WHEN name LIKE '%인터넷%' OR name LIKE '%게임%' THEN 'IT/소프트웨어'
  WHEN name LIKE '%메타버스%' OR name LIKE '%클라우드%' THEN 'IT/소프트웨어'

  -- 인공지능/로봇
  WHEN name LIKE '%AI%' OR name LIKE '%인공지능%' THEN 'AI/로봇'
  WHEN name LIKE '%로봇%' OR name LIKE '%ROBOT%' THEN 'AI/로봇'

  -- 전기차/모빌리티
  WHEN name LIKE '%전기차%' OR name LIKE '%EV%' THEN '전기차/모빌리티'
  WHEN name LIKE '%모빌리티%' OR name LIKE '%자동차%' THEN '전기차/모빌리티'

  -- 에너지/친환경
  WHEN name LIKE '%태양광%' OR name LIKE '%풍력%' THEN '에너지/친환경'
  WHEN name LIKE '%ESG%' OR name LIKE '%탄소%' THEN '에너지/친환경'
  WHEN name LIKE '%수소%' OR name LIKE '%신재생%' THEN '에너지/친환경'

  -- 금융
  WHEN name LIKE '%은행%' OR name LIKE '%금융%' THEN '금융'
  WHEN name LIKE '%증권%' OR name LIKE '%보험%' THEN '금융'

  -- 부동산/리츠
  WHEN name LIKE '%리츠%' OR name LIKE '%REIT%' THEN '부동산/리츠'
  WHEN name LIKE '%부동산%' OR name LIKE '%인프라%' THEN '부동산/리츠'

  -- 배당
  WHEN name LIKE '%배당%' OR name LIKE '%DIVIDEND%' THEN '배당'
  WHEN name LIKE '%고배당%' THEN '배당'

  -- 채권
  WHEN name LIKE '%채권%' OR name LIKE '%BOND%' THEN '채권'
  WHEN name LIKE '%국고채%' OR name LIKE '%회사채%' THEN '채권'
  WHEN name LIKE '%CD%금리%' THEN '채권'

  -- 원자재/상품
  WHEN name LIKE '%금%' OR name LIKE '%GOLD%' THEN '원자재/상품'
  WHEN name LIKE '%은%' OR name LIKE '%SILVER%' THEN '원자재/상품'
  WHEN name LIKE '%원유%' OR name LIKE '%OIL%' THEN '원자재/상품'
  WHEN name LIKE '%구리%' OR name LIKE '%철강%' THEN '원자재/상품'

  -- 해외 지수 (미국)
  WHEN name LIKE '%S&P%' OR name LIKE '%나스닥%' OR name LIKE '%NASDAQ%' THEN '해외지수-미국'
  WHEN name LIKE '%다우%' OR name LIKE '%DOW%' THEN '해외지수-미국'
  WHEN name LIKE '%미국%' AND (name LIKE '%TOP%' OR name LIKE '%배당%') THEN '해외지수-미국'

  -- 해외 지수 (중국)
  WHEN name LIKE '%중국%' OR name LIKE '%차이나%' OR name LIKE '%CHINA%' THEN '해외지수-중국'
  WHEN name LIKE '%항셍%' OR name LIKE '%HANG SENG%' THEN '해외지수-중국'

  -- 해외 지수 (일본)
  WHEN name LIKE '%일본%' OR name LIKE '%닛케이%' THEN '해외지수-일본'
  WHEN name LIKE '%JAPAN%' OR name LIKE '%NIKKEI%' THEN '해외지수-일본'

  -- 해외 지수 (기타)
  WHEN name LIKE '%인도%' OR name LIKE '%INDIA%' THEN '해외지수-인도'
  WHEN name LIKE '%베트남%' OR name LIKE '%VIETNAM%' THEN '해외지수-베트남'
  WHEN name LIKE '%유럽%' OR name LIKE '%EUROPE%' THEN '해외지수-유럽'

  -- 국내 지수
  WHEN name LIKE '%KOSPI%' OR name LIKE '%코스피%' THEN '국내지수'
  WHEN name LIKE '%KOSDAQ%' OR name LIKE '%코스닥%' THEN '국내지수'
  WHEN name LIKE '%200%' OR name LIKE '%TOP%' THEN '국내지수'

  -- 레버리지/인버스
  WHEN name LIKE '%레버리지%' OR name LIKE '%LEVERAGE%' THEN '레버리지/인버스'
  WHEN name LIKE '%인버스%' OR name LIKE '%INVERSE%' THEN '레버리지/인버스'
  WHEN name LIKE '%2X%' OR name LIKE '%3X%' THEN '레버리지/인버스'

  -- 테마
  WHEN name LIKE '%K-POP%' OR name LIKE '%엔터%' THEN '테마'
  WHEN name LIKE '%콘텐츠%' OR name LIKE '%미디어%' THEN '테마'

  -- 기타
  ELSE '기타'
END
WHERE is_etf = TRUE;

-- Step 3: 수동 분류가 필요한 ETF 확인
SELECT
  name,
  code,
  etf_provider,
  etf_sector
FROM companies
WHERE is_etf = TRUE
  AND (etf_sector = '기타' OR etf_sector IS NULL)
ORDER BY etf_provider, name;

-- Step 4: 섹터별 ETF 개수 확인
SELECT
  etf_sector,
  COUNT(*) as etf_count,
  STRING_AGG(DISTINCT etf_provider, ', ') as providers
FROM companies
WHERE is_etf = TRUE
GROUP BY etf_sector
ORDER BY etf_count DESC;

-- Step 5: 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_companies_etf_sector
  ON companies(etf_sector)
  WHERE is_etf = TRUE;

-- Step 6: 복합 인덱스 (운용사 + 섹터 필터링 최적화)
CREATE INDEX IF NOT EXISTS idx_companies_etf_provider_sector
  ON companies(etf_provider, etf_sector)
  WHERE is_etf = TRUE;

-- Step 7: 결과 확인
SELECT
  '✅ ETF 섹터 분류 완료' as status,
  COUNT(*) as total_etfs,
  COUNT(etf_sector) as classified_etfs,
  COUNT(*) FILTER (WHERE etf_sector = '기타' OR etf_sector IS NULL) as unclassified_etfs
FROM companies
WHERE is_etf = TRUE;

-- ============================================
-- 인덱스 확인
-- ============================================
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'companies'
  AND indexname LIKE '%etf%'
ORDER BY indexname;

-- ============================================
-- 롤백 방법 (문제 발생 시)
-- ============================================
/*
-- 섹터 컬럼 제거
ALTER TABLE companies DROP COLUMN IF EXISTS etf_sector;

-- 인덱스 제거
DROP INDEX IF EXISTS idx_companies_etf_sector;
DROP INDEX IF EXISTS idx_companies_etf_provider_sector;
*/
