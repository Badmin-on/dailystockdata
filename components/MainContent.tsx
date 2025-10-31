'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { ReactNode } from 'react';

export default function MainContent({ children }: { children: ReactNode }) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <main
      className={`min-h-screen transition-all duration-300
        lg:${collapsed ? 'ml-20' : 'ml-64'}
        ml-0
      `}
      style={{
        width: typeof window !== 'undefined' && window.innerWidth >= 1024
          ? (collapsed ? 'calc(100vw - 5rem)' : 'calc(100vw - 16rem)')
          : '100vw',
      }}
    >
      {/* 모바일 햄버거 메뉴 버튼 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gradient-to-b from-slate-900 to-slate-800 border-b border-slate-700/50 flex items-center px-4 z-30">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Bars3Icon className="w-6 h-6 text-white" />
        </button>
        <div className="ml-3 flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">Y</span>
          </div>
          <div>
            <span className="text-white font-bold text-lg">YoonStock</span>
            <span className="text-xs text-slate-400 ml-1">Pro</span>
          </div>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="w-full h-full lg:pt-0 pt-14">
        {children}
      </div>
    </main>
  );
}
