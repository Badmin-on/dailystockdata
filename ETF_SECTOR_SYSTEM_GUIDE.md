# ETF 섹터 관리 시스템 구현 가이드

## 📋 개요

동적 섹터/ETF 관리 시스템이 성공적으로 구현되었습니다! 이제 사용자가 직접 섹터를 생성/수정/삭제하고 ETF를 원하는 섹터에 할당할 수 있습니다.

## 🎯 구현된 기능

### 1. 데이터베이스 스키마
- **`etf_sectors` 테이블**: 섹터 관리 (이름, 설명, 성장 전망, 색상 등)
- **`companies` 테이블 확장**: `sector_id`, `is_etf`, `growth_score`, `investment_thesis` 컬럼 추가
- **`v_etf_sector_stats` 뷰**: 섹터별 통계 및 투자 점수 자동 계산
- **`v_etf_details` 뷰**: ETF 개별 상세 정보 및 투자 신호

### 2. API 엔드포인트
- **GET/POST/PUT/DELETE `/api/etf-sectors`**: 섹터 관리
- **GET `/api/etf-sectors/stats`**: 섹터별 통계
- **GET/PUT `/api/etf-details`**: ETF 상세 정보 조회 및 할당

### 3. 관리 UI
- **`/sector-management` 페이지**: 섹터 및 ETF 관리 인터페이스
  - 섹터 개요 탭: 섹터별 통계 및 성과 확인
  - 섹터 관리 탭: 섹터 생성/수정/삭제
  - ETF 할당 탭: ETF를 섹터에 할당

### 4. ETF 모니터링 페이지 업그레이드
- **섹터 히트맵 뷰**: 섹터별 투자 기회를 한눈에 확인
- **동적 섹터 필터**: 데이터베이스 기반 섹터 선택
- **투자 점수 시스템**: 120선 괴리율 + 52주 위치 + 성장 점수 종합 분석

## 📊 초기 데이터

PDF 기준으로 4개 섹터에 21개 ETF가 자동 할당됩니다:

### 섹터 1: 4차 산업 혁명·혁신기술 (3개 ETF)
1. KODEX 4차산업 (361270)
2. ACE 4차산업인더스트리 (408050)
3. TIGER 인공지능 (432420)

### 섹터 2: 2030 AI 시대 – AI 전력·인프라 (10개 ETF)
1. TIGER AI PLUS (445450)
2. TIGER AI HBM (472130)
3. TIGER 전력생산 (360750)
4. KODEX 전기전자 (140160)
5. KODEX 전력공기가스 (278650)
6. KINDEX 한국전력공사 (447430)
7. ACE 전력기술 (424320)
8. KODEX 태양광에너지 (462330)
9. TIGER 글로벌메가트렌드 (448260)
10. SOL 글로벌테크TOP10 (371460)

### 섹터 3: 수소경제 (4개 ETF)
1. TIGER 수소경제 (436810)
2. SOL 수소경제 (451060)
3. HANARO Fn수소경제테마 (457690)
4. KODEX 수소경제테마 (439580)

### 섹터 4: 디지털 헬스케어·의료 AI (3개 ETF)
1. KODEX 헬스케어 (266360)
2. TIGER 헬스케어 (228790)
3. ACE 건강산업 (463440)

## 🚀 배포 단계

### 1단계: 데이터베이스 마이그레이션 실행

Supabase SQL Editor에서 다음 SQL 파일들을 순서대로 실행하세요:

```bash
# 1. 섹터 관리 스키마 생성
supabase/migrations/20250108_etf_sector_management.sql

# 2. 초기 ETF 데이터 임포트
supabase/migrations/20250108_import_initial_etfs.sql
```

### 2단계: 실행 결과 확인

SQL 실행 후 다음 쿼리로 결과 확인:

