import { describe, it, expect } from "vitest";
import {
  buildBillingKeyArgs,
  billingCancelMessage,
} from "@/lib/portone-billing";

const channels = {
  card: "channel-key-card-test",
  kakaopay: "channel-key-kakaopay-test",
};

describe("buildBillingKeyArgs", () => {
  it("kakaopay → EASY_PAY + KAKAOPAY provider + 카카오 채널키", () => {
    const args = buildBillingKeyArgs("kakaopay", channels);
    expect(args).toEqual({
      channelKey: "channel-key-kakaopay-test",
      billingKeyMethod: "EASY_PAY",
      easyPay: { easyPayProvider: "KAKAOPAY" },
    });
  });

  it("card → CARD + 카드 채널키", () => {
    const args = buildBillingKeyArgs("card", channels);
    expect(args).toEqual({
      channelKey: "channel-key-card-test",
      billingKeyMethod: "CARD",
    });
  });

  it("kakaopay 결과에 easyPay 필드가 반드시 존재 (PortOne SDK 요구)", () => {
    const args = buildBillingKeyArgs("kakaopay", channels);
    // SDK union type 분기를 위해 narrow
    if (args.billingKeyMethod !== "EASY_PAY") {
      throw new Error("kakaopay must produce EASY_PAY");
    }
    expect(args.easyPay.easyPayProvider).toBe("KAKAOPAY");
  });

  it("card 결과에는 easyPay 필드가 없음 (CARD 채널은 easyPay 거부)", () => {
    const args = buildBillingKeyArgs("card", channels);
    expect("easyPay" in args).toBe(false);
  });

  it("두 메서드가 서로 다른 채널키를 사용", () => {
    const kakao = buildBillingKeyArgs("kakaopay", channels);
    const card = buildBillingKeyArgs("card", channels);
    expect(kakao.channelKey).not.toBe(card.channelKey);
  });
});

describe("buildBillingKeyArgs — failure modes", () => {
  it("kakaopay 채널키가 빈 문자열이면 throw", () => {
    expect(() =>
      buildBillingKeyArgs("kakaopay", { card: "ck-card", kakaopay: "" }),
    ).toThrow(/kakaopay channel key is missing/);
  });

  it("card 채널키가 빈 문자열이면 throw", () => {
    expect(() =>
      buildBillingKeyArgs("card", { card: "", kakaopay: "ck-kakao" }),
    ).toThrow(/card channel key is missing/);
  });

  it("알 수 없는 method 는 throw (런타임 안전성)", () => {
    expect(() =>
      // @ts-expect-error - 의도적으로 잘못된 method 를 전달
      buildBillingKeyArgs("samsung_pay", { card: "ck", kakaopay: "ck" }),
    ).toThrow(/unknown method/);
  });
});

describe("billingCancelMessage", () => {
  it("kakaopay 메시지에 '카카오페이' 포함", () => {
    expect(billingCancelMessage("kakaopay")).toContain("카카오페이");
  });

  it("card 메시지에 '카드' 포함", () => {
    expect(billingCancelMessage("card")).toContain("카드");
  });

  it("두 메시지가 서로 다름", () => {
    expect(billingCancelMessage("kakaopay")).not.toBe(
      billingCancelMessage("card"),
    );
  });
});
