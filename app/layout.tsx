import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YoonStock - 주식 데이터 모니터링",
  description: "실시간 주식 재무제표 및 주가 분석 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
