import { NextRequest, NextResponse } from "next/server";
import * as PortOne from "@portone/server-sdk";
import { getServiceSupabase, getPortOnePayment } from "@/lib/portone";
import { validatePaymentAmount } from "@/lib/pricing";

/**
 * POST /api/payment/webhook
 *
 * PortOne webhook 수신.
 * 1. Webhook 서명 검증 (위조/replay 방지)
 * 2. PortOne API로 결제 상태 재검증
 * 3. 금액 검증 (가격 조작 방지)
 * 4. Atomic DB 업데이트 (race condition 방지)
 *
 * 멱등성: portone_payment_id UNIQUE + atomic UPDATE WHERE status='pending' 으로 보장.
 */
export async function POST(request: NextRequest) {
  // 1. Webhook 서명 검증
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("PORTONE_WEBHOOK_SECRET이 설정되지 않았습니다");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  const rawBody = await request.text();
  let webhookBody: { data?: { paymentId?: string; transactionId?: string } };

  try {
    const verified = await PortOne.Webhook.verify(
      webhookSecret,
      rawBody,
      Object.fromEntries(request.headers.entries()),
    );
    webhookBody = verified as typeof webhookBody;
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  const paymentId =
    webhookBody.data?.paymentId || webhookBody.data?.transactionId;
  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();

  // 2. 우리 DB에서 pending payment 조회
  const { data: payment } = await supabase
    .from("payments")
    .select("id, namespace_id, amount, period_months, status")
    .eq("portone_payment_id", paymentId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
  }

  // 이미 처리된 결제 (멱등성)
  if (payment.status === "paid") {
    return NextResponse.json({ message: "Already processed" });
  }

  // 3. PortOne API로 실제 결제 상태 확인
  let portonePayment;
  try {
    portonePayment = await getPortOnePayment(paymentId);
  } catch (err) {
    console.error("PortOne API error:", err);
    return NextResponse.json(
      { error: "PortOne verification failed" },
      { status: 500 },
    );
  }

  if (!portonePayment || portonePayment.status !== "PAID") {
    return NextResponse.json(
      { error: "Payment not confirmed by PortOne" },
      { status: 400 },
    );
  }

  // 4. 금액 검증
  if (
    !validatePaymentAmount(payment.period_months, portonePayment.amount.total)
  ) {
    console.error(
      `Amount mismatch: expected ${payment.amount}, got ${portonePayment.amount.total}`,
    );
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // 5. Atomic UPDATE: status가 'pending'인 경우에만 'paid'로 변경
  // 동시 webhook/verify 호출 시 한 번만 성공
  const now = new Date();
  const { data: updatedPayment, error: paymentError } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: now.toISOString() })
    .eq("id", payment.id)
    .eq("status", "pending") // race condition 방지: pending 상태에서만 업데이트
    .select("id")
    .maybeSingle();

  if (paymentError) {
    console.error("Payment update error:", paymentError);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  // 다른 요청이 먼저 처리함 (race condition 방어)
  if (!updatedPayment) {
    return NextResponse.json({ message: "Already processed (race)" });
  }

  // 6. namespace 업데이트 — Postgres interval로 정확한 month 계산
  // setMonth() 사용 시 1월 31일 + 1개월 = 3월 3일 같은 버그 방지
  const { data: ns } = await supabase
    .from("namespaces")
    .select("paid_until, payment_status")
    .eq("id", payment.namespace_id)
    .maybeSingle();

  // 기존 paid_until이 미래면 거기서 연장, 아니면 지금부터
  const baseDate =
    ns?.payment_status === "active" &&
    ns.paid_until &&
    new Date(ns.paid_until) > now
      ? new Date(ns.paid_until)
      : now;

  // RPC로 Postgres interval 계산 (정확한 달력 처리)
  const { data: newPaidUntilData, error: rpcError } = await supabase.rpc(
    "add_months",
    {
      base_date: baseDate.toISOString(),
      months: payment.period_months,
    },
  );

  // RPC 미설정 시 fallback: JS로 계산 (덜 정확하지만 동작)
  let newPaidUntil: Date;
  if (rpcError || !newPaidUntilData) {
    newPaidUntil = new Date(baseDate);
    newPaidUntil.setMonth(newPaidUntil.getMonth() + payment.period_months);
  } else {
    newPaidUntil = new Date(newPaidUntilData);
  }

  const { error: nsError } = await supabase
    .from("namespaces")
    .update({
      payment_status: "active",
      paid_until: newPaidUntil.toISOString(),
    })
    .eq("id", payment.namespace_id);

  if (nsError) {
    console.error("Namespace update error:", nsError);
    return NextResponse.json(
      { error: "Namespace update failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "OK", paid_until: newPaidUntil });
}
