'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStackIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    name: '대시보드',
    path: '/dashboard',
    icon: HomeIcon
  },
  {
    name: '🎯 투자 기회 발굴',
    path: '/investment-finder',
    icon: ArrowTrendingUpIcon,
    badge: 'HOT'
  },
  {
    name: '실시간 모니터링',
    path: '/monitor',
    icon: ChartBarIcon
  },
  {
    name: '수집 현황',
    path: '/collection-status',
    icon: ArrowPathIcon,
    badge: 'NEW'
  },
  {
    name: '종목 비교',
    path: '/stock-comparison',
    icon: CircleStackIcon
  },
  {
    name: '날짜별 비교',
    path: '/date-comparison',
    icon: CalendarDaysIcon
  },
  {
    name: '투자 기회 (구버전)',
    path: '/opportunities',
    icon: ArrowTrendingUpIcon
  },
  {
    name: '히스토리',
    path: '/history',
    icon: ClockIcon
  },
  {
    name: '설정',
    path: '/settings',
    icon: Cog6ToothIcon
  }
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* 사이드바 */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* 로고 영역 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Y</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-tight">YoonStock</span>
                <span className="text-xs text-slate-400">Pro Analytics</span>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {collapsed ? (
              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>

        {/* 메뉴 영역 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                {!collapsed && (
                  <>
                    <span className="ml-3 font-medium">{item.name}</span>
                    {item.badge && (
                      <span className={`ml-auto px-2 py-0.5 text-xs font-semibold rounded-full ${
                        item.badge === 'HOT' 
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse' 
                          : item.badge === 'NEW'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 하단 정보 영역 */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-700/50">
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg p-3 border border-blue-500/20">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">데이터</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300">실시간 연동</p>
                  <p className="text-xs text-slate-500">Supabase DB</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* 메인 컨텐츠 영역을 위한 패딩 */}
      <div className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {/* 여기에 페이지 컨텐츠가 들어갑니다 */}
      </div>
    </>
  );
}
