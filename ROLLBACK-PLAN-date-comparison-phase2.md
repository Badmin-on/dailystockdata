# Date-Comparison Phase 2 최적화 롤백 가이드

## 🚨 긴급 복원 방법 (3가지 옵션)

### Option 1: 파일만 빠르게 복원 (가장 빠름 - 10초)
```bash
# Phase 2 백업 파일로 즉시 복원
cp app/api/date-comparison/route.ts.phase2-backup app/api/date-comparison/route.ts
git add app/api/date-comparison/route.ts
git commit -m "Rollback: restore date-comparison to phase 1 state"
git push
```

### Option 2: Git으로 이전 커밋으로 복원 (안전함 - 30초)
```bash
# Phase 2 최적화 커밋만 되돌리기
git revert HEAD
git push

# 또는 특정 파일만 이전 버전으로
git checkout backup-before-date-comparison-phase2 -- app/api/date-comparison/route.ts
git commit -m "Rollback: date-comparison phase 2 optimization"
git push
```

### Option 3: 백업 브랜치로 완전 복원 (전체 복원 - 1분)
```bash
# Phase 2 백업 브랜치로 전환
git checkout backup-before-date-comparison-phase2
git push origin backup-before-date-comparison-phase2 --force

# 다시 main으로 돌아오기
git checkout main
```

---

## 🗄️ Database Function 삭제 (선택사항)

Database Function이 문제를 일으킬 경우:

```sql
-- Supabase SQL Editor에서 실행
DROP FUNCTION IF EXISTS get_date_comparison(TEXT, TEXT, TEXT, INT, NUMERIC, INT);
```

**중요**: 코드에 Try-Catch Fallback이 있어서 Function이 없어도 자동으로 기존 방법 사용

---

## ✅ 현재 백업 상태

- **Git 백업 브랜치**: `backup-before-date-comparison-phase2`
- **파일 백업**: `app/api/date-comparison/route.ts.phase2-backup`
- **마지막 안전 커밋**: `2aff6cb` (Phase 1 최적화 완료)

---

## 🔍 Phase 2 최적화 내용

**최적화 목표**:
- 2개의 대용량 쿼리 (800ms) + 클라이언트 처리 (200ms) = 1000ms
- → 1개의 Database Function 호출 (150-250ms)
- **예상 개선**: 75-85% 빠름

**Database Function**:
- 이름: `get_date_comparison()`
- 기능: 날짜 범위 데이터 조회 + Growth Rate 계산을 DB에서 한 번에 처리
- 안전성: Try-catch fallback으로 기존 코드 보존

---

## 🔍 문제 발생 시 체크리스트

1. Vercel 배포 로그 확인
2. 브라우저 콘솔에서 에러 메시지 확인
3. 콘솔 로그 확인:
   - `✅ Fast method succeeded` → 최적화 성공
   - `⚠️ Fast method failed, using fallback` → Fallback 사용 (정상)
4. 위의 Option 1 먼저 시도 (가장 빠름)
5. 문제 지속 시 Option 2 사용
6. Database Function 삭제는 마지막 수단

---

## 📊 Phase 1 vs Phase 2 비교

### Phase 1 (현재 상태)
- **최적화**: 날짜 범위 찾기 (2 쿼리 → 1 쿼리)
- **개선**: 40-60ms → 20-30ms (50%)
- **전체 영향**: 3% 개선

### Phase 2 (지금 진행)
- **최적화**: 대용량 데이터 조회 + 계산 (2 쿼리 + 클라이언트 → 1 Function)
- **개선**: 1000ms → 150-250ms (75-85%)
- **전체 영향**: Stock-comparison처럼 극적 개선 예상

---

**작성일**: 2025-11-15
**최적화 대상**: `/date-comparison` API Route (Phase 2)
**예상 개선**: 75-85% 빠름 (1000ms → 150-250ms)
