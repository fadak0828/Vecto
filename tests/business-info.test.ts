import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * business-info.ts는 모듈 로드 시점에 process.env를 한 번만 읽어서
 * `businessInfo` 객체를 freeze합니다. 그래서 ENV 변경 → 동적 재import
 * 패턴이 필요합니다.
 */

const ENV_KEYS = [
  "NEXT_PUBLIC_BUSINESS_NAME",
  "NEXT_PUBLIC_BUSINESS_REPRESENTATIVE",
  "NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER",
  "NEXT_PUBLIC_BUSINESS_MAIL_ORDER_NUMBER",
  "NEXT_PUBLIC_BUSINESS_ADDRESS",
  "NEXT_PUBLIC_BUSINESS_PHONE",
  "NEXT_PUBLIC_BUSINESS_EMAIL",
] as const;

beforeEach(() => {
  vi.resetModules();
  for (const key of ENV_KEYS) vi.stubEnv(key, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function loadModule() {
  return await import("@/lib/business-info");
}

describe("businessInfo", () => {
  it("ENV가 모두 비어 있으면 빈 문자열 (email은 기본값) 반환", async () => {
    const { businessInfo } = await loadModule();
    expect(businessInfo.name).toBe("");
    expect(businessInfo.representative).toBe("");
    expect(businessInfo.registrationNumber).toBe("");
    expect(businessInfo.mailOrderNumber).toBe("");
    expect(businessInfo.address).toBe("");
    expect(businessInfo.phone).toBe("");
    // email은 빈 문자열일 때 기본값으로 폴백
    expect(businessInfo.email).toBe("support@xn--h25b29s.to");
  });

  it("ENV가 채워지면 그대로 반환", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_NAME", "좌표닷투");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REPRESENTATIVE", "홍길동");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER", "123-45-67890");
    vi.stubEnv(
      "NEXT_PUBLIC_BUSINESS_MAIL_ORDER_NUMBER",
      "2026-서울강남-1234",
    );
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_ADDRESS", "서울특별시 강남구 ...");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_PHONE", "010-1234-5678");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_EMAIL", "hello@example.com");

    const { businessInfo } = await loadModule();
    expect(businessInfo.name).toBe("좌표닷투");
    expect(businessInfo.representative).toBe("홍길동");
    expect(businessInfo.registrationNumber).toBe("123-45-67890");
    expect(businessInfo.mailOrderNumber).toBe("2026-서울강남-1234");
    expect(businessInfo.address).toBe("서울특별시 강남구 ...");
    expect(businessInfo.phone).toBe("010-1234-5678");
    expect(businessInfo.email).toBe("hello@example.com");
  });
});

describe("isBusinessInfoComplete", () => {
  it("필수 필드(name/대표/등록번호/주소)가 모두 있으면 true", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_NAME", "좌표닷투");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REPRESENTATIVE", "홍길동");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER", "123-45-67890");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_ADDRESS", "서울 ...");

    const { isBusinessInfoComplete } = await loadModule();
    expect(isBusinessInfoComplete()).toBe(true);
  });

  it("통신판매업 신고번호와 전화는 선택 — 없어도 complete", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_NAME", "좌표닷투");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REPRESENTATIVE", "홍길동");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER", "123-45-67890");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_ADDRESS", "서울 ...");
    // mailOrderNumber, phone 일부러 미설정

    const { isBusinessInfoComplete } = await loadModule();
    expect(isBusinessInfoComplete()).toBe(true);
  });

  it("ENV가 모두 비어 있으면 false", async () => {
    const { isBusinessInfoComplete } = await loadModule();
    expect(isBusinessInfoComplete()).toBe(false);
  });

  it("필수 중 하나라도 비면 false (대표자명 누락)", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_NAME", "좌표닷투");
    // representative 누락
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER", "123-45-67890");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_ADDRESS", "서울 ...");

    const { isBusinessInfoComplete } = await loadModule();
    expect(isBusinessInfoComplete()).toBe(false);
  });

  it("필수 중 하나라도 비면 false (사업자등록번호 누락)", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_NAME", "좌표닷투");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REPRESENTATIVE", "홍길동");
    // registrationNumber 누락
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_ADDRESS", "서울 ...");

    const { isBusinessInfoComplete } = await loadModule();
    expect(isBusinessInfoComplete()).toBe(false);
  });

  it("필수 중 하나라도 비면 false (주소 누락)", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_NAME", "좌표닷투");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REPRESENTATIVE", "홍길동");
    vi.stubEnv("NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER", "123-45-67890");
    // address 누락

    const { isBusinessInfoComplete } = await loadModule();
    expect(isBusinessInfoComplete()).toBe(false);
  });
});
