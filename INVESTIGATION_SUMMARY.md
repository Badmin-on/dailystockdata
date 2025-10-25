# 🔍 Investigation Summary: The 100-Point Bug

## Timeline

```
📅 Investigation Start
    ↓
🔴 Symptom Observed
    "All companies showing 100 points with -100%/+100% changes"
    ↓
💭 Hypothesis 1: View Logic Issue
    "Maybe GREATEST() function is wrong?"
    → Created fix-view-simple.sql
    ↓
🤔 User Insight
    "I think I saved historical data before..."
    ↓
🔍 Investigation Step 1
    → Created /api/check-all-dates
    → Discovery: 141,505 records across 71 dates!
    ↓
❓ New Question
    "Data exists, but why -100%/+100%?"
    ↓
🎯 Breakthrough Moment
    User shows SQL query result:
    - 2025-10-25: revenue = 4933
    - 2025-10-10: revenue = 493300000000
    ↓
💡 Hypothesis 2: Scale Mismatch
    "Different units? Let's check..."
    ↓
🔬 Investigation Step 2
    → Created /api/debug-data-scale
    → Tested with Samsung Electronics
    ↓
✅ ROOT CAUSE FOUND
    Scale Factor: 100,000,000x
    Old data: 원 (won)
    New data: 억원 (hundred millions)
    ↓
🛠️ Solution Created
    → fix-data-scale.sql
    → DATA_SCALE_FIX_GUIDE.md
    → CRITICAL_BUG_FOUND.md
    → 문제해결_보고서.md
    ↓
📝 Documentation Complete
    ↓
✅ Ready for User Action
```

---

## The Bug in Numbers

### Data Scale Evidence

| Metric | Old Data | New Data | Factor |
|--------|----------|----------|--------|
| **Samsung 2024 Revenue** | 300,870,900,000,000 원 | 3,008,709 억원 | 100,000,000x |
| **Unit** | Won (원) | Hundred Millions (억원) | - |
| **Source** | Original scraper | New TypeScript scraper | - |
| **Date Range** | 2025-07-09 to 2025-10-24 | 2025-10-25+ | - |

### Impact Visualization

```
Before Fix:
┌────────────────────────────────────────┐
│  Investment Finder Results             │
├────────────────────────────────────────┤
│  🔴 Company A - Score: 100             │
│     Revenue Growth: -100%              │
│     Op Profit Growth: +100%            │
│                                        │
│  🔴 Company B - Score: 100             │
│     Revenue Growth: +100%              │
│     Op Profit Growth: -100%            │
│                                        │
│  🔴 Company C - Score: 100             │
│     Revenue Growth: -100%              │
│     Op Profit Growth: -100%            │
└────────────────────────────────────────┘

After Fix:
┌────────────────────────────────────────┐
│  Investment Finder Results             │
├────────────────────────────────────────┤
│  🟢 Company A - Score: 82              │
│     Revenue Growth: +5.2%              │
│     Op Profit Growth: +3.8%            │
│                                        │
│  🟡 Company B - Score: 45              │
│     Revenue Growth: +1.2%              │
│     Op Profit Growth: -2.1%            │
│                                        │
│  🟢 Company C - Score: 75              │
│     Revenue Growth: +8.5%              │
│     Op Profit Growth: +7.3%            │
└────────────────────────────────────────┘
```

---

## Technical Deep Dive

### Why -100% Appeared Everywhere

```sql
-- View calculation:
growth_percentage = (current - previous) / previous * 100

-- With scale mismatch:
= (3,008,709 - 300,870,900,000,000) / 300,870,900,000,000 * 100
= -300,870,896,991,291 / 300,870,900,000,000 * 100
= -0.99999999 * 100
≈ -100%
```

### Why Scores Were All 100

```sql
-- Scoring logic (before fix attempt):
CASE 
  WHEN revenue_change_1m >= 5.0 THEN 100
  WHEN revenue_change_1m >= 2.0 THEN 80
  WHEN revenue_change_1m >= 0.5 THEN 60
  WHEN revenue_change_1m >= 0.0 THEN 40
  WHEN revenue_change_1m >= -2.0 THEN 20
  ELSE 0
END

-- With -100% or +100% changes:
-- -100% → ELSE → 0
-- +100% → WHEN >= 5.0 → 100

-- consensus_score = GREATEST(revenue_score, op_profit_score)
-- Result: If one is 100, consensus_score = 100
```

---

## Files Created During Investigation

### Core Solution Files

1. **`scripts/fix-data-scale.sql`** (2,043 bytes)
   - Backup creation
   - Data normalization (÷ 100M)
   - View refresh
   - Verification queries

