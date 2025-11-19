# YoonStock Pro - 프로젝트 지식 베이스

> AI 기반 주식 투자 기회 발굴 시스템
> 최종 업데이트: 2025-11-12

## 📚 문서 구조

이 지식 베이스는 YoonStock Pro 프로젝트의 모든 개발 정보와 학습 내용을 체계적으로 정리한 것입니다.

### 핵심 문서

1. **[[01-YoonStock-Overview]]** - 프로젝트 개요 및 목적
2. **[[02-YoonStock-TechStack]]** - 기술 스택 및 아키텍처
3. **[[03-YoonStock-Features]]** - 핵심 기능 상세 설명
4. **[[04-YoonStock-DevHistory]]** - 개발 히스토리 및 마일스톤
5. **[[05-YoonStock-Patterns]]** - 재사용 가능한 개발 패턴
6. **[[06-YoonStock-Lessons]]** - 학습 내용 및 문제 해결
7. **[[07-YoonStock-API]]** - API 엔드포인트 문서
8. **[[08-YoonStock-Database]]** - 데이터베이스 스키마 및 구조

## 🎯 프로젝트 요약

**YoonStock Pro**는 KOSPI/KOSDAQ 상위 1000개 기업의 재무 컨센서스 변화와 120일 이동평균선 이격도를 분석하여 투자 기회를 자동으로 발굴하는 웹 애플리케이션입니다.

### 핵심 가치

- ✅ **자동화**: GitHub Actions를 통한 일일 데이터 수집 자동화
- ✅ **AI 분석**: 컨센서스 변화 + 이격도 기반 투자 점수 시스템
- ✅ **실시간**: 5초마다 자동 갱신되는 대시보드
- ✅ **확장성**: Supabase + Vercel 기반 클라우드 인프라

### 주요 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Materialized Views
- **Deployment**: Vercel + GitHub Actions
- **Data Sources**: Naver Finance, FnGuide

## 📊 프로젝트 통계

- **총 커밋**: 50+ commits
- **개발 기간**: 2025-11-01 ~ 현재
- **코드베이스**: TypeScript + React
- **데이터**: 1,131개 기업, 131,674개 재무 데이터

## 🔗 관련 리소스

- **GitHub**: [dailystockdata](https://github.com/Badmin-on/dailystockdata)
- **배포**: Vercel (dailystockdata.vercel.app)
- **데이터베이스**: Supabase (Seoul Region)

## 📝 문서 사용법

### Obsidian에서 사용하기

1. 이 폴더(`obsidian-docs`)를 Obsidian vault로 열거나 복사
2. 위 링크를 클릭하여 각 문서로 이동
3. 검색 기능으로 특정 키워드 찾기
4. `[[문서명]]` 형식으로 문서 간 연결
5. 태그로 분류 및 검색

### 태그 시스템

```
#yoonstock - 프로젝트 전체
#nextjs #react #typescript - 프론트엔드
#supabase #postgresql - 백엔드
#github-actions #vercel - 인프라
#투자분석 #재무데이터 - 도메인
#문제해결 #학습 - 개발 경험
```

## 🎓 학습 목적

이 지식 베이스는 다음 목적으로 활용됩니다:

1. **프로젝트 이해**: 전체 시스템 구조와 동작 원리 파악
2. **패턴 재사용**: 성공적인 개발 패턴을 다른 프로젝트에 적용
3. **문제 해결**: 과거 문제와 해결 방법 참고
4. **아이디어 공유**: 새로운 기능 아이디어와 개선사항 기록
5. **협업 도구**: 팀원이나 AI 파트너와 컨텍스트 공유

## 🚀 빠른 시작

### 신규 개발자를 위한 추천 경로

1. [[01-YoonStock-Overview]] - 프로젝트가 무엇인지 이해
2. [[02-YoonStock-TechStack]] - 사용된 기술 스택 파악
3. [[03-YoonStock-Features]] - 주요 기능 학습
4. [[08-YoonStock-Database]] - 데이터 구조 이해
5. [[04-YoonStock-DevHistory]] - 개발 과정 학습

### 문제 해결을 위한 추천 경로

1. [[06-YoonStock-Lessons]] - 유사한 문제 해결 사례 검색
2. [[05-YoonStock-Patterns]] - 적용 가능한 패턴 찾기
3. [[07-YoonStock-API]] - API 관련 이슈 확인

---

**마지막 업데이트**: 2025-11-12
**문서 버전**: 1.0
**작성자**: AI Development Partner
