# 🚀 YoonStock Pro - AI 기반 투자 기회 발굴 시스템

KOSPI/KOSDAQ 상위 1000개 기업의 **재무 컨센서스 변화** + **120일 이평선 이격도**를 분석하여 투자 기회를 자동으로 발굴하는 웹 애플리케이션입니다.

## ✨ 핵심 기능

### 1. 재무 컨센서스 변화 추적
- 전일/1개월/3개월/1년 대비 매출액 및 영업이익 변화율 자동 계산
- FnGuide 기반 애널리스트 컨센서스 수집
- 급상승 기업 실시간 알림

### 2. 120일 이평선 이격도 분석
- 자동 120일 이동평균선 계산
- 이격도 기반 매수/매도 시점 분석
- 52주 최고/최저가 대비 현재 위치 분석

### 3. AI 투자 점수 시스템
- 컨센서스 변화 점수 (60%) + 이격도 점수 (40%)
- S급/A급/B급 투자 등급 자동 분류
- 실시간 투자 기회 랭킹

## 📋 기술 스택

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Materialized Views
- **Deployment**: Vercel
- **Automation**: GitHub Actions (매일 오전 7시 & 오후 7시 KST)
- **Data Sources**: Naver Finance, FnGuide
- **Infrastructure**: Automated data pipeline with view refresh

## 🛠️ 설정 가이드

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속 → 새 프로젝트 생성
2. Region: **Northeast Asia (Seoul)** 선택
3. 강력한 비밀번호 설정

### 2. 데이터베이스 스키마 설정

Supabase SQL Editor에서 `scripts/schema.sql` 파일 실행

### 3. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일에 Supabase 키 입력:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Public Key
- `SUPABASE_SERVICE_KEY`: Supabase Service Role Key (Settings → API)
- `CRON_SECRET`: 랜덤 문자열 (Cron Job 보안용)

### 4. 기존 데이터 마이그레이션 (선택)

```bash
npm run migrate
```

### 5. 로컬 개발 서버 실행

```bash
npm install
npm run dev
```

http://localhost:3000 접속

## 📦 배포 (Vercel)

