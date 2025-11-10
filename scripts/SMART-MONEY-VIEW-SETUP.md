# Smart Money Flow View 생성 가이드

## 🎯 목적
Smart Money Flow 페이지의 500 에러를 해결하기 위해 `v_smart_money_flow` view를 생성합니다.

## 📋 실행 방법

### Supabase 대시보드에서 실행 (5분 소요)

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - 또는 Database > SQL Editor

3. **SQL 실행**
   - `scripts/create-smart-money-flow-view.sql` 파일 열기
   - **전체 내용 복사** (Ctrl+A, Ctrl+C)
   - SQL Editor에 **붙여넣기** (Ctrl+V)
   - **Run** 버튼 클릭 (또는 Ctrl+Enter)

4. **결과 확인**
   ```
   ✅ Step 1: 기존 v_smart_money_flow View 확인
   ✨ Step 2: v_smart_money_flow View 생성
   ✅ Step 3: View 생성 확인
   📊 Step 4: 등급별 통계
   📈 Step 5: 거래량 패턴별 통계
   🏆 Step 6: Smart Money Flow Top 10
   ✅ Smart Money Flow View 생성 완료!
   ```

5. **프론트엔드 확인**
   - 브라우저에서 `/smart-money-flow` 페이지 새로고침
   - **Hard Refresh** (Ctrl+Shift+R 또는 Cmd+Shift+R)
   - 500 에러가 사라지고 데이터가 표시되어야 함

## 🔍 View 설명

### 주요 기능
- **컨센서스 개선**: 1개월 매출/영업이익 전망 상승
- **저평가 종목**: 120일 이동평균 대비 -10% ~ +5% 이격도
- **거래량 증가**: RVOL ≥ 1.2 (최근 5일 평균 vs 20일 평균)

### 점수 계산 방식
```
Smart Money Score =
  Consensus Score × 40% +
  Divergence Score × 30% +
  Volume Score × 30%
```

### 등급 기준
- **S급**: 80점 이상
- **A급**: 60점 이상
- **B급**: 40점 이상
- **C급**: 40점 미만

### 거래량 패턴
- **Strong Accumulation**: RVOL ≥ 2.0 + 누적 7일 이상
- **Moderate Flow**: RVOL 1.5~2.0
- **Increasing Interest**: RVOL 1.2~1.5
- **Normal**: RVOL 1.0~1.2
- **Volume Dry Up**: RVOL < 0.6

## ⚠️ 문제 해결

### "View already exists" 오류
```sql
-- 기존 view 삭제 후 재생성
DROP VIEW IF EXISTS v_smart_money_flow CASCADE;
```

### "Permission denied" 오류
- SERVICE_KEY로 연결되어 있는지 확인
- 프로젝트 소유자 권한 필요

### "Table not found" 오류
다음 테이블/뷰가 필요합니다:
- `v_investment_opportunities` (이미 존재)
- `daily_stock_prices` (이미 존재)

## 📊 기대 결과

실행 후 다음 정보를 확인할 수 있습니다:
- 전체 발굴 기업 수
- S급, A급 기회 개수
- Strong Accumulation 패턴 종목 수
- Top 10 종목 리스트

## ✅ 완료 체크리스트

- [ ] Supabase 대시보드 접속
- [ ] SQL Editor 열기
- [ ] create-smart-money-flow-view.sql 전체 복사
- [ ] SQL Editor에 붙여넣기
- [ ] Run 실행
- [ ] 성공 메시지 확인
- [ ] 브라우저에서 /smart-money-flow 페이지 확인
- [ ] Hard Refresh (Ctrl+Shift+R)
- [ ] 데이터 정상 표시 확인

## 🎉 완료!

View 생성이 완료되면 Smart Money Flow 페이지가 정상적으로 작동합니다.
