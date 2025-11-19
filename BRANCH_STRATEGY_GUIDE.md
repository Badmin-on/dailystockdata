# 브랜치 전략 초보자 가이드

**대상**: Git 브랜치를 처음 사용하는 개발자
**목적**: 안전한 신규 기능 개발 + 빠른 롤백
**소요 시간**: 초기 설정 10분, 이후 자동화

---

## 🎓 브랜치란? (5분 개념 이해)

### 비유: 평행 세계

```
📁 프로젝트 폴더 (하나)
│
├── 🌍 main 브랜치 (현실 세계)
│   → 실제 사용자가 접속하는 버전
│   → 절대 망가뜨리면 안됨!
│
├── 💾 backup-stable-2025-11-19 (타임캡슐)
│   → 2025-11-19 상태 그대로 보관
│   → 언제든 이 상태로 돌아갈 수 있음
│
└── 🔬 feature/naver-v2 (실험실)
    → 마음껏 실험하는 공간
    → 망가져도 main에 영향 없음
    → 성공하면 main에 합치기
```

### 폴더 vs 브랜치

| 방식 | 폴더 복사 | 브랜치 사용 |
|------|----------|------------|
| **파일 위치** | 폴더 2개 (디스크 2배) | 폴더 1개 (효율적) |
| **전환 방법** | 폴더 이동 | `git checkout` 명령어 |
| **Vercel 배포** | 프로젝트 2개 필요 | 자동 Preview 배포 |
| **되돌리기** | 폴더 삭제 | `git revert` (30초) |

---

## 🚀 Step 1: 현재 상태 확인 및 백업 (5분)

### 1-1. 현재 브랜치 확인

**명령어:**
```bash
git branch
```

**예상 출력:**
```
* main
```

**의미:**
- `*`가 붙은 게 현재 작업 중인 브랜치
- 지금은 `main`에 있음

---

### 1-2. 작업 중인 파일 확인

**명령어:**
```bash
git status
```

**예상 출력:**
```
On branch main
Changes not staged for commit:
  modified:   .claude/settings.local.json

Untracked files:
  NAVER_MIGRATION_PLAN.md
  ROLLBACK_PROCEDURE.md
  ...
```

**의미:**
- 수정된 파일들 목록
- 커밋 전 상태

---

### 1-3. 현재 상태 저장 (커밋)

**명령어:**
```bash
# 1. 모든 변경사항 스테이징
git add .

# 2. 커밋 메시지와 함께 저장
git commit -m "Backup: Stable state before Naver migration (2025-11-19)"

# 3. GitHub에 업로드
git push origin main
```

**각 명령어 설명:**
- `git add .`: 모든 파일 변경사항을 "저장 준비" 상태로
- `git commit -m "메시지"`: 실제로 저장 (로컬)
- `git push origin main`: GitHub에 업로드 (백업)

**예상 출력:**
```bash
[main a72413c] Backup: Stable state before Naver migration (2025-11-19)
 5 files changed, 1500 insertions(+)
 create mode 100644 NAVER_MIGRATION_PLAN.md
 create mode 100644 ROLLBACK_PROCEDURE.md
```

---

### 1-4. 백업 브랜치 생성 (타임캡슐 만들기)

**명령어:**
```bash
# 1. 백업 브랜치 생성 및 전환
git checkout -b backup-stable-2025-11-19

# 2. GitHub에 업로드
git push origin backup-stable-2025-11-19
```

**설명:**
- `git checkout -b 브랜치명`: 새 브랜치 만들고 그곳으로 이동
- 이 브랜치는 **절대 수정하지 않음** (읽기 전용 백업)

**예상 출력:**
```bash
Switched to a new branch 'backup-stable-2025-11-19'

Total 3 (delta 0), reused 0 (delta 0)
To https://github.com/yourusername/dailystockdata.git
 * [new branch]      backup-stable-2025-11-19 -> backup-stable-2025-11-19
```

**확인:**
```bash
git branch
```

**출력:**
```
* backup-stable-2025-11-19  ← 현재 여기
  main
```

---

### 1-5. main 브랜치로 복귀

**명령어:**
```bash
git checkout main
```

