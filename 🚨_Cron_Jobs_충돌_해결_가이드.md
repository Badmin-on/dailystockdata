# 🚨 Vercel Cron Jobs 충돌 해결 가이드

## 문제 상황

❌ **에러 메시지:**
```
Your plan allows you to create up to 3 Cron Jobs.
Your plan currently has 3, and thus project is attempting to exceed that limit.
```

**원인:** Vercel Dashboard에 이미 3개의 Cron Jobs가 등록되어 있어서, 새로운 배포가 차단됨

---

## ✅ 해결 방법 (2단계)

### 1단계: 기존 Cron Jobs 삭제 후 배포

#### Step 1: Vercel Dashboard에서 기존 Cron Jobs 삭제

1. **Vercel Dashboard 접속**
   ```
   https://vercel.com/mintons-projects-dfccdb817/dailystockdata/settings/cron-jobs
   ```

2. **Settings → Cron Jobs** 탭 이동

3. **기존 Cron Jobs 모두 삭제**
   - 각 Cron Job 옆 **"..."** 메뉴 클릭
   - **"Delete"** 선택
   - 모든 Cron Jobs 삭제 (3개 모두)

#### Step 2: 자동 배포 확인

GitHub에 최신 코드가 푸시되었으므로:
- Vercel이 **자동으로 재배포** 시작
- 또는 **Deployments → Redeploy** 클릭

#### Step 3: 배포 성공 확인

- **Deployments** 탭에서 "Ready" 상태 확인
- Build Logs에서 에러 없는지 확인

---

### 2단계: Cron Jobs 다시 추가

배포가 성공하면 Cron Jobs를 다시 추가합니다.

#### 방법 A: vercel.json 파일에 추가 (추천)

```bash
# 로컬에서 실행
cd /home/user/webapp
```

**vercel.json 파일 수정:**
```json
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/collect-data?secret=${CRON_SECRET}",
      "schedule": "0 14 * * *",
      "comment": "매일 23:00 KST - 재무 데이터 수집"
    },
    {
      "path": "/api/collect-daily-prices?secret=${CRON_SECRET}",
      "schedule": "0 11 * * 1-5",
      "comment": "평일 20:00 KST - 주가 데이터 수집"
    }
  ],
  "regions": ["icn1"],
  "functions": {
    "app/api/collect-data/route.ts": {
      "maxDuration": 300
    },
    "app/api/collect-daily-prices/route.ts": {
      "maxDuration": 300
    }
  }
}
```

**커밋 및 푸시:**
```bash
git add vercel.json
git commit -m "feat: Re-add cron jobs configuration"
git push origin main
```

#### 방법 B: Vercel Dashboard에서 수동 추가

1. **Settings → Cron Jobs**

2. **"Create Cron Job" 클릭**

3. **첫 번째 Cron Job 추가:**
   - **Path:** `/api/collect-data?secret=${CRON_SECRET}`
   - **Schedule:** `0 14 * * *`
   - **Description:** 매일 23:00 KST - 재무 데이터 수집

4. **두 번째 Cron Job 추가:**
   - **Path:** `/api/collect-daily-prices?secret=${CRON_SECRET}`
   - **Schedule:** `0 11 * * 1-5`
   - **Description:** 평일 20:00 KST - 주가 데이터 수집

---

## 📋 상세 단계별 체크리스트

### Phase 1: 기존 Cron Jobs 제거
- [ ] Vercel Dashboard → Settings → Cron Jobs 접속
- [ ] 기존 Cron Job #1 삭제
- [ ] 기존 Cron Job #2 삭제
- [ ] 기존 Cron Job #3 삭제 (있다면)
- [ ] 모두 삭제 완료 확인 (0개 상태)

### Phase 2: 배포
- [ ] Vercel Deployments 확인 (자동 배포 진행 중)
- [ ] 또는 수동 Redeploy 실행
- [ ] 배포 성공 확인 (Status: Ready)
- [ ] Build Logs에서 에러 없음 확인

