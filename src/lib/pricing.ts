/**
 * 좌표.to 가격 상수
 *
 * UI와 서버 API 모두 여기서 import.
 * 가격 변경 시 이 파일만 수정하면 됩니다.
 */

export type Plan = {
  periodMonths: number;
  price: number; // 원, VAT 포함 표시가격
  supplyPrice: number; // 공급가 (VAT 제외)
  vat: number;
  label: string;
  monthlyPrice: number; // 월 환산
  badge?: string;
};

export const PLANS: Plan[] = [
  {
    periodMonths: 3,
    price: 2900,
    supplyPrice: 2636,
    vat: 264,
    label: "3개월",
    monthlyPrice: 967,
  },
  {
    periodMonths: 6,
    price: 4900,
    supplyPrice: 4455,
    vat: 445,
    label: "6개월",
    monthlyPrice: 817,
    badge: "best value",
  },
  {
    periodMonths: 12,
    price: 8900,
    supplyPrice: 8091,
    vat: 809,
    label: "12개월",
    monthlyPrice: 742,
  },
];

export function getPlan(periodMonths: number): Plan | null {
  return PLANS.find((p) => p.periodMonths === periodMonths) ?? null;
}

export function validatePaymentAmount(
  periodMonths: number,
  amount: number,
): boolean {
  const plan = getPlan(periodMonths);
  if (!plan) return false;
  return plan.price === amount;
}
