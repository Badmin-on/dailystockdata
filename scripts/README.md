# 📊 주가 데이터 자동 수집 시스템

GitHub Actions를 이용한 자동화 + 수동 실행 병행 시스템

---

## 🎯 개요

### 수집 스케줄
- **오전 7시 (KST)**: FnGuide 재무 데이터 수집 (1000개 기업, 16-17분 소요)
- **오후 7시 (KST)**: 네이버 주가 데이터 수집 (1000개 기업, 5-10분 소요)

### 실행 방식
- ✅ **자동 실행**: GitHub Actions (cron 스케줄)
- ✅ **수동 실행**: 로컬 환경 (기존 방식 유지)

---

## 📂 파일 구조

```
dailystockdata/
├── .github/
│   └── workflows/
│       └── stock-data-cron.yml          # GitHub Actions 워크플로우
├── scripts/                              # 자동화 스크립트 폴더
│   ├── fnguide-scraper.js               # FnGuide 재무 데이터 (standalone)
│   ├── stock-price-scraper.js           # 네이버 주가 데이터 (복사본)
│   ├── package.json                      # 의존성 목록
│   └── README.md                         # 이 문서
└── (기존 Next.js 파일들...)

C:\alexDB\  (로컬 수동 실행용 - 유지됨)
├── 1_seoul_ys_fnguide_supabase.js       # Express 서버 + 웹 UI
├── 3_ys_stock_supabase.js               # 독립 실행형
└── .env                                  # 로컬 환경변수
```

---

## 🚀 GitHub Actions 설정 (1회만)

### Step 1: GitHub Secrets 설정

1. GitHub 저장소 페이지 이동
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭
4. 다음 3개 시크릿 추가:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOi...` (Service Role Key) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |

⚠️ **주의**: Service Role Key를 사용하세요 (anon key 아님)

---

### Step 2: 코드 푸시 (이번 한 번만)

```bash
# 현재 디렉토리에서 실행
git add .
git commit -m "Add GitHub Actions automated data collection"
git push origin main
```

---

### Step 3: 자동 실행 확인

1. GitHub 저장소 → **Actions** 탭 클릭
2. 다음 스케줄에 자동 실행됨:
   - 매일 오전 7시 (KST): `FnGuide Financial Data Collection`
   - 매일 오후 7시 (KST): `Naver Stock Price Collection`

---

## 🧪 테스트 방법

### 방법 1: 수동 트리거 (GitHub 웹)

1. GitHub 저장소 → **Actions** 탭
2. 왼쪽에서 **"Stock Data Auto Update"** 클릭
3. 오른쪽 **"Run workflow"** 버튼 클릭
4. 드롭다운에서 선택:
   - `fnguide`: FnGuide 재무 데이터만 수집
   - `stock-price`: 네이버 주가 데이터만 수집
   - `both`: 둘 다 수집 (테스트용)
5. **"Run workflow"** 클릭

### 방법 2: 로컬 테스트

```bash
# scripts 폴더로 이동
cd scripts

# 의존성 설치 (최초 1회)
npm install

# FnGuide 재무 데이터 수집
npm run fnguide

# 네이버 주가 데이터 수집
npm run stock-price

# 둘 다 실행
npm run all
```

⚠️ **주의**: 로컬 테스트 전에 `.env` 파일 필요:

```bash
# scripts/.env 파일 생성
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

---

## 📊 실행 로그 확인

### GitHub Actions 로그

1. **Actions** 탭 → 실행 기록 클릭
2. 왼쪽에서 Job 선택 (`FnGuide Financial Data Collection` 또는 `Naver Stock Price Collection`)
3. 각 Step 클릭하여 상세 로그 확인

