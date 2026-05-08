// PAYMENTS_TRIAL_ENABLED toggle 회귀 테스트.
//
// 배경: PG 심사 시점에 1개월 무료 체험을 끄고 즉시 ₩2,900 결제 흐름을
// 노출해야 카드사/카카오페이 심사관이 실제 결제 검증 가능.
// NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED env 로 토글.
//
// 이 테스트는 헬퍼의 미설정 / "true" / "false" / 대소문자 케이스만 검증.
// 실제 webhook 분기 테스트는 webhook-route 통합 테스트가 필요하지만 현재
// 인프라가 없음 (별도 PR 로 추가 예정).
import { describe, it, expect, afterEach } from "vitest";

// 헬퍼 자체는 webhook 모듈 안에 있어서 직접 import 못함 — env 동작만 검증.
function isTrialEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED ?? "")
    .trim()
    .toLowerCase();
  return v === "" || v === "true";
}

describe("NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED 토글", () => {
  const original = process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED = original;
    }
  });

  it("env 미설정 → trial ON (기본 동작 보존)", () => {
    delete process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED;
    expect(isTrialEnabled()).toBe(true);
  });

  it("env=\"true\" → trial ON", () => {
    process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED = "true";
    expect(isTrialEnabled()).toBe(true);
  });

  it("env=\"false\" → trial OFF", () => {
    process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED = "false";
    expect(isTrialEnabled()).toBe(false);
  });

  it("env=\"FALSE\" (대소문자 무시) → trial OFF", () => {
    process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED = "FALSE";
    expect(isTrialEnabled()).toBe(false);
  });

  it("env=공백 (whitespace) → trial ON (env empty 와 동일하게 다룸)", () => {
    process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED = "  ";
    expect(isTrialEnabled()).toBe(true);
  });

  it("env=\"yes\" 같은 알 수 없는 값 → trial OFF (안전한 기본 — 명시적 \"true\" 아니면 끔)", () => {
    // 의도적으로 보수적: 'yes', '1', 'on' 등은 실수로 체험을 켜진 채로 두기보다
    // 명시적 "true" 만 허용. 단 미설정 / 빈문자열만 ON 으로 본다.
    process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED = "yes";
    expect(isTrialEnabled()).toBe(false);
  });
});
