import { NextRequest, NextResponse } from "next/server";
import * as PortOne from "@portone/server-sdk";
import {
  getServiceSupabase,
  getPortOnePayment,
  schedulePayment,
  getBillingKey,
} from "@/lib/portone";
import { validatePaymentAmount, MONTHLY_PRICE } from "@/lib/pricing";

/**
 * POST /api/payment/webhook
 *
 * PortOne V2 webhook 수신. 5개 이벤트 분기:
 *   1. Transaction.Paid (no scheduleId, payment in DB) → 첫 charge confirm
 *      - payment.subscription_id 있으면 구독 첫 charge → start_subscription RPC
 *      - 없으면 레거시 period-pack charge (하위 호환)
 *   2. Transaction.Paid (scheduleId 존재, payment NOT in DB) → 구독 갱신 charge
 *      → billingKey로 subscription 매핑 → process_subscription_charge RPC (idempotent)
 *   3. Transaction.Failed (scheduleId 존재) → past_due 전환
 *   4. BillingKey.Issued → 로그만 (구독 activation은 Transaction.Paid 경로에서)
 *   5. BillingKey.Failed → pending subscription → 'failed' 상태 전환
 *
 * 보안:
 * - 서명 검증 (`PortOne.Webhook.verify`) — 모든 이벤트 타입에 동일하게 적용.
 * - PortOne API로 결제 상태 재검증 (Transaction.* 이벤트만).
 * - 금액 검증 (구독 ₩2,900 또는 레거시 3/6/12개월).
 * - 멱등성: payments.portone_payment_id UNIQUE + RPC 내부 IF NOT FOUND THEN RETURN.
 */
