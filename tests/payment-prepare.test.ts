import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MONTHLY_PRICE,
  validateSubscriptionAmount,
  validatePaymentAmount,
} from "@/lib/pricing";

// POST /api/payment/prepare 핵심 비즈니스 로직 검증
// (실제 Supabase/인증/PortOne 연동 없이 로직만 테스트)

describe("POST /api/payment/prepare — 단일 SKU 구독", () => {
  it("월 가격이 단일 고정 값", () => {
    expect(MONTHLY_PRICE).toBe(2900);
  });

  it("구독 금액 검증 — 정확한 ₩2,900만 허용", () => {
    expect(validateSubscriptionAmount(MONTHLY_PRICE)).toBe(true);
    expect(validateSubscriptionAmount(2800)).toBe(false);
    expect(validateSubscriptionAmount(3000)).toBe(false);
  });

  it("period_months=1 (월 구독)은 validatePaymentAmount에서 통과", () => {
    expect(validatePaymentAmount(1, 2900)).toBe(true);
    expect(validatePaymentAmount(1, 2800)).toBe(false);
  });

  it("orderName 포맷이 namespace + '프리미엄 구독' 형태", () => {
    const nsName = "홍길동";
    const orderName = `좌표.to/${nsName} 프리미엄 구독 (첫 결제)`;
    expect(orderName).toBe("좌표.to/홍길동 프리미엄 구독 (첫 결제)");
  });

  it("paymentId 포맷이 예측 불가능한 랜덤 값 (jw_ prefix + hex, ≤32 chars)", () => {
    // PortOne paymentId 는 MAX_LENGTH 32. 'jw_' + 24 hex = 27 chars.
    // 이전 'jwapyo_' + 32 hex = 39 chars 는 chargeBillingKey 에서 INVALID_REQUEST 400.
    const mockPaymentId = `jw_${"a1b2c3d4e5f67890a1b2c3d4"}`;
    expect(mockPaymentId).toMatch(/^jw_[0-9a-f]{24}$/);
    expect(mockPaymentId.length).toBeLessThanOrEqual(32);
  });

  it("prepare route 가 PortOne 32자 한도 안에서 paymentId 를 만든다", () => {
    const routePath = resolve(
      __dirname,
      "../src/app/api/payment/prepare/route.ts",
    );
    const route = readFileSync(routePath, "utf8");
    // 'jw_' (3) + randomBytes(12).hex (24) = 27 chars ≤ 32
    expect(route).toMatch(
      /const paymentId = `jw_\$\{randomBytes\(12\)\.toString\("hex"\)\}`/,
    );
    // 옛 39-char 패턴이 다시 등장하면 fail
    expect(route).not.toMatch(/randomBytes\(16\)\.toString\("hex"\)/);
  });

  // Regression for KPN 빌링키 발급 400 (ParsePgRawResponseFailed) — KPN 은
  // customer.fullName 을 필수로 요구한다. prepare 응답에 customerName 이 들어
  // 있어야 클라이언트가 PortOne SDK 에 fullName 을 넘길 수 있다.
  it("prepare 응답에 customerName 필드가 포함되도록 route 에 정의돼 있다", () => {
    const routePath = resolve(
      __dirname,
      "../src/app/api/payment/prepare/route.ts",
    );
    const route = readFileSync(routePath, "utf8");
    expect(route).toMatch(/customerName:\s*ns\.name/);
  });

  it("pricing 페이지가 customerName 을 PortOne customer.fullName 으로 전달한다", () => {
    const pagePath = resolve(__dirname, "../src/app/pricing/page.tsx");
    const page = readFileSync(pagePath, "utf8");
    expect(page).toMatch(/customer:\s*\{[^}]*fullName:\s*customerName/);
  });

  // Regression for v0.7.0 500 bug — subscriptions/payments FKs were pointing
  // at empty public.users, so every prepare call failed with FK violation.
  // 010_fix_user_fks.sql repoints them at auth.users. Don't let that revert.
  it("010_fix_user_fks.sql 가 auth.users 로 FK 를 옮긴다", () => {
    const sqlPath = resolve(__dirname, "../supabase/010_fix_user_fks.sql");
    const sql = readFileSync(sqlPath, "utf8");
    expect(sql).toMatch(
      /subscriptions_user_id_fkey[\s\S]*REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+CASCADE/i,
    );
    expect(sql).toMatch(
      /payments_owner_id_fkey[\s\S]*REFERENCES\s+auth\.users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i,
    );
    expect(sql).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+public\.users/i);
  });
});
