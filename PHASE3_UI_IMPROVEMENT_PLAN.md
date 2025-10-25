# 🎨 Phase 3 실행 계획: UI/UX 대대적 개선

**날짜**: 2025-10-25  
**우선순위**: 🔴 High  
**예상 소요 시간**: 2주  
**담당자**: 프론트엔드 팀

---

## 📋 목차

1. [현재 UI 문제점 분석](#1-현재-ui-문제점-분석)
2. [개선 목표 및 범위](#2-개선-목표-및-범위)
3. [왼쪽 사이드바 메뉴 구현](#3-왼쪽-사이드바-메뉴-구현)
4. [고급 필터링 시스템](#4-고급-필터링-시스템)
5. [차트 시각화 강화](#5-차트-시각화-강화)
6. [반응형 디자인 최적화](#6-반응형-디자인-최적화)
7. [실행 타임라인](#7-실행-타임라인)

---

## 1. 현재 UI 문제점 분석

### 1.1 네비게이션 문제

#### ❌ 현재 상태
```
홈 (/) → 3개 버튼 클릭 → 각 대시보드
      ↓
     뒤로가기만 존재
     전체 구조 파악 어려움
```

#### ✅ 개선 목표
```
┌─────────────────────────────────────────┐
│  사이드바 메뉴 (항상 표시)              │
│  ├─ 📊 대시보드                         │
│  ├─ 🎯 투자 기회                        │
│  ├─ 📈 재무제표                         │
│  ├─ 🔍 검색                             │
│  └─ ⚙️ 설정                             │
└─────────────────────────────────────────┘
     ↓
  모든 페이지에서 1클릭 접근 가능
```

### 1.2 필터링 문제

#### ❌ 현재 상태
- `/opportunities`: 투자등급 필터만 존재 (S/A/B/C/D)
- 시장 구분 필터 없음 (KOSPI/KOSDAQ)
- 업종 필터 없음
- 시가총액 범위 필터 없음
- 주가 범위 필터 없음

#### ✅ 개선 목표
```typescript
interface AdvancedFilter {
  market: 'ALL' | 'KOSPI' | 'KOSDAQ';
  investmentGrade: 'ALL' | 'S' | 'A' | 'B' | 'C' | 'D';
  sector: string[];  // 신규
  marketCapRange: [number, number];  // 신규
  priceRange: [number, number];  // 신규
  divergenceRange: [number, number];  // 신규
  volumeMin: number;  // 신규
}
```

### 1.3 시각화 문제

#### ❌ 현재 상태
- 테이블만 존재 (차트 없음)
- 숫자 데이터만 표시
- 트렌드 파악 어려움
- 비교 분석 불가

#### ✅ 개선 목표
- 주가 추세 차트 (Line Chart)
- 컨센서스 변화 차트 (Bar Chart)
- 투자 기회 분포도 (Scatter Plot)
- 섹터별 분포 (Pie Chart)
- 시가총액 히트맵 (Heatmap)

---

## 2. 개선 목표 및 범위

### 2.1 핵심 목표

1. **직관적인 네비게이션**
   - 왼쪽 사이드바로 모든 페이지 접근
   - 현재 위치 시각적 표시
   - 빠른 페이지 전환

2. **강력한 필터링**
   - 다차원 필터 조합
   - 실시간 결과 업데이트
   - 필터 상태 저장 (LocalStorage)

3. **풍부한 시각화**
   - 5가지 이상 차트 타입
   - 인터랙티브 차트
   - 데이터 다운로드 기능

4. **모바일 최적화**
   - 반응형 레이아웃
   - 터치 제스처 지원
   - 모바일 전용 네비게이션

### 2.2 개발 범위

#### 새로 만들 컴포넌트 (14개)

1. **레이아웃 컴포넌트**
   - `Sidebar.tsx`: 왼쪽 사이드바
   - `Header.tsx`: 상단 헤더
   - `MobileNav.tsx`: 모바일 네비게이션
   - `Footer.tsx`: 하단 정보

2. **필터 컴포넌트**
   - `FilterPanel.tsx`: 통합 필터 패널
   - `MarketFilter.tsx`: 시장 구분 필터
   - `GradeFilter.tsx`: 투자 등급 필터
   - `RangeSlider.tsx`: 범위 슬라이더

3. **차트 컴포넌트**
   - `StockTrendChart.tsx`: 주가 추세 차트
   - `ConsensusChangeChart.tsx`: 컨센서스 변화 차트
   - `OpportunityScatterChart.tsx`: 투자 기회 분포도
   - `SectorPieChart.tsx`: 섹터별 분포 차트
   - `MarketCapHeatmap.tsx`: 시가총액 히트맵

4. **유틸리티 컴포넌트**
   - `ExportButton.tsx`: 데이터 내보내기 버튼

---

## 3. 왼쪽 사이드바 메뉴 구현

### 3.1 디자인 스펙

```
┌─────────────────────────────────────────────────┐
│  [로고] YoonStock Pro                    [토글]  │  ← 헤더 (60px)
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 대시보드                                     │  ← 메뉴 그룹 1
│    ├─ 🏠 홈                    [뱃지: 신규]     │
│    ├─ 📈 모니터링              [뱃지: HOT]      │
│    ├─ 🎯 투자 기회             [뱃지: 15]       │
│    └─ 📋 재무제표                               │
│                                                  │
│  🔍 분석 도구                                    │  ← 메뉴 그룹 2
│    ├─ 📊 섹터 분석             [Soon]           │
│    ├─ 🔥 급등주 알림           [Soon]           │
│    ├─ 💡 AI 추천               [Soon]           │
│    └─ 📈 포트폴리오 관리       [Soon]           │
│                                                  │
│  ⚙️ 설정                                         │  ← 메뉴 그룹 3
│    ├─ 🔔 알림 설정                              │
│    ├─ 🎨 테마 (Light/Dark)                      │
│    ├─ 💾 데이터 관리                            │
│    └─ ℹ️ 도움말                                  │
│                                                  │
│  ─────────────────────────────                  │
│  [프로필] 사용자명                               │  ← 하단 (60px)
│  [설정 아이콘] [로그아웃]                        │
└─────────────────────────────────────────────────┘
```

### 3.2 구현 코드

#### app/components/Sidebar.tsx

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
  icon: string;
  label: string;
  href: string;
  badge?: string | number;
  soon?: boolean;
}

const menuGroups = [
  {
    title: '대시보드',
    icon: '📊',
    items: [
      { icon: '🏠', label: '홈', href: '/', badge: '신규' },
      { icon: '📈', label: '모니터링', href: '/monitor', badge: 'HOT' },
      { icon: '🎯', label: '투자 기회', href: '/opportunities', badge: 15 },
      { icon: '📋', label: '재무제표', href: '/dashboard' }
    ]
  },
  {
    title: '분석 도구',
    icon: '🔍',
    items: [
      { icon: '📊', label: '섹터 분석', href: '/sector-analysis', soon: true },
      { icon: '🔥', label: '급등주 알림', href: '/alerts', soon: true },
      { icon: '💡', label: 'AI 추천', href: '/ai-recommendations', soon: true },
      { icon: '📈', label: '포트폴리오', href: '/portfolio', soon: true }
    ]
  },
  {
    title: '설정',
    icon: '⚙️',
    items: [
      { icon: '🔔', label: '알림 설정', href: '/settings/notifications' },
      { icon: '🎨', label: '테마', href: '/settings/theme' },
      { icon: '💾', label: '데이터 관리', href: '/settings/data' },
      { icon: 'ℹ️', label: '도움말', href: '/help' }
    ]
  }
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-white border-r border-gray-200
        transition-all duration-300 z-50
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* 헤더 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <h1 className="text-xl font-bold text-blue-600">
            YoonStock Pro
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* 메뉴 그룹 */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {!collapsed && (
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-500 uppercase">
                <span>{group.icon}</span>
                <span>{group.title}</span>
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item, itemIndex) => (
                <MenuItemComponent
                  key={itemIndex}
                  item={item}
                  collapsed={collapsed}
                  active={pathname === item.href}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* 하단 프로필 */}
      {!collapsed && (
        <div className="h-16 border-t border-gray-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              U
            </div>
            <span className="text-sm font-medium">사용자</span>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg">⚙️</button>
        </div>
      )}
    </aside>
  );
}

function MenuItemComponent({
  item,
  collapsed,
  active
}: {
  item: MenuItem;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={item.soon ? '#' : item.href}
      className={`
        flex items-center justify-between px-3 py-2.5 rounded-lg
        transition-all duration-200
        ${active
          ? 'bg-blue-50 text-blue-600 font-semibold'
          : 'text-gray-700 hover:bg-gray-50'
        }
        ${item.soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{item.icon}</span>
        {!collapsed && <span className="text-sm">{item.label}</span>}
      </div>
      {!collapsed && item.badge && (
        <span
          className={`
            px-2 py-0.5 rounded-full text-xs font-semibold
            ${typeof item.badge === 'number'
              ? 'bg-red-500 text-white'
              : 'bg-yellow-100 text-yellow-800'
            }
          `}
        >
          {item.badge}
        </span>
      )}
      {!collapsed && item.soon && (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
          Soon
        </span>
      )}
    </Link>
  );
}
```

#### app/layout.tsx (수정)

```typescript
import Sidebar from './components/Sidebar';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 bg-gray-50">
            {/* 상단 헤더 */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
              <h2 className="text-lg font-semibold">페이지 제목</h2>
              <div className="flex items-center gap-4">
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  🔄 새로고침
                </button>
              </div>
            </header>

            {/* 메인 컨텐츠 */}
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
```

---

## 4. 고급 필터링 시스템

### 4.1 필터 UI 디자인

```
┌─────────────────────────────────────────────────┐
│  🔍 필터                          [초기화] [적용] │
├─────────────────────────────────────────────────┤
│                                                  │
│  시장 구분                                       │
│  [전체]  [KOSPI]  [KOSDAQ]                      │
│                                                  │
│  투자 등급                                       │
│  [전체]  [S급]  [A급]  [B급]  [C급]  [D급]      │
│                                                  │
│  시가총액 (억원)                                 │
│  [─────●────────────────] 10 ~ 100,000          │
│                                                  │
│  주가 범위 (원)                                  │
│  [──────────●───────────] 1,000 ~ 500,000       │
│                                                  │
│  이격도 범위 (%)                                 │
│  [───────●──────────────] -20 ~ +20             │
│                                                  │
│  거래량 (최소)                                   │
│  [입력: 100,000]                                │
│                                                  │
│  섹터 (다중 선택)                                │
│  ☑ 반도체     ☐ 자동차     ☐ 바이오             │
│  ☑ IT/소프트웨어  ☐ 금융  ☐ 화학                │
│  ☐ 전기전자   ☐ 통신      ☐ 에너지              │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 4.2 구현 코드

#### app/components/FilterPanel.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import RangeSlider from './RangeSlider';

export interface FilterState {
  market: 'ALL' | 'KOSPI' | 'KOSDAQ';
  investmentGrade: 'ALL' | 'S' | 'A' | 'B' | 'C' | 'D';
  marketCapRange: [number, number];
  priceRange: [number, number];
  divergenceRange: [number, number];
  volumeMin: number;
  sectors: string[];
}

const initialFilter: FilterState = {
  market: 'ALL',
  investmentGrade: 'ALL',
  marketCapRange: [10, 100000],
  priceRange: [1000, 500000],
  divergenceRange: [-20, 20],
  volumeMin: 0,
  sectors: []
};

const sectorOptions = [
  '반도체', '자동차', '바이오', 'IT/소프트웨어',
  '금융', '화학', '전기전자', '통신', '에너지'
];

interface FilterPanelProps {
  onFilterChange: (filter: FilterState) => void;
}

export default function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [filter, setFilter] = useState<FilterState>(initialFilter);

  useEffect(() => {
    // LocalStorage에서 저장된 필터 불러오기
    const savedFilter = localStorage.getItem('yoonstock-filter');
    if (savedFilter) {
      setFilter(JSON.parse(savedFilter));
    }
  }, []);

  const handleApply = () => {
    // LocalStorage에 필터 저장
    localStorage.setItem('yoonstock-filter', JSON.stringify(filter));
    onFilterChange(filter);
  };

  const handleReset = () => {
    setFilter(initialFilter);
    localStorage.removeItem('yoonstock-filter');
    onFilterChange(initialFilter);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          🔍 필터
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            초기화
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            적용
          </button>
        </div>
      </div>

      {/* 시장 구분 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          시장 구분
        </label>
        <div className="flex gap-2">
          {(['ALL', 'KOSPI', 'KOSDAQ'] as const).map((market) => (
            <button
              key={market}
              onClick={() => setFilter({ ...filter, market })}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${filter.market === market
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {market === 'ALL' ? '전체' : market}
            </button>
          ))}
        </div>
      </div>

      {/* 투자 등급 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          투자 등급
        </label>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'S', 'A', 'B', 'C', 'D'] as const).map((grade) => (
            <button
              key={grade}
              onClick={() => setFilter({ ...filter, investmentGrade: grade })}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${filter.investmentGrade === grade
                  ? grade === 'S' ? 'bg-yellow-500 text-white'
                    : grade === 'A' ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {grade === 'ALL' ? '전체' : `${grade}급`}
            </button>
          ))}
        </div>
      </div>

      {/* 시가총액 범위 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          시가총액 (억원)
        </label>
        <RangeSlider
          min={10}
          max={100000}
          step={100}
          value={filter.marketCapRange}
          onChange={(value) => setFilter({ ...filter, marketCapRange: value })}
        />
      </div>

      {/* 주가 범위 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          주가 범위 (원)
        </label>
        <RangeSlider
          min={1000}
          max={500000}
          step={1000}
          value={filter.priceRange}
          onChange={(value) => setFilter({ ...filter, priceRange: value })}
        />
      </div>

      {/* 이격도 범위 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          이격도 범위 (%)
        </label>
        <RangeSlider
          min={-20}
          max={20}
          step={1}
          value={filter.divergenceRange}
          onChange={(value) => setFilter({ ...filter, divergenceRange: value })}
        />
      </div>

      {/* 거래량 최소 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          거래량 (최소)
        </label>
        <input
          type="number"
          value={filter.volumeMin}
          onChange={(e) => setFilter({ ...filter, volumeMin: Number(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="예: 100,000"
        />
      </div>

      {/* 섹터 선택 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          섹터 (다중 선택)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {sectorOptions.map((sector) => (
            <label
              key={sector}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filter.sectors.includes(sector)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFilter({ ...filter, sectors: [...filter.sectors, sector] });
                  } else {
                    setFilter({ ...filter, sectors: filter.sectors.filter(s => s !== sector) });
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{sector}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. 차트 시각화 강화

### 5.1 Recharts 설치

```bash
cd /home/user/webapp
npm install recharts
npm install --save-dev @types/recharts
```

### 5.2 주가 추세 차트

#### app/components/StockTrendChart.tsx

```typescript
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface StockTrendChartProps {
  data: Array<{
    date: string;
    close_price: number;
    ma_120?: number;
  }>;
  companyName: string;
}

export default function StockTrendChart({ data, companyName }: StockTrendChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        📈 {companyName} 주가 추세 (120일)
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toLocaleString()}원`, '']}
            labelFormatter={(label) => `날짜: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="close_price"
            stroke="#2563eb"
            strokeWidth={2}
            name="종가"
            dot={false}
          />
          {data[0]?.ma_120 && (
            <Line
              type="monotone"
              dataKey="ma_120"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="120일 이평선"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 6. 반응형 디자인 최적화

### 6.1 브레이크포인트 전략

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'sm': '640px',   // 모바일 (작은 화면)
      'md': '768px',   // 태블릿
      'lg': '1024px',  // 노트북
      'xl': '1280px',  // 데스크톱
      '2xl': '1536px'  // 큰 데스크톱
    }
  }
};
```

### 6.2 모바일 네비게이션

#### app/components/MobileNav.tsx

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 모바일 헤더 (md 이하에서만 표시) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <h1 className="text-lg font-bold text-blue-600">YoonStock Pro</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 메뉴 내용 */}
            <nav className="p-4 space-y-2 mt-16">
              <Link href="/" className="block px-4 py-3 rounded-lg hover:bg-gray-100">
                🏠 홈
              </Link>
              <Link href="/monitor" className="block px-4 py-3 rounded-lg hover:bg-gray-100">
                📈 모니터링
              </Link>
              <Link href="/opportunities" className="block px-4 py-3 rounded-lg hover:bg-gray-100">
                🎯 투자 기회
              </Link>
              <Link href="/dashboard" className="block px-4 py-3 rounded-lg hover:bg-gray-100">
                📋 재무제표
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 7. 실행 타임라인

### Week 1: 레이아웃 및 네비게이션

| 일자 | 작업 | 담당 | 상태 |
|------|------|------|------|
| Day 1-2 | Sidebar 컴포넌트 구현 | FE팀 | Pending |
| Day 3 | Layout 통합 및 라우팅 | FE팀 | Pending |
| Day 4 | MobileNav 구현 | FE팀 | Pending |
| Day 5 | 반응형 테스트 | QA팀 | Pending |

### Week 2: 필터 및 차트

| 일자 | 작업 | 담당 | 상태 |
|------|------|------|------|
| Day 6-7 | FilterPanel 구현 | FE팀 | Pending |
| Day 8 | RangeSlider 구현 | FE팀 | Pending |
| Day 9-10 | 차트 컴포넌트 5개 구현 | FE팀 | Pending |
| Day 11 | 통합 테스트 | QA팀 | Pending |
| Day 12 | 성능 최적화 | FE팀 | Pending |
| Day 13-14 | 최종 QA 및 배포 | 전체팀 | Pending |

---

**작성일**: 2025-10-25  
**다음 업데이트**: Week 1 완료 후
