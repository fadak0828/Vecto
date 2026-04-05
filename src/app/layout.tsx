import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "좌표.to — 짧고 의미있는 한글 URL",
  description:
    "한글로 된 짧고 의미있는 URL을 만드세요. 좌표.to/go/오늘강의 처럼 누구나 기억하고 입력할 수 있는 주소.",
  openGraph: {
    title: "좌표.to — 짧고 의미있는 한글 URL",
    description:
      "한글로 된 짧고 의미있는 URL을 만드세요. 강의실, 명함, 전단지에서 바로 쓸 수 있습니다.",
    siteName: "좌표.to",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistMono.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
