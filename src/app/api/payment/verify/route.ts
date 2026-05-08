import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceSupabase, getPortOnePayment } from "@/lib/portone";
import { validatePaymentAmount } from "@/lib/pricing";

/**
 * GET /api/payment/verify?paymentId=xxx
 *
 * 수동 결제 확인 (webhook 실패 안전망).
 * 클라이언트가 결제 완료 후 webhook이 안 오면 이 엔드포인트를 호출.
 * 서버가 PortOne API에 직접 확인하고 DB 업데이트.
 *
 * 구독 첫 charge의 경우 start_subscription RPC로 billing key 저장 + period 시작.
 * 구독 갱신 charge는 webhook에서만 처리 (verify 경로로 호출할 이유 없음).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 인증
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const paymentId = request.nextUrl.searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId가 필요합니다." },
      { status: 400 },
    );
  }

  const serviceSupabase = getServiceSupabase();

  const { data: payment } = await serviceSupabase
    .from("payments")
    .select(
      "id, namespace_id, amount, period_months, status, owner_id, subscription_id",
    )
    .eq("portone_payment_id", paymentId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json(
      { error: "결제 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // IDOR 방어
  if (payment.owner_id !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (payment.status === "paid") {
    return NextResponse.json({
      message: "이미 확인된 결제입니다.",
      status: "paid",
    });
  }

  // 1개월 무료 체험 (trial) flow 단락 처리:
  //   "1개월 무료로 시작하기" 는 PortOne 에서 빌링키만 발급하고 실제 charge 는
  //   30일 후로 schedule 한다. 그러면 payment.status 는 영원히 'pending' 으로
  //   남고 PortOne 측에서도 PAID 상태가 안 뜬다 (실제 결제가 없으니).
  //
  //   하지만 BillingKey.Issued webhook 이 start_trial RPC 로 subscription 을
  //   'trialing' 으로 전환해두므로, payment.subscription_id 의 상태가 trialing
  //   이면 무료 체험이 성공적으로 시작된 것 → 클라이언트 입장에서는 "성공".
  //
  //   webhook 이 늦게 도착하면 잠시 pending 으로 응답되겠지만, /payment/complete
  //   페이지가 5초 간격 6회 폴링하므로 webhook 도착 후 자연스럽게 trialing 감지.
  // 1개월 무료 체험 (trial) flow 단락 처리:
  //   "1개월 무료로 시작하기" 는 PortOne 에서 빌링키만 발급하고 실제 charge 는
  //   30일 후로 schedule 한다. 그러면 payment.status 는 영원히 'pending' 으로
  //   남고 PortOne 측에서도 PAID 상태가 안 뜬다 (실제 결제가 없으니).
  //
  //   하지만 BillingKey.Issued webhook 이 start_trial RPC 로 subscription 을
  //   'trialing' 으로 전환해두므로, payment.subscription_id 의 상태가 trialing
  //   이면 무료 체험이 성공적으로 시작된 것 → 클라이언트 입장에서는 "성공".
  //
  //   webhook 이 늦게 도착하면 잠시 pending 으로 응답되겠지만, /payment/complete
  //   페이지가 5초 간격 6회 폴링하므로 webhook 도착 후 자연스럽게 trialing 감지.
  if (payment.subscription_id) {
    const { data: sub } = await serviceSupabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("id", payment.subscription_id)
      .maybeSingle();
    if (sub?.status === "trialing") {
      return NextResponse.json({
        message: "무료 체험이 시작되었습니다.",
        status: "paid",
        paid_until: sub.current_period_end,
      });
    }
    if (sub?.status === "active") {
      return NextResponse.json({
        message: "구독이 활성화되었습니다.",
        status: "paid",
        paid_until: sub.current_period_end,
      });
    }
  }

  let portonePayment;
  try {
    portonePayment = await getPortOnePayment(paymentId);
  } catch {
    return NextResponse.json(
      { error: "결제 확인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  if (!portonePayment || portonePayment.status !== "PAID") {
    return NextResponse.json({
      message: "결제가 아직 완료되지 않았습니다.",
      status: "pending",
    });
  }

  // 금액 검증
  if (
    !validatePaymentAmount(payment.period_months, portonePayment.amount.total)
  ) {
    return NextResponse.json(
      { error: "결제 금액이 일치하지 않습니다." },
      { status: 400 },
    );
  }

  // Atomic pending → paid
  const nowIso = new Date().toISOString();
  const { data: updatedPayment } = await serviceSupabase
    .from("payments")
    .update({ status: "paid", paid_at: nowIso })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!updatedPayment) {
    return NextResponse.json({
      message: "이미 확인된 결제입니다.",
      status: "paid",
    });
  }

  // 구독 첫 charge
  if (payment.subscription_id) {
    if (portonePayment.billingKey) {
      await serviceSupabase
        .from("subscriptions")
        .update({
          portone_billing_key_id: portonePayment.billingKey,
          updated_at: nowIso,
        })
        .eq("id", payment.subscription_id);
    }

    const { data: newEnd } = await serviceSupabase.rpc("start_subscription", {
      p_subscription_id: payment.subscription_id,
      p_paid_at: portonePayment.paidAt ?? nowIso,
    });

    return NextResponse.json({
      message: "구독이 시작되었습니다.",
      status: "paid",
      paid_until: newEnd,
    });
  }

  // 레거시 period-pack 경로 (in-flight 하위 호환)
  const { data: ns } = await serviceSupabase
    .from("namespaces")
    .select("paid_until, payment_status")
    .eq("id", payment.namespace_id)
    .maybeSingle();

  const now = new Date();
  const baseDate =
    ns?.payment_status === "active" &&
    ns.paid_until &&
    new Date(ns.paid_until) > now
      ? new Date(ns.paid_until)
      : now;

  const { data: newPaidUntilData, error: rpcError } = await serviceSupabase.rpc(
    "add_months",
    { base_date: baseDate.toISOString(), months: payment.period_months },
  );

  let newPaidUntil: Date;
  if (rpcError || !newPaidUntilData) {
    newPaidUntil = new Date(baseDate);
    newPaidUntil.setMonth(newPaidUntil.getMonth() + payment.period_months);
  } else {
    newPaidUntil = new Date(newPaidUntilData);
  }

  await serviceSupabase
    .from("namespaces")
    .update({
      payment_status: "active",
      paid_until: newPaidUntil.toISOString(),
    })
    .eq("id", payment.namespace_id);

  return NextResponse.json({
    message: "결제가 확인되었습니다.",
    status: "paid",
    paid_until: newPaidUntil,
  });
}
