# 01. YoonStock Pro - 프로젝트 개요

> 태그: #yoonstock #프로젝트개요 #투자분석

## 프로젝트 소개

**YoonStock Pro**는 KOSPI/KOSDAQ 상위 1000개 기업의 재무 컨센서스 변화와 주가 기술적 분석을 결합하여 투자 기회를 자동으로 발굴하는 AI 기반 웹 애플리케이션입니다.

### 핵심 문제 인식

```
❌ 기존 문제점:
- 재무 컨센서스 데이터를 수동으로 확인해야 함
- 주가 이격도를 일일이 계산해야 함
- 투자 기회 발굴에 많은 시간 소요
- 1000개 기업을 모니터링하기 불가능

✅ YoonStock 솔루션:
- 매일 자동 데이터 수집 (GitHub Actions)
- AI 기반 투자 점수 자동 계산
- 실시간 대시보드 (5초 갱신)
- S/A/B/C 등급 자동 분류
```

## 프로젝트 목표

### 1차 목표 (완료)
- [x] KOSPI/KOSDAQ 1000개 기업 데이터 수집 자동화
- [x] 재무 컨센서스 변화율 추적 시스템
- [x] 120일 이동평균선 이격도 분석
- [x] AI 투자 점수 시스템 구축
- [x] 실시간 대시보드 구현

### 2차 목표 (진행중)
- [ ] Smart Money Flow (기관/외국인 매매 분석)
- [ ] Consensus Trend (컨센서스 추이 시각화)
- [ ] ETF 섹터 분석 시스템
- [ ] 모바일 최적화

### 3차 목표 (계획)
- [ ] 알림 시스템 (텔레그램/이메일)
- [ ] 포트폴리오 시뮬레이션
- [ ] 백테스팅 기능
- [ ] 사용자 커스텀 필터

## 핵심 기능

### 1. 투자 기회 발굴 (`/opportunities`)

**컨센서스 점수 (60%) + 이격도 점수 (40%)**

```typescript
// 투자 점수 알고리즘
consensus_score = (
  revenue_change_1m * 0.3 +
  op_profit_change_1m * 0.4 +
  revenue_change_3m * 0.2 +
  op_profit_change_3m * 0.1
)

divergence_score = 120일 이격도 기반 점수

investment_score = consensus_score * 0.6 + divergence_score * 0.4
```

**등급 분류**:
- **S급** (80점 이상): 컨센서스 급상승 + 주가 저평가
- **A급** (70-79점): 컨센서스 상승 + 주가 적정
- **B급** (60-69점): 컨센서스 소폭 상승
- **C급** (50-59점): 관찰 필요

### 2. Smart Money Flow (`/smart-money-flow`)

**기관/외국인 매매 분석**

```
현재 컨센서스 대비 주가 위치 분석
- 컨센서스 상승 + 주가 하락 = 매수 기회
- 대형주 중심 필터링
- 거래량 분석
```

### 3. Consensus Trend (`/consensus-trend`)

**컨센서스 변화 추이 시각화**

- Dual-axis 차트 (매출액 + 영업이익)
- 실제값 vs 퍼센트 변화 모드
- 시계열 분석

### 4. ETF 모니터링 (`/etf-monitoring`)

**섹터별 ETF 성과 분석**

- 동적 섹터 할당 시스템
- 변화율 자동 계산
- Top 20 종목 표시

## 데이터 수집 자동화

### GitHub Actions Workflow

```yaml
스케줄:
  - 재무 데이터: 매일 오전 7:00 KST
  - 주가 데이터: 매일 오후 7:00 KST

데이터 소스:
  - FnGuide: 재무 컨센서스
  - Naver Finance: 일일 주가

처리량:
  - 1,000개 기업
  - 4개년 재무 데이터 (2024-2027)
  - 120일 주가 데이터
```

### 자동화 프로세스

