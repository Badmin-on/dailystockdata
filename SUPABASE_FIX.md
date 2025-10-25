# 🔧 Supabase View 수정 가이드

## 문제 상황
- 재무 데이터 비교에서 모든 기업이 100점으로 표시됨
- 매출/영업이익 증감이 -100% 또는 +100%로 잘못 표시됨

## 원인
1. **과거 비교 데이터 부족**: 오늘(2025-10-25) 첫 수집이라 1개월 전 데이터가 없음
2. **잘못된 점수 계산**: GREATEST() 사용으로 한쪽만 좋아도 100점 받음

## 해결 방법

### 1단계: Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: `gakqqmhubnbswqmnpprv`
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2단계: SQL 실행
아래 SQL을 복사해서 SQL Editor에 붙여넣고 **Run** 클릭:

\`\`\`sql
-- 📋 scripts/fix-view-simple.sql 내용 전체 복사
-- (파일 내용 참조)
\`\`\`

또는 로컬 파일 사용:
- 파일 위치: `/home/user/webapp/scripts/fix-view-simple.sql`
- 파일 내용을 열어서 전체 복사 → SQL Editor에 붙여넣기

### 3단계: View 갱신
SQL Editor에서 다음 명령 실행:

\`\`\`sql
-- Materialized View 갱신
REFRESH MATERIALIZED VIEW public.mv_consensus_changes;
REFRESH MATERIALIZED VIEW public.mv_stock_analysis;

-- 결과 확인
SELECT 
  name,
  code,
  market,
  revenue_change_1m,
  op_profit_change_1m,
  consensus_score,
  divergence_score,
  investment_score,
  investment_grade
FROM public.v_investment_opportunities
LIMIT 20;
\`\`\`

### 4단계: 웹사이트에서 확인
- 브라우저에서 페이지 새로고침 (Ctrl+F5 또는 Cmd+Shift+R)
- 투자 기회 발굴 페이지 확인
- 점수가 정상적으로 표시되는지 확인

## 변경 사항

### Before (문제):
- \`GREATEST(revenue_score, op_profit_score)\` ← 둘 중 큰 값만 선택
- 한쪽이 -100%여도 다른 쪽이 +100%면 점수 100점
- NULL 처리 안됨 → COALESCE로 0 대체

### After (수정):
- \`(revenue_score + op_profit_score) / 2.0\` ← 평균 사용
- NULL이면 명시적으로 0점 처리
- 가중치 조정: 재무 30% + 가격 70% (과거 데이터 부족 시)
- 과거 데이터 쌓이면 가중치 다시 조정 예정

## 장기 해결책

### 매일 재무 데이터 수집 스케줄
현재 vercel.json의 cron 설정:
\`\`\`json
{
  "path": "/api/collect-data?secret=\${CRON_SECRET}",
  "schedule": "0 14 * * 0"  // 매주 일요일만
}
\`\`\`

변경 필요:
\`\`\`json
{
  "path": "/api/collect-data?secret=\${CRON_SECRET}",
  "schedule": "0 14 * * *"  // 매일 23:00 KST
}
\`\`\`

이렇게 하면:
- 1주일 후: 1일 전 비교 가능
- 1개월 후: 1개월 전 비교 가능
- 3개월 후: 3개월 전 비교 가능

## 확인 사항
- [ ] SQL 실행 완료
- [ ] View 갱신 완료  
- [ ] 웹사이트에서 정상 표시 확인
- [ ] 점수가 다양하게 분포 (0~100점)
- [ ] 증감률이 NULL 또는 합리적인 값

## 문제 발생 시
1. SQL 에러 메시지 확인
2. 에러 내용과 함께 개발자에게 문의
3. 또는 GitHub Issues에 등록