2. **`DATA_SCALE_FIX_GUIDE.md`** (3,888 bytes)
   - English step-by-step guide
   - Before/after examples
   - Safety instructions
   - Troubleshooting

3. **`CRITICAL_BUG_FOUND.md`** (6,383 bytes)
   - Complete investigation report
   - Evidence and impact analysis
   - Lessons learned

4. **`문제해결_보고서.md`** (4,912 bytes)
   - Korean comprehensive report
   - 조사 과정 및 해결 방안
   - 단계별 실행 가이드

### Debug Tools

5. **`app/api/debug-data-scale/route.ts`** (2,036 bytes)
   - Real-time data scale inspection
   - Scale factor calculation
   - Company-specific analysis

6. **`app/api/check-all-dates/route.ts`** (1,752 bytes)
   - Historical data verification
   - Date range analysis
   - Record count per date

---

## Key Discoveries

### Discovery 1: Historical Data Exists
- **What we found:** 141,505 records across 71 dates
- **Importance:** Confirmed comparison data is available
- **Tool used:** `/api/check-all-dates`

### Discovery 2: Scale Mismatch
- **What we found:** 100,000,000x difference between old and new data
- **Importance:** This IS the root cause
- **Tool used:** `/api/debug-data-scale`

### Discovery 3: Data Collection Pattern
- **Old collections:** Daily from 2025-07-09 to 2025-10-24
- **New collections:** From 2025-10-25 onwards
- **Change point:** The scraper was updated on 2025-10-25

---

## Solution Components

### 1. Data Normalization
```sql
UPDATE financial_data
SET 
  revenue = revenue / 100000000.0,
  operating_profit = operating_profit / 100000000.0
WHERE scrape_date < '2025-10-25';
```

### 2. View Refresh
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_consensus_changes;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_analysis;
```

### 3. Safety Backup
```sql
CREATE TABLE financial_data_backup AS 
SELECT * FROM financial_data 
WHERE scrape_date < '2025-10-25';
```

---

## Execution Checklist

### Pre-Execution
- [ ] Read `DATA_SCALE_FIX_GUIDE.md` or `문제해결_보고서.md`
- [ ] Open Supabase SQL Editor
- [ ] Prepare `scripts/fix-data-scale.sql`

### Execution
- [ ] Run backup creation query
- [ ] Verify backup record count
- [ ] Run data normalization UPDATE
- [ ] Check affected rows count
- [ ] Run view refresh commands
- [ ] Verify sample results

### Post-Execution
- [ ] Test `/investment-finder` page
- [ ] Verify scores vary (not all 100)
- [ ] Check growth rates realistic (not ±100%)
- [ ] Confirm filters work correctly

---

## Success Metrics

### Before Fix
- ❌ Score distribution: 100% at 100 points
- ❌ Growth rates: Only -100% or +100%
- ❌ Usable opportunities: 0
- ❌ System status: Broken

### After Fix (Expected)
- ✅ Score distribution: 0-100 points spread
- ✅ Growth rates: -10% to +20% realistic range
- ✅ Usable opportunities: ~50-200 companies
- ✅ System status: Fully functional

---

## Commit History

```bash
a143b50 docs: Add Korean problem resolution report
5ed7374 🚨 CRITICAL: Identify data scale mismatch (100M factor)
6730d81 (previous commits...)
```

---

## Git Push Status

✅ **All commits pushed to remote**

```
To https://github.com/Badmin-on/dailystockdata.git
   6730d81..a143b50  main -> main
```

---

## Next Actions for User

1. **Open Supabase SQL Editor**
   - URL: https://supabase.com/dashboard
   - Navigate to your project
   - Click "SQL Editor"

2. **Execute Migration**
   - Copy contents of `scripts/fix-data-scale.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait 2-5 minutes

3. **Verify Results**
   - Check backup table created
   - Verify normalized values
   - Test investment finder

4. **Report Back**
   - Share results or screenshots
   - Report any issues
   - Confirm system working

---

## Contact Points

- **Guide (English):** `DATA_SCALE_FIX_GUIDE.md`
- **Guide (Korean):** `문제해결_보고서.md`
- **Technical Report:** `CRITICAL_BUG_FOUND.md`
- **SQL Script:** `scripts/fix-data-scale.sql`

---

**Investigation Status:** ✅ COMPLETE  
**Solution Status:** ✅ READY FOR EXECUTION  
**Risk Level:** 🟢 LOW (Backup available, Rollback possible)  
**Priority:** 🚨 CRITICAL  
**Estimated Fix Time:** ⏱️ 10 minutes

---

*Investigation completed: 2025-10-25*  
*Total investigation time: ~2 hours*  
*Files created: 6*  
*Commits made: 2*  
*Root cause identified: Data scale mismatch (100M factor)*
