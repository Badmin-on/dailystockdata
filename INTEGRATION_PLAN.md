# 컨센서스 밸류에이션 분석 Main 브랜치 통합 계획

## 📊 현재 상태 분석 (2024-11-19)

### ✅ 완료된 작업 (feature/consensus-analysis 브랜치)
1. **Phase 0**: 테스트 데이터 준비 ✅
2. **Phase 1**: DB 스키마 및 TypeScript 타입 ✅
3. **Phase 2**: 계산 엔진 구현 ✅
4. **Phase 3**: API 엔드포인트 ✅
5. **Phase 4**: Frontend UI ✅
6. **Phase 5**: 배치 계산 스크립트 ✅
7. **추가 기능**: 컨센서스 변화 추이 분석 ✅

### ⚠️ 확인 필요 사항
1. **DB 데이터 상태**:
   - ❓ consensus_metric_daily 테이블에 실제 데이터가 있는가?
   - ❓ 최근 날짜 데이터가 저장되어 있는가?
   - ❓ SK케미칼(285130) 같은 개별 종목 데이터가 있는가?

2. **GitHub Actions**:
   - ❌ 컨센서스 데이터 수집이 포함되지 않음
   - ✅ FnGuide 재무 데이터: 매일 오전 7시 (한국 시간)
   - ✅ 네이버 주가 데이터: 매일 오후 7시 (한국 시간)

3. **스크립트 위치**:
   - ✅ `scripts/calculate-consensus-batch.ts` 존재
   - ❓ GitHub Actions에서 실행 가능한 JS 버전 필요

---

## 🎯 통합 계획 (Main 브랜치)

### Phase 0: 사전 준비 및 검증 ✅ 우선 순위
**목표**: DB 데이터 상태 확인 및 누락 데이터 보완

#### Step 0-1: DB 데이터 검증
```bash
# 스크립트 실행
npx tsx scripts/check-consensus-data.ts

# 확인 사항:
# 1. consensus_metric_daily 레코드 수
# 2. 최신 snapshot_date
# 3. 주요 종목 데이터 존재 여부
# 4. financial_data_extended 데이터 존재 여부
```

**Expected**:
- ✅ 최소 100개 이상 종목 데이터
- ✅ 최근 3일 이내 snapshot_date
- ✅ 주요 종목(카카오, SK케미칼 등) 데이터 확인

**If Failed**:
```bash
# 배치 스크립트 수동 실행
npx tsx scripts/calculate-consensus-batch.ts
```

#### Step 0-2: 재무 데이터 확인
```bash
# financial_data_extended 테이블 확인
# - 2024, 2025년 데이터 존재 여부
# - EPS, PER 값이 null이 아닌지 확인
```

**If Failed**:
- FnGuide 스크래퍼 재실행
- GitHub Actions 로그 확인

---

### Phase 1: GitHub Actions 통합
**목표**: 컨센서스 계산을 자동화 워크플로우에 추가

#### Step 1-1: TypeScript → JavaScript 변환
```bash
# 배치 스크립트 JS 버전 생성
# scripts/calculate-consensus-batch.js

# 또는 tsx 사용하도록 워크플로우 수정
```

#### Step 1-2: GitHub Actions 워크플로우 수정
**파일**: `.github/workflows/stock-data-cron.yml`

**추가 내용**:
```yaml
# Job 3: 컨센서스 계산 (오전 8시 - FnGuide 수집 후)
consensus-calculator:
  name: Consensus Metrics Calculation
  runs-on: ubuntu-latest
  needs: [fnguide-scraper]  # FnGuide 데이터 수집 후 실행
  if: |
    github.event.schedule == '0 23 * * *' ||  # 한국 시간 오전 8시
    github.event.inputs.scraper_type == 'consensus' ||
    github.event.inputs.scraper_type == 'both'

  steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run consensus calculator
      env:
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      run: |
        echo "🚀 컨센서스 지표 계산 시작..."
        npx tsx scripts/calculate-consensus-batch.ts
        echo "✅ 컨센서스 지표 계산 완료!"
```

#### Step 1-3: Secrets 확인
**GitHub Repository → Settings → Secrets**:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_KEY`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`

---

### Phase 2: Feature 브랜치 정리 및 테스트
**목표**: Main 통합 전 마지막 검증

#### Step 2-1: 최종 빌드 테스트
```bash
# 빌드 에러 확인
npm run build

# TypeScript 타입 체크
npx tsc --noEmit
```

#### Step 2-2: 로컬 테스트
```bash
# 개발 서버 실행
npm run dev

# 테스트 항목:
# ✅ 메인 페이지 (/consensus-analysis)
# ✅ 종목 상세 페이지 (클릭 테스트)
# ✅ 필터 기능
# ✅ 4분면 차트
# ✅ 컨센서스 변화 추이 (1일/1주/1개월/3개월)
# ✅ 날짜 표시 (한국 시간)
```

