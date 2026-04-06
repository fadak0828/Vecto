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
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 인증 확인
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

  // service_role로 payment 조회 (RLS 바이패스)
  const serviceSupabase = getServiceSupabase();

  const { data: payment } = await serviceSupabase
    .from("payments")
    .select("id, namespace_id, amount, period_months, status, owner_id")
    .eq("portone_payment_id", paymentId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json(
      { error: "결제 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // 본인 결제인지 확인
  if (payment.owner_id !== user.id) {
    return NextResponse.json(
      { error: "권한이 없습니다." },
      { status: 403 },
    );
  }

  // 이미 처리됨
  if (payment.status === "paid") {
    return NextResponse.json({
      message: "이미 확인된 결제입니다.",
      status: "paid",
    });
  }

  // PortOne에서 결제 상태 확인
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

  // DB 업데이트 — atomic UPDATE WHERE status='pending' (race condition 방지)
  const now = new Date();
  const { data: updatedPayment } = await serviceSupabase
    .from("payments")
    .update({ status: "paid", paid_at: now.toISOString() })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!updatedPayment) {
    // 다른 요청(webhook 등)이 먼저 처리함
    return NextResponse.json({
      message: "이미 확인된 결제입니다.",
      status: "paid",
    });
  }

  // 기존 만료일 이후 연장 로직 (Postgres add_months로 정확한 달력 계산)
  const { data: ns } = await serviceSupabase
    .from("namespaces")
    .select("paid_until, payment_status")
    .eq("id", payment.namespace_id)
    .maybeSingle();

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
