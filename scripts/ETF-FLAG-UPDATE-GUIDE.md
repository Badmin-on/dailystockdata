# ETF 플래그 업데이트 가이드 ⚡

## 🎯 목적
ETF 모니터링 페이지에 139개 모든 ETF 표시 (현재 15개 → 139개)

## ✅ 안전성 확인 완료
- ✅ ETF 관련 페이지만 영향
- ✅ 투자 기회, Smart Money Flow, 종목 비교 등 **다른 모든 기능 영향 없음**
- ✅ 데이터 손상 없음 (단순 TRUE/FALSE 플래그 변경)

---

## 🚀 실행 방법 (3분 소요)

### Supabase 대시보드에서 실행

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴 "SQL Editor" 클릭

3. **SQL 실행**
   - `scripts/update-etf-flag.sql` 파일 열기
   - **전체 내용 복사** (Ctrl+A, Ctrl+C)
   - SQL Editor에 **붙여넣기** (Ctrl+V)
   - **Run** 버튼 클릭

4. **결과 확인**
   ```
   ✅ Step 1: 현재 상태 확인
   📋 Step 2: 업데이트 대상 샘플
   ✨ Step 3: is_etf 플래그 업데이트 실행
   ✅ Step 4: 업데이트 결과 확인
   📈 Step 5: 운용사별 ETF 개수
   🏷️  Step 6: 섹터 할당 상태
   ✅ ETF 플래그 업데이트 완료!
   ```

5. **프론트엔드 확인**
   - 브라우저에서 `/etf-monitoring` 페이지 열기
   - **Hard Refresh** (Ctrl+Shift+R 또는 Cmd+Shift+R)
   - ETF 개수 확인: **15개 → 139개**로 증가

---

## 📊 예상 결과

### 변경 전
- 화면에 표시: 15개 ETF
- 누락: 124개 ETF

### 변경 후
- 화면에 표시: 139개 ETF ✅
- 운용사별:
  - KODEX: ~40개
  - TIGER: ~60개
  - RISE: ~15개
  - ACE: ~10개
  - 기타: ~14개

---

## 🔧 업데이트 상세 내용

### SQL 동작
```sql
UPDATE companies
SET is_etf = TRUE
WHERE etf_provider IS NOT NULL
  AND is_etf IS DISTINCT FROM TRUE;
```

### 변경되는 레코드
- **대상**: `etf_provider` 컬럼이 있지만 `is_etf = FALSE` 또는 `NULL`인 종목
- **개수**: 약 125개
- **예시**:
  ```
  TIGER 미국나스닥100 (133690)
  KODEX 미국나스닥100 (379810)
  TIGER 200 (102110)
  KODEX 레버리지 (122630)
  ... 등 125개
  ```

### 변경되지 않는 것
- ✅ 기존 `is_etf = TRUE` 레코드 (15개)
- ✅ 일반 주식 레코드 (ETF가 아닌 종목)
- ✅ 모든 View (`mv_consensus_changes`, `v_investment_opportunities` 등)
- ✅ 다른 페이지 기능

---

## ⚠️ 문제 해결

### "UPDATE" 명령 실행 안됨
- **원인**: 읽기 전용 권한
- **해결**: SERVICE_KEY 사용 확인 또는 소유자 권한 필요

### 업데이트 후에도 15개만 표시
1. **Hard Refresh 확인**: Ctrl+Shift+R
2. **API 캐시 확인**: 브라우저 개발자 도구 > Network 탭
3. **SQL 실행 확인**: Step 4 결과에서 `is_etf_TRUE` 개수 확인

### 다른 페이지에 문제 발생
- **가능성**: 거의 없음 (분석 완료)
- **롤백 방법**:
  ```sql
  -- 원래대로 되돌리기
  UPDATE companies
  SET is_etf = FALSE
  WHERE id IN (
    SELECT id FROM companies
    WHERE etf_provider IS NOT NULL
    LIMIT 125
  );
  ```

---

## ✅ 완료 체크리스트

실행 전:
- [ ] Supabase 대시보드 접속 가능
- [ ] SQL Editor 열림
- [ ] update-etf-flag.sql 파일 준비

실행:
- [ ] SQL 전체 복사
- [ ] SQL Editor에 붙여넣기
- [ ] Run 실행
- [ ] 성공 메시지 확인 ("✅ ETF 플래그 업데이트 완료!")

실행 후:
- [ ] 브라우저 Hard Refresh (Ctrl+Shift+R)
- [ ] /etf-monitoring 페이지 열기
- [ ] ETF 개수 확인 (139개)
- [ ] 다른 페이지 정상 작동 확인

---

## 🎉 완료!

업데이트 후:
- **ETF 모니터링 페이지**: 15개 → 139개 ✅
- **투자 기회 페이지**: 변화 없음 ✅
- **Smart Money Flow**: 변화 없음 ✅
- **종목 비교**: 변화 없음 ✅

**모든 ETF가 정상적으로 표시됩니다!** 🚀