```
1. GitHub Actions 트리거
   ↓
2. 데이터 스크래핑 (scripts/)
   ↓
3. Supabase 업로드
   ↓
4. Materialized View 갱신
   ↓
5. 대시보드 자동 업데이트
```

## 사용자 여정

### 투자자 시나리오

```
1. 메인 페이지 접속
   - 데이터 수집 현황 확인
   - 등록 기업 수, 데이터 건수 확인

2. 투자 기회 대시보드
   - S급/A급 기업 필터링
   - 이격도 -10% ~ 0% 매수 적기 확인
   - 컨센서스 급변 기업 모니터링

3. Smart Money Flow
   - 기관/외국인 매수 종목 확인
   - 대형주 중심 안전 투자

4. Consensus Trend
   - 관심 기업 컨센서스 추이 확인
   - 장기 성장 가능성 판단

5. 종목 비교 (/stock-comparison)
   - 여러 기업 재무 비교
   - 투자 의사결정
```

## 비즈니스 가치

### 시간 절약

```
수동 작업:
- 1000개 기업 확인: ~20시간/일
- 이격도 계산: ~5시간/일
- 컨센서스 수집: ~10시간/일
총 35시간/일

YoonStock 자동화:
- 데이터 수집: 자동 (0시간)
- 점수 계산: 자동 (0시간)
- 대시보드 확인: 5분
총 5분/일

시간 절약: 99.8%
```

### 투자 효율

```
기존 방식:
- 제한된 종목 분석 (10-20개)
- 수동 계산 오류 가능
- 실시간 모니터링 불가

YoonStock:
- 1000개 종목 동시 모니터링
- 자동 계산 (오류 최소화)
- 5초마다 실시간 업데이트
```

## 기술적 차별화

### 1. Materialized Views

```sql
-- 성능 최적화
CREATE MATERIALIZED VIEW v_investment_opportunities AS
SELECT ...
-- 복잡한 조인과 계산을 미리 수행
-- API 응답 시간: ~50ms
```

### 2. 자동 갱신 시스템

```javascript
// Materialized View 자동 REFRESH
await fetch('/api/refresh-views', {
  method: 'POST'
});
// GitHub Actions에서 자동 호출
```

### 3. 동적 필터링

```typescript
// 4개년 동적 필터 (연도 자동 업데이트)
WHERE year IN (
  SELECT DISTINCT year
  FROM financial_data
  WHERE year >= EXTRACT(YEAR FROM CURRENT_DATE)
  ORDER BY year
  LIMIT 4
)
```

## 확장 가능성

### 단기 확장

1. **알림 시스템**: S급 기업 발견 시 텔레그램 알림
2. **포트폴리오**: 관심 종목 저장 및 추적
3. **백테스팅**: 과거 투자 점수와 실제 수익률 비교

### 중기 확장

1. **AI 예측**: 머신러닝 기반 주가 예측
2. **뉴스 분석**: 기업 뉴스 감성 분석
3. **재무비율**: PER, PBR, ROE 등 추가 지표

### 장기 확장

1. **글로벌 확장**: 미국, 중국 주식 시장 추가
2. **소셜 기능**: 투자 아이디어 공유
3. **프리미엄**: 고급 분석 기능 유료화

## 프로젝트 성과

### 개발 기간
- **시작**: 2025-11-01
- **1차 완성**: 2025-11-12 (12일)
- **총 커밋**: 50+ commits

### 기술 성과
- ✅ Next.js 15 + React 19 최신 스택 적용
- ✅ Supabase Materialized Views 활용
- ✅ GitHub Actions 완전 자동화
- ✅ 모바일 반응형 디자인

### 데이터 성과
- ✅ 1,131개 기업 데이터
- ✅ 131,674개 재무 레코드
- ✅ 매일 자동 업데이트

---

**다음 문서**: [[02-YoonStock-TechStack]]
**관련 문서**: [[03-YoonStock-Features]], [[08-YoonStock-Database]]
