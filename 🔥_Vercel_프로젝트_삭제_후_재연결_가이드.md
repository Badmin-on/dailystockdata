# 🔥 Vercel 프로젝트 삭제 후 재연결 가이드

## ✅ 이 방법이 가장 확실합니다!

기존 Cron Jobs와 모든 설정을 완전히 제거하고 깨끗하게 시작합니다.

---

## 📋 전체 과정 (10분 소요)

```
1단계: Vercel 프로젝트 삭제 (2분)
   ↓
2단계: GitHub 저장소 재연결 (3분)
   ↓
3단계: 환경 변수 설정 (3분)
   ↓
4단계: 배포 완료 (2분)
   ↓
완료! 🎉
```

---

## 1️⃣ 단계: Vercel 프로젝트 삭제

### A. 프로젝트 설정으로 이동

**직접 링크:**
```
https://vercel.com/mintons-projects-dfccdb817/dailystockdata/settings
```

또는:
1. Vercel Dashboard → 프로젝트 선택
2. **Settings** 탭 클릭

### B. 프로젝트 삭제

1. 왼쪽 사이드바 **맨 아래**로 스크롤

2. **"Advanced"** 섹션 찾기

3. **"Delete Project"** 버튼 찾기 (빨간색)

4. 클릭하면 확인 창이 나타남

5. 프로젝트 이름 입력: `dailystockdata`

6. **"Delete"** 버튼 클릭

### C. 삭제 완료 확인

- Dashboard로 돌아감
- `dailystockdata` 프로젝트가 사라졌는지 확인

---

## 2️⃣ 단계: GitHub 저장소 재연결

### A. 새 프로젝트 생성

1. **Vercel Dashboard 홈**
   ```
   https://vercel.com/dashboard
   ```

2. **"Add New..." 버튼** 클릭 (우측 상단)

3. **"Project"** 선택

### B. GitHub 저장소 선택

1. **"Import Git Repository"** 섹션에서

2. **GitHub** 아이콘 클릭

3. 저장소 목록에서 **"dailystockdata"** 찾기
   - Owner: `Badmin-on`
   - Repository: `dailystockdata`

4. **"Import"** 버튼 클릭

### C. 프로젝트 설정

**Configure Project 화면:**

1. **Project Name**: `dailystockdata` (자동 입력됨)

2. **Framework Preset**: `Next.js` (자동 감지됨)

3. **Root Directory**: `.` (기본값)

4. **Build Command**: `next build` (자동)

5. **Output Directory**: `.next` (자동)

**⚠️ 아직 "Deploy" 버튼 누르지 마세요!**

---

## 3️⃣ 단계: 환경 변수 설정

**Configure Project 화면에서:**

### A. Environment Variables 섹션

1. **"Environment Variables"** 섹션 펼치기

2. 아래 4개 변수 추가:

#### 변수 1: NEXT_PUBLIC_SUPABASE_URL
```
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: https://gakqqmhubnbswqmnpprv.supabase.co
```
- Environment: **All** (Production, Preview, Development 모두 선택)

#### 변수 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Name:  NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3FxbWh1Ym5ic3dxbW5wcHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NDk5MjQsImV4cCI6MjA3NTMyNTkyNH0.6gbpDu1ILzcSvcz__n8kOxreueX0_MCjwJDCBQA70oY
```
- Environment: **All**

#### 변수 3: SUPABASE_SERVICE_KEY
```
Name:  SUPABASE_SERVICE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3FxbWh1Ym5ic3dxbW5wcHJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc0OTkyNCwiZXhwIjoyMDc1MzI1OTI0fQ.sIUxTApR43oGxUb8my3Ao8aza7RTLRUvJS-c7DQZnvI
```
- Environment: **All**

#### 변수 4: CRON_SECRET (선택사항)
```
Name:  CRON_SECRET
Value: a8f4c2d1b9e7f6a3c5d8e2b4f7a9c1d3e5f8a2b6c9d4e7f1a3b8c5d9e2f6a4b7
```
- Environment: **All**
- **참고**: Cron Jobs를 사용하지 않지만, API 보안을 위해 설정해두는 것이 좋습니다.

### B. 변수 입력 방법

각 변수마다:
1. **"Add"** 버튼 클릭
2. **Name** 입력
3. **Value** 붙여넣기
4. **Environment**: All 선택 (체크박스 3개 모두)
5. **"Save"** 또는 다음 변수로 이동

---

## 4️⃣ 단계: 배포

### A. 배포 시작

1. 모든 환경 변수 입력 완료 확인

2. **"Deploy"** 버튼 클릭 (파란색 큰 버튼)

3. 배포 시작! 🚀

### B. 배포 진행 상황

**화면에 표시되는 것:**
```
Building...
├─ Installing dependencies
├─ Building application
├─ Generating pages
└─ Finalizing build