export async function POST(request: NextRequest) {
  // 1. Webhook 서명 검증
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("PORTONE_WEBHOOK_SECRET이 설정되지 않았습니다");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  const rawBody = await request.text();
  let webhookBody: {
    type?: string;
    data?: {
      paymentId?: string;
      transactionId?: string;
      billingKey?: string;
    };
  };

  try {
    const verified = await PortOne.Webhook.verify(
      webhookSecret,
      rawBody,
      Object.fromEntries(request.headers.entries()),
    );
    webhookBody = verified as typeof webhookBody;
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = webhookBody.type;
  const supabase = getServiceSupabase();

  // === BillingKey.Ready === (발급창 열림, 무시)
  if (eventType === "BillingKey.Ready") {
    return NextResponse.json({ message: "OK" });
  }

  // === BillingKey.Issued ===
  // PortOne webhook payload: { billingKey, storeId } — issueId 없음.
  // 매핑 방법: PortOne API GET /billing-keys/{billingKey} 호출 → IssuedBillingKeyInfo 응답에서
  // issueId(우리 paymentId) 또는 customer.customerId(paymentId)를 추출 → DB lookup.
  if (eventType === "BillingKey.Issued") {
    const billingKey = webhookBody.data?.billingKey;

    if (!billingKey) {
      console.error("BillingKey.Issued missing billingKey");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // PortOne API에서 billing key 정보 조회 (issueId/customerId 추출용)
    let billingKeyInfo;
    try {
      billingKeyInfo = await getBillingKey(billingKey);
    } catch (err) {
      console.error("getBillingKey API error:", err);
      return NextResponse.json(
        { error: "Billing key fetch failed" },
        { status: 500 },
      );
    }

    if (!billingKeyInfo) {
      console.error(`BillingKey.Issued for unknown billingKey: ${billingKey}`);
      return NextResponse.json(
        { error: "Billing key not found in PortOne" },
        { status: 404 },
      );
    }

    // issueId 우선, customerId 보조 — 둘 다 우리 paymentId
    const correlationId =
      billingKeyInfo.issueId ?? billingKeyInfo.customer?.customerId;

    if (!correlationId) {
      console.error(
        JSON.stringify({
          event: "billing_key.issued.no_correlation",
          billingKeyHasIssueId: !!billingKeyInfo.issueId,
          billingKeyHasCustomer: !!billingKeyInfo.customer,
        }),
      );
      return NextResponse.json(
        { error: "Cannot correlate billing key to payment" },
        { status: 400 },
      );
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("id, subscription_id, amount, namespace_id")
      .eq("portone_payment_id", correlationId)
      .maybeSingle();

    if (!payment || !payment.subscription_id) {
      console.error(
        `BillingKey.Issued for unknown payment: ${correlationId}`,
      );
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    // ENG-C3 fix: billing_key_id update 실패 시 500 반환 (절대 silent하게 진행 금지)
    // .is(null) 조건은 idempotency guard — 이미 같은 키로 set되어 있으면 0 rows update
    // (no error)이고 그 경우는 retry이므로 charge를 또 시도하지 않음.
    const nowIso = new Date().toISOString();
    const { data: updatedSub, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        portone_billing_key_id: billingKey,
        updated_at: nowIso,
      })
      .eq("id", payment.subscription_id)
      .is("portone_billing_key_id", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("billing_key_id update failed:", updateError);
      return NextResponse.json(
        { error: "DB update failed" },
        { status: 500 },
      );
    }

    // updatedSub === null → 이미 billing key가 설정됨 (retry). 첫 charge도 이미 시도됐을
    // 가능성이 큼 → chargeBillingKey 재호출 안 함. PortOne 측에서 paymentId 중복 거부.
    if (!updatedSub) {
      console.log(
        JSON.stringify({
          event: "billing_key.issued.retry",
          sub_id: payment.subscription_id,
        }),
      );
      return NextResponse.json({ message: "Already processed" });
    }

    // 1개월 무료 체험 flow:
    //   1. PortOne에 +30d 결제 예약 생성 (schedulePayment)
    //   2. 성공 시 start_trial RPC → subscription status='trialing', period_end=trial_end
    //   3. 실패 시 billing_key_id NULL 롤백, status='failed' (ENG A6 fix — 영구 trialing 방지)
    // D+30에 PortOne scheduler가 charge → Transaction.Paid webhook → process_subscription_charge
    const { data: ns } = await supabase
      .from("namespaces")
      .select("name")
      .eq("id", payment.namespace_id)
      .maybeSingle();

    const trialDays = 30;
    const payAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const scheduled = await schedulePayment({
      billingKey,
      paymentId: correlationId,
      payAt,
      orderName: `좌표.to/${ns?.name ?? "premium"} 프리미엄 (첫 결제, 무료 체험 후)`,
      amount: MONTHLY_PRICE,
    });

    if (!scheduled) {
      // ENG A6 FIX: schedulePayment 실패 시 billing_key_id 롤백 + status='failed'.
      // 사용자는 /pricing 에러 화면에서 재시도 가능. 영구 trialing 방지.
      await supabase
        .from("subscriptions")
        .update({
          portone_billing_key_id: null,
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.subscription_id);
      console.error(
        JSON.stringify({
          event: "subscription.schedule.failed",
          sub_id: payment.subscription_id,
          billing_key: billingKey.substring(0, 8) + "...",
        }),
      );
      return NextResponse.json(
        { error: "Schedule creation failed" },
        { status: 500 },
      );
    }

    // start_trial RPC — pending → trialing, period_end = now+30d
    const { data: trialEnd, error: trialError } = await supabase.rpc(
      "start_trial",
      { p_subscription_id: payment.subscription_id, p_trial_days: trialDays },
    );

    if (trialError || !trialEnd) {
      console.error("start_trial RPC failed:", trialError);
      // 복구 어려움: schedule은 PortOne에 존재, sub는 pending. 수동 reconciliation 필요.
      return NextResponse.json(
        { error: "Trial start failed" },
        { status: 500 },
      );
    }

    console.log(
      JSON.stringify({
        event: "subscription.trial.started",
        sub_id: payment.subscription_id,
        trial_end: trialEnd,
      }),
    );
    return NextResponse.json({ message: "OK", trial_end: trialEnd });
  }

  // === BillingKey.Failed ===
  // 이슈: webhook payload는 billingKey만 포함. 발급 실패 시 PortOne이 실제 billing key를
  // 만들지 않을 가능성 → API 조회 실패 가능. 그래서 best-effort 매핑:
  //   1. PortOne API로 조회 시도
  //   2. 성공하면 issueId/customerId로 pending sub 찾아 'failed' 전환
  //   3. 실패하면 로그만 남기고 200 반환 — /prepare 엔드포인트의 staleness cleanup이
  //      15분 후 pending row를 정리해서 사용자 retry 허용
  if (eventType === "BillingKey.Failed") {
    const billingKey = webhookBody.data?.billingKey;
    if (!billingKey) {
      return NextResponse.json({ message: "OK" });
    }

    try {
      const billingKeyInfo = await getBillingKey(billingKey);
      const correlationId =
        billingKeyInfo?.issueId ?? billingKeyInfo?.customer?.customerId;

      if (correlationId) {
        const { data: payment } = await supabase
          .from("payments")
          .select("subscription_id")
          .eq("portone_payment_id", correlationId)
          .maybeSingle();

        if (payment?.subscription_id) {
          await supabase
            .from("subscriptions")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.subscription_id)
            .in("status", ["pending"]);
        }
      }
    } catch (err) {
      console.warn("BillingKey.Failed correlation failed:", err);
      // Best-effort — staleness cleanup in /prepare handles unrecoverable cases
    }

    console.log(
      JSON.stringify({ event: "billing_key.failed", logged: true }),
    );
    return NextResponse.json({ message: "OK" });
  }

  // === Transaction.* 이벤트 처리 ===
  const paymentId =
    webhookBody.data?.paymentId || webhookBody.data?.transactionId;
  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

  // PortOne API로 실제 결제 조회 (scheduleId, billingKey 포함)
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

  if (!portonePayment) {
    return NextResponse.json(
      { error: "Payment not found in PortOne" },
      { status: 404 },
    );
  }

  // === Transaction.Failed ===
  if (eventType === "Transaction.Failed") {
    // scheduleId 있으면 구독 갱신 실패 → past_due
    if (portonePayment.scheduleId && portonePayment.billingKey) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, failed_charge_count")
        .eq("portone_billing_key_id", portonePayment.billingKey)
        .maybeSingle();

      if (sub) {
        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            past_due_since: new Date().toISOString(),
            failed_charge_count: (sub.failed_charge_count ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id)
          .in("status", ["active", "past_due"]);

        console.log(
          JSON.stringify({
            event: "subscription.charge.failed",
            sub_id: sub.id,
            failed_count: (sub.failed_charge_count ?? 0) + 1,
          }),
        );
      }
    }
    return NextResponse.json({ message: "OK" });
  }

  // === Transaction.Paid ===
  if (eventType && eventType !== "Transaction.Paid") {
    // 기타 이벤트 (Ready, Confirm, Cancelled 등) → 무시
    return NextResponse.json({ message: "Ignored" });
  }

  if (portonePayment.status !== "PAID") {
    return NextResponse.json(
      { error: "Payment not confirmed by PortOne" },
      { status: 400 },
    );
  }

  // 구독 갱신 charge (PortOne scheduler가 생성 → 우리 DB에 없음)
  if (portonePayment.scheduleId && portonePayment.billingKey) {
    const { data: payment } = await supabase
      .from("payments")
      .select("id")
      .eq("portone_payment_id", paymentId)
      .maybeSingle();

    if (payment) {
      // 이미 처리됨 (멱등)
      return NextResponse.json({ message: "Already processed" });
    }

    // billing key로 subscription 매핑
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("portone_billing_key_id", portonePayment.billingKey)
      .maybeSingle();

    if (!sub) {
      console.error(
        `Recurring charge for unknown billingKey: paymentId=${paymentId}`,
      );
      return NextResponse.json(
        { error: "Subscription not found for billing key" },
        { status: 404 },
      );
    }

    // 금액 검증
    if (portonePayment.amount.total !== MONTHLY_PRICE) {
      console.error(
        `Recurring charge amount mismatch: expected ${MONTHLY_PRICE}, got ${portonePayment.amount.total}`,
      );
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // ENG-C1 IDEMPOTENT RPC
    const { error: rpcError } = await supabase.rpc(
      "process_subscription_charge",
      {
        p_payment_id: paymentId,
        p_subscription_id: sub.id,
        p_amount: portonePayment.amount.total,
        p_paid_at: portonePayment.paidAt ?? new Date().toISOString(),
      },
    );

    if (rpcError) {
      console.error("process_subscription_charge error:", rpcError);
      return NextResponse.json(
        { error: "Charge processing failed" },
        { status: 500 },
      );
    }

    console.log(
      JSON.stringify({
        event: "subscription.charge.success",
        sub_id: sub.id,
        amount: portonePayment.amount.total,
      }),
    );
    return NextResponse.json({ message: "OK" });
  }

  // 첫 charge — 우리 DB에 pending payment가 미리 들어있음
  const { data: payment } = await supabase
    .from("payments")
    .select("id, namespace_id, amount, period_months, status, subscription_id")
    .eq("portone_payment_id", paymentId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
  }

  // M2 fix: 이미 paid 상태이지만 subscription이 pending이면 (이전 webhook에서
  // start_subscription 실패) recovery 경로 → start_subscription 재시도 후 응답.
  // 이전에는 "Already processed" 즉시 반환해서 stuck 됨.
  if (payment.status === "paid") {
    if (payment.subscription_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("id", payment.subscription_id)
        .maybeSingle();
      if (sub && sub.status === "pending") {
        const { data: newEnd, error: startErr } = await supabase.rpc(
          "start_subscription",
          {
            p_subscription_id: payment.subscription_id,
            p_paid_at: new Date().toISOString(),
          },
        );
        if (startErr) {
          console.error("start_subscription recovery failed:", startErr);
          return NextResponse.json(
            { error: "Recovery failed" },
            { status: 500 },
          );
        }
        console.log(
          JSON.stringify({
            event: "subscription.first_charge.recovered",
            sub_id: payment.subscription_id,
            paid_until: newEnd,
          }),
        );
        return NextResponse.json({ message: "Recovered", paid_until: newEnd });
      }
    }
    return NextResponse.json({ message: "Already processed" });
  }

  // 금액 검증
  if (
    !validatePaymentAmount(payment.period_months, portonePayment.amount.total)
  ) {
    console.error(
      `Amount mismatch: expected ${payment.amount}, got ${portonePayment.amount.total}`,
    );
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // Atomic UPDATE pending → paid
  const nowIso = new Date().toISOString();
  const { data: updatedPayment, error: paymentError } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: nowIso })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (paymentError) {
    console.error("Payment update error:", paymentError);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  if (!updatedPayment) {
    // 이미 다른 요청이 처리함
    return NextResponse.json({ message: "Already processed (race)" });
  }

  // Subscription 연결된 첫 charge → start_subscription RPC로 billing key 저장 + period 설정
  if (payment.subscription_id) {
    // billing key 저장 (ENG-H4 first charge linkage)
    if (portonePayment.billingKey) {
      await supabase
        .from("subscriptions")
        .update({
          portone_billing_key_id: portonePayment.billingKey,
          updated_at: nowIso,
        })
        .eq("id", payment.subscription_id);
    }

    // ENG-C4: 기존 paid_until 보존하며 period 시작
    const { data: newEnd, error: startError } = await supabase.rpc(
      "start_subscription",
      {
        p_subscription_id: payment.subscription_id,
        p_paid_at: portonePayment.paidAt ?? nowIso,
      },
    );

    if (startError) {
      console.error("start_subscription error:", startError);
      return NextResponse.json(
        { error: "Subscription start failed" },
        { status: 500 },
      );
    }

    console.log(
      JSON.stringify({
        event: "subscription.first_charge.success",
        sub_id: payment.subscription_id,
        paid_until: newEnd,
      }),
    );

    return NextResponse.json({
      message: "OK",
      paid_until: newEnd,
    });
  }

  // 레거시 period-pack (하위 호환 — in-flight 결제만)
  const { data: ns } = await supabase
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

  const { data: newPaidUntilData, error: rpcError } = await supabase.rpc(
    "add_months",
    {
      base_date: baseDate.toISOString(),
      months: payment.period_months,
    },
  );

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
