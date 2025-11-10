# 유연한 날짜 매칭 시스템 (Flexible Date Matching)

## 🎯 핵심 개념

**정확한 날짜 간격은 현실적으로 불가능하므로, 가장 가까운 실제 날짜를 사용합니다.**

### 날짜 매칭 로직

| 기간 | 이상적 간격 | 실제 동작 |
|------|------------|----------|
| **1D** | 정확히 1일 전 | 가장 최근 2개 날짜 비교 (3일 차이여도 OK) |
| **1M** | 정확히 30일 전 | ~30일 전에 가장 가까운 날짜 |
| **3M** | 정확히 90일 전 | ~90일 전에 가장 가까운 날짜 |
| **1Y** | 정확히 365일 전 | ~365일 전에 가장 가까운 날짜 (없으면 가장 오래된 날짜) |

### 예시

```
DB에 저장된 날짜:
├─ 2025-11-09 (최신)
├─ 2025-11-02 (7일 전)
├─ 2025-10-15 (25일 전)
└─ 2025-07-09 (123일 전, 가장 오래됨)

실제 매칭:
├─ 1D: 11-09 vs 11-02 (7일 차이)
├─ 1M: 11-09 vs 10-15 (25일 차이)
├─ 3M: 11-09 vs 07-09 (123일 차이)
└─ 1Y: 11-09 vs 07-09 (123일 차이, 가장 오래된 것 사용)
```

**정확하지 않아도 OK!** 가용한 데이터로 최선의 비교를 수행합니다.

## 📂 주요 파일

### 실행 파일 (이것만 실행!)
```
scripts/MASTER-flexible-all-periods.sql
```

**포함 기능:**
- ✅ mv_consensus_changes 업데이트 (1D/1M/3M/1Y 모두 계산)
- ✅ v_investment_opportunities 업데이트 (모든 컬럼 노출)
- ✅ 검증 쿼리 (날짜 매칭, 샘플 데이터, 통계, 등급 분포)

### 참고 파일
- `flexible-1d-1y-support.sql` - MV만 업데이트
- `update-investment-view-flexible.sql` - View만 업데이트

## 🚀 실행 방법

### Supabase 대시보드에서 실행 (권장)

1. **Supabase 대시보드** 로그인
2. SQL Editor 열기
3. `scripts/MASTER-flexible-all-periods.sql` 파일 열기
4. 전체 내용 **복사**
5. SQL Editor에 **붙여넣기**
6. **Run** 버튼 클릭
7. 결과 확인:
   ```
   ✅ Step 1: mv_consensus_changes 생성 완료
   ✅ Step 2: v_investment_opportunities 업데이트 완료
   📅 날짜 매칭 정보
   📊 샘플 데이터 (Top 10)
   📈 통계
   🎯 등급 분포
   🎉 완료!
   ```

### 실행 후 확인

브라우저에서 `/opportunities` 페이지로 이동:
1. **Hard Refresh** (Ctrl+Shift+R 또는 Cmd+Shift+R)
2. 1D 데이터 확인 (0.00% → 실제 값)
3. 3M 데이터 확인 (N/A → 실제 값 또는 여전히 N/A)
4. S급 5개 정상 표시 확인

## 📊 현재 데이터 상태

### 확인된 사실

```bash
cd scripts && node check-scrape-dates.js
```

결과:
```
✅ Total unique scrape dates: 1
📊 All unique dates:
   1. 2025-11-09

❌ CRITICAL: Only 1 scrape_date exists!
```

**문제:** 비교할 두 번째 날짜가 없음

**해결:**
1. ⏳ 백그라운드 스크래퍼 실행 중 (2025-11-02 데이터 수집 중)
2. ⏳ 완료 후 자동으로 두 번째 날짜 생성
3. ⏳ SQL 실행하면 즉시 1D 계산 가능

## 🔧 문제 해결

### 스크래퍼 실행 상태 확인

```bash
# 현재 실행 중인 스크래퍼 확인
ps aux | grep fnguide-scraper

# 로그 확인
tail -f scripts/fnguide-test.log
```

### 날짜 수 다시 확인

```bash
cd scripts && node check-scrape-dates.js
```

### API 응답 테스트

```bash
cd scripts && node test-api-response.js
```

## 📅 타임라인

### 현재 상황
```
├─ 2025-11-09 데이터만 존재
├─ 1D 계산 불가능 (비교 대상 없음)
├─ 1M 계산 가능 (같은 날짜와 비교하므로 0%)
└─ 스크래퍼 실행 중 (85% 완료)
```

### 스크래퍼 완료 후 (예상 10-15분)
```
├─ 2025-11-02 데이터 추가
├─ 2025-11-09 데이터 유지
├─ SQL 실행 → MV/View 업데이트
└─ 1D 계산 가능! (11-09 vs 11-02, 7일 차이)
```

### SQL 실행 후
```
✅ 1D: 실제 값 표시 (0.18%, 5.08% 등)
✅ 1M: 정상 값 표시 (8.39%, 2.19% 등)
⚠️  3M: 데이터 부족 (가장 오래된 날짜가 7일 전이므로)
⚠️  1Y: 데이터 부족 (365일치 필요)
✅ S급 5개 정상 표시
```

## 💡 장기 해결책

### 1. 매일 자동 스크래핑
```bash
# Cron job 설정 (매일 오전 7시)
0 7 * * * cd /path/to/project/scripts && node fnguide-scraper.js
```

### 2. Historical 데이터 백필
- 과거 1년치 데이터 수동 수집
- 또는 API 제공자에게 Historical 데이터 요청

### 3. MV 자동 Refresh
```bash
# Cron job (매일 오전 8시, 스크래핑 후)
0 8 * * * cd /path/to/project/scripts && node refresh-mv.js
```

## ✅ 체크리스트

실행 전:
- [ ] Supabase 대시보드 접속 가능
- [ ] SQL Editor 열림
- [ ] MASTER-flexible-all-periods.sql 파일 준비

실행:
- [ ] SQL 전체 복사
- [ ] SQL Editor에 붙여넣기
- [ ] Run 실행
- [ ] 성공 메시지 확인

실행 후:
- [ ] 브라우저 Hard Refresh
- [ ] 1D 데이터 확인
- [ ] S급 5개 표시 확인
- [ ] API 캐시 무효화 확인

## 🎉 예상 결과

```
투자 기회 화면:
├─ S급 5개 표시 ✅
├─ 1D 매출: +0.18%, +5.08% 등 실제 값 ✅
├─ 1D 영익: +1.32%, +6.48% 등 실제 값 ✅
├─ 1M 매출: +8.39%, +2.19% 등 정상 ✅
├─ 3M: 데이터 쌓이면 자동 표시 ⏳
└─ 1Y: 365일 후 자동 표시 ⏳
```

**핵심: 정확한 날짜 간격 불필요, 가용 데이터로 최선의 비교 수행!**
