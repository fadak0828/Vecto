// 주소창 접두어 방식 단축 URL — 호스트 판별 + raw 원본 URL 추출 + 검증.
// `https://만들기.좌표.to/https://www.naver.com` 형태를 다룬다.
import { describe, it, expect } from "vitest";
import { isMakerHost, extractOriginalUrl } from "@/lib/prefix-url";
import { validateUrl, MAX_URL_LENGTH } from "@/lib/slug-validation";

const MAKER = "https://만들기.좌표.to";
const MAKER_PUNY = "https://xn--ok0b30kwpe.xn--h25b29s.to";

describe("isMakerHost — 접두어 호스트에서만 동작", () => {
  it("유니코드 만들기.좌표.to 를 인식한다", () => {
    expect(isMakerHost("만들기.좌표.to")).toBe(true);
  });

  it("punycode 형태를 인식한다 (브라우저 Host 헤더 형식)", () => {
    expect(isMakerHost("xn--ok0b30kwpe.xn--h25b29s.to")).toBe(true);
  });

  it("포트·대소문자를 무시한다", () => {
    expect(isMakerHost("xn--ok0b30kwpe.xn--h25b29s.to:443")).toBe(true);
    expect(isMakerHost("만들기.좌표.to:3000")).toBe(true);
  });

  // 케이스 8: 기존 단축 URL 리다이렉트 경로와 충돌 방지 — 본 호스트는 제외.
  it("일반 호스트(좌표.to)에서는 동작하지 않는다", () => {
    expect(isMakerHost("좌표.to")).toBe(false);
    expect(isMakerHost("xn--h25b29s.to")).toBe(false);
    expect(isMakerHost("vecto.vercel.app")).toBe(false);
    expect(isMakerHost(null)).toBe(false);
    expect(isMakerHost("")).toBe(false);
  });
});

describe("extractOriginalUrl — raw 보존, 디코딩 금지", () => {
  // 케이스 1
  it("단순 https URL 을 추출한다", () => {
    expect(extractOriginalUrl(`${MAKER}/https://www.naver.com`)).toBe(
      "https://www.naver.com"
    );
  });

  it("http URL 도 추출한다", () => {
    expect(extractOriginalUrl(`${MAKER}/http://example.com`)).toBe(
      "http://example.com"
    );
  });

  // 케이스 2: 퍼센트 인코딩된 긴 한글 경로 (Velog 스타일) — 인코딩 그대로 보존.
  it("퍼센트 인코딩된 한글 경로를 디코딩하지 않고 보존한다", () => {
    const velog =
      "https://velog.io/@minwoo/%EB%A6%AC%EC%95%A1%ED%8A%B8-%ED%9B%85%EC%8A%A4-%EC%99%84%EB%B2%BD-%EC%A0%95%EB%A6%AC-2026";
    expect(extractOriginalUrl(`${MAKER}/${velog}`)).toBe(velog);
  });

  it("@, - 등의 문자를 보존한다", () => {
    const url = "https://velog.io/@user/some-long-post-title-here";
    expect(extractOriginalUrl(`${MAKER}/${url}`)).toBe(url);
  });

  // 케이스 3: Base64 없이 쿼리스트링 지원 — 쿼리(?q=한글&page=2)까지 보존.
  it("쿼리스트링을 보존한다 (literal 한글)", () => {
    const url = "https://example.com/search?q=한글&page=2";
    expect(extractOriginalUrl(`${MAKER}/${url}`)).toBe(url);
  });

  it("쿼리스트링을 보존한다 (percent-encoded 한글)", () => {
    const url = "https://example.com/search?q=%ED%95%9C%EA%B8%80&page=2";
    expect(extractOriginalUrl(`${MAKER}/${url}`)).toBe(url);
  });

  // 케이스 4: 쿼리 값 안에 인코딩된 다른 URL 이 있어도 한 번도 디코딩하지 않는다.
  it("쿼리 값 안의 인코딩된 URL 을 훼손하지 않는다", () => {
    const inner = "https%3A%2F%2Fother.com%2Fpath%3Fa%3D1";
    const url = `https://example.com/r?to=${inner}&x=2`;
    const out = extractOriginalUrl(`${MAKER}/${url}`);
    expect(out).toBe(url);
    // 한 번도 디코딩되지 않아 %3A, %2F 가 그대로 남아 있어야 한다.
    expect(out).toContain("%3A%2F%2F");
  });

  it("punycode 호스트로 들어와도 동일하게 추출한다", () => {
    expect(
      extractOriginalUrl(`${MAKER_PUNY}/https://example.com/a?b=c`)
    ).toBe("https://example.com/a?b=c");
  });

  it("프록시가 `//` 를 축약(`https:/`)한 경우 복원한다", () => {
    expect(extractOriginalUrl(`${MAKER}/https:/www.naver.com`)).toBe(
      "https://www.naver.com"
    );
    expect(
      extractOriginalUrl(`${MAKER}/http:/example.com/path?q=1`)
    ).toBe("http://example.com/path?q=1");
  });

  it("경로가 없으면 null 을 반환한다", () => {
    expect(extractOriginalUrl(MAKER)).toBeNull();
    expect(extractOriginalUrl(`${MAKER}/`)).toBeNull();
  });
});

