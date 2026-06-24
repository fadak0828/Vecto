/**
 * 주소창 접두어 방식 단축 URL — 호스트 판별 + 원본 URL 추출.
 *
 * 사용자가 `https://만들기.좌표.to/https://www.naver.com` 형태로 접속하면
 * `/` 뒤 전체를 원본 URL 로 인식한다.
 *
 * 핵심 원칙:
 *   1. 프레임워크가 파싱한 pathname 만 쓰지 않는다. pathname 은 쿼리를 떼버리고
 *      `//`·`:` 정규화로 원본을 훼손할 수 있다. 대신 raw request URL 문자열
 *      전체를 직접 잘라 쿼리까지 보존한다.
 *   2. 원본 URL 전체에 decodeURIComponent() 를 적용하지 않는다. `%EB..`,
 *      `%2F`, `%3F` 같은 기존 인코딩이 그대로 살아 있어야 한다.
 *   3. #fragment 는 브라우저가 서버로 전송하지 않으므로 이 방식으로는 절대
 *      복원할 수 없다. (지원 불가 — 문서/주석에 명시)
 *   4. 이 로직은 `만들기.좌표.to` 호스트에서만 실행한다. 그래야 기존 단축 URL
 *      리다이렉트 경로(/go/*, /[namespace]/* 등) 와 충돌하지 않는다.
 *
 * 알려진 제약 (Next.js 슬러그 정규화):
 *   Next 는 경로의 중복 슬래시(`//`)를 단일(`/`)로 합치는 308 redirect 를
 *   proxy 보다 먼저 수행한다. 그래서 `.../https://x.com` 은 먼저
 *   `.../https:/x.com` 으로 바뀐 뒤 도달한다 — 선두 스킴은 아래에서 복원하지만,
 *   원본 URL 의 *경로 안쪽* `//` (예: `.../a//b`) 는 복원되지 않는다. 실무에서
 *   경로 내부 `//` 는 드물어 v1 에서는 허용 가능한 제약으로 둔다.
 */

/** 원본 URL 최대 길이 (rate limit 과 함께 남용 방지). */
export { MAX_URL_LENGTH } from "@/lib/slug-validation";

/**
 * 접두어 호스트 (유니코드 + punycode 양형 모두 허용).
 * 브라우저 Host 헤더는 IDN 을 punycode 로 보내지만, 직접 입력/프록시 환경에
 * 따라 유니코드가 올 수도 있어 둘 다 받는다.
 *
 *   만들기.좌표.to  ↔  xn--ok0b30kwpe.xn--h25b29s.to
 */
const MAKER_HOSTS = new Set([
  "만들기.좌표.to",
  "xn--ok0b30kwpe.xn--h25b29s.to",
]);

/** Host 헤더가 접두어 생성 호스트인지 판별 (포트·대소문자 무시). */
export function isMakerHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = host.split(":")[0].trim().toLowerCase();
  return MAKER_HOSTS.has(bare);
}

/**
 * raw request URL 문자열에서 원본 URL 을 추출한다.
 *
 * 입력 예: `https://만들기.좌표.to/https://example.com/search?q=%ED%95%9C&page=2`
 * 출력:    `https://example.com/search?q=%ED%95%9C&page=2`  (디코딩하지 않음)
 *
 * scheme://host 까지만 떼어내고 첫 `/` 뒤 전체(쿼리 포함)를 그대로 돌려준다.
 * 일부 프록시/런타임이 `https://` 의 `//` 를 `/` 로 축약(`https:/host`)하는
 * 경우를 대비해 그 부분만 방어적으로 복원한다.
 *
 * @returns 원본 URL 문자열, 경로가 없으면 null
 */
export function extractOriginalUrl(requestUrl: string): string | null {
  let rest: string;
  const schemeIdx = requestUrl.indexOf("://");
  if (schemeIdx === -1) {
    // scheme 이 없으면 입력 자체가 path+query 라고 본다.
    rest = requestUrl.startsWith("/") ? requestUrl.slice(1) : requestUrl;
  } else {
    const afterScheme = schemeIdx + 3;
    const slashIdx = requestUrl.indexOf("/", afterScheme);
    if (slashIdx === -1) return null; // host 만 있고 경로 없음
    rest = requestUrl.slice(slashIdx + 1); // 선행 `/` 제거, 쿼리는 보존
  }

  if (!rest) return null;

  // 방어적 복원: `https:/host` → `https://host` (프록시의 `//` 축약 대응).
  // 이미 `https://` 인 경우는 (?!/) 로 건드리지 않는다.
  rest = rest.replace(/^(https?):\/(?!\/)/i, "$1://");

  return rest;
}
