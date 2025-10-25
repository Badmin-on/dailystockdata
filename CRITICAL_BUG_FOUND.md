# 🚨 CRITICAL BUG IDENTIFIED - Data Scale Mismatch

## Executive Summary

**Problem:** All investment opportunities show 100 points with -100%/+100% consensus changes.

**Root Cause:** Data scale mismatch between old and new scraper output.

**Scale Difference:** **100,000,000x** (1억)

**Status:** ✅ **IDENTIFIED AND FIX READY**

---

## The Discovery

### What We Thought
Initially, we believed the problem was in the View logic using `GREATEST()` instead of averaging scores.

### What We Found
The REAL problem is **data unit inconsistency**:

**Old Scraper (before 2025-10-25):**
```javascript
// original-scripts/1_seoul_ys_fnguide.js
const revenue = parseFloat(revenueStr.replace(/,/g, ''));
// Stored raw FnGuide value in 원 (won)
// Example: 300,870,900,000,000
```

**New Scraper (2025-10-25+):**
```typescript
// lib/scraper-fnguide.ts
export interface FinancialYearData {
  revenue: number | null;  // 매출액 (억원) <- Comment says 억원!
}
const revenue = parseFloat(revenueStr.replace(/,/g, ''));
// Also stores raw value, but interprets as 억원
// Example: 3,008,709
```

### The Math That Breaks Everything

When the materialized view calculates consensus changes:

```sql
-- mv_consensus_changes view does:
(curr.revenue - prev.revenue) / prev.revenue * 100 as revenue_growth_1month

-- With mismatched scales:
(3,008,709 - 300,870,900,000,000) / 300,870,900,000,000 * 100
= -99.999999999%
≈ -100%
```

**Result:** Every comparison shows -100% or +100%, making all scores max out at 100.

---

## Evidence

### Samsung Electronics (005930) - 2024 Revenue

| Date | Revenue | Unit | Source |
|------|---------|------|--------|
| 2025-10-25 | 3,008,709 | 억원 | New scraper |
| 2025-10-23 | 3,008,709 | 억원 | New scraper |
| 2025-10-10 | 300,870,900,000,000 | 원 | Old scraper |
| 2025-09-30 | 300,870,900,000,000 | 원 | Old scraper |
| 2025-07-09 | 300,870,900,000,000 | 원 | Old scraper |

**Scale Factor:** `300,870,900,000,000 ÷ 3,008,709 = 100,000,000`

---

## Impact Analysis

### Affected Data
- **Total records:** 141,505
- **Old data (needs fix):** ~140,661 records (before 2025-10-25)
- **New data (correct):** ~844 records (2025-10-25+)
- **Date range:** 2025-07-09 to 2025-10-24

### Affected Features
1. ❌ **Investment Finder** - All companies show 100 points
2. ❌ **Consensus Changes** - All show -100% or +100%
3. ❌ **Growth Rates** - Completely inaccurate
4. ❌ **Historical Comparisons** - Unusable

---

## The Fix

### Solution: Normalize Old Data

**Divide old data by 100,000,000 to convert from 원 to 억원**

```sql
UPDATE financial_data
SET 
  revenue = revenue / 100000000.0,
  operating_profit = operating_profit / 100000000.0
WHERE scrape_date < '2025-10-25';

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consensus_changes;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;
```

### Why This Fix is Correct

1. **FnGuide displays in 억원** - Standard Korean financial reporting
2. **New scraper is documented correctly** - Comments say "억원"
3. **Original script stored raw values** - Without scale consideration
4. **One-time fix** - Future data will be consistent

### Safety Measures

```sql
-- Backup before fix
CREATE TABLE financial_data_backup AS 
SELECT * FROM financial_data 
WHERE scrape_date < '2025-10-25';

-- Rollback if needed
DELETE FROM financial_data WHERE scrape_date < '2025-10-25';
INSERT INTO financial_data SELECT * FROM financial_data_backup;
```

---

## Files Created for Fix

1. **`/scripts/fix-data-scale.sql`**
   - Complete migration script with backup
   - Verification queries
   - View refresh commands

2. **`/DATA_SCALE_FIX_GUIDE.md`**
   - Step-by-step user guide
   - Before/after examples
   - Troubleshooting tips

3. **`/app/api/debug-data-scale/route.ts`**
   - Debug API to inspect data scales
   - Shows scale factor calculation
   - Useful for verification

---

## Timeline of Investigation

1. **Initial symptom:** All companies score 100 points
2. **First hypothesis:** View logic using GREATEST() wrong
3. **User insight:** "I collected historical data before"
4. **Discovery:** 141,505 records across 71 dates exist!
5. **New hypothesis:** Maybe no comparison data?
6. **User provides:** SQL query showing actual values
7. **BREAKTHROUGH:** Scale difference visible in raw data
8. **Verification:** Created debug API, confirmed 100,000,000x factor
9. **Solution:** Normalize old data to 억원

---

## Expected Results After Fix

### Investment Finder Page

**Before Fix:**
```
🔴 Company A - Score: 100
   Revenue Growth 1M: -100%
   Op Profit Growth 1M: +100%
   
🔴 Company B - Score: 100
   Revenue Growth 1M: +100%
   Op Profit Growth 1M: -100%
```

**After Fix:**
```
🟢 Company A - Score: 75
   Revenue Growth 1M: +5.2%
   Op Profit Growth 1M: +3.8%
   
🟡 Company B - Score: 45
   Revenue Growth 1M: +1.2%
   Op Profit Growth 1M: -2.1%
   
🟢 Company C - Score: 82
   Revenue Growth 1M: +8.5%
   Op Profit Growth 1M: +7.3%
```

### Realistic Score Distribution

- **0-30 points:** Companies with declining consensus
- **30-60 points:** Companies with stable/mixed signals
- **60-80 points:** Companies with good improvement
- **80-100 points:** Companies with excellent growth

---

## Action Required

### For User

1. **Execute fix script in Supabase SQL Editor**
   - Open: https://supabase.com/dashboard
   - Navigate to SQL Editor
   - Run: `/scripts/fix-data-scale.sql`

2. **Verify results**
   - Check sample companies show realistic values
   - Confirm growth rates are reasonable
   - Test investment-finder page

3. **Report back**
   - Let me know if scores now vary (not all 100)
   - Share any issues encountered

### For Future

- ✅ All future data will be in 억원
- ✅ No more scale mismatches
- ✅ Consistent calculations in Views
- ✅ Accurate investment opportunities

---

## Lessons Learned

1. **Document data units clearly** - Always specify in comments and schemas
2. **Validate data consistency** - Check scale when migrating data sources
3. **Test with real data** - Synthetic data might not reveal unit issues
4. **Backup before migrations** - Always create safety nets
5. **Investigate thoroughly** - The obvious answer isn't always correct

---

**Status:** ✅ Bug identified, fix prepared, awaiting user execution

**Priority:** 🚨 CRITICAL - System unusable until fixed

**Estimated Fix Time:** 2-5 minutes to execute SQL script

**Risk Level:** LOW - Backup created, rollback available
