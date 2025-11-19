# 04. YoonStock Pro - 개발 히스토리

> 태그: #yoonstock #개발히스토리 #마일스톤

## 프로젝트 타임라인

```
2025-11-01: 프로젝트 시작
2025-11-03: 기본 대시보드 완성
2025-11-06: Materialized Views 도입
2025-11-09: Smart Money Flow 추가
2025-11-10: Consensus Trend 추가
2025-11-11: 모바일 최적화
2025-11-12: 프로젝트 문서화
```

## 주요 마일스톤

### Phase 1: 기반 구축 (11/01 - 11/03)

**목표**: 기본 데이터 수집 및 대시보드

#### 11/01 - 프로젝트 초기 설정
```bash
# 주요 커밋
8dadc95 - Add package-lock.json for npm ci compatibility
c455a4c - Fix: Add is_etf column to fnguide-scraper
```

**작업 내용**:
- Next.js 15 프로젝트 생성
- Supabase 연결 설정
- 기본 스키마 설계

#### 11/02 - 데이터 수집 시스템
```bash
# 주요 커밋
19245ed - Add detailed error logging for companies insert
e84076c - Add comprehensive Supabase connection test
```

**문제 해결**:
- Companies 테이블 삽입 실패
- Supabase 연결 테스트 강화
- 에러 로깅 시스템 구축

#### 11/03 - 기본 대시보드
```bash
# 주요 커밋
c2fcf57 - Remove unnecessary UI elements after GitHub Actions
f99d437 - Improve mobile responsive design
740085c - Fix timezone issue: Use Korea time
```

**완성 기능**:
- ✅ 재무 데이터 대시보드
- ✅ 날짜 필터링
- ✅ 모바일 반응형

### Phase 2: 자동화 (11/04 - 11/06)

**목표**: GitHub Actions 자동 수집

#### 11/04 - 타임존 이슈
```bash
# 주요 커밋
740085c - Fix timezone issue: Use Korea time (UTC+9)
```

**문제**:
- 수집 날짜가 UTC로 저장되어 한국 시간과 불일치
- 전일 데이터가 당일로 표시

**해결**:
```javascript
// KST 타임존 사용
const today = new Date().toLocaleString('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
```

#### 11/05 - GitHub Actions 구축
```bash
# 주요 커밋
a6760fa - Add automatic Materialized View refresh
a14b0ee - Fix stock price scraping accuracy
```

**구현**:
- 재무 데이터 수집 (오전 7시)
- 주가 데이터 수집 (오후 7시)
- Materialized View 자동 갱신

#### 11/06 - 성능 최적화
```bash
# 주요 커밋
aa10b48 - docs: Add comprehensive project documentation
d3fcfb4 - feat: Add dynamic year filter for automatic annual updates
6643388 - Add safe View update scripts and diagnostic tools
e95198c - Add 4-year dynamic filter for v_investment_opportunities
```

**최적화**:
- Materialized Views 도입
- 동적 연도 필터 (자동 업데이트)
- View 안전 업데이트 스크립트

### Phase 3: 고급 기능 (11/07 - 11/09)

**목표**: 투자 기회 발굴 시스템

#### 11/07 - UI 개선
```bash
# 주요 커밋
4afa882 - Fix critical bug: Materialized View refresh fallback
f587cf2 - Hide investment-finder menu item
8776464 - Hide unnecessary manual data collection features
```

**개선사항**:
- Materialized View 갱신 폴백 메커니즘
- UI 정리 (불필요한 메뉴 숨김)
- 사용자 경험 개선

#### 11/08 - ETF 시스템
```bash
# 주요 커밋
db59388 - Add ETF sector management system with dynamic allocation
ad673a4 - Add SQL migrations for ETF sector system
80da1e1 - Remove decimal places from price displays
```

**신규 기능**:
- ETF 섹터 관리 시스템
- 동적 섹터 할당
- 가격 표시 최적화 (소수점 제거)

#### 11/08 - API 성능 최적화
```bash
# 주요 커밋
2b920b1 - Optimize API performance v3: PostgreSQL Function
9377147 - Optimize API performance v2: Full query with client-side dedup
8860cb0 - Optimize API performance: Remove pagination loops
```

**시도**:
1. ❌ Pagination 루프 제거 (revert)
2. ❌ 클라이언트 중복 제거 (revert)
3. ❌ PostgreSQL Function (revert)
4. ✅ Materialized Views (최종 채택)

**교훈**:
- 복잡한 쿼리는 Materialized Views가 최적
- 클라이언트 처리보다 DB 처리가 효율적
- 성능 개선 전 반드시 벤치마크

#### 11/09 - Smart Money Flow
```bash
# 주요 커밋
5d6dded - Add Smart Money Flow feature with volume analysis
7222ebf - Fix investment opportunities API caching issue
e37c090 - Fix investment grade statistics display
```

**신규 페이지**:
- Smart Money Flow 분석
- 기관/외국인 매매 추적
- 투자 등급 통계 수정

### Phase 4: 시각화 및 분석 (11/10 - 11/11)

