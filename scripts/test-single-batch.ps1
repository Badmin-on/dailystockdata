# 단일 배치 테스트 스크립트 (PowerShell)
# 배치 1번만 수집하여 정상 작동 확인

Write-Host "🧪 배치 1 테스트 수집 시작..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/collect-stock-prices/batch?batch=1" -Method Get -UseBasicParsing

    Write-Host "HTTP Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $data = $response.Content | ConvertFrom-Json
    $data | ConvertTo-Json -Depth 10
    Write-Host ""

    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 테스트 성공! 전체 수집을 진행해도 안전합니다." -ForegroundColor Green
        Write-Host ""
        Write-Host "다음 명령으로 전체 수집 시작:" -ForegroundColor Cyan
        Write-Host "  .\scripts\collect-prices-safe.ps1" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ 테스트 실패! 문제를 해결한 후 다시 시도하세요." -ForegroundColor Red
    Write-Host "오류: $($_.Exception.Message)" -ForegroundColor Red
}
