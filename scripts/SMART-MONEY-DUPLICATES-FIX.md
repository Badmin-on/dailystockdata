# Smart Money Flow 중복 제거 가이드

## 🎯 문제
Smart Money Flow 페이지에서 같은 회사가 중복 표시됨
- 에이피알: 3번 중복
- 리가켐바이오, 넷마블 등: 2번 중복

## 🔍 원인
`v_investment_opportunities`가 같은 회사를 여러 연도(2025, 2026, 2027)로 반환하여 발생

## ✅ 해결 방법
`v_smart_money_flow` view를 수정하여 **회사당 최고 점수 1개만 선택**

---

## 🚀 실행 방법 (2분 소요)

### Supabase 대시보드에서 실행

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴 "SQL Editor" 클릭

3. **SQL 실행**
   - `scripts/fix-smart-money-duplicates.sql` 파일 열기
   - **전체 내용 복사** (Ctrl+A, Ctrl+C)
   - SQL Editor에 **붙여넣기** (Ctrl+V)
   - **Run** 버튼 클릭

4. **결과 확인**
   ```
   ✅ Step 1: 현재 중복 상태 확인
   ✨ Step 2: v_smart_money_flow 재생성
   ✅ Step 3: 수정 후 상태 확인
   📊 Step 4: 등급별 통계
   ✅ Smart Money Flow 중복 제거 완료!
   ```

5. **프론트엔드 확인**
   - 브라우저에서 `/smart-money-flow` 페이지 새로고침
   - **Hard Refresh** (Ctrl+Shift+R)
   - 중복 제거 확인

---

## 📊 예상 결과

### 변경 전
```
총 레코드: 18개
고유 회사: 12개
→ 6개 회사 중복
```

### 변경 후
```
총 레코드: 12개
고유 회사: 12개
→ 중복 없음 ✅
```

---

## 🔧 수정 내용

### SQL 변경사항

**기존 (중복 발생):**
```sql
FROM v_investment_opportunities io
```

**수정 (중복 제거):**
```sql
WITH unique_opportunities AS (
  SELECT DISTINCT ON (company_id)
    *
  FROM v_investment_opportunities
  ORDER BY company_id, investment_score DESC, year DESC
)
FROM unique_opportunities io
```

### 로직
- 같은 회사가 여러 연도로 존재할 경우
- `investment_score`가 높은 것 우선
- 같은 점수면 최신 연도(`year`) 우선
- **회사당 1개만 선택**

---

## ⚠️ 영향 범위

### 변경되는 것
- ✅ Smart Money Flow 페이지만

### 변경되지 않는 것
- ❌ 투자 기회 페이지
- ❌ ETF 모니터링
- ❌ 종목 비교
- ❌ 다른 모든 기능

**100% 안전합니다!**

---

## 🔄 롤백 방법

문제 발생 시 원래 view로 되돌리기:
```sql
-- 원본 SQL 실행
-- scripts/create-smart-money-flow-view.sql
```

---

## ✅ 완료 체크리스트

실행 전:
- [ ] Supabase 대시보드 접속 가능
- [ ] SQL Editor 열기
- [ ] fix-smart-money-duplicates.sql 준비

실행:
- [ ] SQL 전체 복사
- [ ] SQL Editor에 붙여넣기
- [ ] Run 실행
- [ ] 성공 메시지 확인

실행 후:
- [ ] Hard Refresh (Ctrl+Shift+R)
- [ ] /smart-money-flow 페이지 확인
- [ ] 중복 제거 확인 (18개 → 12개)
- [ ] 등급별 통계 확인

---

## 🎉 완료!

중복 제거 후:
- **Smart Money Flow**: 중복 없음 ✅
- **다른 모든 페이지**: 영향 없음 ✅

모든 회사가 1번씩만 깔끔하게 표시됩니다! 🚀
