import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대시보드 — 좌표.to",
  description: "내 좌표, 구독, 링크를 한 곳에서 관리하세요.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
