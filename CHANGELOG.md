# Changelog

All notable changes to YoonStock Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-05

### 🎉 Major Updates

#### Automated Data Pipeline with GitHub Actions
- **Replaced Vercel Cron** with GitHub Actions for better reliability
- **Two Separate Workflows**:
  - FnGuide scraper: 매일 오전 7:00 KST (재무 데이터 수집)
  - Stock Price scraper: 매일 오후 7:00 KST (주가 데이터 수집)
- **Automatic Materialized View Refresh**: 데이터 수집 후 자동으로 MVs 갱신
- **Manual Workflow Trigger**: GitHub Actions 탭에서 수동 실행 가능

#### Fixed Critical Stock Price Bug
- **Issue**: 주가가 실제와 다르게 표시됨 (예: 44,950원 → 42,550원)
- **Root Cause**:
  - ▲/▼ 기호 감지 대신 "하락"/"상승" 한글 텍스트 사용해야 함
  - 잘못된 셀 인덱스 사용 (cells[3] → cells[2])
- **Fix**:
  - 한글 텍스트 감지로 변경 (`includes('하락')`, `includes('상승')`)
  - 올바른 셀 인덱스 사용하여 변동률 추출
- **Impact**: 모든 주가 데이터가 정확하게 수집됨

#### Fixed Timezone Issues
- **Issue**: 한국 시간으로 수집해도 UTC 날짜로 저장됨
- **Root Cause**: GitHub Actions는 UTC 환경에서 실행
- **Fix**: 수집 시점에 KST 시간 계산 (`UTC + 9시간`)
- **Impact**: 모든 날짜가 한국 시간 기준으로 정확하게 저장됨

### 🔧 Technical Improvements

#### Database Optimization
- **Materialized Views** auto-refresh after data collection
- **psql Direct Connection**: GitHub Actions에서 Supabase PostgreSQL 직접 연결
- **Better Error Handling**: Scraper 실패 시 Artifact 자동 저장

#### Code Quality
- **Encoding Fix**: EUC-KR to UTF-8 변환 로직 개선
- **Error Logging**: 더 상세한 에러 메시지와 로깅
- **Retry Logic**: 네트워크 실패 시 자동 재시도

#### Documentation
- **Comprehensive Docs**: 전체 프로젝트 문서화 완료
  - `docs/ARCHITECTURE.md`: 시스템 아키텍처 및 데이터 흐름
  - `docs/DATABASE.md`: 데이터베이스 스키마 및 Materialized Views
  - `docs/DEVELOPMENT.md`: 로컬 개발 환경 설정 가이드
  - `docs/TROUBLESHOOTING.md`: 문제 해결 가이드
  - `docs/API.md`: REST API 엔드포인트 상세 문서
  - `CHANGELOG.md`: 변경 이력 기록

### 🐛 Bug Fixes

