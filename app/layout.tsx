import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from "@/contexts/SidebarContext";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";

export const metadata: Metadata = {
  title: "YoonStock Pro - 주식 데이터 모니터링",
  description: "실시간 주식 재무제표 및 주가 분석 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-slate-950">
        <SidebarProvider>
          <Sidebar />
          <MainContent>
            {children}
          </MainContent>
        </SidebarProvider>
      </body>
    </html>
  );
}
