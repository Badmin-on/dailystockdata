# Single Batch Test Script (English Version)
# Test batch 1 collection

Write-Host "Testing Batch 1 Collection..." -ForegroundColor Cyan
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
        Write-Host "[SUCCESS] Test passed! Safe to proceed with full collection." -ForegroundColor Green
        Write-Host ""
        Write-Host "Next step - Run full collection:" -ForegroundColor Cyan
        Write-Host "  .\scripts\collect-prices-safe-en.ps1" -ForegroundColor White
    }
}
catch {
    Write-Host "[ERROR] Test failed! Please check the error and try again." -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
