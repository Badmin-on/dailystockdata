# Smart Money Flow: 당해년도 컨센서스 사용

## 🎯 목적
주가/거래량 시점과 일치하는 **당해년도(2025년) 컨센서스만** 사용

## 📊 데이터 일관성

### 변경 전 (가능성)
```
회사별로 여러 연도 컨센서스 혼재:
├─ A 회사: 2025년 컨센서스 (investment_score: 80)
├─ A 회사: 2026년 컨센서스 (investment_score: 85) ← 선택됨
└─ A 회사: 2027년 컨센서스 (investment_score: 75)

문제:
- 오늘의 주가/거래량
- 2026년 컨센서스 (미래 전망)
→ 시점 불일치
```

### 변경 후 (명확함)
```
회사별로 당해년도만:
├─ A 회사: 2025년 컨센서스 ← 유일
└─ 주가/거래량: 2025년 현재 시점

결과:
✅ 모든 데이터가 현재 시점으로 통일
✅ Smart Money 본질에 충실 (단기 모멘텀)
```

---

## 🔧 변경 내용

### SQL 수정
```sql
-- 기존
SELECT DISTINCT ON (company_id)
  *
FROM v_investment_opportunities
ORDER BY company_id, investment_score DESC, year DESC

-- 수정
SELECT DISTINCT ON (company_id)
  *
FROM v_investment_opportunities
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)  -- 당해년도만! ← 추가
ORDER BY company_id, investment_score DESC
```

### 효과
- ✅ 당해년도(2025년) 컨센서스만 사용
- ✅ 주가/거래량과 시점 일치
- ✅ 데이터 일관성 보장
- ✅ 사용자 혼란 제거

---

## 🚀 실행 방법

### Supabase 대시보드

1. https://supabase.com/dashboard 접속
2. SQL Editor 열기
3. `scripts/fix-smart-money-current-year-only.sql` **전체 복사**
4. SQL Editor에 **붙여넣기**
5. **Run** 실행
6. 성공 메시지 확인

### 확인

1. 브라우저 Hard Refresh (Ctrl+Shift+R)
2. `/smart-money-flow` 페이지 확인
3. 데이터 일관성 확인

---

## 📝 추가 기능 (향후 논의)

사용자 요청에 따라 향후 고려 가능:
- [ ] 연도 선택 필터 (2025/2026/2027)
- [ ] 고급 모드 토글
- [ ] 별도 "미래 성장주" 스크리닝 페이지

**현재는 당해년도만 사용하여 데이터 일관성 유지**

---

## ✅ 완료

실행 후:
- ✅ 당해년도 컨센서스만 사용
- ✅ 주가/거래량과 시점 일치
- ✅ Smart Money 본질에 충실
- ✅ 향후 확장 가능성 유지