**로그 예시**:
```
🚀 FnGuide 재무 데이터 수집 시작: 2024-01-15
📋 KOSPI 수집: 500개 (중복 제거됨)
📋 KOSDAQ 수집: 500개 (중복 제거됨)
📊 총 1000개 기업 수집 예정
...
📈 진행률: 50/1000 (5.0%)
📈 진행률: 100/1000 (10.0%)
...
✅ 크롤링 완료! 성공: 995, 실패: 5
💾 Supabase에 저장 중...
✅ 1000개 기업 정보 저장 완료
📦 총 4개 배치로 삽입 시작...
✅ Batch 1/4 저장 완료 (1000개 레코드)
...
🎉 모든 작업 완료!
⏱️  총 소요 시간: 16분 32초
📊 저장 결과: 1000개 기업, 4000개 재무 레코드
```

---

## ⚠️ 문제 해결

### 문제 1: GitHub Actions 실패

**증상**: Actions 탭에서 빨간색 X 표시

**해결**:
1. 로그 확인 → 오류 메시지 확인
2. Secrets 설정 재확인
3. 수동 실행으로 대체 (아래 참조)

---

### 문제 2: 환경변수 오류

**증상**: `❌ 환경변수 누락: SUPABASE_URL`

**해결**:
1. GitHub → Settings → Secrets 확인
2. 3개 시크릿 모두 존재하는지 확인
3. 값이 정확한지 재확인 (복사/붙여넣기 오류 주의)

---

### 문제 3: 타임아웃

**증상**: Actions 실행 6시간 후 자동 취소

**원인**: GitHub Actions 무료 플랜 제한 (6시간)

**해결**: 정상 실행 시 16-17분 소요되므로 발생 가능성 낮음. 재실행 또는 수동 실행.

---

## 🔄 수동 실행 (폴백 방법)

### GitHub Actions 실패 시 대응

**기존 로컬 환경에서 실행** (변경 없음):

```bash
# 방법 1: Express 서버 + 웹 UI (FnGuide)
cd C:\alexDB
node 1_seoul_ys_fnguide_supabase.js
# → http://localhost:3000/stocks 접속
# → 웹 UI로 진행률 모니터링

# 방법 2: 독립 실행형 (네이버 주가)
cd C:\alexDB
node 3_ys_stock_supabase.js
```

---

## 📈 운영 전략

### Phase 1: 검증 기간 (1-2주)

- ✅ 자동 실행 활성화
- ✅ 매일 로그 확인
- ✅ 수동 실행 병행 (백업)
- ✅ 데이터 정합성 검증

### Phase 2: 안정화 (1개월)

- ✅ 자동 실행 신뢰도 확인
- ✅ 실패율 모니터링
- ⚠️ 실패 시 즉시 수동 실행

### Phase 3: 완전 자동화

- ✅ 자동 실행만 사용
- ✅ 수동 실행은 긴급 시에만
- ✅ 주간 데이터 품질 리뷰

---

## 📋 체크리스트

### 초기 설정

- [ ] GitHub Secrets 3개 설정 완료
- [ ] 코드 푸시 완료
- [ ] Actions 탭에서 워크플로우 확인
- [ ] 수동 트리거 테스트 성공

### 일일 점검 (초기 1-2주)

- [ ] GitHub Actions 실행 로그 확인
- [ ] Supabase 데이터 확인
- [ ] 실패 시 수동 실행 대응

### 주간 점검

- [ ] 자동 실행 성공률 확인 (90% 이상 목표)
- [ ] 데이터 품질 검증
- [ ] 로그 분석 및 개선 사항 도출

---

## 🆘 지원

### 문의 사항

- GitHub Issues 등록
- 로그 파일 첨부
- 오류 메시지 스크린샷

### 추가 개선 사항

- Slack/Discord 알림 연동
- 데이터 품질 검증 자동화
- 실패 시 자동 재시도
- 성공/실패 통계 대시보드

---

## 📝 변경 이력

- **2024-01-XX**: 초기 버전 생성
  - GitHub Actions 자동화 구현
  - 수동 실행 방식 병행 유지
  - 실행 가이드 문서화
