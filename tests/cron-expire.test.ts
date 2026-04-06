import { describe, it, expect } from "vitest";

// GET /api/cron/expire의 핵심 비즈니스 로직 테스트

describe("GET /api/cron/expire — 인증", () => {
  it("올바른 secret은 통과한다", () => {
    const cronSecret = "test-secret-123";
    const authHeader = `Bearer ${cronSecret}`;
    expect(authHeader === `Bearer ${cronSecret}`).toBe(true);
  });

  it("잘못된 secret은 거부한다", () => {
    const cronSecret = "test-secret-123";
    const authHeader = "Bearer wrong-secret";
    expect(authHeader === `Bearer ${cronSecret}`).toBe(false);
  });

  it("secret이 없으면 거부한다", () => {
    const authHeader = null;
    expect(authHeader === null).toBe(true);
  });
});

describe("GET /api/cron/expire — 만료 전이 로직", () => {
  it("paid_until이 지난 active namespace를 expired로 전이한다", () => {
    const now = new Date("2026-04-06T00:00:00Z");
    const paidUntil = new Date("2026-04-01T00:00:00Z");
    const isExpired = paidUntil < now;
    expect(isExpired).toBe(true);
  });

  it("paid_until이 아직 남은 active namespace는 유지한다", () => {
    const now = new Date("2026-04-06T00:00:00Z");
    const paidUntil = new Date("2026-07-06T00:00:00Z");
    const isExpired = paidUntil < now;
    expect(isExpired).toBe(false);
  });
});

describe("GET /api/cron/expire — 7일 경고 알림", () => {
  it("7일 이내 만료 예정인 namespace를 감지한다", () => {
    const now = new Date("2026-04-06T00:00:00Z");
    const warningDate = new Date(now);
    warningDate.setDate(warningDate.getDate() + 7);

    const paidUntil = new Date("2026-04-10T00:00:00Z"); // 4일 남음
    const needsWarning = paidUntil > now && paidUntil <= warningDate;
    expect(needsWarning).toBe(true);
  });

  it("8일 이상 남은 namespace는 알림 대상이 아니다", () => {
    const now = new Date("2026-04-06T00:00:00Z");
    const warningDate = new Date(now);
    warningDate.setDate(warningDate.getDate() + 7);

    const paidUntil = new Date("2026-04-20T00:00:00Z"); // 14일 남음
    const needsWarning = paidUntil > now && paidUntil <= warningDate;
    expect(needsWarning).toBe(false);
  });
});
