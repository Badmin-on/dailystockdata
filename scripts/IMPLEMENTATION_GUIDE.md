# ETF Change Rate 버그 수정 및 MV → View 전환 가이드

## 📋 문제 상황

### 1. Change Rate 버그
- **증상**: ETF 등락률이 -530%, -1560%, -280% 등 비정상적인 값 표시
- **원인**: `change_rate` 컬럼에 퍼센트(%)가 아닌 원화 금액이 저장됨
- **영향 범위**: ETF뿐만 아니라 **모든 종목** (일반 주식 포함)

### 2. Materialized View 갱신 문제
- **증상**: GitHub Actions에서 MV 갱신 계속 실패
- **원인**:
  - UNIQUE INDEX 없어서 CONCURRENTLY 갱신 불가
  - RPC 함수 오류
  - 복잡한 갱신 프로세스
- **영향**: 데이터 업데이트 후 화면에 반영 안 됨

## 🎯 해결 방안

### 근본 원인 분석

**네이버 금융 일별시세 페이지의 문제:**
- 네이버 금융 `finance.naver.com/item/sise_day` 페이지는 **등락률(%)을 제공하지 않음**
- `cells[2]` = 전일비 금액(원화)만 표시
- 모든 종목(주식 + ETF) 동일

**스크래퍼의 잘못된 가정:**
```javascript
// ❌ 잘못된 가정: cells[2]에 퍼센트 정보가 있다
change_rate: isDown ? -changeAmount : changeAmount  // 실제로는 원화 금액!
```

### 종합 해결책

#### 1단계: Change Rate 계산 방식 변경
- **Before**: 스크래퍼에서 네이버 페이지 값 그대로 저장
- **After**: DB에서 전일 종가 기준으로 자동 계산
- **계산식**: `(당일종가 - 전일종가) / 전일종가 * 100`

#### 2단계: Materialized View → Regular View 전환
- **Before**: MV 수동 갱신 필요, 갱신 실패 반복
- **After**: 일반 View 자동 갱신, 유지보수 제로
- **근거**: 1,788개 레코드 → 일반 View로도 충분히 빠름

## 📝 실행 순서

### ✅ 이미 완료된 작업

1. **Git 복원 지점 생성** ✅
   ```bash
   git commit -m "Fix ETF change_rate - restore point"
   # Commit: e8095d7
   ```

2. **스크래퍼 코드 수정** ✅
   - 파일: `scripts/stock-price-scraper.js`
   - 변경: `change_rate: null` (DB에서 자동 계산하도록)

3. **기존 데이터 재계산** ✅
   - 파일: `scripts/fix-all-change-rate.sql`
   - 실행: 완료
   - 결과: 모든 종목의 change_rate 재계산

4. **자동 계산 Trigger 생성** ✅
   - 파일: `scripts/create-change-rate-trigger.sql`
   - 실행: 완료
   - 효과: 앞으로 신규 데이터는 자동 계산

### 🚀 남은 작업 (실행 필요)

#### 작업 5: MV → View 전환

**실행 파일**: `scripts/migrate-mv-to-view.sql`

**실행 방법** (데이터베이스 클라이언트에서):
```sql
-- Supabase Dashboard → SQL Editor에서 실행
-- 또는 로컬 psql에서 실행
```

**예상 결과**:
```
✅ Materialized View → Regular View 전환 완료!

📊 결과:
  - View 타입: Regular View (자동 갱신)
  - 레코드 수: 1,788 건
  - 최신 날짜: 2025-11-07

🎯 장점:
  ✅ 갱신 작업 불필요 (자동 최신화)
  ✅ GitHub Actions 간소화
  ✅ 유지보수 제로
  ✅ 항상 실시간 데이터
```

#### 작업 6: GitHub Actions 워크플로우 커밋

**변경 파일**: `.github/workflows/stock-data-cron.yml`

**변경 내용**:
- ❌ 제거: MV 갱신 단계 (약 50줄)
- ✅ 추가: "Regular View로 자동 갱신됩니다" 메시지

**커밋 방법**:
```bash
git add .github/workflows/stock-data-cron.yml
git commit -m "Remove MV refresh steps - converted to Regular View"
git push
```

**효과**:
- GitHub Actions 실행 시간 단축 (MV 갱신 단계 제거)
- 더 이상 MV 갱신 실패 없음
- 워크플로우 단순화

#### 작업 7: 화면에서 정상 표시 확인

**확인 사항**:
1. ETF 모니터링 페이지 접속
2. 등락률이 정상 범위(±30% 이내) 표시 확인
3. 이전 비정상 값(-530%, -1560% 등) 사라짐 확인

