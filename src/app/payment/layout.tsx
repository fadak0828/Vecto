import { notFound } from "next/navigation";
import { paymentsEnabled } from "@/lib/feature-flags";

/**
 * 결제 플래그 OFF 시 /payment/* 전체를 404로 차단.
 * 서버 컴포넌트 레이아웃이라 하위 client 페이지(/payment/complete)도 가드됨.
 */
export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!paymentsEnabled) {
    notFound();
  }
  return children;
}