**설명:**
- 백업은 만들었으니, 다시 main으로 돌아옴
- 파일 내용은 똑같음 (아직 아무것도 안 바뀜)

**확인:**
```bash
git branch
```

**출력:**
```
  backup-stable-2025-11-19
* main  ← 다시 여기로 돌아옴
```

---

## 🔬 Step 2: 개발 브랜치 생성 (실험실 만들기)

### 2-1. 새 기능 개발 브랜치 생성

**명령어:**
```bash
# 1. 개발 브랜치 생성 및 전환
git checkout -b feature/naver-v2

# 2. GitHub에 업로드
git push origin feature/naver-v2
```

**설명:**
- `feature/naver-v2`라는 이름의 새 브랜치
- 이제부터 이 브랜치에서 마음껏 코드 수정 가능
- main은 전혀 영향받지 않음!

**예상 출력:**
```bash
Switched to a new branch 'feature/naver-v2'

Total 3 (delta 0), reused 0 (delta 0)
remote:
remote: Create a pull request for 'feature/naver-v2' on GitHub by visiting:
remote:      https://github.com/yourusername/dailystockdata/pull/new/feature/naver-v2
remote:
To https://github.com/yourusername/dailystockdata.git
 * [new branch]      feature/naver-v2 -> feature/naver-v2
```

**확인:**
```bash
git branch
```

**출력:**
```
  backup-stable-2025-11-19
* feature/naver-v2  ← 개발 브랜치 (현재 위치)
  main
```

---

### 2-2. Vercel Preview 배포 확인

**1. Vercel Dashboard 접속**
```
https://vercel.com/dashboard
→ Your Project (dailystockdata) 클릭
→ Deployments 탭
```

**2. 확인 사항**
```
✅ Production: main 브랜치 배포
   → https://dailystockdata.vercel.app

✅ Preview: feature/naver-v2 브랜치 배포
   → https://dailystockdata-git-feature-naver-v2.vercel.app
```

**3. Preview URL 활용**
- 실제 사용자는 Production URL 접속 (기존 버전)
- 당신은 Preview URL에서 신규 기능 테스트
- 완전히 독립적인 환경!

---

## 💻 Step 3: 신규 기능 개발 (코드 작성)

### 3-1. 파일 생성 및 수정

**현재 브랜치 확인:**
```bash
git branch
# * feature/naver-v2 ← 여기서 작업
```

**파일 수정 예시:**

1. **lib/scraper-naver.ts 생성**
   - NAVER_MIGRATION_PLAN.md에서 복사-붙여넣기
   - VS Code에서 파일 생성 후 코드 작성

2. **types/database.types.ts 수정**
   - 기존 파일 열기
   - FinancialDataExtended 타입 추가

3. **로컬 테스트**
   ```bash
   npm run dev
   ```
   - http://localhost:3000 접속
   - 기능 정상 작동 확인

---

### 3-2. 변경사항 저장 (커밋)

**명령어:**
```bash
# 1. 변경된 파일 확인
git status

# 2. 모든 변경사항 스테이징
git add .

# 3. 커밋 (로컬 저장)
git commit -m "Add: Naver Finance scraper implementation"

# 4. GitHub에 업로드 + Vercel 자동 배포
git push origin feature/naver-v2
```

**예상 출력:**
```bash
[feature/naver-v2 b8f92a1] Add: Naver Finance scraper implementation
 3 files changed, 450 insertions(+), 2 deletions(-)
 create mode 100644 lib/scraper-naver.ts

Enumerating objects: 7, done.
Counting objects: 100% (7/7), done.
Delta compression using up to 8 threads
Compressing objects: 100% (4/4), done.
Writing objects: 100% (4/4), 8.45 KiB | 8.45 MiB/s, done.
Total 4 (delta 2), reused 0 (delta 0)
To https://github.com/yourusername/dailystockdata.git
   a72413c..b8f92a1  feature/naver-v2 -> feature/naver-v2
```

**Vercel 자동 배포:**
- 5-10분 후 Preview URL 업데이트됨
- https://dailystockdata-git-feature-naver-v2.vercel.app

