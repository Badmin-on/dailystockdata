# ============================================
# 수집 후 데이터 검증 스크립트
# ============================================

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        데이터 수집 후 검증 시작                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. 수집 전 상태 로드
Write-Host "📊 1. 수집 전/후 상태 비교..." -ForegroundColor Yellow

$beforeFile = "data-status-before-collection.json"
if (Test-Path $beforeFile) {
    $before = Get-Content $beforeFile | ConvertFrom-Json
    Write-Host "  ✅ 수집 전 상태 로드 완료" -ForegroundColor Green
}
else {
    Write-Host "  ⚠️ 수집 전 상태 파일 없음" -ForegroundColor Yellow
    $before = $null
}

# 2. 현재 상태 조회
try {
    $afterResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/data-status" -Method Get -UseBasicParsing
    $after = $afterResponse.Content | ConvertFrom-Json
    $after | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Out-File "data-status-after-collection.json"
    Write-Host "  ✅ 수집 후 상태 저장 완료" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ 데이터 상태 조회 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. 비교 분석
if ($before) {
    Write-Host "📈 2. 변화량 분석..." -ForegroundColor Yellow
    Write-Host ""

    $companyDiff = $after.overall.total_companies - $before.overall.total_companies
    $financialDiff = $after.overall.total_financial_records - $before.overall.total_financial_records
    $priceDiff = $after.overall.total_price_records - $before.overall.total_price_records
    $companiesWithPricesDiff = $after.overall.companies_with_prices - $before.overall.companies_with_prices

    Write-Host "  총 기업 수:" -NoNewline
    Write-Host "  $($before.overall.total_companies) → $($after.overall.total_companies)" -NoNewline
    if ($companyDiff -ne 0) { Write-Host " (+$companyDiff)" -ForegroundColor Green } else { Write-Host " (변화 없음)" -ForegroundColor Gray }

    Write-Host "  재무 데이터:" -NoNewline
    Write-Host " $($before.overall.total_financial_records) → $($after.overall.total_financial_records)" -NoNewline
    if ($financialDiff -ne 0) { Write-Host " (+$financialDiff)" -ForegroundColor Green } else { Write-Host " (변화 없음)" -ForegroundColor Gray }

    Write-Host "  주가 데이터:" -NoNewline
    Write-Host " $($before.overall.total_price_records) → $($after.overall.total_price_records)" -NoNewline
    if ($priceDiff -gt 0) { Write-Host " (+$priceDiff)" -ForegroundColor Green } else { Write-Host " (변화 없음)" -ForegroundColor Red }

    Write-Host "  주가 보유 기업:" -NoNewline
    Write-Host " $($before.overall.companies_with_prices) → $($after.overall.companies_with_prices)" -NoNewline
    if ($companiesWithPricesDiff -gt 0) { Write-Host " (+$companiesWithPricesDiff)" -ForegroundColor Green } else { Write-Host " (변화 없음)" -ForegroundColor Red }

    Write-Host ""

    # 기대값 검증
    $expectedCompaniesWithPrices = 1788  # 전체 기업 수
    $actualCoverage = [math]::Round(($after.overall.companies_with_prices / 1788) * 100, 1)

    Write-Host "📊 3. 목표 달성률..." -ForegroundColor Yellow
    Write-Host "  목표: 1,788개 기업 (100%)"
    Write-Host "  실제: $($after.overall.companies_with_prices)개 기업 ($actualCoverage%)" -NoNewline

    if ($actualCoverage -ge 95) {
        Write-Host " ✅ 목표 달성!" -ForegroundColor Green
    }
    elseif ($actualCoverage -ge 80) {
        Write-Host " ⚠️ 거의 달성 (80% 이상)" -ForegroundColor Yellow
    }
    else {
        Write-Host " ❌ 추가 수집 필요 (80% 미만)" -ForegroundColor Red
    }

    Write-Host ""
}

# 4. 데이터 품질 검증
Write-Host "🔍 4. 데이터 품질 검증..." -ForegroundColor Yellow

$avgPricesPerCompany = $after.overall.avg_prices_per_company
Write-Host "  평균 주가 데이터 수: $avgPricesPerCompany일치" -NoNewline

if ($avgPricesPerCompany -ge 120) {
    Write-Host " ✅ 120일 이평선 분석 가능" -ForegroundColor Green
}
elseif ($avgPricesPerCompany -ge 60) {
    Write-Host " ⚠️ 60일 이평선 분석 가능 (120일 권장)" -ForegroundColor Yellow
}
else {
    Write-Host " ❌ 추가 수집 필요 (120일 미만)" -ForegroundColor Red
}

Write-Host "  120일 준비 기업: $($after.overall.estimated_companies_with_120day)개 ($($after.collection_progress.estimated_ma120_ready_rate))"
Write-Host ""

# 5. 투자 분석 가능 여부
Write-Host "🎯 5. 투자 분석 준비 상태..." -ForegroundColor Yellow

if ($after.collection_progress.can_analyze_investments) {
    Write-Host "  ✅ 투자 기회 분석 가능" -ForegroundColor Green
}
else {
    Write-Host "  ❌ 투자 기회 분석 불가 (View 갱신 필요)" -ForegroundColor Red
}

Write-Host ""

# 6. 최종 권장 사항
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║              최종 권장 사항                        ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Magenta

if ($actualCoverage -ge 95 -and $avgPricesPerCompany -ge 120) {
    Write-Host ""
    Write-Host "✅ 모든 검증 통과! 다음 단계:" -ForegroundColor Green
    Write-Host "  1. View 갱신: Invoke-WebRequest -Method POST http://localhost:3000/api/refresh-views" -ForegroundColor White
    Write-Host "  2. 모니터링 페이지 확인: http://localhost:3000/monitor" -ForegroundColor White
    Write-Host "  3. 투자 기회 분석: http://localhost:3000/opportunities" -ForegroundColor White
}
elseif ($actualCoverage -lt 80) {
    Write-Host ""
    Write-Host "⚠️ 주가 데이터 수집 부족 (80% 미만)" -ForegroundColor Yellow
    Write-Host "  추가 수집 필요한 배치 확인 후 재실행 권장" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "✅ 수집 완료! View 갱신 후 사용 가능" -ForegroundColor Green
    Write-Host "  Invoke-WebRequest -Method POST http://localhost:3000/api/refresh-views" -ForegroundColor White
}

Write-Host ""
