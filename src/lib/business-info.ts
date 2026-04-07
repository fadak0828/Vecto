/**
 * 사업자 정보 (전자상거래법 표시 의무)
 *
 * footer, 약관, 결제 페이지에서 import해서 사용합니다.
 * ENV가 비어 있거나 공백뿐일 때는 빈 문자열을 반환하므로, 호출부에서
 * placeholder를 직접 처리해야 합니다 (예: `businessInfo.name || "좌표.to"`).
 *
 * NEXT_PUBLIC_ prefix 이유: 사업자 정보는 어차피 사이트에 공개되는
 * 정보이므로 클라이언트 컴포넌트에서 직접 참조할 수 있어야 합니다.
 *
 * 빌드 시점 vs 런타임:
 * - server component에서 import → 매 요청마다 process.env 읽음
 * - client component에서 import → Next.js가 빌드 시점에 인라인
 * Vercel에서 ENV 변경 후에는 반드시 재배포해야 client 컴포넌트가 갱신됩니다.
 */

/**
 * 공백뿐인 값 (예: " ")이 통과하지 않도록 trim합니다. Vercel에 값 붙여넣을 때
 * 따옴표나 공백이 묻어 들어오는 사고를 방지.
 */
function readEnv(key: string): string {
  return (process.env[key] ?? "").trim();
}

export const businessInfo = {
  name: readEnv("NEXT_PUBLIC_BUSINESS_NAME"),
  representative: readEnv("NEXT_PUBLIC_BUSINESS_REPRESENTATIVE"),
  registrationNumber: readEnv("NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER"),
  mailOrderNumber: readEnv("NEXT_PUBLIC_BUSINESS_MAIL_ORDER_NUMBER"),
  address: readEnv("NEXT_PUBLIC_BUSINESS_ADDRESS"),
  phone: readEnv("NEXT_PUBLIC_BUSINESS_PHONE"),
  // email은 빈 문자열일 때 기본값으로 폴백 (legal 표기에 항상 연락처 필요).
  email: readEnv("NEXT_PUBLIC_BUSINESS_EMAIL") || "support.vecto@gmail.com",
} as const;

/**
 * PG 심사 통과에 필요한 필수 필드가 모두 채워져 있는가.
 * 통신판매업 신고번호와 전화는 선택 (신고 진행 중이거나 전화 미보유 가능).
 *
 * 의도적으로 export만 해두고 현재는 어디서도 호출하지 않습니다. Phase C에서
 * "라이브 결제 활성화 직전 build-time guard" 또는 "dev 환경 배너"로 wire-up
 * 예정. 삭제하지 말 것.
 */
export function isBusinessInfoComplete(): boolean {
  return Boolean(
    businessInfo.name &&
      businessInfo.representative &&
      businessInfo.registrationNumber &&
      businessInfo.address,
  );
}
