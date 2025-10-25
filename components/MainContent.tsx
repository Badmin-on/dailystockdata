'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import { ReactNode } from 'react';

export default function MainContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main
      className={`min-h-screen transition-all duration-300 ${
        collapsed ? 'ml-20' : 'ml-64'
      }`}
      style={{
        width: collapsed ? 'calc(100vw - 5rem)' : 'calc(100vw - 16rem)',
      }}
    >
      <div className="w-full h-full">
        {children}
      </div>
    </main>
  );
}