describe("원본 URL 검증 (validateUrl) — 접두어 방식에 적용", () => {
  it("케이스 1: 정상 https URL 통과", () => {
    const original = extractOriginalUrl(`${MAKER}/https://www.naver.com`)!;
    expect(validateUrl(original).valid).toBe(true);
  });

  it("케이스 3: 쿼리 포함 URL 통과", () => {
    const original = extractOriginalUrl(
      `${MAKER}/https://example.com/search?q=%ED%95%9C&page=2`
    )!;
    expect(validateUrl(original).valid).toBe(true);
  });

  // 케이스 5: 잘못된 URL
  it("케이스 5: 스킴 없는 잘못된 URL 거부", () => {
    const original = extractOriginalUrl(`${MAKER}/not-a-real-url`)!;
    expect(validateUrl(original).valid).toBe(false);
  });

  // 케이스 6: 위험 프로토콜
  it("케이스 6: javascript: / data: / file: 프로토콜 거부", () => {
    expect(
      validateUrl(extractOriginalUrl(`${MAKER}/javascript:alert(1)`)!).valid
    ).toBe(false);
    expect(
      validateUrl(
        extractOriginalUrl(`${MAKER}/data:text/html,<script>1</script>`)!
      ).valid
    ).toBe(false);
    expect(
      validateUrl(extractOriginalUrl(`${MAKER}/file:///etc/passwd`)!).valid
    ).toBe(false);
  });

  it("ftp: 도 거부한다", () => {
    expect(
      validateUrl(extractOriginalUrl(`${MAKER}/ftp://files.example.com`)!).valid
    ).toBe(false);
  });

  // 케이스 7: 매우 긴 URL
  it("케이스 7: MAX_URL_LENGTH 초과 URL 거부", () => {
    const longUrl = "https://example.com/" + "a".repeat(MAX_URL_LENGTH);
    const original = extractOriginalUrl(`${MAKER}/${longUrl}`)!;
    expect(original.length).toBeGreaterThan(MAX_URL_LENGTH);
    expect(validateUrl(original).valid).toBe(false);
  });

  it("경계값: MAX_URL_LENGTH 이하 URL 통과", () => {
    const okUrl =
      "https://example.com/" + "a".repeat(MAX_URL_LENGTH - 30);
    expect(okUrl.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(validateUrl(okUrl).valid).toBe(true);
  });
});

// 케이스 8: 기존 단축 URL 리다이렉트 기능과의 충돌 여부.
describe("기존 리다이렉트 경로와의 충돌 격리", () => {
  it("본 호스트의 /go/슬러그 요청은 접두어 호스트가 아니다", () => {
    // proxy 는 isMakerHost 가 false 이므로 /go/* 를 가로채지 않는다.
    expect(isMakerHost("좌표.to")).toBe(false);
  });

  it("접두어 호스트의 임의 경로는 전부 원본 URL 로 해석된다", () => {
    // 만들기.좌표.to 에서는 /go/x 조차 원본 URL 후보로 추출된다(그리고
    // validateUrl 에서 거부됨) — 본 호스트의 /go 와 의미가 겹치지 않는다.
    const out = extractOriginalUrl(`${MAKER}/go/some-slug`);
    expect(out).toBe("go/some-slug");
    expect(validateUrl(out!).valid).toBe(false);
  });
});
