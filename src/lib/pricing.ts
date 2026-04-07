/**
 * 좌표.to 가격 상수 — Single SKU Freemium.
 *
 * UI와 서버 API 모두 여기서 import.
 * 가격 변경 시 이 파일만 수정하면 됩니다.
 *
 * Legacy period-pack (PLANS 배열, getPlan) 은 제거됨.
 * in-flight 레거시 결제는 payments.period_months in (1, 3, 6, 12) CHECK로 허용.
 */

export const MONTHLY_PRICE = 2900;
export const MONTHLY_SUPPLY_PRICE = 2636; // 공급가 (VAT 제외)
export const MONTHLY_VAT = 264;
export const MONTHLY_LABEL = "월 구독" as const;
export const CURRENCY = "KRW" as const;

/**
 * 결제 금액 검증.
 * 구독 월 charge는 항상 MONTHLY_PRICE. 레거시 period-pack in-flight 허용 X.
 */
export function validateSubscriptionAmount(amount: number): boolean {
  return amount === MONTHLY_PRICE;
}

/**
 * 레거시 period-pack 검증 (in-flight payments 호환).
 * 3/6/12 개월 가격 체크. 신규 결제에는 사용하지 마세요.
 *
 * @deprecated Use validateSubscriptionAmount for new subscriptions.
 */
export function validateLegacyPaymentAmount(
  periodMonths: number,
  amount: number,
): boolean {
  const legacyPrices: Record<number, number> = {
    3: 2900,
    6: 4900,
    12: 8900,
  };
  return legacyPrices[periodMonths] === amount;
}

/**
 * period_months → 금액 검증 통합 helper.
 * period_months=1 → subscription, 3/6/12 → legacy.
 */
export function validatePaymentAmount(
  periodMonths: number,
  amount: number,
): boolean {
  if (periodMonths === 1) {
    return validateSubscriptionAmount(amount);
  }
  return validateLegacyPaymentAmount(periodMonths, amount);
}

/**
 * VAT 비율 기준 공급가/부가세 split.
 * 세금계산서 발행 시 사용.
 */
export function splitPrice(total: number): { supply: number; vat: number } {
  const supply = Math.round(total / 1.1);
  return { supply, vat: total - supply };
}