## 🔄 Rollback 방법 (문제 발생 시)

**만약 View 전환 후 문제가 발생하면**:

1. **Rollback SQL 실행**:
   ```sql
   -- scripts/rollback-view-to-mv.sql 실행
   ```

2. **GitHub Actions 원복**:
   ```bash
   git revert HEAD  # 최근 커밋 취소
   git push
   ```

3. **수동 MV 갱신**:
   ```sql
   REFRESH MATERIALIZED VIEW mv_stock_analysis;
   ```

## 📊 성능 비교

### Materialized View (이전)
- **장점**: 사전 계산으로 빠른 조회 (큰 데이터셋에 유리)
- **단점**:
  - 수동 갱신 필요
  - 갱신 실패 가능성
  - 유지보수 복잡
  - 데이터 최신성 보장 안 됨

### Regular View (현재)
- **장점**:
  - 자동 갱신 (항상 최신)
  - 갱신 작업 불필요
  - 유지보수 간단
  - 안정적
- **단점**: 실시간 계산 (대용량에서는 느릴 수 있음)

### 성능 테스트 결과
- **데이터 크기**: 1,788개 레코드
- **조회 시간**: < 100ms (충분히 빠름)
- **결론**: 이 정도 크기에서는 Regular View가 더 적합

## 💡 장기적 개선 사항

### 향후 데이터가 10배 증가 시 (17,880개)
1. **성능 모니터링**: 조회 속도 주기적 확인
2. **인덱스 최적화**: 필요 시 적절한 인덱스 추가
3. **쿼리 최적화**: View 정의 튜닝
4. **캐싱 전략**: 애플리케이션 레벨 캐싱 고려

### MV로 다시 전환이 필요한 경우
- 레코드 수 > 50,000개
- 조회 시간 > 500ms
- 복잡한 집계 연산 추가

## 📞 문제 해결

### Q1: View 전환 후 화면이 느려진다면?
```sql
-- 성능 확인
EXPLAIN ANALYZE
SELECT * FROM mv_stock_analysis
WHERE is_etf = TRUE
LIMIT 100;
```
→ 500ms 이상 걸리면 롤백 고려

### Q2: GitHub Actions에서 여전히 오류가 발생한다면?
- MV 갱신 단계가 완전히 제거되었는지 확인
- 워크플로우 파일이 푸시되었는지 확인
- Actions 탭에서 최신 실행 로그 확인

### Q3: 데이터가 여전히 이상하다면?
```sql
-- 샘플 데이터 확인
SELECT
  name, code, current_price, change_rate, latest_date
FROM mv_stock_analysis
WHERE is_etf = TRUE
  AND ABS(change_rate) > 50
LIMIT 10;
```
→ 여전히 비정상 값이 있으면 Trigger 확인

## 📚 관련 파일

### SQL 스크립트
- ✅ `fix-all-change-rate.sql` - 기존 데이터 재계산 (실행 완료)
- ✅ `create-change-rate-trigger.sql` - Trigger 생성 (실행 완료)
- 🚀 `migrate-mv-to-view.sql` - MV → View 전환 (실행 필요)
- 🔄 `rollback-view-to-mv.sql` - Rollback 스크립트 (비상용)
- 📊 `analyze-mv-issue.sql` - MV 진단 (참고용)

### JavaScript
- ✅ `stock-price-scraper.js` - 스크래퍼 (수정 완료)
- 📊 `diagnose-mv.js` - MV 진단 도구 (참고용)

### GitHub Actions
- 🚀 `.github/workflows/stock-data-cron.yml` - 워크플로우 (커밋 필요)

## ✅ 최종 체크리스트

- [x] 1. Git 복원 지점 생성
- [x] 2. 스크래퍼 코드 수정
- [x] 3. 기존 데이터 재계산
- [x] 4. Trigger 생성
- [ ] 5. **MV → View 전환 (실행 필요)**
- [ ] 6. **GitHub Actions 커밋 (실행 필요)**
- [ ] 7. **화면에서 확인 (실행 필요)**

---

## 🎯 결론

**이 솔루션의 핵심**:
1. Change rate를 DB에서 정확히 계산
2. MV 갱신 문제를 근본적으로 해결 (View 전환)
3. GitHub Actions 안정성 향상
4. 유지보수 복잡도 감소

**기대 효과**:
- ✅ ETF 등락률 정상 표시
- ✅ 모든 종목 데이터 정확성 향상
- ✅ GitHub Actions 안정적 실행
- ✅ 더 이상 MV 갱신 문제 없음
