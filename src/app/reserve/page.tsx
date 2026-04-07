import { redirect } from "next/navigation";

/**
 * /reserve — DEPRECATED in v0.7.0 (Single SKU Freemium).
 *
 * 이전 모델: 결제 전에 이름만 임시 예약 (waitlist 패턴)
 * 새 모델: 무료 가입 = 즉시 namespace 소유 → 별도 예약 단계 불필요
 *
 * 기존 북마크/링크 보존을 위해 /dashboard로 영구 redirect.
 */
export default function ReservePage() {
  redirect("/dashboard");
}
