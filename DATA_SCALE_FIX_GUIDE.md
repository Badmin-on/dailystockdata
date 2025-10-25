# 🚨 Data Scale Mismatch - Critical Fix Required

## Problem Identified

After investigation, I discovered the **root cause** of why all companies show 100 points with -100%/+100% changes:

### Scale Mismatch Details

**Old Data (before 2025-10-25):**
- Stored in **원 (won)**
- Example: Samsung 2024 revenue = `300,870,900,000,000` won

**New Data (2025-10-25 onwards):**
- Stored in **억원 (hundred millions)**  
- Example: Samsung 2024 revenue = `3,008,709` 억원

**Scale Factor:** `100,000,000x` (exactly 1억)

### Why This Causes -100% Changes

When the materialized view calculates:
```sql
(new_value - old_value) / old_value * 100
= (3,008,709 - 300,870,900,000,000) / 300,870,900,000,000 * 100
≈ -100%
```

Every single comparison between new and old data shows -100% or +100% because of this massive scale difference!

## Verification

Run this to see the problem yourself:

```sql
SELECT 
  scrape_date,
  year,
  revenue,
  operating_profit
FROM financial_data
WHERE company_id = 1  -- Samsung Electronics
  AND year = '2024'
ORDER BY scrape_date DESC
LIMIT 5;
```

You'll see:
- `2025-10-25`: revenue = `3,008,709` (new format - correct)
- `2025-07-09`: revenue = `300,870,900,000,000` (old format - needs fixing)

## Solution

**Normalize old data to 억원 by dividing by 100,000,000**

### Step-by-Step Fix Instructions

#### Option 1: Run in Supabase SQL Editor (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in left sidebar

2. **Open the fix script**
   - In your project: `/home/user/webapp/scripts/fix-data-scale.sql`
   - Copy the entire contents

3. **Execute in SQL Editor**
   ```sql
   -- The script will:
   -- 1. Create backup table
   -- 2. Show count of records to update
   -- 3. Update old data (divide by 100,000,000)
   -- 4. Verify the fix
   -- 5. Refresh materialized views
   -- 6. Show sample results
   ```

4. **Review Results**
   - Check that revenue values now match scale
   - Verify growth percentages look realistic (not -100%/+100%)
   - Confirm consensus_score shows variety (not all 100)

#### Option 2: Run via API (Alternative)

If you prefer, I can create an API endpoint to execute this migration programmatically.

## Expected Results After Fix

### Before Fix
```
Company: Samsung Electronics
2025-10-25: revenue = 3,008,709
2025-07-09: revenue = 300,870,900,000,000
Growth: -100% ❌
```

### After Fix
```
Company: Samsung Electronics  
2025-10-25: revenue = 3,008,709
2025-07-09: revenue = 3,008,709
Growth: 0% or realistic % ✅
```

### Investment Finder Results

**Before:** All companies show 100 points, -100%/+100% changes
**After:** Companies show varied scores (0-100), realistic growth rates

## Safety

- ✅ Script creates `financial_data_backup` table before changes
- ✅ Only affects data before 2025-10-25
- ✅ Can be rolled back if needed:
  ```sql
  -- Rollback (if needed)
  DELETE FROM financial_data WHERE scrape_date < '2025-10-25';
  INSERT INTO financial_data SELECT * FROM financial_data_backup;
  ```

## Why This Happened

The original scraper (`original-scripts/1_seoul_ys_fnguide.js`) stored raw values from FnGuide without scale conversion. The new TypeScript scraper (`lib/scraper-fnguide.ts`) was correctly documented to store in 억원, but the old data wasn't converted when migrated.

## Next Steps

1. **Execute the fix script** in Supabase SQL Editor
2. **Verify the results** look correct
3. **Test investment-finder page** - should now show realistic scores
4. **Monitor future data** - all new collections will be in 억원

## Need Help?

If you encounter any issues:
1. Check the backup table was created: `SELECT COUNT(*) FROM financial_data_backup;`
2. Review the migration results carefully
3. Let me know if you need rollback assistance

---

**This fix is CRITICAL for accurate investment opportunity detection!**
