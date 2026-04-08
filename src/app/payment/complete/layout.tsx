import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 확인 — 좌표.to",
  description: "결제를 확인하고 있습니다.",
  robots: { index: false, follow: false },
};

export default function PaymentCompleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
