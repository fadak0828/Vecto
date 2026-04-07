import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceSupabase, cancelPortOnePayment } from "@/lib/portone";

/**
 * POST /api/payment/refund
 *
 * 환불 처리 (현재 구현: 7일 이내 전액 환불).
 *
 * 전자상거래법 기준:
 * - 구매 후 7일 이내: 전액 환불 (현재 구현)
 * - 구매 후 7일 이후: 환불 불가
 *
 * 일할 환불(잔여 기간 비례)은 미구현. 추후 PR에서 추가 예정.
 *
 * Body: { payment_id: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: { payment_id?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  if (!body.payment_id) {
    return NextResponse.json(
      { error: "payment_id가 필요합니다." },
      { status: 422 },
    );
  }

  const serviceSupabase = getServiceSupabase();

  // 결제 조회 — ENG-C2: subscription_id 필수 SELECT
  const { data: payment } = await serviceSupabase
    .from("payments")
    .select(
      "id, namespace_id, portone_payment_id, amount, status, paid_at, owner_id, subscription_id",
    )
    .eq("id", body.payment_id)
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

  // ENG-C2: 구독 charge 환불 loophole plug.
  // 구독 갱신/첫 charge는 이 엔드포인트로 환불 불가 — 구독 해지 플로우를 써야 함.
  if (payment.subscription_id) {
    return NextResponse.json(
      {
        error:
          "구독 결제는 이 방법으로 환불할 수 없습니다. 대시보드에서 구독 해지를 이용하세요.",
      },
      { status: 400 },
    );
  }

  if (payment.status !== "paid") {
    return NextResponse.json(
      { error: "환불 가능한 결제가 아닙니다." },
      { status: 400 },
    );
  }

  // 7일 이내 확인
  const paidAt = new Date(payment.paid_at!);
  const daysSincePaid = Math.floor(
    (Date.now() - paidAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSincePaid > 7) {
    return NextResponse.json(
      { error: "구매 후 7일이 경과하여 환불이 불가합니다." },
      { status: 400 },
    );
  }

  // 1. atomic UPDATE: status를 'paid' → 'refunding'로 전환
  // 동시 환불 요청 방지 + 크래시 시 reconciliation 가능
  const { data: refundingPayment } = await serviceSupabase
    .from("payments")
    .update({ status: "refunding" })
    .eq("id", payment.id)
    .eq("status", "paid")
    .select("id")
    .maybeSingle();

  if (!refundingPayment) {
    return NextResponse.json(
      { error: "이미 환불 처리 중이거나 환불된 결제입니다." },
      { status: 409 },
    );
  }

  // 2. PortOne 환불 API 호출
  const reason = body.reason || "사용자 환불 요청";
  const success = await cancelPortOnePayment(
    payment.portone_payment_id,
    reason,
  );

  if (!success) {
    // 롤백: PortOne 환불 실패 시 status를 다시 paid로
    await serviceSupabase
      .from("payments")
      .update({ status: "paid" })
      .eq("id", payment.id);

    return NextResponse.json(
      { error: "환불 처리 중 오류가 발생했습니다. 고객센터에 문의해주세요." },
      { status: 500 },
    );
  }

  // 3. PortOne 환불 성공 → DB 최종 업데이트
  await serviceSupabase
    .from("payments")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", payment.id);

  // namespace를 free로 변경 (namespace가 존재할 때만)
  if (payment.namespace_id) {
    await serviceSupabase
      .from("namespaces")
      .update({ payment_status: "free", paid_until: null })
      .eq("id", payment.namespace_id);
  }

  return NextResponse.json({
    message: "환불이 완료되었습니다.",
    refunded_amount: payment.amount,
  });
}