**목표**: 차트 및 트렌드 분석

#### 11/10 - Consensus Trend
```bash
# 주요 커밋
b2f433a - Add Consensus Trend Analysis with dual-axis chart
c120f08 - Add recharts dependency
2d873f9 - Fix chart gaps: Connect null values
```

**구현**:
- Recharts 라이브러리 도입
- Dual-axis 차트 (매출액 + 영업이익)
- Null 값 연결로 차트 갭 해결

#### 11/11 - 사용성 개선
```bash
# 주요 커밋
ad0a3d1 - Add percentage change mode to consensus-trend
704c126 - Fix TypeScript type error in percentage calculation
172967a - Optimize consensus-trend page for mobile devices
```

**개선**:
- 퍼센트 변화 모드 추가
- TypeScript 타입 에러 수정
- 모바일 최적화

### Phase 5: 문서화 (11/12)

**목표**: 프로젝트 지식 베이스 구축

**작업**:
- Obsidian 문서 체계 구축
- 개발 패턴 정리
- 학습 내용 문서화

## 주요 기술 결정

### 1. Next.js 15 선택

**이유**:
- App Router 최신 아키텍처
- Server Components
- API Routes 통합
- Vercel 배포 최적화

**결과**: ✅ 성공적

### 2. Supabase 선택

**이유**:
- PostgreSQL 기반
- 서울 리전
- Materialized Views 지원
- 무료 티어

**결과**: ✅ 매우 만족

### 3. Materialized Views 도입

**시도한 최적화**:
1. Pagination 제거
2. 클라이언트 중복 제거
3. PostgreSQL Function
4. **Materialized Views** ← 최종 선택

**성능**:
- Before: ~2000ms
- After: ~50ms
- **40배 향상**

### 4. GitHub Actions 자동화

**이유**:
- 무료
- Cron 스케줄링
- 자동 로깅
- Artifact 저장

**결과**: ✅ 완벽한 자동화

## 주요 버그 및 해결

### Bug 1: Materialized View Refresh 실패

**증상**:
```
Error: Materialized View refresh failed
```

**원인**:
- IPv6 연결 이슈
- Supabase 서버 타임아웃

**해결**:
```typescript
// Fallback 메커니즘
try {
  await refreshMaterializedView();
} catch (error) {
  console.log('Fallback to regular view');
  // Regular view 사용
}
```

**커밋**: `4afa882`

### Bug 2: ETF change_rate 자동 계산 실패

**증상**:
- ETF 종목의 변화율이 null

**원인**:
- daily_stock_prices에 이전 가격 없음
- change_rate 계산 로직 누락

**해결**:
```sql
-- 자동 계산 시스템
CREATE TRIGGER auto_calculate_change_rate
BEFORE INSERT ON daily_stock_prices
FOR EACH ROW
EXECUTE FUNCTION calculate_change_rate();
```

**커밋**: `e8ea6a3`

### Bug 3: 타임존 불일치

**증상**:
- 수집 날짜가 UTC로 저장
- 한국 시간과 하루 차이

**해결**:
```javascript
const today = new Date().toLocaleString('ko-KR', {
  timeZone: 'Asia/Seoul'
});
```

**커밋**: `740085c`

## 개발 통계

### 커밋 분석

```
총 커밋 수: 50+

카테고리별:
- Feature: 25 (50%)
- Fix: 15 (30%)
- Refactor: 5 (10%)
- Docs: 5 (10%)

주요 작업:
- Frontend: 20 커밋
- Backend: 15 커밋
- Infrastructure: 10 커밋
- Documentation: 5 커밋
```

### 코드 통계

```
파일 수:
- TypeScript/React: 30+
- API Routes: 20+
- Scripts: 5
- SQL: 10+

코드 라인:
- Frontend: ~5,000 줄
- Backend: ~3,000 줄
- Scripts: ~1,500 줄
```

### 데이터 통계

```
수집 데이터:
- 기업: 1,131개
- 재무 레코드: 131,674개
- 주가 데이터: 120일 × 1,131개

자동화:
- 일일 수집: 2회
- 총 API 호출: ~2,000회/일
- 데이터 처리: ~1.5시간/일
```

## 학습 포인트

### 성공 요인

1. **Materialized Views**: 성능 40배 향상
2. **GitHub Actions**: 완전 자동화
3. **TypeScript**: 타입 안정성
4. **Tailwind CSS**: 빠른 UI 개발

### 개선 필요

1. **테스트 코드**: 0% → 목표 80%
2. **에러 핸들링**: 더 세밀한 처리
3. **모니터링**: 성능 추적 시스템
4. **문서화**: API 문서 자동화

### 다음 프로젝트에 적용

1. **처음부터 Materialized Views 고려**
2. **타임존 처리 표준화**
3. **테스트 주도 개발 (TDD)**
4. **지속적 문서화**

---

**이전 문서**: [[03-YoonStock-Features]]
**다음 문서**: [[05-YoonStock-Patterns]]
**관련 문서**: [[06-YoonStock-Lessons]]
