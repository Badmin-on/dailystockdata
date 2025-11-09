# 🔥 Smart Money Flow 페이지 설계 문서

## 📋 프로젝트 개요

**페이지명**: Smart Money Flow (스마트 머니 플로우)
**URL**: `/smart-money-flow`
**목적**: 컨센서스 개선 + 저평가 + **거래량 증가** 조합으로 기관/외국인 자금 유입 조짐 감지

---

## 🎯 핵심 선별 조건

### 1. 재무 컨센서스 개선 ✅ (기존 활용)
- 매출액/영업이익 1개월 변화율 > 0%
- 기존 `v_investment_opportunities` 활용

### 2. 주가 저평가 구간 ✅ (기존 활용)
- 120일 이평선 이격도: **-10% ~ +5%**
- 적정가 ~ 약간 저평가 구간

### 3. 거래량 증가 (관심도 상승) 🆕 **신규 추가**
- **RVOL (Relative Volume)**: 20일 평균 거래량 대비 최근 5일 평균 > 1.2배
- **거래량 추세**: 최근 5일 > 이전 5일
- **Accumulation 패턴**: 상승일 거래량 증가 비율

---

## 📊 필요한 데이터

### 기존 데이터 (활용 가능)
| 데이터 | 출처 | 상태 |
|--------|------|------|
| 재무 컨센서스 변화 | `mv_consensus_changes` | ✅ |
| 주가, 120일 평균 | `mv_stock_analysis` | ✅ |
| 현재 거래량 | `daily_stock_prices.volume` | ✅ |

### 신규 계산 필요
| 지표 | 계산 방식 | 난이도 |
|------|-----------|--------|
| 20일 평균 거래량 | `AVG(volume) OVER (ORDER BY date ROWS 19 PRECEDING)` | 🟢 쉬움 |
| 최근 5일 평균 거래량 | `AVG(volume) OVER (ORDER BY date ROWS 4 PRECEDING)` | 🟢 쉬움 |
| RVOL | `최근 5일 평균 / 20일 평균` | 🟢 쉬움 |
| Accumulation 일수 | `COUNT(상승일 AND 거래량 증가)` | 🟡 보통 |

---

## 🏗️ 아키텍처 설계

### Option 1: DB View 생성 (권장 ⭐)
**장점**:
- 성능 최적화 (DB에서 계산)
- 재사용 가능
- API 간소화

**단점**:
- DB 마이그레이션 필요
- 초기 구축 시간 약간 소요

**구현**:
```sql
CREATE OR REPLACE VIEW v_smart_money_flow AS
WITH volume_metrics AS (
  SELECT
    company_id,
    date,
    volume,
    close,
    LAG(close) OVER (PARTITION BY company_id ORDER BY date) as prev_close,
    AVG(volume) OVER (PARTITION BY company_id ORDER BY date ROWS 19 PRECEDING) as vol_avg_20d,
    AVG(volume) OVER (PARTITION BY company_id ORDER BY date ROWS 4 PRECEDING) as vol_avg_5d
  FROM daily_stock_prices
  WHERE date >= CURRENT_DATE - INTERVAL '40 days'
),
latest_metrics AS (
  SELECT DISTINCT ON (company_id)
    company_id,
    volume,
    vol_avg_20d,
    vol_avg_5d,
    CASE
      WHEN vol_avg_20d > 0 THEN vol_avg_5d / vol_avg_20d
      ELSE NULL
    END as rvol
  FROM volume_metrics
  WHERE vol_avg_20d IS NOT NULL
  ORDER BY company_id, date DESC
),
accumulation_days AS (
  SELECT
    company_id,
    COUNT(*) FILTER (
      WHERE close > prev_close AND volume > LAG(volume) OVER (PARTITION BY company_id ORDER BY date)
    ) as acc_days_10d
  FROM volume_metrics
  WHERE date >= CURRENT_DATE - INTERVAL '10 days'
  GROUP BY company_id
)
SELECT
  io.*,
  lm.rvol,
  lm.vol_avg_20d,
  lm.vol_avg_5d,
  ad.acc_days_10d,
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
  ) as smart_money_score
FROM v_investment_opportunities io
LEFT JOIN latest_metrics lm ON io.company_id = lm.company_id
LEFT JOIN accumulation_days ad ON io.company_id = ad.company_id
WHERE lm.rvol >= 1.2  -- 거래량 20% 이상 증가
  AND io.divergence_120 BETWEEN -10 AND 5  -- 저평가 ~ 적정가
  AND io.consensus_score >= 40  -- 컨센서스 개선
ORDER BY smart_money_score DESC;
```

### Option 2: API에서 계산 (빠른 프로토타입)
**장점**:
- DB 수정 없음
- 빠른 개발

**단점**:
- 성능 저하
- 복잡한 로직

---

## 🎨 UI/UX 디자인 (Volume Sentiment Mini 참고)

### 디자인 콘셉트
**Volume Sentiment Mini의 장점 활용**:
- ✅ 다크 테마 (눈의 피로 감소)
- ✅ 그라데이션 카드 (시각적 계층 구조)
- ✅ 컬러 코딩 (Good/Warn/Bad)
- ✅ 실시간 차트 (거래량 시각화)
- ✅ 점수 바 (직관적 상태 표시)

