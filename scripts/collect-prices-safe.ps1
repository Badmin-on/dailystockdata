# ============================================
# YoonStock Pro - 안전한 주가 데이터 배치 수집 스크립트 (PowerShell)
# ============================================

param(
    [int]$StartBatch = 1,
    [int]$EndBatch = 18,
    [int]$WaitSeconds = 60
)

# 설정
$ApiUrl = "http://localhost:3000/api/collect-stock-prices/batch"
$LogFile = "collection-log-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"

# 로그 함수
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

# 진행률 바 함수
function Show-Progress {
    param($Current, $Total)
    $percent = [math]::Round(($Current / $Total) * 100, 0)
    Write-Progress -Activity "배치 수집 진행 중" -Status "$Current/$Total 완료 ($percent%)" -PercentComplete $percent
}

# 배치 수집 함수
function Invoke-BatchCollection {
    param($BatchNumber, $RetryCount = 3)

    for ($attempt = 1; $attempt -le $RetryCount; $attempt++) {
        Write-Log "📦 배치 $BatchNumber 수집 시작 (시도 $attempt/$RetryCount)"

        try {
            $response = Invoke-WebRequest -Uri "$ApiUrl`?batch=$BatchNumber" -Method Get -UseBasicParsing

            if ($response.StatusCode -eq 200) {
                $data = $response.Content | ConvertFrom-Json
                $successCount = $data.success_count
                $errorCount = $data.error_count

                Write-Log "✅ 배치 $BatchNumber 완료: 성공 $successCount개, 실패 $errorCount개"
                return $true
            }
        }
        catch {
            Write-Log "❌ 배치 $BatchNumber 실패: $($_.Exception.Message)"
            if ($attempt -lt $RetryCount) {
                Write-Log "⏳ 5초 후 재시도..."
                Start-Sleep -Seconds 5
            }
        }
    }

    Write-Log "🚨 배치 $BatchNumber 최종 실패 ($RetryCount회 시도)"
    return $false
}

# 메인 실행
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   YoonStock Pro - 주가 데이터 배치 수집 시작     ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

Write-Log "📊 수집 범위: 배치 $StartBatch ~ $EndBatch"
Write-Log "📦 배치당 기업 수: 100개"
Write-Log "📝 로그 파일: $LogFile"
Write-Log "⏱️  배치 간 대기: $WaitSeconds초"
Write-Host ""

$startTime = Get-Date
$successBatches = 0
$failedBatches = 0
$consecutiveFailures = 0

# 배치 수집 시작
for ($batch = $StartBatch; $batch -le $EndBatch; $batch++) {
    Show-Progress -Current ($batch - 1) -Total $EndBatch

    if (Invoke-BatchCollection -BatchNumber $batch) {
        $successBatches++
        $consecutiveFailures = 0
    }
    else {
        $failedBatches++
        $consecutiveFailures++

        # 3번 연속 실패 시 중단
        if ($consecutiveFailures -ge 3) {
            Write-Log "🚨 3번 연속 실패로 수집 중단"
            break
        }
    }

    # 마지막 배치가 아니면 대기
    if ($batch -lt $EndBatch) {
        Write-Log "⏳ $WaitSeconds초 대기 중..."
        Start-Sleep -Seconds $WaitSeconds
    }

    Write-Host ""
}

# 최종 진행률
Show-Progress -Current $successBatches -Total $EndBatch
Write-Progress -Activity "배치 수집 진행 중" -Completed

# 종료 시간 및 통계
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║              수집 작업 완료                        ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Log "✅ 성공 배치: $successBatches/$EndBatch"
Write-Log "❌ 실패 배치: $failedBatches/$EndBatch"
Write-Log "⏱️  소요 시간: $($duration.Minutes)분 $($duration.Seconds)초"
Write-Log "📝 상세 로그: $LogFile"

# 다음 단계 안내
Write-Host ""
Write-Host "🎯 다음 단계:" -ForegroundColor Green
Write-Host "1. 로그 확인: Get-Content $LogFile"
Write-Host "2. 데이터 상태 확인: Invoke-WebRequest http://localhost:3000/api/data-status"
Write-Host "3. View 갱신: Invoke-WebRequest -Method POST http://localhost:3000/api/refresh-views"
Write-Host "4. 모니터링 페이지: http://localhost:3000/monitor"
Write-Host ""

# ============================================
# 추가 작업: 2026 전망 데이터 수집 및 계산
# ============================================
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        2026 전망 데이터 수집 및 계산 시작          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# 1. FnGuide Scraper 실행
Write-Log "🚀 FnGuide 데이터 수집 시작 (2026/2027 전망)..."
try {
    npx tsx scripts/scrape-all-fnguide.ts
    Write-Log "✅ FnGuide 데이터 수집 완료"
} catch {
    Write-Log "❌ FnGuide 데이터 수집 실패: $_"
}

# 2. Consensus Calculator 실행
Write-Log "🚀 컨센서스 지표 계산 시작 (Future-Proof)..."
try {
    npx tsx scripts/calculate-consensus-batch.ts
    Write-Log "✅ 컨센서스 지표 계산 완료"
} catch {
    Write-Log "❌ 컨센서스 지표 계산 실패: $_"
}

Write-Host ""

# 결과 반환
if ($failedBatches -gt 0) {
    Write-Host "⚠️ 일부 배치 수집 실패. 로그를 확인하세요." -ForegroundColor Yellow
    exit 1
}
else {
    Write-Host "✅ 모든 배치 수집 성공!" -ForegroundColor Green
    exit 0
}
