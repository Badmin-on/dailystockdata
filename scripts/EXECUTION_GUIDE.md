# ETF 데이터 수정 실행 가이드

## 개요

ETF 등락률 데이터 오류를 수정하고 섹터 분류 기능을 추가하는 가이드입니다.

## 문제점

### 1. 등락률 오류
- **현상**: ETF의 `change_rate`가 88744%, 1075315% 등 비정상적으로 높은 값
- **원인**: `daily_stock_prices` 테이블의 `change_rate` 컬럼에 전일 종가가 저장됨
- **영향**: ETF 모니터링 페이지에서 잘못된 등락률 표시

### 2. 섹터 분류 없음
- **현상**: ETF를 섹터별로 필터링/모니터링 불가
- **요구사항**: 반도체, 2차전지, 바이오, IT, 해외지수 등 섹터별 분류 필요

## 실행 순서

### Step 1: 등락률 데이터 검증 및 수정

#### 1-1. Supabase SQL Editor 접속
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

#### 1-2. 검증 단계 실행
```sql
-- scripts/fix-etf-change-rate.sql 파일의 Step 1~3 실행
-- 결과를 확인하여 데이터가 올바르게 계산되는지 검증
```

**예상 결과**:
```
검증: ETF 등락률 수정 대상
total_records: 약 50,000개
abnormal_records: 대부분
avg_old_change_rate: 50,000 이상 (비정상)
avg_correct_change_rate: -5 ~ +5 사이 (정상)
```

#### 1-3. 실제 업데이트 실행
검증 결과가 정상이면 Step 4의 주석을 해제하고 실행:

```sql
UPDATE daily_stock_prices dsp
SET change_rate = t.correct_change_rate
FROM temp_etf_change_rates t
WHERE dsp.company_id = t.company_id
  AND dsp.date = t.date
  AND t.correct_change_rate IS NOT NULL;
```

**예상 소요 시간**: 1-3분

#### 1-4. Materialized View 갱신
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;
```

**예상 소요 시간**: 30초-1분

### Step 2: ETF 섹터 분류 추가

#### 2-1. 스키마 업데이트
```sql
-- scripts/add-etf-sector.sql 파일의 Step 1 실행
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS etf_sector VARCHAR(50);
```

#### 2-2. 자동 섹터 분류
```sql
-- scripts/add-etf-sector.sql 파일의 Step 2 실행
-- UPDATE 문을 실행하여 ETF 이름 기반으로 자동 분류
```

**분류 카테고리** (총 20개):
- 반도체
- 2차전지
- 바이오/헬스케어
- IT/소프트웨어
- AI/로봇
- 전기차/모빌리티
- 에너지/친환경
- 금융
- 부동산/리츠
- 배당
- 채권
- 원자재/상품
- 해외지수-미국
- 해외지수-중국
- 해외지수-일본
- 해외지수-인도
- 해외지수-베트남
- 해외지수-유럽
- 국내지수
- 레버리지/인버스
- 테마
- 기타

#### 2-3. 분류 결과 확인
```sql
-- scripts/add-etf-sector.sql 파일의 Step 3~4 실행
-- '기타'로 분류된 ETF가 있으면 수동 분류 필요
```

#### 2-4. 인덱스 생성
```sql
-- scripts/add-etf-sector.sql 파일의 Step 5~6 실행
-- 섹터 필터링 성능 최적화
```

### Step 3: API 업데이트 배포

등락률과 섹터 데이터가 정상적으로 업데이트되면:

```bash
# 프로젝트 디렉토리로 이동
cd C:\Users\nebad\Desktop\dailystockdata\dailystockdata

# Git 커밋
git add scripts/
git commit -m "Add ETF data fix and sector classification SQL scripts"

# Vercel 재배포 트리거 (자동)
git push origin main
```

## 검증 방법

### 1. 등락률 검증

#### Supabase SQL Editor에서:
```sql
SELECT
  c.name,
  c.code,
  dsp.close_price,
  dsp.change_rate,
  LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as prev_price
FROM daily_stock_prices dsp
JOIN companies c ON c.id = dsp.company_id
WHERE c.is_etf = TRUE
  AND dsp.date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY dsp.date DESC
LIMIT 10;
```

**예상 결과**: `change_rate`가 -10 ~ +10% 사이의 정상 범위

#### 웹 UI에서:
1. https://dailystockdata.vercel.app/etf-monitoring 접속
2. 등락률이 -5% ~ +5% 정도의 정상 범위인지 확인
3. 평균 수익률이 수만% → 수% 단위로 변경되었는지 확인

### 2. 섹터 분류 검증

```sql
SELECT
  etf_sector,
  COUNT(*) as count,
  STRING_AGG(name, ', ') FILTER (WHERE name LIKE '%삼성%') as example_names
FROM companies
WHERE is_etf = TRUE
GROUP BY etf_sector
ORDER BY count DESC;
```

**예상 결과**:
- 채권: 20-30개
- 국내지수: 10-20개
- 해외지수-미국: 10-15개
- 기타: 10개 이하

## 롤백 방법

### 등락률 롤백
```sql
-- 백업이 없는 경우: NULL로 초기화 후 재수집
UPDATE daily_stock_prices dsp
SET change_rate = NULL
FROM companies c
WHERE dsp.company_id = c.id
  AND c.is_etf = TRUE;
```

### 섹터 컬럼 제거
```sql
ALTER TABLE companies DROP COLUMN IF EXISTS etf_sector;
DROP INDEX IF EXISTS idx_companies_etf_sector;
DROP INDEX IF EXISTS idx_companies_etf_provider_sector;
```

## 예상 영향

### 긍정적 영향
✅ ETF 등락률이 정상 범위(-10% ~ +10%)로 표시
✅ 평균 수익률 계산이 정확해짐
✅ 섹터별 ETF 필터링 및 모니터링 가능
✅ 투자자가 섹터 트렌드를 한눈에 파악 가능

### 주의사항
⚠️ `mv_stock_analysis` 뷰 갱신 중 1-3분간 일부 API 응답 지연 가능
⚠️ 대량 UPDATE로 인해 일시적 DB 부하 증가

## 다음 단계

SQL 실행 완료 후:
1. API 업데이트 (섹터 필터 추가)
2. UI 업데이트 (섹터 선택 드롭다운 추가)
3. 섹터별 통계 카드 추가
4. Git 커밋 및 배포

## 문의

문제 발생 시 스크린샷과 함께 문의하세요.
