# 📋 스크립트 실행 순서 가이드

## ✅ 완료된 작업

1. **데이터 정규화** ✅
   - 파일: `fix-data-scale-simple.sql`
   - 상태: 2025-10-25 실행 완료
   - 결과: 과거 데이터 억원 단위로 정규화

---

## 🚀 지금 실행할 작업

### 파일: `FINAL_VIEW_CREATE_2025-10-25.sql` ⭐

**이 파일을 Supabase SQL Editor에서 실행하세요!**

**또는:** 프로젝트 루트의 `👉_여기_실행하세요.md` 참고

---

## 📁 파일 구조

### 실행 필요 (NOW)
```
✅ FINAL_VIEW_CREATE_2025-10-25.sql  👈 이것 실행!
```

### 이미 완료 (DONE)
```
✅ fix-data-scale-simple.sql         (완료)
```

### 오래된 파일 (ARCHIVED)
```
_OLD/
  ├── check-and-refresh-views.sql   (사용하지 마세요)
  ├── refresh-views-if-exist.sql    (사용하지 마세요)
  └── refresh-views-safe.sql        (사용하지 마세요)
```

---

## 🎯 실행 순서 요약

| 순서 | 파일 | 상태 | 설명 |
|------|------|------|------|
| 1️⃣ | `fix-data-scale-simple.sql` | ✅ 완료 | 데이터 정규화 |
| 2️⃣ | `FINAL_VIEW_CREATE_2025-10-25.sql` | ⏳ **실행 필요** | View 생성 |

---

## 💡 빠른 링크

- **전체 가이드:** `/👉_여기_실행하세요.md`
- **실행 스크립트:** `FINAL_VIEW_CREATE_2025-10-25.sql`
- **문제 보고서:** `/CRITICAL_BUG_FOUND.md`
- **조사 요약:** `/INVESTIGATION_SUMMARY.md`

---

## ⚠️ 주의사항

**절대 실행하지 마세요:**
- ❌ `check-and-refresh-views.sql`
- ❌ `refresh-views-*.sql`
- ❌ `_OLD/` 폴더의 모든 파일

**실행할 파일:**
- ✅ `FINAL_VIEW_CREATE_2025-10-25.sql` 만!

---

**날짜:** 2025-10-25  
**상태:** View 생성 대기 중  
**다음 액션:** `FINAL_VIEW_CREATE_2025-10-25.sql` 실행
