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
 * PortOne API로 결제 상태 조회
 * https://developers.portone.io/opi/ko/api/payment
 */
export async function getPortOnePayment(paymentId: string): Promise<{
  status: string;
  amount: { total: number };
  id: string;
} | null> {
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