- Fixed stock price parsing for Korean text detection (하락/상승) [#1]
- Fixed cell index for change rate extraction (cells[3] → cells[2]) [#1]
- Fixed timezone conversion for KST storage [#2]
- Fixed Materialized Views not refreshing after data collection [#3]

### 📊 Performance

- **API Response Time**: 5-10x faster with Materialized Views
- **Data Collection**:
  - FnGuide: ~60분 (1,000 기업)
  - Stock Price: ~16-17분 (1,000 기업)
- **Materialized View Refresh**: ~30초 (2개 MVs)

### 🔒 Security

- Moved CRON_SECRET to GitHub Secrets
- Removed sensitive data from logs
- Added authentication for Cron endpoints

---

## [1.0.0] - 2025-10-01

### 🎉 Initial Release

#### Core Features

**투자 기회 발굴 시스템**:
- 재무 컨센서스 변화 추적 (전일/1개월/3개월/1년 대비)
- 120일 이동평균선 및 이격도 분석
- AI 투자 점수 시스템 (S/A/B/C 등급)
- 실시간 투자 기회 랭킹

**데이터 수집**:
- FnGuide 재무 데이터 수집 (매출액, 영업이익)
- 네이버 금융 주가 데이터 수집
- 1,000개 기업 (KOSPI 500 + KOSDAQ 500)
- 4개년 재무 데이터 (2024-2027)

**기술 스택**:
- Frontend: Next.js 15 + TypeScript + Tailwind CSS
- Database: Supabase (PostgreSQL) with Materialized Views
- Deployment: Vercel
- Automation: Vercel Cron (later changed to GitHub Actions)

#### API Endpoints

- `GET /api/investment-opportunities`: 투자 기회 발굴
- `GET /api/consensus-changes`: 컨센서스 변화 분석
- `GET /api/stock-analysis`: 주가 분석 (120일 이평선)
- `GET /api/stock-comparison`: 기업 간 재무 비교
- `GET /api/available-years`: 사용 가능한 연도 목록
- `GET /api/test-db`: 데이터베이스 상태 확인

#### Database Schema

**Tables**:
- `companies`: 기업 기본 정보 (1,131개)
- `financial_data`: 재무제표 데이터 (131,674개)
- `daily_stock_prices`: 일별 주가 데이터 (120,000개)

**Materialized Views**:
- `mv_consensus_changes`: 컨센서스 변화율 계산 (캐시)
- `mv_stock_analysis`: 120일 이평선 및 이격도 계산 (캐시)

**Normal Views**:
- `v_investment_opportunities`: 투자 점수 및 등급 계산

#### UI Pages

- `/dashboard`: 기본 대시보드 (재무 데이터 비교)
- `/opportunities`: 투자 기회 발굴 페이지 (핵심 기능)
- Landing Page: 프로젝트 소개 및 주요 기능

---

## [Unreleased]

### 🚀 Planned Features

- [ ] User authentication and personalized watchlists
- [ ] Email/Slack notifications for S-grade opportunities
- [ ] Historical performance tracking
- [ ] Backtesting investment strategies
- [ ] Mobile responsive improvements
- [ ] Export to Excel/CSV functionality
- [ ] Chart visualizations (Recharts/Chart.js)
- [ ] Real-time stock price updates (WebSocket)
- [ ] Technical indicators (RSI, MACD, Bollinger Bands)
- [ ] News sentiment analysis integration

### 🐛 Known Issues

- [ ] Materialized Views require manual refresh if data collection fails
- [ ] GitHub Actions may experience ±15 minute delay on scheduled runs
- [ ] Some companies missing data (delisted or data unavailable)
- [ ] Mobile UI needs optimization for small screens
- [ ] No pagination on large result sets (performance issue)

---

## Release Notes Format

### Types of Changes

- **🎉 Major Updates**: Major new features or breaking changes
- **✨ Features**: New features and enhancements
- **🐛 Bug Fixes**: Bug fixes and corrections
- **🔧 Technical Improvements**: Code quality, performance, refactoring
- **📊 Performance**: Performance improvements with metrics
- **🔒 Security**: Security-related changes
- **📝 Documentation**: Documentation updates
- **⚠️ Deprecations**: Deprecated features (to be removed)
- **🗑️ Removals**: Removed features

### Commit Convention

```
feat: add new feature
fix: fix bug
docs: update documentation
style: code formatting
refactor: code refactoring
test: add tests
chore: build process, tools
```

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.1.0 | 2025-11-05 | GitHub Actions automation + Bug fixes |
| 1.0.0 | 2025-10-01 | Initial release |

---

## Migration Guide

### Migrating from v1.0.0 to v1.1.0

**No Breaking Changes** - All API endpoints remain the same.

**Action Required**:
1. Update environment variables in GitHub Secrets (if using automation)
2. Run manual Materialized View refresh once:
   ```sql
   REFRESH MATERIALIZED VIEW mv_consensus_changes;
   REFRESH MATERIALIZED VIEW mv_stock_analysis;
   ```

**Deprecated**:
- Vercel Cron (replaced by GitHub Actions, but still functional)

**New Features**:
- GitHub Actions workflows for automated data collection
- Automatic Materialized View refresh after data collection
- Better error handling and logging

---

## Contributors

- [@Badmin-on](https://github.com/Badmin-on) - Initial work and maintenance

---

## License

Private Project - All Rights Reserved

---

## Acknowledgments

- **Data Sources**:
  - [FnGuide](https://www.fnguide.com) - 재무 컨센서스 데이터
  - [Naver Finance](https://finance.naver.com) - 주가 데이터
- **Infrastructure**:
  - [Supabase](https://supabase.com) - PostgreSQL database hosting
  - [Vercel](https://vercel.com) - Frontend hosting and deployment
  - [GitHub Actions](https://github.com/features/actions) - CI/CD automation
