# 🚀 YoonStock Web - 주식 데이터 모니터링 대시보드

KOSPI/KOSDAQ 상위 1000개 기업의 재무제표 및 주가를 실시간으로 모니터링하는 웹 애플리케이션입니다.

## 📋 기술 스택

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Automation**: Vercel Cron Jobs

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

### 4. 기존 데이터 마이그레이션

```bash
npm run migrate
```

### 5. 로컬 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속

## 📦 배포 (Vercel)

1. GitHub에 푸시
2. [Vercel](https://vercel.com) 연결
3. 환경변수 설정 (Settings → Environment Variables)
4. 자동 배포 완료

## 📅 자동 데이터 수집

평일 오전 8시 자동 실행 (Vercel Cron)

## 📊 데이터 구조

- **companies**: 기업 정보 (1000개)
- **financial_data**: 재무제표 (매출액, 영업이익)
- **daily_stock_prices**: 일일 주가 (종가, 변동률, 거래량)

## 📄 라이선스

Private Project
