import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceSupabase, revokeBillingKeySchedules } from "@/lib/portone";

/**
 * POST /api/subscription/cancel
 *
 * 구독 해지.
 * 1. 인증 + IDOR guard (cancel_subscription RPC 내부에서 user_id 체크)
 * 2. cancel_subscription RPC 원자적 호출 → status='canceled', billing_key 반환
 * 3. PortOne 결제 예약 취소 (billing key 기반)
 *
 * 중요: namespaces.payment_status 건드리지 않음 — 사용자는 current_period_end까지
 * 유료 상태 유지 (일할 환불 없음, MVP 단순화).
 *
 * Body: { subscription_id: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: { subscription_id?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  if (!body.subscription_id) {
    return NextResponse.json(
      { error: "subscription_id가 필요합니다." },
      { status: 422 },
    );
  }

  const serviceSupabase = getServiceSupabase();

  // ENG-H1: Atomic cancel_subscription RPC.
  // IDOR guard는 RPC 내부 (WHERE user_id = p_user_id).
  // 반환값: billing_key (PortOne unschedule용) 또는 NULL (권한 없음/이미 취소).
  const { data: billingKey, error: rpcError } = await serviceSupabase.rpc(
    "cancel_subscription",
    {
      p_subscription_id: body.subscription_id,
      p_user_id: user.id,
      p_reason: body.reason ?? null,
    },
  );

  if (rpcError) {
    console.error("cancel_subscription RPC error:", rpcError);
    return NextResponse.json(
      { error: "구독 해지 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  if (billingKey === null || billingKey === undefined) {
    // RPC이 NULL 반환 = 권한 없음 or 이미 취소됨 or 존재 안 함
    return NextResponse.json(
      { error: "해지할 수 있는 구독을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // PortOne 예약 취소 — 실패해도 DB 상태는 canceled 유지 (reconciliation은 cron에서)
  try {
    const revoked = await revokeBillingKeySchedules(billingKey);
    if (!revoked) {
      console.warn(
        JSON.stringify({
          event: "subscription.cancel.portone_revoke_failed",
          sub_id: body.subscription_id,
          message:
            "DB에서는 canceled 상태이지만 PortOne 예약 취소 실패. reconciliation 필요.",
        }),
      );
    }
  } catch (err) {
    console.error("revokeBillingKeySchedules error:", err);
    // DB는 이미 canceled 상태 — 사용자에게 성공 응답 주고 운영자가 후처리
  }

  console.log(
    JSON.stringify({
      event: "subscription.canceled",
      sub_id: body.subscription_id,
    }),
  );

  return NextResponse.json({
    message: "구독이 해지되었습니다. 현재 결제 기간까지는 계속 이용 가능합니다.",
  });
}
