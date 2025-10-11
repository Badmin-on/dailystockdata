# ============================================
# Post-Collection Validation Script (English)
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Post-Collection Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Load before state
Write-Host "[1] Comparing before/after states..." -ForegroundColor Yellow

$beforeFile = "data-status-before-collection.json"
if (Test-Path $beforeFile) {
    $before = Get-Content $beforeFile | ConvertFrom-Json
    Write-Host "  [OK] Before state loaded" -ForegroundColor Green
}
else {
    Write-Host "  [WARN] Before state file not found" -ForegroundColor Yellow
    $before = $null
}

# 2. Get current state
try {
    $afterResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/data-status" -Method Get -UseBasicParsing
    $after = $afterResponse.Content | ConvertFrom-Json
    $after | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Out-File "data-status-after-collection.json"
    Write-Host "  [OK] After state saved" -ForegroundColor Green
}
catch {
    Write-Host "  [ERROR] Failed to get data status: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Compare changes
if ($before) {
    Write-Host "[2] Change Analysis..." -ForegroundColor Yellow
    Write-Host ""

    $companyDiff = $after.overall.total_companies - $before.overall.total_companies
    $financialDiff = $after.overall.total_financial_records - $before.overall.total_financial_records
    $priceDiff = $after.overall.total_price_records - $before.overall.total_price_records
    $companiesWithPricesDiff = $after.overall.companies_with_prices - $before.overall.companies_with_prices

    Write-Host "  Total Companies:" -NoNewline
    Write-Host "  $($before.overall.total_companies) -> $($after.overall.total_companies)" -NoNewline
    if ($companyDiff -ne 0) { Write-Host " (+$companyDiff)" -ForegroundColor Green } else { Write-Host " (no change)" -ForegroundColor Gray }

    Write-Host "  Financial Data:" -NoNewline
    Write-Host " $($before.overall.total_financial_records) -> $($after.overall.total_financial_records)" -NoNewline
    if ($financialDiff -ne 0) { Write-Host " (+$financialDiff)" -ForegroundColor Green } else { Write-Host " (no change)" -ForegroundColor Gray }

    Write-Host "  Price Data:" -NoNewline
    Write-Host " $($before.overall.total_price_records) -> $($after.overall.total_price_records)" -NoNewline
    if ($priceDiff -gt 0) { Write-Host " (+$priceDiff)" -ForegroundColor Green } else { Write-Host " (no change)" -ForegroundColor Red }

    Write-Host "  Companies with Prices:" -NoNewline
    Write-Host " $($before.overall.companies_with_prices) -> $($after.overall.companies_with_prices)" -NoNewline
    if ($companiesWithPricesDiff -gt 0) { Write-Host " (+$companiesWithPricesDiff)" -ForegroundColor Green } else { Write-Host " (no change)" -ForegroundColor Red }

    Write-Host ""

    # Target validation
    $expectedCompaniesWithPrices = 1788
    $actualCoverage = [math]::Round(($after.overall.companies_with_prices / 1788) * 100, 1)

    Write-Host "[3] Target Achievement..." -ForegroundColor Yellow
    Write-Host "  Target: 1,788 companies (100%)"
    Write-Host "  Actual: $($after.overall.companies_with_prices) companies ($actualCoverage%)" -NoNewline

    if ($actualCoverage -ge 95) {
        Write-Host " [SUCCESS] Target achieved!" -ForegroundColor Green
    }
    elseif ($actualCoverage -ge 80) {
        Write-Host " [GOOD] Almost achieved (80%+)" -ForegroundColor Yellow
    }
    else {
        Write-Host " [WARN] Need more collection (<80%)" -ForegroundColor Red
    }

    Write-Host ""
}

# 4. Data quality validation
Write-Host "[4] Data Quality Check..." -ForegroundColor Yellow

$avgPricesPerCompany = $after.overall.avg_prices_per_company
Write-Host "  Avg price data: $avgPricesPerCompany days" -NoNewline

if ($avgPricesPerCompany -ge 120) {
    Write-Host " [OK] 120-day MA analysis available" -ForegroundColor Green
}
elseif ($avgPricesPerCompany -ge 60) {
    Write-Host " [WARN] 60-day MA available (120-day recommended)" -ForegroundColor Yellow
}
else {
    Write-Host " [ERROR] Need more data (<120 days)" -ForegroundColor Red
}

Write-Host "  120-day ready companies: $($after.overall.estimated_companies_with_120day) ($($after.collection_progress.estimated_ma120_ready_rate))"
Write-Host ""

# 5. Investment analysis readiness
Write-Host "[5] Investment Analysis Status..." -ForegroundColor Yellow

if ($after.collection_progress.can_analyze_investments) {
    Write-Host "  [OK] Investment opportunity analysis available" -ForegroundColor Green
}
else {
    Write-Host "  [ERROR] Investment analysis unavailable (need view refresh)" -ForegroundColor Red
}

Write-Host ""

# 6. Final recommendations
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "       Recommendations" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

if ($actualCoverage -ge 95 -and $avgPricesPerCompany -ge 120) {
    Write-Host ""
    Write-Host "[SUCCESS] All validations passed! Next steps:" -ForegroundColor Green
    Write-Host "  1. Refresh views: Invoke-WebRequest -Method POST http://localhost:3000/api/refresh-views" -ForegroundColor White
    Write-Host "  2. Check monitor: http://localhost:3000/monitor" -ForegroundColor White
    Write-Host "  3. Analyze opportunities: http://localhost:3000/opportunities" -ForegroundColor White
}
elseif ($actualCoverage -lt 80) {
    Write-Host ""
    Write-Host "[WARN] Price data collection insufficient (<80%)" -ForegroundColor Yellow
    Write-Host "  Additional collection recommended" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "[SUCCESS] Collection completed! Ready after view refresh" -ForegroundColor Green
    Write-Host "  Invoke-WebRequest -Method POST http://localhost:3000/api/refresh-views" -ForegroundColor White
}

Write-Host ""