---

### 3-3. Preview 환경에서 테스트

**1. Preview URL 접속**
```
https://dailystockdata-git-feature-naver-v2.vercel.app
```

**2. 기능 테스트**
- [ ] 메인 페이지 정상 로딩
- [ ] 날짜별 비교 페이지
- [ ] 종목 비교 페이지
- [ ] 신규 API 엔드포인트 (`/api/collect-data-dual`)

**3. 문제 발생 시**
- Preview 환경에서만 망가짐
- Production (실제 사용자)는 전혀 영향 없음!

---

## ✅ Step 4: 성공 시 - Production 배포

### 4-1. 테스트 완료 후 main 병합

**명령어:**
```bash
# 1. main 브랜치로 전환
git checkout main

# 2. feature/naver-v2의 변경사항을 main에 합치기
git merge feature/naver-v2

# 3. GitHub에 업로드 + Production 자동 배포
git push origin main
```

**설명:**
- `git merge`: 개발 브랜치의 모든 변경사항을 main에 복사
- 자동으로 Vercel Production 배포 시작
- 5-10분 후 실제 사용자에게 적용됨

**예상 출력:**
```bash
Switched to branch 'main'

Updating a72413c..b8f92a1
Fast-forward
 lib/scraper-naver.ts      | 450 +++++++++++++++++++++++++++++++++++++
 types/database.types.ts   |  25 +++
 3 files changed, 475 insertions(+)
 create mode 100644 lib/scraper-naver.ts

Enumerating objects: 7, done.
To https://github.com/yourusername/dailystockdata.git
   a72413c..b8f92a1  main -> main
```

**확인:**
```bash
# Production URL 접속 (5-10분 후)
open https://dailystockdata.vercel.app
```

---

## 🚨 Step 5: 문제 발생 시 - 롤백 (3가지 방법)

## 방법 1: 마지막 커밋만 되돌리기 (가장 빠름)

**상황**: 방금 배포한 버전에 버그 발견

**명령어:**
```bash
# 1. main 브랜치에서 실행
git checkout main

# 2. 마지막 커밋 취소
git revert HEAD

# 3. 자동으로 커밋 메시지 생성됨 (그대로 저장)
# Git 에디터가 열리면 :wq 입력 (저장 후 종료)

# 4. GitHub에 업로드 + 자동 롤백 배포
git push origin main
```

**설명:**
- `git revert HEAD`: 마지막 커밋을 취소하는 새 커밋 생성
- 히스토리는 남기되, 코드는 이전 상태로
- **30초 내 롤백 완료**

**예상 출력:**
```bash
[main c9d83f2] Revert "Add: Naver Finance scraper implementation"
 3 files changed, 2 insertions(+), 475 deletions(-)
 delete mode 100644 lib/scraper-naver.ts
```

---

## 방법 2: 특정 시점으로 완전 복원 (백업 브랜치 활용)

**상황**: 여러 번 커밋했는데 전부 문제 있음, 2025-11-19 상태로 돌아가고 싶음

**명령어:**
```bash
# 1. main 브랜치에서 실행
git checkout main

# 2. 백업 브랜치 상태로 강제 리셋
git reset --hard backup-stable-2025-11-19

# 3. GitHub에 강제 업로드 (⚠️ 주의: 팀 프로젝트면 팀원과 조율 필요)
git push origin main --force
```

**⚠️ 경고:**
- `--force`는 Git 히스토리를 강제로 덮어씀
- 혼자 작업하는 프로젝트에서만 사용
- 팀 프로젝트면 방법 1 사용 권장

**예상 출력:**
```bash
HEAD is now at a72413c Backup: Stable state before Naver migration (2025-11-19)

Total 0 (delta 0), reused 0 (delta 0)
To https://github.com/yourusername/dailystockdata.git
 + b8f92a1...a72413c main -> main (forced update)
```

**확인:**
```bash
git log --oneline -5
# a72413c Backup: Stable state before Naver migration (2025-11-19)
# ← 2025-11-19 상태로 완전 복원됨
```

---

## 방법 3: 개발 브랜치만 삭제 (main은 유지)

