import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase-server";
import { getServiceSupabase } from "@/lib/portone";
import { getPlan } from "@/lib/pricing";

/**
 * POST /api/payment/prepare
 *
 * 결제 준비: paymentId 생성 + 금액 검증.
 * 클라이언트는 이 응답으로 PortOne SDK를 호출합니다.
 *
 * Body: { period_months: 3 | 6 | 12 }
 * Returns: { paymentId, amount, orderName, namespaceId }
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

  // 요청 파싱
  let body: { period_months?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const periodMonths = body.period_months;
  if (!periodMonths) {
    return NextResponse.json(
      { error: "period_months가 필요합니다." },
      { status: 422 },
    );
  }

  // 플랜 검증
  const plan = getPlan(periodMonths);
  if (!plan) {
    return NextResponse.json(
      { error: "유효하지 않은 기간입니다. 3, 6, 12개월만 가능합니다." },
      { status: 422 },
    );
  }

  // namespace 확인
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

  // paymentId 생성 — 추측 불가능한 랜덤 값 (PII 노출 방지 + 보안)
  const paymentId = `jwapyo_${randomBytes(16).toString("hex")}`;
  const orderName = `좌표.to/${ns.name} ${plan.label} 이용권`;

  // pending payment 기록 — service_role 사용 (RLS INSERT 허용 안 함)
  const serviceSupabase = getServiceSupabase();
  const { error: insertError } = await serviceSupabase.from("payments").insert({
    namespace_id: ns.id,
    owner_id: user.id,
    portone_payment_id: paymentId,
    amount: plan.price,
    period_months: periodMonths,
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json(
      { error: "결제 준비 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    paymentId,
    amount: plan.price,
    orderName,
    namespaceId: ns.id,
  });
}
