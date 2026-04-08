import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase-server";
import { getServiceSupabase } from "@/lib/portone";
import { MONTHLY_PRICE } from "@/lib/pricing";

/**
 * POST /api/payment/prepare
 *
 * 구독 결제 준비: paymentId 생성 + pending subscription 생성.
 * 클라이언트는 이 응답으로 PortOne SDK(IssueBillingKeyAndPay)를 호출합니다.
 *
 * 기존 period-pack 모드는 제거됨. 이제 단일 SKU ₩2,900/월 구독만 지원.
 *
 * Returns: { paymentId, amount, orderName, namespaceId, subscriptionId, customerName }
 *
 * customerName 은 PortOne SDK 의 customer.fullName 에 그대로 전달됩니다.
 * KPN 등 일부 PG 는 빌링키 발급 시 구매자 이름을 필수로 요구하므로 누락하면 400.
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();

  // 1. 인증
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 2. namespace 확인
  const { data: ns } = await supabase
    .from("namespaces")
    .select("id, name, payment_status")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!ns) {
    return NextResponse.json(
      { error: "네임스페이스가 없습니다. 먼저 네임스페이스를 생성하세요." },
      { status: 400 },
    );
  }

  const serviceSupabase = getServiceSupabase();

  // 3. 이미 활성 구독이 있는지 확인 (subs_one_active_per_user UNIQUE INDEX가 DB 레벨 방어)
  // Staleness cleanup: BillingKey.Failed webhook이 도착하지 않은 pending 구독이
  // 사용자를 영구적으로 lock-out 시키지 않도록, 15분 이상 묵은 pending은 정리.
  const { data: existingActive } = await serviceSupabase
    .from("subscriptions")
    .select("id, status, created_at")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "pending"])
    .maybeSingle();

  if (existingActive) {
    if (existingActive.status === "pending") {
      const ageMs =
        Date.now() - new Date(existingActive.created_at).getTime();
      if (ageMs > 15 * 60 * 1000) {
        // Stale pending → cleanup. payment row도 함께 (FK SET NULL이라 안전).
        await serviceSupabase
          .from("payments")
          .delete()
          .eq("subscription_id", existingActive.id)
          .eq("status", "pending");
        await serviceSupabase
          .from("subscriptions")
          .delete()
          .eq("id", existingActive.id);
        // Fall through — proceed to create fresh pending
      } else {
        return NextResponse.json(
          {
            error: "이미 진행 중인 결제가 있습니다. 잠시 후 다시 시도하세요.",
          },
          { status: 409 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "이미 활성 구독이 있습니다." },
        { status: 409 },
      );
    }
  }

  // 4. paymentId 생성 — 추측 불가능한 랜덤 값.
  // PortOne paymentId 는 MAX_LENGTH 32. 'jw_' (3) + randomBytes(12).hex (24) = 27자.
  // 이전 'jwapyo_' (7) + randomBytes(16).hex (32) = 39자는 chargeBillingKey 에서 INVALID_REQUEST 400.
  const paymentId = `jw_${randomBytes(12).toString("hex")}`;
  const orderName = `좌표.to/${ns.name} 프리미엄 구독 (첫 결제)`;

  // 5. pending subscription 생성 — current_period_*는 첫 charge 성공 후 start_subscription RPC가 채움
  const { data: newSub, error: subError } = await serviceSupabase
    .from("subscriptions")
    .insert({
      user_id: user.id,
      namespace_id: ns.id,
      status: "pending",
      failed_charge_count: 0,
    })
    .select("id")
    .maybeSingle();

  if (subError || !newSub) {
    return NextResponse.json(
      { error: "구독 준비 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  // 6. pending payment 생성 — period_months=1 (월 구독 단위), subscription_id 연결
  const { error: insertError } = await serviceSupabase.from("payments").insert({
    namespace_id: ns.id,
    owner_id: user.id,
    subscription_id: newSub.id,
    portone_payment_id: paymentId,
    amount: MONTHLY_PRICE,
    period_months: 1,
    status: "pending",
  });

  if (insertError) {
    // rollback pending subscription
    await serviceSupabase.from("subscriptions").delete().eq("id", newSub.id);
    return NextResponse.json(
      { error: "결제 준비 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    paymentId,
    amount: MONTHLY_PRICE,
    orderName,
    namespaceId: ns.id,
    subscriptionId: newSub.id,
    customerName: ns.name,
  });
}