**상황**: feature/naver-v2 실험 실패, 다시 처음부터 시작하고 싶음

**명령어:**
```bash
# 1. main 브랜치로 전환 (현재 feature/naver-v2에 있다면)
git checkout main

# 2. 로컬 브랜치 삭제
git branch -D feature/naver-v2

# 3. GitHub에서도 삭제
git push origin --delete feature/naver-v2
```

**설명:**
- main은 전혀 영향 없음
- feature/naver-v2만 깔끔하게 삭제
- 다시 새로운 이름으로 브랜치 만들면 됨

**예상 출력:**
```bash
Deleted branch feature/naver-v2 (was b8f92a1).

To https://github.com/yourusername/dailystockdata.git
 - [deleted]         feature/naver-v2
```

---

## 📊 브랜치 상태 확인 명령어 모음

### 현재 브랜치 확인
```bash
git branch
# * main  ← 별표가 현재 브랜치
```

### 모든 브랜치 (GitHub 포함) 확인
```bash
git branch -a
```

**예상 출력:**
```
* main
  feature/naver-v2
  backup-stable-2025-11-19
  remotes/origin/main
  remotes/origin/feature/naver-v2
  remotes/origin/backup-stable-2025-11-19
```

### 각 브랜치의 최신 커밋 확인
```bash
git log --oneline --graph --all -10
```

**예상 출력:**
```
* b8f92a1 (feature/naver-v2) Add: Naver Finance scraper implementation
* a72413c (HEAD -> main, backup-stable-2025-11-19) Backup: Stable state
* 2aff6cb Optimize date-comparison API: 2 queries → 1 query
* 404e255 Optimize stock-comparison API: 100+ queries → 1 query
```

### 브랜치 간 차이 확인
```bash
# main과 feature/naver-v2 비교
git diff main..feature/naver-v2
```

---

## 🎯 실전 워크플로우 요약

### 일상 작업 흐름

```bash
# ========================================
# 1. 새로운 기능 개발 시작
# ========================================
git checkout main                          # main으로 이동
git pull origin main                       # 최신 상태 동기화
git checkout -b feature/new-feature        # 새 브랜치 생성
git push origin feature/new-feature        # GitHub에 업로드

# ========================================
# 2. 코드 작성 및 테스트
# ========================================
# VS Code에서 파일 수정...
npm run dev                                # 로컬 테스트
git add .                                  # 변경사항 스테이징
git commit -m "Add: 기능 설명"             # 커밋
git push origin feature/new-feature        # Preview 배포

# Preview URL에서 테스트:
# https://dailystockdata-git-feature-new-feature.vercel.app

# ========================================
# 3. 테스트 성공 → Production 배포
# ========================================
git checkout main                          # main으로 전환
git merge feature/new-feature              # 변경사항 병합
git push origin main                       # Production 배포

# ========================================
# 4. 문제 발생 → 긴급 롤백
# ========================================
git checkout main                          # main 확인
git revert HEAD                            # 마지막 커밋 취소
git push origin main                       # 롤백 배포 (30초)

# ========================================
# 5. 개발 브랜치 정리
# ========================================
git branch -d feature/new-feature          # 로컬 삭제 (병합 완료 후)
git push origin --delete feature/new-feature  # GitHub 삭제
```

---

## 🔧 자주 발생하는 상황 & 해결법

### Q1: "지금 어떤 브랜치에 있는지 모르겠어요"
```bash
git branch
# * feature/naver-v2  ← 별표가 현재 브랜치
```

### Q2: "파일 수정했는데 브랜치 전환이 안 돼요"
```bash
# 에러: error: Your local changes to the following files would be overwritten

# 해결법 1: 커밋 후 전환
git add .
git commit -m "WIP: 작업 중"
git checkout main

# 해결법 2: 임시 저장 (stash)
git stash                    # 변경사항 임시 보관
git checkout main            # 브랜치 전환
git checkout feature/naver-v2  # 다시 돌아옴
git stash pop                # 보관했던 변경사항 복원
```

