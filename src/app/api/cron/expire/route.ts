import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/portone";

/**
 * GET /api/cron/expire
 *
 * Vercel Cron으로 매일 실행.
 * 1. active → expired 전이 (paid_until 경과)
 * 2. 7일 전 만료 예정 알림 이메일
 * 3. 30일+ expired → 리다이렉트 비활성화 (payment_status로 관리)
 *
 * CRON_SECRET 헤더로 외부 접근 차단.
 */
export async function GET(request: NextRequest) {
  // 비밀 헤더 검증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const now = new Date();
  const results = {
    expired: 0,
    subscription_canceled: 0,
    warnings_sent: 0,
    errors: [] as string[],
  };

  // 1. active → expired 전이 (레거시 period-pack + 구독 period_end 초과)
  const { data: expiredNamespaces, error: expiredError } = await supabase
    .from("namespaces")
    .update({ payment_status: "expired" })
    .eq("payment_status", "active")
    .lt("paid_until", now.toISOString())
    .select("id, name, owner_id");

  if (expiredError) {
    results.errors.push(`Expire update failed: ${expiredError.message}`);
  } else {
    results.expired = expiredNamespaces?.length ?? 0;
  }

  // 2. past_due > 14d → canceled (ENG-H2 bulk RPC)
  const { data: canceledResult, error: pastDueError } = await supabase.rpc(
    "expire_past_due_subscriptions",
    { p_grace_days: 14 },
  );

  if (pastDueError) {
    results.errors.push(`past_due expire failed: ${pastDueError.message}`);
  } else if (Array.isArray(canceledResult) && canceledResult[0]) {
    results.subscription_canceled = canceledResult[0].canceled_count ?? 0;
  }

  // 2. 7일 전 만료 예정 알림
  // Vercel serverless는 함수 종료 시 미완료 Promise를 죽임 → 반드시 await
  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() + 7);

  const { data: warningNamespaces } = await supabase
    .from("namespaces")
    .select("id, name, owner_id, paid_until")
    .eq("payment_status", "active")
    .gt("paid_until", now.toISOString())
    .lte("paid_until", warningDate.toISOString());

  if (warningNamespaces && warningNamespaces.length > 0) {
    // 이메일 동시 발송 (Promise.allSettled로 일부 실패 허용)
    const emailPromises = warningNamespaces.map(async (ns) => {
      try {
        const { data: user } = await supabase
          .from("users")
          .select("email")
          .eq("id", ns.owner_id)
          .maybeSingle();

        if (user?.email) {
          await sendRenewalEmail(
            user.email,
            ns.name,
            new Date(ns.paid_until),
          );
          return { success: true, ns: ns.name };
        }
        return { success: false, ns: ns.name, reason: "no email" };
      } catch (err) {
        console.error(`Warning email failed for ${ns.name}:`, err);
        return { success: false, ns: ns.name, reason: String(err) };
      }
    });

    const settled = await Promise.allSettled(emailPromises);
    results.warnings_sent = settled.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;
  }

  return NextResponse.json({
    message: "Cron completed",
    ...results,
    timestamp: now.toISOString(),
  });
}

async function sendRenewalEmail(
  email: string,
  namespaceName: string,
  expiresAt: Date,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  const daysLeft = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "좌표.to <noreply@좌표.to>",
      to: email,
      subject: `좌표.to/${namespaceName} 이용권이 ${daysLeft}일 후 만료됩니다`,
      html: `
        <div style="font-family: Pretendard, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #006565;">좌표.to/${namespaceName}</h2>
          <p>안녕하세요! 좌표.to/${namespaceName} 이용권이 <strong>${daysLeft}일 후</strong> 만료됩니다.</p>
          <p>만료 후 30일까지는 기존 링크가 유지되지만, 이후에는 리다이렉트가 중지됩니다.</p>
          <a href="https://좌표.to/pricing" style="display: inline-block; padding: 12px 24px; background: #006565; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">이용권 갱신하기</a>
          <p style="color: #78716c; font-size: 12px; margin-top: 24px;">좌표.to</p>
        </div>
      `,
    }),
  });
}
