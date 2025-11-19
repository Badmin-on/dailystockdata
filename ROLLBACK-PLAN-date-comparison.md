# Date-Comparison 최적화 롤백 가이드

## 🚨 긴급 복원 방법 (3가지 옵션)

### Option 1: 파일만 빠르게 복원 (가장 빠름 - 10초)
```bash
# 백업 파일로 즉시 복원
cp app/api/date-comparison/route.ts.backup app/api/date-comparison/route.ts
git add app/api/date-comparison/route.ts
git commit -m "Rollback: restore date-comparison to original state"
git push
```

### Option 2: Git으로 이전 커밋으로 복원 (안전함 - 30초)
```bash
# 최신 커밋만 되돌리기
git revert HEAD
git push

# 또는 특정 파일만 이전 버전으로
git checkout backup-before-date-comparison-optimization -- app/api/date-comparison/route.ts
git commit -m "Rollback: date-comparison optimization"
git push
```

### Option 3: 백업 브랜치로 완전 복원 (전체 복원 - 1분)
```bash
# 백업 브랜치로 전환
git checkout backup-before-date-comparison-optimization
git push origin backup-before-date-comparison-optimization --force

# 다시 main으로 돌아오기
git checkout main
```

---

## 🗄️ Database Function 삭제 (선택사항)

Database Function이 문제를 일으킬 경우:

```sql
-- Supabase SQL Editor에서 실행
DROP FUNCTION IF EXISTS find_closest_date_range(TEXT, TEXT);
```

**참고**: 코드에 Fallback이 있어서 Function이 없어도 자동으로 기존 방법 사용

---

## ✅ 현재 백업 상태

- **Git 백업 브랜치**: `backup-before-date-comparison-optimization`
- **파일 백업**: `app/api/date-comparison/route.ts.backup`
- **마지막 안전 커밋**: `404e255` (stock-comparison 최적화 완료)

---

## 🔍 문제 발생 시 체크리스트

1. Vercel 배포 로그 확인
2. 콘솔 에러 메시지 확인
3. 위의 Option 1 먼저 시도 (가장 빠름)
4. 문제 지속 시 Option 2 사용
5. Database Function 삭제는 마지막 수단

---

**작성일**: 2025-11-15
**최적화 대상**: `/date-comparison` API Route
**예상 개선**: 2 쿼리 → 1 쿼리 (40-60ms → 20-30ms)
