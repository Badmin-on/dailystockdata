# 🚀 YoonStock Pro - Quick Start Guide (English)

**Problem**: Korean characters display incorrectly in PowerShell
**Solution**: Use English version scripts (`-en.ps1`)

---

## ⚡ Quick Commands (3 Steps)

### **Step 1: Test Collection** (2 minutes)

```powershell
cd C:\alexDB\yoonstock-web
.\scripts\test-single-batch-en.ps1
```

**Expected Output**:
```
Testing Batch 1 Collection...
HTTP Status: 200
[SUCCESS] Test passed! Safe to proceed with full collection.
```

---

### **Step 2: Full Collection** (30-40 minutes)

```powershell
.\scripts\collect-prices-safe-en.ps1
```

**Progress Display**:
```
========================================
 YoonStock Pro - Batch Collection
========================================

[CONFIG] Batch range: 1 ~ 18
[CONFIG] Companies per batch: 100
[CONFIG] Wait between batches: 60 seconds

Batch Collection Progress: 50% (9/18)
```

**Optional - Resume from specific batch**:
```powershell
.\scripts\collect-prices-safe-en.ps1 -StartBatch 10 -EndBatch 18
```

---

### **Step 3: Validation & View Refresh**

```powershell
# 1. Validate
.\scripts\post-collection-validation-en.ps1

# 2. Refresh Views
Invoke-WebRequest -Method POST http://localhost:3000/api/refresh-views

# 3. Open Monitor
start http://localhost:3000/monitor
```

---

## 📊 Expected Results

### **Before Collection**
- Total companies: 1,788
- Price data: 32,425 records
- Companies with prices: **19 (1.1%)**
- 120-day ready: 15 (0.8%)

### **After Collection**
- Total companies: 1,788
- Price data: **~214,560 records** (+182,135)
- Companies with prices: **~1,700 (95%+)** (+1,681)
- 120-day ready: **~1,400 (80%+)** (+1,385)

---

## 🛡️ Safety Features

### **Automatic**
- ✅ Duplicate prevention (UPSERT logic)
- ✅ Auto-retry on failure (3 times)
- ✅ Auto-stop after 3 consecutive failures
- ✅ Detailed logging with timestamps

### **Manual Control**
- ✅ `Ctrl+C` to safely stop
- ✅ Resume from any batch
- ✅ Adjustable wait time

---

## 🔧 Troubleshooting

### **Issue 1: Korean characters displayed incorrectly**

**Solution**: Use English version scripts
```powershell
# Use these instead:
.\scripts\test-single-batch-en.ps1
.\scripts\collect-prices-safe-en.ps1
.\scripts\post-collection-validation-en.ps1
```

### **Issue 2: Server not responding**

```powershell
# Restart dev server
npm run dev
```

### **Issue 3: Collection fails**

```bash
# Check server logs
# Look for error messages in terminal running npm run dev
```

### **Issue 4: Need to resume**

```powershell
# Check log to find last successful batch
Get-Content collection-log-*.txt | Select-String "SUCCESS"

# Resume from next batch (e.g., batch 10)
.\scripts\collect-prices-safe-en.ps1 -StartBatch 10 -EndBatch 18
```

---

## 📝 Log Files

Generated automatically:
- `collection-log-YYYYMMDD-HHMMSS.txt` - Collection log
- `data-status-before-collection.json` - Before state
- `data-status-after-collection.json` - After state

**View logs**:
```powershell
# Latest log
Get-ChildItem collection-log-*.txt |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 |
  Get-Content -Tail 50
```

---

## 🎯 Success Checklist

After completion:
- [ ] Test batch succeeded (batch 1)
- [ ] All 18 batches completed
- [ ] No errors in log file
- [ ] Companies with prices ≥ 1,700 (95%+)
- [ ] Avg price data ≥ 120 days
- [ ] Views refreshed
- [ ] Monitor page shows correct data
- [ ] Opportunities page displays results

---

## 🌐 Useful URLs

- **Monitor**: http://localhost:3000/monitor
- **Opportunities**: http://localhost:3000/opportunities
- **Dashboard**: http://localhost:3000/dashboard
- **API Status**: http://localhost:3000/api/data-status

---

## 📖 Full Documentation

For detailed guide (Korean): `COLLECTION_GUIDE.md`

---

**Ready to start!** Run the test collection now! 🚀