### 새 페이지 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  🔥 Smart Money Flow                  [목록 보기] [차트]│
│  기관/외국인 자금 유입 조짐 감지                         │
├─────────────────────────────────────────────────────────┤
│ [필터 패널]                                             │
│  ○ 최소 점수  ○ 시장  ○ RVOL 범위  ○ 정렬              │
├─────────────────────────────────────────────────────────┤
│ [통계 카드 - 4개]                                        │
│  S급 기회   A급 기회   평균 RVOL   총 발굴 기업        │
├─────────────────────────────────────────────────────────┤
│ [종목 카드] - 그라데이션 배경                            │
│  ┌─ 삼성전자 (005930) ─────────────────────────┐      │
│  │ 💯 스마트 머니 점수: 85점        [S급]       │      │
│  │ 📊 컨센서스: 70  📉 이격도: 80  📈 거래량: 90│      │
│  │                                              │      │
│  │ [거래량 차트 - 미니] ━━━━━━━━━━━━━━━━━      │      │
│  │ RVOL: 1.8x │ Acc Days: 7일 │ 평균 대비: ↑45%│      │
│  │                                              │      │
│  │ [재무 개선] 1M 매출: +15% │ 1M 영업익: +22% │      │
│  │ [주가 위치] 120일평 근처 (-3.2%) │ 적정가    │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 컬러 시스템 (Volume Sentiment Mini 스타일)
```css
:root {
  --bg: #0b0d12;              /* 배경 */
  --panel: #12151d;           /* 패널 */
  --accent-good: #59d38e;     /* Accumulation (녹색) */
  --accent-warn: #ff8a65;     /* 주의 (주황) */
  --accent-bad: #ff5c7c;      /* Distribution (빨강) */
  --accent-info: #58a6ff;     /* 정보 (파랑) */
}
```

---

## 📈 차별화 포인트

| 기존 투자 기회 페이지 | Smart Money Flow 페이지 |
|---------------------|------------------------|
| 컨센서스 + 이격도 | 컨센서스 + 이격도 + **거래량** |
| 정적 데이터 | **동적 거래량 추세** |
| 표 중심 | **차트 + 카드** 중심 |
| 라이트 테마 | **다크 테마** |
| 점수만 표시 | **거래량 패턴 시각화** |

---

## 🚀 구현 로드맵

### Phase 1: 데이터 레이어 (1-2일)
- [x] `daily_stock_prices` volume 데이터 확인
- [ ] `v_smart_money_flow` View 생성
- [ ] API 엔드포인트 `/api/smart-money-flow` 구현
- [ ] 데이터 검증 스크립트 작성

### Phase 2: UI 구현 (2-3일)
- [ ] 다크 테마 기본 레이아웃
- [ ] 거래량 차트 컴포넌트 (Chart.js)
- [ ] 종목 카드 컴포넌트
- [ ] 필터 패널
- [ ] 모바일 반응형

### Phase 3: 최적화 & 검증 (1일)
- [ ] 성능 테스트 (1000+ 종목)
- [ ] 거래량 계산 정확도 검증
- [ ] 사용자 피드백 반영

**총 예상 개발 기간**: 4-6일

---

## 🔍 기술적 타당성 분석

### ✅ 가능 여부: **100% 가능**

**이유**:
1. **데이터 존재**: `daily_stock_prices.volume` 이미 수집 중
2. **계산 단순**: Window Function으로 간단히 구현
3. **성능 문제 없음**: Regular View로 자동 갱신
4. **UI 구현 용이**: 기존 페이지 + Chart.js 추가

### ⚠️ 주의사항

**1. 데이터 품질 확인 필요**
```sql
-- volume 데이터가 NULL인 비율 확인
SELECT
  COUNT(*) FILTER (WHERE volume IS NULL) * 100.0 / COUNT(*) as null_pct
FROM daily_stock_prices
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

**2. 계산 부하**
- 1,788개 종목 × 40일 데이터 = 약 71,520 레코드
- Window Function 사용 시 성능 문제 없음 (PostgreSQL 최적화)

**3. 차트 라이브러리**
- Chart.js (기존 사용 중) 활용
- 미니 차트는 Sparkline 형태로 경량화

---

## 💡 추가 아이디어

### 1. 거래량 패턴 태그
```
🟢 Strong Accumulation: RVOL > 2.0 + 상승일 거래량 7일 이상
🟡 Moderate Flow: RVOL 1.5-2.0
🔴 Distribution Risk: 하락일 거래량 > 상승일 거래량
⚪ Volume Dry Up: RVOL < 0.6 (기관 이탈 가능성)
```

### 2. 알림 기능 (향후)
- 특정 종목이 조건 충족 시 알림
- 일일 리포트 이메일

### 3. 비교 차트
- 동종 업종 평균 RVOL 비교
- 외국인/기관 순매수 데이터 연동 (추후)

---

## 📝 결론

**✅ 기술적으로 100% 구현 가능**
**✅ 기존 인프라 활용 가능 (추가 개발 최소화)**
**✅ 차별화된 가치 제공 (거래량 분석 추가)**

**다음 단계**:
1. Volume 데이터 품질 확인
2. `v_smart_money_flow` View 생성
3. 프로토타입 UI 구현

---

**작성일**: 2025-11-09
**버전**: 1.0
**담당**: Claude + User Collaboration
