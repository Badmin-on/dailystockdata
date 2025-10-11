# ============================================
# YoonStock Pro - Safe Batch Collection Script (English)
# ============================================

param(
    [int]$StartBatch = 1,
    [int]$EndBatch = 18,
    [int]$WaitSeconds = 60
)

# Configuration
$ApiUrl = "http://localhost:3000/api/collect-stock-prices/batch"
$LogFile = "collection-log-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"

# Log function
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

# Progress bar function
function Show-Progress {
    param($Current, $Total)
    $percent = [math]::Round(($Current / $Total) * 100, 0)
    Write-Progress -Activity "Batch Collection Progress" -Status "$Current/$Total completed ($percent%)" -PercentComplete $percent
}

# Batch collection function
function Invoke-BatchCollection {
    param($BatchNumber, $RetryCount = 3)

    for ($attempt = 1; $attempt -le $RetryCount; $attempt++) {
        Write-Log "[START] Batch $BatchNumber collection (Attempt $attempt/$RetryCount)"

        try {
            $response = Invoke-WebRequest -Uri "$ApiUrl`?batch=$BatchNumber" -Method Get -UseBasicParsing

            if ($response.StatusCode -eq 200) {
                $data = $response.Content | ConvertFrom-Json
                $successCount = $data.success_count
                $errorCount = $data.error_count

                Write-Log "[SUCCESS] Batch $BatchNumber completed: $successCount success, $errorCount errors"
                return $true
            }
        }
        catch {
            Write-Log "[ERROR] Batch $BatchNumber failed: $($_.Exception.Message)"
            if ($attempt -lt $RetryCount) {
                Write-Log "[RETRY] Retrying in 5 seconds..."
                Start-Sleep -Seconds 5
            }
        }
    }

    Write-Log "[FAILED] Batch $BatchNumber failed after $RetryCount attempts"
    return $false
}

# Main execution
Write-Host "========================================" -ForegroundColor Magenta
Write-Host " YoonStock Pro - Batch Collection" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

Write-Log "[CONFIG] Batch range: $StartBatch ~ $EndBatch"
Write-Log "[CONFIG] Companies per batch: 100"
Write-Log "[CONFIG] Log file: $LogFile"
Write-Log "[CONFIG] Wait between batches: $WaitSeconds seconds"
Write-Host ""

$startTime = Get-Date
$successBatches = 0
$failedBatches = 0
$consecutiveFailures = 0

# Start batch collection
for ($batch = $StartBatch; $batch -le $EndBatch; $batch++) {
    Show-Progress -Current ($batch - 1) -Total $EndBatch

    if (Invoke-BatchCollection -BatchNumber $batch) {
        $successBatches++
        $consecutiveFailures = 0
    }
    else {
        $failedBatches++
        $consecutiveFailures++

        # Stop after 3 consecutive failures
        if ($consecutiveFailures -ge 3) {
            Write-Log "[ABORT] Stopped after 3 consecutive failures"
            break
        }
    }

    # Wait if not the last batch
    if ($batch -lt $EndBatch) {
        Write-Log "[WAIT] Waiting $WaitSeconds seconds..."
        Start-Sleep -Seconds $WaitSeconds
    }

    Write-Host ""
}

# Final progress
Show-Progress -Current $successBatches -Total $EndBatch
Write-Progress -Activity "Batch Collection Progress" -Completed

# End time and statistics
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "       Collection Completed" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Log "[RESULT] Success: $successBatches/$EndBatch"
Write-Log "[RESULT] Failed: $failedBatches/$EndBatch"
Write-Log "[RESULT] Duration: $($duration.Minutes)m $($duration.Seconds)s"
Write-Log "[RESULT] Log file: $LogFile"

# Next steps
Write-Host ""
Write-Host "[NEXT STEPS]" -ForegroundColor Green
Write-Host "1. Check log: Get-Content $LogFile"
Write-Host "2. Check status: Invoke-WebRequest http://localhost:3000/api/data-status"
Write-Host "3. Refresh views: Invoke-WebRequest -Method POST http://localhost:3000/api/refresh-views"
Write-Host "4. Open monitor: http://localhost:3000/monitor"
Write-Host ""

# Return result
if ($failedBatches -gt 0) {
    Write-Host "[WARNING] Some batches failed. Check the log." -ForegroundColor Yellow
    exit 1
}
else {
    Write-Host "[SUCCESS] All batches collected successfully!" -ForegroundColor Green
    exit 0
}
