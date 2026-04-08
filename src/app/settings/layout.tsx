import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "설정 — 좌표.to",
  description: "프로필 이미지, 이름, 한 줄 소개, 링크를 편집하세요.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
