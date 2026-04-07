/**
 * PortOne 서버 유틸리티
 *
 * webhook/cron에서 사용하는 service_role Supabase client와
 * PortOne API 호출 헬퍼.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _serviceClient: SupabaseClient | null = null;

/**
 * RLS를 바이패스하는 service_role client.
 * webhook, cron 등 사용자 세션이 없는 서버 라우트에서만 사용.
 * 절대 클라이언트에 노출하지 말 것.
 */
export function getServiceSupabase(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY가 필요합니다. .env.local을 확인하세요.",
    );
  }

  _serviceClient = createClient(url, key);
  return _serviceClient;
}

/**
 * PortOne API Payment 응답 (subset — subscription 관련 필드 포함)
 * SDK 타입: PaidPayment + FailedPayment + etc.
 */
export type PortOnePaymentResponse = {
  status: string;
  amount: { total: number };
  id: string;
  /** 결제 예약(scheduler)으로 실행된 charge인 경우에만 존재 — 구독 갱신 식별 */
  scheduleId?: string;
  /** 빌링키 결제인 경우에만 존재 — 구독 매핑용 */
  billingKey?: string;
  /** 결제 완료 시각 (RFC 3339) */
  paidAt?: string;
} | null;

/**
 * PortOne API로 결제 상태 조회
 * https://developers.portone.io/opi/ko/api/payment
 *
 * subscription 갱신 식별에 쓰는 scheduleId + billingKey 필드를 노출.
 */
export async function getPortOnePayment(
  paymentId: string,
): Promise<PortOnePaymentResponse> {
  const apiSecret = process.env.PORTONE_API_SECRET;
  if (!apiSecret) {
    throw new Error("PORTONE_API_SECRET이 필요합니다.");
  }

  const res = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`PortOne API error: ${res.status}`);
  }

  return res.json();
}

/**
 * PortOne API로 결제 취소(환불)
 */
export async function cancelPortOnePayment(
  paymentId: string,
  reason: string,
): Promise<boolean> {
  const apiSecret = process.env.PORTONE_API_SECRET;
  if (!apiSecret) {
    throw new Error("PORTONE_API_SECRET이 필요합니다.");
  }

  const res = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );

  return res.ok;
}

/**
 * PortOne API로 billing key 정보 조회.
 * 빌링키에 연결된 customer.customerId, customData, issueId 등을 가져옴.
 * https://developers.portone.io/api/rest-v2/billingKey#get-billing-keys-billing-key
 *
 * 핵심 사용처: BillingKey.Issued webhook에서 billingKey를 받았을 때
 * issueId(우리 paymentId)를 추출해서 pending subscription과 매핑.
 */
export type BillingKeyInfoResponse = {
  status: string;
  billingKey: string;
  /** 고객사가 채번한 빌링키 발급 고유 아이디 = 우리 paymentId */
  issueId?: string;
  customer?: { customerId?: string };
  customData?: string;
} | null;

export async function getBillingKey(
  billingKey: string,
): Promise<BillingKeyInfoResponse> {
  const apiSecret = process.env.PORTONE_API_SECRET;
  if (!apiSecret) {
    throw new Error("PORTONE_API_SECRET이 필요합니다.");
  }

  const res = await fetch(
    `https://api.portone.io/billing-keys/${encodeURIComponent(billingKey)}`,
    {
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`PortOne billing-key API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Billing key 이용 결제 (첫 charge 또는 수동 charge).
 * PortOne이 scheduleId 없이 처리하며, 반환되는 paymentId가 webhook 발화 시 동일하게 전달됨.
 * https://developers.portone.io/api/rest-v2/payment#post-billing-keys-pay
 */
export async function chargeBillingKey(params: {
  billingKey: string;
  paymentId: string;
  orderName: string;
  amount: number;
  currency?: string;
}): Promise<boolean> {
  const apiSecret = process.env.PORTONE_API_SECRET;
  if (!apiSecret) {
    throw new Error("PORTONE_API_SECRET이 필요합니다.");
  }

  const res = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(params.paymentId)}/billing-key`,
    {
      method: "POST",
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        billingKey: params.billingKey,
        orderName: params.orderName,
        amount: { total: params.amount },
        currency: params.currency ?? "KRW",
      }),
    },
  );

  if (!res.ok) {
    console.error(
      `chargeBillingKey failed: status=${res.status} body=${await res.text()}`,
    );
    return false;
  }
  return true;
}

/**
 * PortOne billing key로 등록된 모든 결제 예약(schedule) 취소.
 * subscription 해지 시 호출.
 * https://developers.portone.io/api/rest-v2/payment.paymentSchedule#revoke-payment-schedules
 */
export async function revokeBillingKeySchedules(
  billingKey: string,
): Promise<boolean> {
  const apiSecret = process.env.PORTONE_API_SECRET;
  if (!apiSecret) {
    throw new Error("PORTONE_API_SECRET이 필요합니다.");
  }

  const res = await fetch(
    `https://api.portone.io/payment-schedules?billingKey=${encodeURIComponent(billingKey)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        "Content-Type": "application/json",
      },
    },
  );

  // 예약 건이 없어도 404가 아닌 200 반환하는 게 정상. 404도 허용 (already revoked).
  return res.ok || res.status === 404;
}

/**
 * PortOne billing key 삭제.
 * subscription 완전 정리 (cancel 후 재사용 불가 상태로).
 */
export async function deleteBillingKey(
  billingKey: string,
  reason: string,
): Promise<boolean> {
  const apiSecret = process.env.PORTONE_API_SECRET;
  if (!apiSecret) {
    throw new Error("PORTONE_API_SECRET이 필요합니다.");
  }

  const res = await fetch(
    `https://api.portone.io/billing-keys/${encodeURIComponent(billingKey)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );

  return res.ok;
}