```sql
-- 섹터별 ETF 수 확인
SELECT
  s.name as 섹터명,
  s.growth_outlook as 성장전망,
  COUNT(c.id) as ETF수
FROM public.etf_sectors s
LEFT JOIN public.companies c ON c.sector_id = s.id AND c.is_etf = TRUE
GROUP BY s.id, s.name, s.growth_outlook
ORDER BY s.display_order;

-- ETF 상세 정보 확인
SELECT
  sector_name as 섹터,
  name as 종목명,
  code as 코드,
  investment_score as 투자점수,
  valuation_signal as 평가신호,
  position_signal as 위치신호
FROM public.v_etf_details
ORDER BY sector_id, investment_score DESC;
```

### 3단계: 코드 배포

```bash
# Git 커밋
git add .
git commit -m "Add ETF sector management system with dynamic allocation"

# Vercel 배포
git push
```

## 💡 사용 방법

### 새 섹터 생성
1. `/sector-management` 페이지 접속
2. "섹터 관리" 탭 선택
3. "새 섹터 생성" 버튼 클릭
4. 섹터 정보 입력:
   - **섹터명**: 예) "메타버스"
   - **설명**: 예) "가상현실, AR/VR, 메타버스 플랫폼 관련 기업"
   - **성장 전망**: 매우 높음/높음/중립/낮음
   - **색상**: UI에서 섹터를 구분할 색상 선택
5. "생성" 버튼 클릭

### ETF 섹터 할당
1. `/sector-management` 페이지 접속
2. "ETF 할당" 탭 선택
3. ETF 목록에서 "할당/수정" 버튼 클릭
4. 섹터 선택 및 추가 정보 입력:
   - **섹터 선택**: 드롭다운에서 원하는 섹터 선택
   - **성장 점수** (0-100): ETF의 성장 잠재력 평가 점수
   - **투자 논리**: 이 ETF를 선택한 이유 및 투자 전략
5. "할당" 버튼 클릭

### 섹터 히트맵으로 투자 기회 확인
1. `/etf-monitoring` 페이지 접속
2. "섹터 히트맵" 뷰 확인 (기본값)
3. 각 섹터 카드에서 확인 가능:
   - **투자 점수**: 0-100점 (높을수록 저평가)
   - **섹터 평가**: 매우 저평가/저평가/적정가/고평가/매우 고평가
   - **평균 120선 괴리율**: 음수일수록 저평가
   - **52주 평균 위치**: 낮을수록 저점 근처
4. 섹터 카드 클릭 → 해당 섹터 ETF 목록으로 자동 이동

### ETF 목록에서 상세 정보 확인
1. `/etf-monitoring` 페이지에서 "목록 보기" 선택
2. 섹터 필터로 특정 섹터만 필터링 가능
3. 각 ETF의 투자 점수, 평가 신호, 위치 신호 확인

## 📈 투자 점수 계산 방식

### 개별 ETF 투자 점수 (0-100점)
```
투자 점수 =
  (Divergence 점수 × 40%) +
  (52주 역포지션 점수 × 30%) +
  (성장 점수 × 30%)

- Divergence 점수: 50 - divergence_120
  (120선 아래일수록 높은 점수)

- 52주 역포지션 점수: 100 - position_in_52w_range
  (52주 저점에 가까울수록 높은 점수)

- 성장 점수: 사용자가 직접 설정 (0-100)
```

### 섹터 투자 점수 (0-100점)
```
섹터 투자 점수 = 50 - 평균 Divergence

섹터 평가:
- 매우 저평가: 평균 divergence ≤ -10%
- 저평가: -10% < 평균 divergence ≤ -5%
- 적정가: -5% < 평균 divergence ≤ 5%
- 고평가: 5% < 평균 divergence ≤ 10%
- 매우 고평가: 평균 divergence > 10%
```

## 🎨 섹터 색상 가이드

섹터를 시각적으로 구분하기 위한 권장 색상:

