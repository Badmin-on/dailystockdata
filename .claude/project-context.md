# YoonStock Pro - Claude Code Project Context

This file provides essential context for Claude Code to quickly understand and work with this project.

## 📋 Project Overview

**Project Name**: YoonStock Pro (dailystockdata)
**Type**: AI-powered investment opportunity discovery system
**Status**: Active Development (v1.1.0)
**Primary Language**: TypeScript, JavaScript
**Framework**: Next.js 15 (App Router)
**Database**: Supabase (PostgreSQL)
**Deployment**: Vercel

## 🎯 Core Purpose

Automatically discover investment opportunities by analyzing:
1. **Financial Consensus Changes** (FnGuide data)
   - Revenue & Operating Profit trends
   - Day/1M/3M/1Y comparison
2. **Stock Price Analysis** (Naver Finance data)
   - 120-day moving average
   - Divergence rate (저평가/고평가)
   - 52-week high/low analysis
3. **Investment Scoring** (AI algorithm)
   - S/A/B/C grade classification
   - Combined score from consensus (60%) + divergence (40%)

## 🗂️ Project Structure

```
dailystockdata/
├── app/                        # Next.js 15 App Router
│   ├── api/                    # API Routes (8 endpoints)
│   ├── dashboard/              # Dashboard page
│   ├── opportunities/          # Main feature page
│   └── layout.tsx
│
├── scripts/                    # Data Collection Scripts
│   ├── fnguide-scraper.js      # Financial data (60 min, 1000 companies)
│   ├── stock-price-scraper.js  # Stock prices (16 min, 1000 companies)
│   └── schema.sql              # Database schema
│
├── .github/workflows/          # CI/CD Automation
│   └── stock-data-cron.yml     # Daily data collection (7am, 7pm KST)
│
├── docs/                       # Comprehensive Documentation
│   ├── ARCHITECTURE.md         # System design & data flow
│   ├── DATABASE.md             # Schema & Materialized Views
│   ├── DEVELOPMENT.md          # Local dev setup
│   ├── TROUBLESHOOTING.md      # Common issues & fixes
│   └── API.md                  # REST API documentation
│
└── CHANGELOG.md                # Version history
```

## 🔑 Critical Files

### Data Collection (Most Important!)
- **`scripts/stock-price-scraper.js:87-102`**: Stock price parsing logic
  - Uses Korean text detection ("하락"/"상승")
  - Correct cell indices: cells[1]=close, cells[2]=change, cells[6]=volume
  - **Recently fixed bug**: Wrong cell index caused incorrect prices
- **`scripts/fnguide-scraper.js:296-301`**: KST timezone conversion
  - GitHub Actions runs in UTC, must add 9 hours

### Database Architecture
- **`scripts/schema.sql`**: Complete database schema
  - 3 raw tables: companies, financial_data, daily_stock_prices
  - 2 Materialized Views: mv_consensus_changes, mv_stock_analysis
  - 1 Normal View: v_investment_opportunities
