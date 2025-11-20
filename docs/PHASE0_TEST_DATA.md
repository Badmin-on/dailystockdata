# Phase 0: Test Data Summary

## Selected Test Stocks (10 stocks)

Diverse stocks selected for consensus calculation testing with complete 2024-2025 data.

### Distribution
- **HIGH_GROWTH**: 2 stocks (EPS growth > 50%)
- **NORMAL_GROWTH**: 4 stocks (EPS growth 10-50%)
- **DECLINE**: 2 stocks (Negative EPS growth)
- **TURNAROUND**: 1 stock (Deficit → Profit)
- **DEFICIT**: 1 stock (Both years deficit)

---

## Test Stock Details

### 1. GS리테일 (007070) - HIGH_GROWTH
- **Category**: Growth with de-rating
- **EPS 2024**: 25원 → **EPS 2025**: 1,672원 (+6588%)
- **PER 2024**: 666.89배 → **PER 2025**: 12.92배 (-98.06%)
- **Test Focus**: Extreme growth rate handling, PER normalization

### 2. 디아이 (003160) - HIGH_GROWTH
- **Category**: Growth with de-rating
- **EPS 2024**: 39원 → **EPS 2025**: 919원 (+2256%)
- **PER 2024**: 374.11배 → **PER 2025**: 28.35배 (-92.42%)
- **Test Focus**: High growth rate, PER compression

### 3. LS (006260) - NORMAL_GROWTH
- **Category**: Growth with re-rating
- **EPS 2024**: 7,371원 → **EPS 2025**: 10,986원 (+49%)
- **PER 2024**: 12.79배 → **PER 2025**: 17.48배 (+37%)
- **Test Focus**: Balanced growth scenario (Q1 quadrant)

### 4. 카페24 (042000) - NORMAL_GROWTH
- **Category**: Growth with de-rating
- **EPS 2024**: 1,066원 → **EPS 2025**: 1,579원 (+48%)
- **PER 2024**: 31.80배 → **PER 2025**: 20.17배 (-37%)
- **Test Focus**: Healthy growth scenario (Q2 quadrant - target zone)

### 5. 알테오젠 (196170) - NORMAL_GROWTH
- **Category**: Growth with re-rating
- **EPS 2024**: 1,171원 → **EPS 2025**: 1,725원 (+47%)
- **PER 2024**: 264.19배 → **PER 2025**: 324.07배 (+23%)
- **Test Focus**: High valuation stocks, biotech sector

### 6. 산일전기 (004770) - NORMAL_GROWTH
- **Category**: Growth with re-rating
- **EPS 2024**: 3,214원 → **EPS 2025**: 4,646원 (+45%)
- **PER 2024**: 21.35배 → **PER 2025**: 29.77배 (+39%)
- **Test Focus**: Moderate growth with valuation expansion

### 7. HS효성첨단소재 (298050) - DECLINE
- **Category**: Decline with extreme re-rating
- **EPS 2024**: 11,124원 → **EPS 2025**: 316원 (-97%)
- **PER 2024**: 15.70배 → **PER 2025**: 629.09배 (+3907%)
- **Test Focus**: Extreme decline, PER explosion (Q3 quadrant)

### 8. 대우건설 (047040) - DECLINE
- **Category**: Decline with extreme re-rating
- **EPS 2024**: 563원 → **EPS 2025**: 17원 (-97%)
- **PER 2024**: 5.51배 → **PER 2025**: 204.99배 (+3620%)
- **Test Focus**: Severe decline handling (Q3 quadrant)

### 9. SK (034730) - TURNAROUND ⭐
- **Category**: Turnaround (deficit to major profit)
- **EPS 2024**: -17,618원 → **EPS 2025**: 35,156원
- **PER 2024**: N/A → **PER 2025**: TBD
- **Test Focus**: Major turnaround detection, negative EPS handling

### 10. 롯데케미칼 (011170) - DEFICIT ⚠️
- **Category**: Persistent deficit (improving)
- **EPS 2024**: -39,988원 → **EPS 2025**: -20,322원
- **PER 2024**: N/A → **PER 2025**: -3.97배
- **Test Focus**: Deficit stock handling, negative PER, improvement tracking

---

## Quadrant Distribution (Expected)

Based on EPS growth and PER growth:

### Q1 (Growth + Re-rating)
- LS (006260)
- 알테오젠 (196170)
- 산일전기 (004770)

### Q2 (Growth + De-rating) ⭐ Target Zone
- GS리테일 (007070)
- 디아이 (003160)
- 카페24 (042000)

### Q3 (Decline + Re-rating)
- HS효성첨단소재 (298050)
- 대우건설 (047040)

### Q4 (Decline + De-rating)
- *(None selected - least attractive scenario)*

### Edge Cases
- SK (034730) - TURNAROUND
- 롯데케미칼 (011170) - DEFICIT

---

## Validation Criteria

All test stocks must:
1. ✅ Have complete 2024-2025 data
2. ✅ Represent diverse growth scenarios
3. ✅ Include edge cases (turnaround, deficit)
4. ✅ Cover different valuation levels (PER 5-600+)
5. ✅ Include both large and small companies

---

## Test Coverage

### Calculation Engine Tests
- ✅ Normal growth (10-50%)
- ✅ High growth (>50%)
- ✅ Negative growth
- ✅ Extreme PER values (>600)
- ✅ Turnaround scenarios
- ✅ Deficit scenarios

### Metric Calculation Tests
- **FVB Score**: Test with various EPS/PER ratio combinations
- **HGS Score**: Healthy growth detection (Q2 quadrant)
- **RRS Score**: Re-rating risk assessment
- **Quadrant Assignment**: All 4 quadrants + edge cases

### Edge Case Tests
- **Deficit Stocks**: Handle negative EPS
- **Turnaround Stocks**: Deficit → profit transition
- **Extreme Values**: PER >600, EPS growth >1000%
- **Low EPS**: Very small EPS values (<100원)

---

## Next Steps (Phase 1)

With test data prepared, proceed to:
1. Create DB schema (consensus_metric_daily, consensus_diff_log)
2. Implement calculation engine
3. Test calculations on these 10 stocks
4. Validate results manually

---

## Notes

- **Data Source**: financial_data_extended table
- **Year Range**: 2024 (actual) → 2025 (estimate)
- **Selection Date**: 2025-11-19
- **Total Candidates**: 872 stocks with complete data
- **Selection Criteria**: Diversity of scenarios and edge cases

---

*Generated during Phase 0: Preparation*
