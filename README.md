# 🚀 YoonStock Web - 주식 데이터 모니터링 대시보드

KOSPI/KOSDAQ 상위 1000개 기업의 재무제표 및 주가를 실시간으로 모니터링하는 웹 애플리케이션입니다.

## 📋 기술 스택

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Automation**: Vercel Cron Jobs (평일 오전 8시)
- **Data Sources**: Naver Finance, FnGuide

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

### Vercel Cron Jobs (프로덕션)

#### 1단계: 재무제표 수집
- **스케줄**: 평일 오전 8시 (KST)
- **엔드포인트**: `/api/collect-data`
- **수집 데이터**: 매출액, 영업이익 (4개년 데이터)
- **소요 시간**: 약 30-60분

#### 2단계: 주가 데이터 수집
- **스케줄**: 평일 오후 8시 (KST)
- **엔드포인트**: `/api/collect-stock-prices`
- **수집 데이터**: 당일 종가, 변동률, 거래량 (장 마감 15:30 → 수집 20:00)
- **소요 시간**: 약 30-60분

**보안**: 모든 엔드포인트는 `CRON_SECRET` 인증 필요

### 수동 테스트 (로컬/프로덕션)
```bash
# 재무제표 테스트 (5개 기업)
curl http://localhost:3000/api/collect-data/manual

# 주가 데이터 테스트 (5개 기업)
curl http://localhost:3000/api/collect-stock-prices/manual
```

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

### 대시보드 (`/dashboard`)
- 전일/1개월/3개월/1년 전 대비 증감률 계산
- 날짜/연도 필터링
- 정렬 기능 (매출액/영업이익 증감율)
- 유망 기업 하이라이팅 (✨ 추정치 기반 성장)
- 당일 급등 기업 표시 (🔥 +5% 이상)

### API 엔드포인트
- `GET /api/stock-comparison`: 기업 데이터 비교
- `GET /api/available-years`: 사용 가능한 연도 목록
- `GET /api/test-db`: 데이터베이스 상태 확인
- `GET /api/collect-data`: 자동 데이터 수집 (Cron)
- `GET /api/collect-data/manual`: 수동 테스트 수집

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

## 📄 라이선스

Private Project

## 🙋‍♂️ 문의

GitHub Issues: https://github.com/Badmin-on/dailystockdata/issues
