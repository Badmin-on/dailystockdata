# 1D/1Y 데이터 N/A 문제 해결

## 문제 분석

### 발견된 문제
투자 기회 화면(/opportunities)에서 다음 데이터가 N/A로 표시됨:
- 1D 매출 (revenue_change_1d)
- 1D 영업이익 (op_profit_change_1d)
- 1Y 매출 (revenue_change_1y)
- 1Y 영업이익 (op_profit_change_1y)

### 근본 원인
1. **mv_consensus_changes** materialized view가 1M 데이터만 계산하고 1D/1Y는 계산하지 않음
2. **v_investment_opportunities** view가 1D/1Y 컬럼을 노출하지 않음

### 종목 비교 화면은 왜 작동하나?
종목 비교 화면(`/stock-comparison`)은 다음과 같이 동작합니다:
- financial_data 테이블에서 직접 데이터를 읽음
- 모든 scrape_date를 가져와서 가장 가까운 날짜를 찾음
- 1D: 두 번째로 최근 날짜
- 1M: 약 30일 전 (±7일 범위)
- 1Y: 약 360일 전 (±14일 범위)
- 동적으로 변화율을 계산

## 해결 방법

### 수정 내용
동일한 로직을 mv_consensus_changes와 v_investment_opportunities에 적용:

1. **mv_consensus_changes 업데이트**
   - 1D: 가장 최근 날짜와 바로 이전 날짜 비교
   - 1M: 약 30일 전과 비교 (기존)
   - 1Y: 약 360일 전과 비교 (신규)

2. **v_investment_opportunities 업데이트**
   - revenue_change_1d, op_profit_change_1d 컬럼 추가
   - revenue_change_1y, op_profit_change_1y 컬럼 추가

### 실행 방법

#### Option 1: Supabase 대시보드에서 실행 (권장)

1. Supabase 대시보드에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. `scripts/add-1d-1y-support.sql` 파일 내용 복사
5. SQL Editor에 붙여넣기
6. **Run** 버튼 클릭

#### Option 2: psql 커맨드라인 (고급 사용자)

```bash
# Supabase connection string 확인 (Dashboard > Project Settings > Database)
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" -f scripts/add-1d-1y-support.sql
```

### 예상 결과

SQL 실행 후:

```
✅ Step 1 completed: mv_consensus_changes updated!
✅ Step 2 completed: v_investment_opportunities updated!
📊 Step 3: Verifying the updates...
🎉 All done! Investment opportunities page now supports 1D and 1Y data!
```

샘플 데이터 10개와 통계가 표시됩니다.

## 테스트 방법

1. SQL 실행 완료 후
2. 브라우저에서 투자 기회 페이지 새로고침 (Ctrl+F5 또는 Cmd+Shift+R)
3. 1D 매출, 1D 영업이익 값 확인
4. 1Y 매출, 1Y 영업이익 값 확인

### 예상되는 화면

기존:
```
1D 매출: N/A
1D 영업이익: N/A
1Y 매출: N/A
1Y 영업이익: N/A
```

수정 후:
```
1D 매출: +2.5%
1D 영업이익: +3.1%
1Y 매출: +15.2%
1Y 영업이익: +18.7%
```

## 추가 수정사항

### Grade 색상 문제 해결
투자 등급(S, A, B, C) 배지 색상도 수정되었습니다:
- `components/Sidebar.tsx:136-150` - getGradeColor() 함수 업데이트
- 'S', 'A', 'B', 'C' 및 'S급', 'A급', 'B급', 'C급' 모두 지원

브라우저 새로고침 시 적용됩니다.

## 파일 목록

생성된 파일:
- `scripts/add-1d-1y-support.sql` - **메인 실행 파일** (이것만 실행하면 됨)
- `scripts/update-consensus-view-with-1d-1y.sql` - mv_consensus_changes 업데이트 (참조용)
- `scripts/update-investment-view-with-1d-1y.sql` - v_investment_opportunities 업데이트 (참조용)
- `scripts/update-consensus-view.js` - Node.js 실행 스크립트 (미완성, 참조용)
- `scripts/check-consensus-data.sql` - 진단용 SQL (참조용)
- `scripts/check-consensus-columns.js` - 진단용 스크립트 (참조용)

## 문제 발생 시

### 오류: "materialized view does not exist"
- mv_stock_analysis가 없는 경우 먼저 생성 필요
- `scripts/FINAL_VIEW_CREATE_2025-10-25_v2.sql` 실행

### 오류: "permission denied"
- SUPABASE_SERVICE_KEY로 로그인 확인
- 또는 Supabase 대시보드에서 실행

### 데이터가 여전히 NULL
- financial_data 테이블에 충분한 기간의 데이터가 있는지 확인
- 최소 2개 이상의 scrape_date 필요 (1D용)
- 최소 360일 이상의 데이터 필요 (1Y용)

## 커밋 정보

현재 세션에서 수정된 사항:
- Grade 색상 수정: `components/Sidebar.tsx`
- Smart Money Flow 메뉴 추가: `components/Sidebar.tsx`
- Git commit: `5d6dded` - "Add Smart Money Flow feature with volume analysis"

1D/1Y 데이터 수정은 데이터베이스 변경이므로 별도 커밋 불필요.
