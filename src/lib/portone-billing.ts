/**
 * PortOne 빌링키 발급 인자 빌더.
 *
 * 카카오페이는 EASY_PAY 채널 + easyPayProvider 지정,
 * 카드 직접입력은 CARD 채널을 사용.
 *
 * pricing 페이지에서 분리된 이유: ternary 내부에 PortOne SDK의 union type
 * (CARD vs EASY_PAY+easyPay)을 직접 작성하면 typo가 런타임에서만 드러남.
 * 순수 함수로 빼서 단위 테스트로 회귀를 막는다.
 */

export type PayMethod = "kakaopay" | "card";

export type ChannelKeys = {
  card: string;
  kakaopay: string;
};

export type BillingKeyMethodArgs =
  | {
      channelKey: string;
      billingKeyMethod: "CARD";
    }
  | {
      channelKey: string;
      billingKeyMethod: "EASY_PAY";
      easyPay: { easyPayProvider: "KAKAOPAY" };
    };

/**
 * PortOne.requestIssueBillingKey 에 spread 할 channelKey + 메서드 인자를 만든다.
 *
 * @example
 *   const args = buildBillingKeyArgs("kakaopay", { card: "ck-...", kakaopay: "ck-..." });
 *   PortOne.requestIssueBillingKey({ storeId, ...args, issueId, ... });
 */
export function buildBillingKeyArgs(
  method: PayMethod,
  channels: ChannelKeys,
): BillingKeyMethodArgs {
  switch (method) {
    case "kakaopay": {
      if (!channels.kakaopay) {
        throw new Error(
          "[portone-billing] kakaopay channel key is missing — set NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY",
        );
      }
      return {
        channelKey: channels.kakaopay,
        billingKeyMethod: "EASY_PAY",
        easyPay: { easyPayProvider: "KAKAOPAY" },
      };
    }
    case "card": {
      if (!channels.card) {
        throw new Error(
          "[portone-billing] card channel key is missing — set NEXT_PUBLIC_PORTONE_CHANNEL_KEY",
        );
      }
      return {
        channelKey: channels.card,
        billingKeyMethod: "CARD",
      };
    }
    default: {
      // 컴파일 타임 exhaustiveness — 새 PayMethod 추가 시 여기서 type error.
      const _exhaustive: never = method;
      throw new Error(`[portone-billing] unknown method: ${String(_exhaustive)}`);
    }
  }
}

/**
 * 결제 취소/실패 시 사용자에게 보여줄 한국어 에러 메시지.
 * method 별로 다른 문구를 사용해야 사용자가 어디서 문제가 났는지 안다.
 */
export function billingCancelMessage(method: PayMethod): string {
  return method === "kakaopay"
    ? "카카오페이 결제가 취소되었습니다."
    : "카드 등록이 취소되었습니다.";
}
