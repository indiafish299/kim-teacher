import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "선배교사 김선생 — 교사를 위한 AI 업무 파트너",
  description:
    "가정통신문·공문 초안, 수업 자료, 생활기록부 문구, 업무 상담까지. 20년차 선배 교사처럼 도와주는 AI 비서입니다.",
  openGraph: {
    title: "선배교사 김선생",
    description: "가정통신문, 수업 자료, 생기부 문구, 업무 상담을 함께하는 교사용 AI 비서",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#16181a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%23146150'/%3E%3Ctext x='50' y='68' font-size='56' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'%3E김%3C/text%3E%3C/svg%3E"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