- **4차 산업**: `#4F46E5` (보라색) - 혁신
- **AI 인프라**: `#EC4899` (분홍색) - 미래 기술
- **수소경제**: `#10B981` (녹색) - 친환경
- **헬스케어**: `#F59E0B` (주황색) - 생명/건강
- **메타버스**: `#8B5CF6` (자주색) - 가상 공간
- **핀테크**: `#06B6D4` (청록색) - 금융 혁신

## 🔧 고급 기능

### 섹터 순서 변경
섹터는 `display_order` 값으로 정렬됩니다. 순서를 변경하려면:

```sql
UPDATE public.etf_sectors
SET display_order = [새로운 순서]
WHERE id = [섹터 ID];
```

### 섹터 삭제 제한
ETF가 할당된 섹터는 삭제할 수 없습니다. 삭제하려면:
1. 해당 섹터의 모든 ETF를 다른 섹터로 이동
2. 또는 ETF 할당 해제 (sector_id = NULL)
3. 그 후 섹터 삭제 가능

### 벌크 할당 (여러 ETF 동시 할당)
SQL로 여러 ETF를 한 번에 섹터에 할당:

```sql
UPDATE public.companies
SET
  sector_id = [섹터 ID],
  is_etf = TRUE,
  growth_score = 70
WHERE code IN ('123456', '234567', '345678');
```

## 📱 모바일 지원

모든 페이지는 반응형으로 구현되어 있어 모바일에서도 원활하게 사용 가능합니다:
- 섹터 히트맵: 카드 레이아웃으로 스크롤 가능
- ETF 목록: 테이블 → 카드 뷰로 자동 전환
- 관리 페이지: 터치 친화적 UI

## 🔄 자동 갱신

GitHub Actions가 하루 2회 실행되면:
1. 주가 데이터 수집
2. Materialized View 자동 갱신 (`mv_stock_analysis`)
3. 섹터 통계 뷰 자동 업데이트 (`v_etf_sector_stats`)
4. 투자 점수 자동 재계산

별도 작업 없이 최신 데이터 자동 반영!

## 🎯 다음 단계 권장사항

1. **알림 시스템 추가**
   - 특정 섹터가 "매우 저평가" 상태가 되면 알림
   - ETF가 52주 저점 근처(20% 이하)에 도달하면 알림

2. **백테스팅 기능**
   - 과거 투자 점수 추이 그래프
   - 섹터 로테이션 전략 시뮬레이션

3. **포트폴리오 추천**
   - AI 기반 섹터 배분 제안
   - 리밸런싱 타이밍 제안

4. **커스텀 대시보드**
   - 사용자별 관심 섹터 북마크
   - 개인화된 알림 설정

## ❓ FAQ

**Q: ETF를 여러 섹터에 동시에 할당할 수 있나요?**
A: 현재는 하나의 ETF는 하나의 섹터에만 할당 가능합니다. 이는 명확한 분류를 위한 설계입니다.

**Q: 섹터 색상을 나중에 변경할 수 있나요?**
A: 네, 섹터 관리 탭에서 언제든지 수정 가능합니다.

**Q: 투자 점수는 어떻게 해석하나요?**
A:
- 80점 이상: S급 - 매우 강력한 매수 기회
- 70-79점: A급 - 강력한 매수 기회
- 60-69점: B급 - 양호한 매수 기회
- 50-59점: C급 - 보통 수준
- 50점 미만: D급 - 관망 또는 매도 고려

**Q: 기존 ETF 데이터는 어떻게 되나요?**
A: 기존 ETF 데이터는 그대로 유지되며, 새 시스템은 추가 정보만 확장합니다.

## 📞 지원

문제가 발생하거나 추가 기능이 필요한 경우:
1. GitHub Issues에 등록
2. 또는 Claude Code를 통해 직접 요청

---

**구축 완료일**: 2025-01-08
**버전**: 1.0.0
**시스템 상태**: ✅ 프로덕션 준비 완료