1. GitHub에 푸시
2. [Vercel](https://vercel.com) 연결
3. 환경변수 설정 (Settings → Environment Variables)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `CRON_SECRET`
4. 자동 배포 완료

## 📅 자동 데이터 수집

### GitHub Actions (자동화)

#### 워크플로우 1: 재무 데이터 수집
- **스케줄**: 매일 오전 7:00 KST (UTC 22:00 전날)
- **스크립트**: `scripts/fnguide-scraper.js`
- **데이터 소스**: FnGuide
- **수집 데이터**: 매출액, 영업이익 (2024-2027년 예상치)
- **처리량**: 1,000개 기업 (KOSPI 500 + KOSDAQ 500)
- **소요 시간**: 약 60분
- **후처리**: Materialized View 자동 REFRESH

#### 워크플로우 2: 주가 데이터 수집
- **스케줄**: 매일 오후 7:00 KST (UTC 10:00)
- **스크립트**: `scripts/stock-price-scraper.js`
- **데이터 소스**: Naver Finance
- **수집 데이터**: 당일 종가, 변동률, 거래량
- **처리량**: 1,000개 기업
- **소요 시간**: 약 16-17분
- **후처리**: Materialized View 자동 REFRESH

**특징**:
- ✅ 타임존 자동 변환 (UTC → KST)
- ✅ 자동 재시도 & 에러 로깅
- ✅ Materialized View 자동 갱신
- ✅ 실패 시 Artifact 저장

### 수동 실행
GitHub Actions 탭에서 "Run workflow" 버튼으로 수동 실행 가능
- **fnguide**: 재무 데이터만 수집
- **stock-price**: 주가 데이터만 수집
- **both**: 둘 다 수집

## 📊 데이터 구조

### Companies (기업 정보)
- 1,131개 기업 (KOSPI 500 + KOSDAQ 500)
- 종목코드, 회사명, 시장 구분

### Financial Data (재무제표)
- 131,674개 레코드
- 4개년 데이터 (2024-2027)
- 매출액, 영업이익 (억원 단위 → 원 단위 자동 변환)
- 추정치 플래그

### Daily Stock Prices (주가 데이터)
- 종가, 변동률, 거래량
- 120일 이평선 계산

## 🎯 주요 기능

### 투자 기회 대시보드 (`/opportunities`) 🆕
- 컨센서스 변화 + 이격도 기반 투자 점수 계산
- S급/A급/B급 투자 등급 자동 분류
- 실시간 투자 기회 랭킹
- 이격도 필터링 (매수 적기 자동 선별)
- 컨센서스 급변 기업 모니터링

### 기본 대시보드 (`/dashboard`)
- 전일/1개월/3개월/1년 전 대비 증감률 계산
- 날짜/연도 필터링
- 정렬 기능 (매출액/영업이익 증감율)
- 유망 기업 하이라이팅 (✨ 추정치 기반 성장)
- 당일 급등 기업 표시 (🔥 +5% 이상)

### API 엔드포인트
- `GET /api/investment-opportunities`: 투자 기회 발굴 (신규)
- `GET /api/consensus-changes`: 컨센서스 변화 분석 (신규)
- `GET /api/stock-analysis`: 120일 이평선 분석 (신규)
- `POST /api/refresh-views`: Materialized View 갱신 (신규)
- `GET /api/stock-comparison`: 기업 데이터 비교
- `GET /api/available-years`: 사용 가능한 연도 목록
- `GET /api/test-db`: 데이터베이스 상태 확인
- `GET /api/collect-data`: 자동 데이터 수집 (Cron)
- `GET /api/collect-stock-prices`: 주가 데이터 수집 (Cron)

## 🔧 개발 스크립트

```bash
npm run dev          # 로컬 개발 서버
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run migrate      # 기존 Excel 데이터 마이그레이션
```

## 📈 성능 최적화

- **배치 처리**: 50개씩 병렬 처리
- **Rate Limiting**: 초당 2개 요청
- **타임아웃**: 5분 (Vercel Pro)
- **캐싱**: 5초마다 자동 갱신

## 📊 투자 전략 가이드

### S급 기업 (투자 점수 80점 이상)
- **특징:** 컨센서스 급상승 + 주가 저평가
- **전략:** 적극 매수 (포트폴리오 우선 순위)

### A급 기업 (투자 점수 70-79점)
- **특징:** 컨센서스 상승 + 주가 적정가
- **전략:** 단기 매매 또는 분할 매수

### 이격도 활용법
- **-10% ~ 0%:** 최적 매수 구간 (저평가)
- **0% ~ 5%:** 양호한 매수 구간
- **+15% 이상:** 과열 구간 (수익 실현 고려)

## ⚠️ 면책 조항

이 시스템은 투자 참고 도구이며, 투자 결정 및 그에 따른 책임은 전적으로 투자자 본인에게 있습니다.

## 📋 상세 문서

- [시스템 아키텍처](docs/ARCHITECTURE.md) - 전체 시스템 구조 및 데이터 흐름
- [데이터베이스 스키마](docs/DATABASE.md) - DB 구조, Views, 인덱스 설명
- [개발 가이드](docs/DEVELOPMENT.md) - 로컬 환경 설정 및 개발 워크플로우
- [문제 해결 가이드](docs/TROUBLESHOOTING.md) - 일반적인 문제 및 해결 방법
- [API 문서](docs/API.md) - REST API 엔드포인트 상세
- [변경 이력](CHANGELOG.md) - 주요 업데이트 및 버그 수정 기록

## 📄 라이선스

Private Project

## 🙋‍♂️ 문의

GitHub Issues: https://github.com/Badmin-on/dailystockdata/issues