### Q3: "main에 실수로 커밋했어요"
```bash
# 방법 1: 커밋 취소하고 개발 브랜치로 옮기기
git reset --soft HEAD~1       # 커밋 취소 (파일 변경은 유지)
git checkout -b feature/fix   # 새 브랜치 생성
git add .
git commit -m "Fix: 올바른 브랜치에 커밋"
git push origin feature/fix
```

### Q4: "Merge 충돌 발생했어요"
```bash
# 충돌 발생 시
git checkout main
git merge feature/naver-v2
# Auto-merging lib/scraper.ts
# CONFLICT (content): Merge conflict in lib/scraper.ts

# 해결 방법:
# 1. VS Code에서 lib/scraper.ts 열기
# 2. 충돌 부분 수동 수정 (<<<<<<, ======, >>>>>> 표시 제거)
# 3. 저장 후:
git add lib/scraper.ts
git commit -m "Merge: Resolve conflict in scraper.ts"
git push origin main
```

### Q5: "Preview 배포가 안 돼요"
```bash
# 확인 사항 1: Vercel 설정
# Dashboard → Settings → Git → Preview Deployments
# ✅ "All branches" 선택되어 있는지 확인

# 확인 사항 2: 푸시 했는지 확인
git push origin feature/naver-v2

# 확인 사항 3: Vercel Deployments 탭 확인
# 에러 로그가 있다면 확인
```

---

## 📚 추가 학습 자료

### Git 브랜치 시각화 도구
```bash
# 설치 (Windows Git Bash)
git log --oneline --graph --all --decorate

# 또는 VS Code 확장:
# GitLens 설치 → Source Control 탭에서 시각적으로 확인
```

### 유용한 Git 별칭 (Alias)
```bash
# ~/.gitconfig 파일에 추가
[alias]
  st = status
  co = checkout
  br = branch
  cm = commit -m
  unstage = reset HEAD --
  last = log -1 HEAD
  visual = log --oneline --graph --all --decorate

# 사용 예시:
git st              # git status 대신
git co main         # git checkout main 대신
git br              # git branch 대신
git cm "메시지"     # git commit -m "메시지" 대신
```

---

## ✅ 최종 체크리스트

### 브랜치 전략 성공 조건

- [ ] **백업 브랜치 생성 완료**
  ```bash
  git branch
  # backup-stable-2025-11-19 존재 확인
  ```

- [ ] **개발 브랜치에서 작업**
  ```bash
  git branch
  # * feature/naver-v2 ← 별표 확인
  ```

- [ ] **Vercel Preview 배포 확인**
  - Preview URL 접속 가능
  - Production URL은 기존 버전 유지

- [ ] **롤백 방법 숙지**
  - 방법 1: `git revert HEAD` (30초 롤백)
  - 방법 2: `git reset --hard backup-stable-2025-11-19`

- [ ] **안전한 작업 습관**
  - 항상 `git branch`로 현재 위치 확인
  - main에서는 직접 코드 수정 안 함
  - 커밋 전 `git status`로 확인

---

## 🚀 지금 바로 시작하기

**복사-붙여넣기 명령어 모음:**

```bash
# ========================================
# Step 1: 백업 생성
# ========================================
cd /c/Users/nebad/Desktop/dailystockdata/dailystockdata
git add .
git commit -m "Backup: Stable state before Naver migration (2025-11-19)"
git push origin main
git checkout -b backup-stable-2025-11-19
git push origin backup-stable-2025-11-19
git checkout main

# ========================================
# Step 2: 개발 브랜치 생성
# ========================================
git checkout -b feature/naver-v2
git push origin feature/naver-v2

# ========================================
# Step 3: 확인
# ========================================
git branch
# 예상 출력:
#   backup-stable-2025-11-19
# * feature/naver-v2
#   main

echo "✅ 브랜치 전략 설정 완료!"
echo "이제 feature/naver-v2에서 마음껏 개발하세요."
echo "Preview URL: https://dailystockdata-git-feature-naver-v2.vercel.app"
```

---

**문서 버전**: 1.0
**작성일**: 2025-11-19
**대상**: Git 브랜치 초보자
**다음 단계**: 실제 Naver 스크래퍼 구현 (NAVER_MIGRATION_PLAN.md 참조)