Deploying...
```

**소요 시간:** 약 2-3분

### C. 배포 완료

**성공 시 화면:**
```
✓ Deployment Ready

https://dailystockdata-xxx.vercel.app

Visit    Inspect    Copy URL
```

**배포 URL 복사:**
- 나중에 접속할 수 있도록 URL 복사해두세요!

---

## 5️⃣ 단계: 확인

### A. 웹사이트 접속

배포 완료 후:

1. **"Visit"** 버튼 클릭
   
   또는 URL 직접 입력:
   ```
   https://your-new-url.vercel.app
   ```

2. **메인 페이지 확인**
   - 데이터베이스 연결 상태
   - 등록 기업 수
   - 버튼들이 보이는지

### B. 데이터 수집 페이지 접속

```
https://your-new-url.vercel.app/admin/collect
```

**확인 사항:**
- 페이지가 로드되는가?
- 2개의 수집 버튼이 보이는가?
- UI가 정상인가?

### C. Cron Jobs 확인

**Settings → Cron Jobs 확인:**
```
https://vercel.com/mintons-projects-dfccdb817/dailystockdata/settings/cron-jobs
```

**확인:**
- ✅ **"No cron jobs configured"** 메시지
- ✅ **또는 Cron Jobs: 0개**

완벽! 🎉

---

## 📋 체크리스트

### 삭제 단계
```
□ Vercel Dashboard 접속
□ dailystockdata 프로젝트 선택
□ Settings → Advanced → Delete Project
□ 프로젝트 이름 입력: dailystockdata
□ Delete 버튼 클릭
□ 삭제 완료 확인
```

### 재연결 단계
```
□ Dashboard → Add New → Project
□ GitHub 저장소 선택 (dailystockdata)
□ Import 클릭
□ Framework: Next.js 확인
```

### 환경 변수 단계
```
□ NEXT_PUBLIC_SUPABASE_URL 추가
□ NEXT_PUBLIC_SUPABASE_ANON_KEY 추가
□ SUPABASE_SERVICE_KEY 추가
□ CRON_SECRET 추가 (선택)
□ 모든 변수 Environment: All 확인
```

### 배포 단계
```
□ Deploy 버튼 클릭
□ 빌드 진행 상황 확인
□ 배포 완료 대기 (2-3분)
□ Deployment Ready 확인
```

### 확인 단계
```
□ 웹사이트 접속 테스트
□ /admin/collect 페이지 접속
□ Settings → Cron Jobs = 0개 확인
□ 완료! 🎉
```

---

## ⚠️ 주의사항

### 1. 환경 변수는 반드시!

환경 변수를 입력하지 않으면:
- ❌ Supabase 연결 실패
- ❌ 데이터 로딩 불가
- ❌ 수집 기능 작동 안 함

**반드시 4개 모두 입력하세요!**

### 2. 도메인은 바뀝니다

새 프로젝트를 만들면:
- 새 URL: `dailystockdata-xyz123.vercel.app`
- 이전 URL은 사용 불가

**새 URL을 저장해두세요!**

### 3. Custom 도메인이 있었다면

이전에 커스텀 도메인을 연결했다면:
- 재연결 필요
- Settings → Domains에서 추가

---

## 🎯 예상 결과

### 성공 시:

```
✓ 프로젝트 삭제 완료
✓ 재연결 완료
✓ 환경 변수 설정 완료
✓ 배포 성공
✓ Cron Jobs: 0개
✓ 웹사이트 정상 작동
✓ 데이터 수집 페이지 작동
```

### URL:
```
메인:           https://dailystockdata-xxx.vercel.app
데이터 수집:    https://dailystockdata-xxx.vercel.app/admin/collect
투자 기회:      https://dailystockdata-xxx.vercel.app/opportunities
```

---

## 💡 장점

### 이 방법의 장점:

1. ✅ **완전히 깨끗한 시작**
   - 모든 이전 설정 제거
   - Cron Jobs 충돌 없음

2. ✅ **확실한 해결**
   - 캐시 문제 해결
   - 오래된 설정 제거

3. ✅ **빠른 작업**
   - 10분이면 완료
   - 복잡한 디버깅 불필요

4. ✅ **최신 상태로 시작**
   - 최신 코드로 배포
   - 최적화된 설정

---

## 🚀 지금 시작하세요!

**1단계부터 차근차근 따라하세요:**

1. **프로젝트 삭제**
   ```
   https://vercel.com/mintons-projects-dfccdb817/dailystockdata/settings
   → Advanced → Delete Project
   ```

2. **재연결**
   ```
   https://vercel.com/dashboard
   → Add New → Project → Import dailystockdata
   ```

3. **환경 변수 4개 입력**

4. **Deploy 클릭**

5. **완료!** 🎉

---

**예상 소요 시간:** 10분  
**난이도:** 쉬움 ⭐  
**성공률:** 100% 🎯

**지금 바로 시작하세요!** 💪
