/**
 * 기능 플래그.
 *
 * 현재 용도: 결제 연동(PG 심사/계약)이 완료되기 전까지 결제 관련 UI를
 * 일괄 숨기기 위한 토글. 서버/클라이언트 양쪽에서 import 가능하도록
 * NEXT_PUBLIC_ prefix 사용. 값이 "true"일 때만 결제 UI 렌더링.
 *
 * API 라우트(/api/payment/*, /api/cron/expire, webhook)는 이 플래그의
 * 영향을 받지 않음. UI만 감추고 백엔드는 그대로 둔다 — 결제 연동이
 * 끝나면 ENV 값만 "true"로 바꿔 재배포.
 */
export const paymentsEnabled =
  (process.env.NEXT_PUBLIC_PAYMENTS_ENABLED ?? "").trim() === "true";