- **Materialized Views**: MUST refresh after data collection (see issue #3 below)

### Automation
- **`.github/workflows/stock-data-cron.yml:59-80`**: FnGuide job + MV refresh
- **`.github/workflows/stock-data-cron.yml:126-147`**: Stock price job + MV refresh
- **Schedule**: 7:00 KST (fnguide), 19:00 KST (stock prices)

### API Routes
- **`app/api/investment-opportunities/route.ts`**: Main feature API
- **`app/api/test-db/route.ts`**: Database health check

## 🚨 Recent Critical Changes (v1.1.0 - 2025-11-05)

### Issue #1: Stock Price Accuracy Bug ✅ FIXED
**Problem**: Prices showed 42,550 instead of 44,950 for 엠로 (058970)
**Root Cause**:
- Used ▲/▼ symbols but Naver uses "하락"/"상승" Korean text
- Wrong cell index: cells[3] (opening price) instead of cells[2] (change)
**Fix**: `scripts/stock-price-scraper.js:87-102`
```javascript
// BEFORE (WRONG):
const isUp = priceChangeText.includes('▲');
const changeAmount = cleanNumber($(cells[3]).text());

// AFTER (CORRECT):
const isUp = priceChangeText.includes('상승');
const isDown = priceChangeText.includes('하락');
const changeAmount = cleanNumber(priceChangeText.replace('하락', '').replace('상승', ''));
```

### Issue #2: Timezone Mismatch ✅ FIXED
**Problem**: Nov 4 7am KST data saved as Nov 3 in database
**Root Cause**: GitHub Actions runs in UTC (Nov 3 22:00 UTC = Nov 4 7:00 KST)
**Fix**: Added 9-hour offset calculation in both scrapers
```javascript
const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
```

### Issue #3: Materialized Views Not Auto-Refreshing ✅ FIXED
**Problem**: Website showed Oct 31 data even after Nov 5 collection
**Root Cause**: Materialized Views cache results and don't auto-update
**Architecture**:
```
Raw Tables → Materialized Views (cache) → Normal View → API
   ↓              ↓                           ↓
 INSERT     MUST REFRESH               Fast JOIN only
```
**Fix**: Added psql REFRESH commands to GitHub Actions workflows
```bash
psql "postgresql://postgres:${KEY}@db.${HOST}:5432/postgres" \
  -c "REFRESH MATERIALIZED VIEW mv_consensus_changes;" \
  -c "REFRESH MATERIALIZED VIEW mv_stock_analysis;"
```

### Issue #4: Replaced Vercel Cron with GitHub Actions ✅ COMPLETED
**Reason**: Better reliability, separate workflows, manual trigger capability
**Implementation**: Two independent jobs with automatic MV refresh

## 📊 Data Pipeline

```
[FnGuide/Naver]
    ↓ (HTTP GET, EUC-KR → UTF-8)
[Scrapers: fnguide-scraper.js, stock-price-scraper.js]
    ↓ (Parse HTML, Clean data, KST conversion)
[Raw Tables: companies, financial_data, daily_stock_prices]
    ↓ (UPSERT with conflict resolution)
[GitHub Actions: psql REFRESH]
    ↓ (Heavy computation cached)
[Materialized Views: mv_consensus_changes, mv_stock_analysis]
    ↓ (Fast JOIN, Investment score calculation)
[Normal View: v_investment_opportunities]
    ↓ (Next.js API Routes)
[Frontend: React + Tailwind CSS]
```

## 🔧 Common Development Tasks

### 1. Fix Stale Data Issue
**Symptom**: Website shows old data
**Quick Fix**:
```sql
-- Run in Supabase SQL Editor
REFRESH MATERIALIZED VIEW mv_consensus_changes;
REFRESH MATERIALIZED VIEW mv_stock_analysis;
```

### 2. Test Scrapers Locally
```bash
cd scripts
# Test with first 10 companies only (edit script)
node fnguide-scraper.js
node stock-price-scraper.js
```

### 3. Debug Stock Price Parsing
```bash
cd scripts
node -e "
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
(async () => {
  const { data } = await axios.get('https://finance.naver.com/item/sise_day.naver?code=058970', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    responseType: 'arraybuffer'
  });
  const html = iconv.decode(data, 'euc-kr');
  const $ = cheerio.load(html);
  const row = $('table.type2 tr[onmouseover]').first();
  row.find('td').each((i, cell) => console.log(\`[\${i}]\`, $(cell).text().trim()));
})();
"
```

### 4. Check Database Status
```bash
curl http://localhost:3000/api/test-db
```

### 5. Manual GitHub Actions Trigger
1. GitHub → Actions tab
2. "Stock Data Auto Update" workflow
3. "Run workflow" button
4. Select: fnguide / stock-price / both

## 🎓 Important Concepts

### Why 2027 Data Appears Most
**This is NORMAL!** FnGuide provides future estimates (2024-2027):
- 2027 is 2 years out → analysts update most frequently
- 2024 is mostly finalized → fewer changes
- 2025 is current year → moderate changes
- More 2027 data = healthy, active analyst coverage

### Materialized Views Performance Impact
- **Without MVs**: 5-10 seconds (LAG/Window functions in real-time)
- **With MVs**: <1 second (pre-computed results)
- **Trade-off**: Must refresh after data updates

### Investment Score Algorithm
```javascript
score = (consensus_score * 0.6) + (divergence_score * 0.4)

consensus_score = (revenue_change_1m * 0.3) + (op_change_1m * 0.3)

divergence_score = {
  40 points: divergence_rate < -10%  (매우 저평가)
  30 points: -10% ≤ divergence < 0%  (저평가)
  20 points: 0% ≤ divergence < 5%    (적정가)
  10 points: 5% ≤ divergence < 15%   (고평가)
  0 points: divergence ≥ 15%         (과열)
}

grade = {
  'S': score ≥ 80
  'A': 70 ≤ score < 80
  'B': 60 ≤ score < 70
  'C': score < 60
}
```

## ⚠️ Known Issues & Limitations

### Current Limitations
1. **Supabase Free Tier**:
   - 500MB storage limit
   - No pg_cron extension
   - 100 max connections
2. **GitHub Actions Schedule**:
   - May have ±15 minute delay
   - Auto-disabled if repo inactive >2 weeks
3. **No Authentication**: Public data, no user accounts
4. **No Real-time Updates**: Updates twice daily only

### Common Problems & Quick Fixes

**Problem**: Old data on website
- **Quick Fix**: Manual MV refresh (see SQL above)
- **Root Cause**: MV not refreshed after collection
- **Long-term**: GitHub Actions should handle automatically

**Problem**: Stock price wrong
- **Check**: Naver HTML structure changed?
- **Debug**: Run test script (see section 3 above)
- **Fix**: Update `scripts/stock-price-scraper.js:87-102`

**Problem**: GitHub Actions failed
- **Check**: Actions tab → Failed job → Logs
- **Common**: Network timeout, Supabase down, rate limiting
- **Fix**: Manual re-run usually works

## 🚀 Next Developer Quick Start

### First Time Setup (5 minutes)
```bash
# 1. Install dependencies
npm install
cd scripts && npm install && cd ..

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with Supabase keys

# 3. Run dev server
npm run dev

# 4. Test database connection
curl http://localhost:3000/api/test-db
```

### Before Making Changes
1. Read `docs/ARCHITECTURE.md` for system overview
2. Read `docs/DATABASE.md` for schema details
3. Check `CHANGELOG.md` for recent changes
4. Review recent commits for context

### When Working on Data Collection
- **ALWAYS test locally first** (with 5-10 companies only)
- **NEVER commit without testing** scraper changes
- **CHECK cell indices** if modifying HTML parsing
- **VERIFY timezone** handling for date fields

### When Working on Database
- **ALWAYS backup** before schema changes
- **TEST queries** in Supabase SQL Editor first
- **REFRESH MVs** after changing data
- **CHECK performance** impact with EXPLAIN

## 📞 Getting Help

### Documentation Resources
- `docs/ARCHITECTURE.md` - System design & data flow
- `docs/DATABASE.md` - Schema & Materialized Views
- `docs/DEVELOPMENT.md` - Local development guide
- `docs/TROUBLESHOOTING.md` - Common issues & solutions
- `docs/API.md` - REST API documentation
- `CHANGELOG.md` - Version history

### External Resources
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [GitHub Actions](https://github.com/Badmin-on/dailystockdata/actions)

### Key Queries for Context

**Check latest data dates**:
```sql
SELECT MAX(date) FROM daily_stock_prices;
SELECT MAX(collected_at) FROM financial_data;
```

**Check MV freshness**:
```sql
SELECT matviewname, last_refresh FROM pg_matviews
WHERE matviewname IN ('mv_consensus_changes', 'mv_stock_analysis');
```

**Check specific company**:
```sql
SELECT * FROM v_investment_opportunities WHERE code = '005930';
```

## 🎯 Project Goals & Priorities

### Current Focus (v1.1.x)
1. ✅ Stable data collection automation
2. ✅ Accurate stock price parsing
3. ✅ Automatic MV refresh
4. ⏳ Mobile UI optimization
5. ⏳ Performance improvements

### Future Roadmap (v1.2.0+)
- User authentication & watchlists
- Email/Slack notifications
- Historical performance tracking
- Chart visualizations
- Mobile app (React Native)

## 💡 Tips for Claude Code

### When User Reports Data Issue
1. Check MV last refresh time (SQL query above)
2. Verify latest data dates in raw tables
3. Ask if they need manual MV refresh
4. Check GitHub Actions logs if automated

### When Modifying Scrapers
1. **CRITICAL**: Test HTML structure first (test script)
2. Verify cell indices match current Naver/FnGuide HTML
3. Check Korean text detection ("하락"/"상승")
4. Validate timezone conversion (KST = UTC+9)
5. Test with 5-10 companies before full run

### When User Asks About Old Data
- **If scrapers ran successfully but data old**: MV refresh needed
- **If scrapers failed**: Check GitHub Actions logs
- **If MV recently refreshed**: Cache may need clearing

### Performance Debugging
1. Check if MVs exist and are fresh
2. Verify indices on MV columns
3. Check query EXPLAIN plan
4. Consider adding LIMIT to large queries

## 🔐 Security Notes

- **Public Data**: No sensitive user information
- **API Keys**: Stored in environment variables only
- **CRON_SECRET**: Required for automated endpoints
- **RLS**: Currently disabled (public read access)

## ⏱️ Last Updated

**Date**: 2025-11-05
**Version**: 1.1.0
**Major Changes**: GitHub Actions automation, Stock price bug fix, Timezone fix, MV auto-refresh

---

**Note for Claude**: This context file should be your first reference when starting work on this project. All information here is verified and up-to-date as of the last update date.
