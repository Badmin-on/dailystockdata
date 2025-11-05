# 🛠️ Development Guide

YoonStock Pro 로컬 개발 환경 설정 및 개발 워크플로우 가이드입니다.

## 📋 Prerequisites

### Required Software
- **Node.js**: 20.x 이상 (LTS 권장)
- **npm**: 10.x 이상 (Node.js 포함)
- **Git**: 최신 버전
- **Code Editor**: VS Code 권장

### Recommended VS Code Extensions
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- GitLens

## 🚀 Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/Badmin-on/dailystockdata.git
cd dailystockdata
```

### 2. Install Dependencies

**Frontend Dependencies** (Next.js):
```bash
npm install
```

**Scripts Dependencies** (Scrapers):
```bash
cd scripts
npm install
cd ..
```

### 3. Environment Setup

**Create `.env.local`**:
```bash
cp .env.example .env.local
```

**Configure Environment Variables**:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Cron Secret (for API security)
CRON_SECRET=your-random-secret-string
```

**Getting Supabase Keys**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Settings → API → Copy keys

### 4. Database Setup

**Option A: Use Existing Supabase Project**
1. Supabase SQL Editor 접속
2. `scripts/schema.sql` 파일 내용 복사
3. SQL Editor에서 실행

**Option B: Create New Supabase Project**
```bash
# 1. Supabase 프로젝트 생성 (https://supabase.com)
# 2. Region: ap-northeast-2 (Seoul) 선택
# 3. schema.sql 실행
# 4. 환경변수 설정
```

### 5. Run Development Server

```bash
npm run dev
```

서버가 실행되면 http://localhost:3000 에서 확인 가능합니다.

## 📁 Project Structure

```
dailystockdata/
├── app/                      # Next.js 15 App Router
│   ├── api/                  # API Routes
│   │   ├── investment-opportunities/
│   │   ├── consensus-changes/
│   │   ├── stock-analysis/
│   │   └── ...
│   ├── dashboard/            # 대시보드 페이지
│   ├── opportunities/        # 투자 기회 페이지
│   └── layout.tsx            # Root Layout
│
├── components/               # React Components
│   ├── ui/                   # UI 컴포넌트
│   └── ...
│
├── lib/                      # Utility Functions
│   ├── supabase/             # Supabase Client
│   └── utils.ts              # 공통 유틸
│
├── scripts/                  # Data Collection Scripts
│   ├── fnguide-scraper.js    # 재무 데이터 수집
│   ├── stock-price-scraper.js # 주가 데이터 수집
│   ├── schema.sql            # 데이터베이스 스키마
│   └── package.json          # Scripts dependencies
│
├── .github/                  # GitHub Configuration
│   └── workflows/
│       └── stock-data-cron.yml # 자동화 워크플로우
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── DEVELOPMENT.md
│   ├── TROUBLESHOOTING.md
│   └── API.md
│
├── public/                   # Static Assets
├── .env.local                # Environment Variables (gitignored)
├── .env.example              # Environment Template
├── next.config.js            # Next.js Configuration
├── tailwind.config.ts        # Tailwind Configuration
├── tsconfig.json             # TypeScript Configuration
└── package.json              # Project Dependencies
```

## 🔧 Development Workflow

### Feature Development

**1. Create Feature Branch**:
```bash
git checkout -b feature/your-feature-name
```

**2. Make Changes**:
```bash
# Edit code
# Test locally
npm run dev
```

**3. Commit Changes**:
```bash
git add .
git commit -m "feat: add your feature description"
```

**4. Push and Create PR**:
```bash
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

### Commit Message Convention

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅 (기능 변경 없음)
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 프로세스, 도구 수정
```

**Examples**:
```bash
feat: add 120-day moving average chart
fix: correct stock price parsing for Korean text
docs: update API documentation
refactor: simplify consensus change calculation
```

## 🧪 Testing

### Manual Testing

**1. Test Frontend**:
```bash
npm run dev
# 브라우저에서 http://localhost:3000 접속
# 각 페이지 동작 확인
```

**2. Test API Endpoints**:
```bash
# Using curl
curl http://localhost:3000/api/investment-opportunities

# Using browser
http://localhost:3000/api/test-db
```

**3. Test Data Collection Scripts**:
```bash
cd scripts

# Test FnGuide scraper (1-2 companies)
node fnguide-scraper.js

# Test Stock Price scraper (1-2 companies)
node stock-price-scraper.js
```

### Database Testing

**Check Data Integrity**:
```sql
-- Companies count
SELECT COUNT(*) FROM companies;
-- Expected: 1,131

-- Financial data count
SELECT COUNT(*) FROM financial_data;
-- Expected: 130,000+

-- Stock prices count
SELECT COUNT(*) FROM daily_stock_prices;
-- Expected: 120,000+

-- Materialized Views
SELECT COUNT(*) FROM mv_consensus_changes;
SELECT COUNT(*) FROM mv_stock_analysis;
```