### Phase 3: Cron Jobs 재추가
- [ ] 방법 A 또는 B 선택
- [ ] Cron Job #1 추가 (재무 데이터)
- [ ] Cron Job #2 추가 (주가 데이터)
- [ ] Settings → Cron Jobs에서 2개 활성화 확인

### Phase 4: 환경 변수 확인
- [ ] Settings → Environment Variables
- [ ] `CRON_SECRET` 존재 확인
- [ ] `SUPABASE_SERVICE_KEY` 존재 확인
- [ ] 모든 환경 변수 Production 환경 적용 확인

### Phase 5: 테스트
- [ ] 웹사이트 접속 확인
- [ ] API 엔드포인트 수동 테스트 (선택)
- [ ] Cron Job 실행 대기 (오늘 밤 23:00)

---

## 🔍 현재 상태

### 완료된 것:
✅ **vercel.json에서 Cron Jobs 임시 제거** (충돌 방지)
✅ **GitHub에 푸시 완료**
✅ **Cron 설정 백업 파일 생성** (`vercel-crons-backup.json`)

### 다음 단계:
1️⃣ **Vercel Dashboard에서 기존 Cron Jobs 삭제**
2️⃣ **배포 성공 확인**
3️⃣ **Cron Jobs 다시 추가**

---

## ⚠️ 중요 사항

### Free Plan vs Pro Plan

**Vercel Free Plan 제한:**
- ❌ Cron Jobs: 최대 **1개**만 생성 가능
- ❌ Function 실행 시간: 10초

**Vercel Pro Plan ($20/월):**
- ✅ Cron Jobs: 최대 **3개** 생성 가능
- ✅ Function 실행 시간: 300초 (5분)
- ✅ 데이터 수집에 필수!

**현재 계정 Plan 확인:**
```
https://vercel.com/account/billing
```

**⚠️ Free Plan이면:**
- Cron Job 1개만 사용 가능
- 재무 데이터 수집만 활성화 권장 (더 중요함)
- 주가 데이터는 수동 실행

---

## 🎯 최종 목표 상태

**Vercel Cron Jobs (2개):**
```
1. /api/collect-data          - 0 14 * * *    [Enabled]
2. /api/collect-daily-prices  - 0 11 * * 1-5  [Enabled]
```

**Environment Variables (4개):**
```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_KEY
✅ CRON_SECRET
```

**배포 상태:**
```
✅ Status: Ready
✅ Build: Successful
✅ Domain: Active
```

---

## 📞 예상 소요 시간

| 단계 | 소요 시간 |
|------|-----------|
| Cron Jobs 삭제 | 2분 |
| 배포 대기 | 3-5분 |
| Cron Jobs 재추가 | 3분 |
| **총 시간** | **10분** |

---

## 🆘 문제 해결

### Q1: Cron Jobs가 안 보여요!
→ Settings → Cron Jobs 탭 확인
→ 없으면 이미 삭제된 것 (다음 단계로)

### Q2: 배포가 계속 실패해요!
→ Build Logs 확인
→ 에러 메시지 복사해서 질문

### Q3: Pro Plan이 필요한가요?
→ **예, 필수입니다!**
→ Free Plan은 Cron Job 1개만 지원
→ Function 실행 시간도 10초로 제한

### Q4: Cron Jobs를 다시 추가했는데 작동 안 해요!
→ Environment Variables 확인
→ `CRON_SECRET` 값 일치하는지 확인
→ Vercel Logs에서 실행 여부 확인

---

## ✨ 다음 단계

1. **지금 바로:** Vercel Dashboard에서 기존 Cron Jobs 삭제
2. **5분 후:** 배포 성공 확인
3. **그 다음:** Cron Jobs 다시 추가
4. **오늘 밤 23:00:** 첫 자동 수집 시작!

---

**화이팅! 거의 다 왔습니다!** 🚀