#### Step 2-3: Git 커밋 정리
```bash
# 현재 커밋 확인
git log --oneline -10

# 필요시 커밋 squash (선택사항)
git rebase -i HEAD~5
```

---

### Phase 3: Main 브랜치 통합
**목표**: 안전한 main 브랜치 머지

#### Step 3-1: Main 브랜치 최신화
```bash
# Main 브랜치로 전환
git checkout main

# 최신 상태 확인
git pull origin main

# Feature 브랜치 머지 전 확인
git log --oneline -5
```

#### Step 3-2: Pull Request 생성
**GitHub에서 진행**:
1. feature/consensus-analysis → main PR 생성
2. 변경 파일 리스트 확인
3. 충돌 확인 및 해결

**PR 체크리스트**:
- [ ] 모든 Phase 완료 확인
- [ ] 빌드 성공 확인
- [ ] 테스트 통과 확인
- [ ] 새로운 의존성 확인
- [ ] DB 스키마 변경사항 문서화
- [ ] README 업데이트

#### Step 3-3: 머지 및 배포
```bash
# Squash and Merge 권장
# Main 브랜치 보호

# 머지 후 확인
git checkout main
git pull origin main

# 프로덕션 배포 (Vercel)
# - 자동 배포 트리거
# - 환경 변수 확인
```

---

### Phase 4: 프로덕션 검증
**목표**: 실제 운영 환경에서 정상 작동 확인

#### Step 4-1: Vercel 배포 확인
**확인 사항**:
- [ ] 빌드 성공
- [ ] 환경 변수 적용
- [ ] 페이지 접근 가능
- [ ] API 응답 확인

#### Step 4-2: Supabase DB 확인
```sql
-- 최신 데이터 확인
SELECT COUNT(*) FROM consensus_metric_daily;
SELECT DISTINCT snapshot_date FROM consensus_metric_daily ORDER BY snapshot_date DESC LIMIT 5;

-- 특정 종목 확인
SELECT * FROM consensus_metric_daily WHERE ticker = '035720' ORDER BY snapshot_date DESC LIMIT 5;
```

#### Step 4-3: GitHub Actions 실행 확인
**GitHub → Actions 탭**:
- [ ] 다음날 오전 8시 실행 확인
- [ ] 로그 확인
- [ ] DB 업데이트 확인

---

## 📝 체크리스트

### 통합 전 (현재)
- [ ] DB 데이터 상태 확인 (Step 0-1)
- [ ] 재무 데이터 확인 (Step 0-2)
- [ ] GitHub Actions 수정 (Step 1-2)
- [ ] 로컬 테스트 완료 (Step 2-2)
- [ ] 빌드 테스트 통과 (Step 2-1)

### 통합 중
- [ ] PR 생성 및 리뷰
- [ ] 충돌 해결
- [ ] Main 브랜치 머지

### 통합 후
- [ ] Vercel 배포 확인
- [ ] 프로덕션 테스트
- [ ] GitHub Actions 실행 확인
- [ ] 모니터링 설정

---

## 🚨 롤백 계획

### 문제 발생 시
1. **즉시 롤백**:
   ```bash
   git revert <merge-commit-hash>
   git push origin main
   ```

2. **Vercel 롤백**:
   - Vercel Dashboard → Deployments
   - 이전 성공 배포 버전으로 롤백

3. **DB 롤백** (필요시):
   ```sql
   -- consensus 관련 테이블만 영향
   -- 기존 데이터 백업 권장
   ```

---

## 📊 성공 지표

### 기술적 지표
- ✅ 빌드 에러 0개
- ✅ 런타임 에러 0개
- ✅ 페이지 로딩 < 3초
- ✅ API 응답 < 500ms
- ✅ GitHub Actions 성공률 > 95%

### 비즈니스 지표
- ✅ 종목 커버리지 > 100개
- ✅ 일일 데이터 업데이트 성공
- ✅ 사용자 경험 개선

---

## 다음 단계

### 우선순위 1: DB 데이터 확인 ⚡
```bash
npx tsx scripts/check-consensus-data.ts
```

### 우선순위 2: 누락 데이터 보완
```bash
# 필요시
npx tsx scripts/calculate-consensus-batch.ts
```

### 우선순위 3: GitHub Actions 수정
- `.github/workflows/stock-data-cron.yml` 편집
- 컨센서스 계산 job 추가

---

**작성일**: 2024-11-19
**작성자**: Claude Code
**브랜치**: feature/consensus-analysis → main
**예상 완료일**: 2024-11-20 (1-2일 소요)