**Test Materialized View Refresh**:
```sql
-- Manual refresh
REFRESH MATERIALIZED VIEW mv_consensus_changes;
REFRESH MATERIALIZED VIEW mv_stock_analysis;

-- Check last refresh time
SELECT matviewname, last_refresh
FROM pg_matviews
WHERE matviewname IN ('mv_consensus_changes', 'mv_stock_analysis');
```

## 📦 Building & Deployment

### Local Build

```bash
# Production build
npm run build

# Test production build locally
npm run start
```

### Vercel Deployment

**Automatic Deployment**:
1. Push to `main` branch
2. Vercel automatically deploys
3. Check deployment status on Vercel Dashboard

**Manual Deployment**:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Environment Variables (Vercel)**:
1. Vercel Dashboard → Settings → Environment Variables
2. Add all variables from `.env.local`
3. Redeploy

## 🔄 Data Collection Development

### Testing Scrapers Locally

**FnGuide Scraper** (재무 데이터):
```bash
cd scripts

# Full run (takes ~60 minutes)
node fnguide-scraper.js

# Test with fewer companies (edit script)
# Change: const companyList = await getCompanyList();
# To: const companyList = (await getCompanyList()).slice(0, 10);
```

**Stock Price Scraper** (주가 데이터):
```bash
cd scripts

# Full run (takes ~16-17 minutes)
node stock-price-scraper.js

# Test with fewer companies (edit script)
# Change: const companyList = await getCompanyList();
# To: const companyList = (await getCompanyList()).slice(0, 10);
```

**Debug Single Company**:
```bash
# Create test script
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('code', '005930')
    .single();
  console.log(data);
}
test();
"
```

### GitHub Actions Testing

**Test Workflow Locally** (using act):
```bash
# Install act (https://github.com/nektos/act)
# macOS: brew install act
# Windows: choco install act-cli

# Test fnguide scraper workflow
act -j fnguide-scraper --secret-file .env.local

# Test stock price scraper workflow
act -j stock-price-scraper --secret-file .env.local
```

**Manual Workflow Trigger**:
1. GitHub Repository → Actions 탭
2. Select "Stock Data Auto Update"
3. Click "Run workflow"
4. Choose scraper type (fnguide/stock-price/both)
5. Monitor logs

## 🐛 Debugging

### Frontend Debugging

**Browser DevTools**:
```javascript
// Add console.log in React components
console.log('Data:', data);

// Check API responses
// Network tab → API calls → Response
```

**Next.js Debugging**:
```bash
# Enable verbose logging
NODE_OPTIONS='--inspect' npm run dev

# Chrome DevTools → chrome://inspect
```

### Backend Debugging

**API Route Debugging**:
```typescript
// app/api/investment-opportunities/route.ts
export async function GET(request: Request) {
  console.log('Request received:', request.url);

  // Add breakpoints here
  const data = await fetchData();
  console.log('Data fetched:', data.length);

  return NextResponse.json(data);
}
```

**Database Query Debugging**:
```typescript
// Check Supabase query
const { data, error } = await supabase
  .from('v_investment_opportunities')
  .select('*')
  .limit(10);

console.log('Query result:', { data, error });
```

### Scraper Debugging

**Add Verbose Logging**:
```javascript
// scripts/stock-price-scraper.js
console.log('[DEBUG] Fetching URL:', url);
console.log('[DEBUG] HTML length:', decodedHtml.length);
console.log('[DEBUG] Cells found:', cells.length);
console.log('[DEBUG] Parsed data:', priceData);
```

**Test Single Stock**:
```javascript
// Create test-stock-price.js
async function testStockPrice(stockCode) {
    const url = `https://finance.naver.com/item/sise_day.naver?code=${stockCode}`;
    // ... scraping logic
    console.log('Result:', result);
}

testStockPrice('005930');  // 삼성전자
```

## 🔑 Common Development Tasks

### Add New API Endpoint

**1. Create Route Handler**:
```typescript
// app/api/your-endpoint/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('your_table')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

**2. Test Endpoint**:
```bash
curl http://localhost:3000/api/your-endpoint
```

### Add New Database Table

**1. Update schema.sql**:
```sql
-- scripts/schema.sql
CREATE TABLE your_new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**2. Run in Supabase SQL Editor**

**3. Update TypeScript Types** (optional):
```typescript
// lib/types.ts
export interface YourNewTable {
  id: number;
  name: string;
  created_at: string;
}
```

### Add New Scraper

**1. Create Scraper Script**:
```javascript
// scripts/your-scraper.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function scrapeData() {
  // Scraping logic
}

scrapeData();
```

**2. Test Locally**:
```bash
cd scripts
node your-scraper.js
```

**3. Add to GitHub Actions** (optional):
```yaml
# .github/workflows/stock-data-cron.yml
your-scraper:
  name: Your Scraper
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: cd scripts && npm ci
    - run: node your-scraper.js
```

## 🔧 Configuration Files

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
      },
    },
  },
  plugins: [],
};

export default config;
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit Pull Request

## 📞 Getting Help

- GitHub Issues: https://github.com/Badmin-on/dailystockdata/issues
- Documentation: `/docs` directory
- Code Comments: 코드 내 주석 참고
