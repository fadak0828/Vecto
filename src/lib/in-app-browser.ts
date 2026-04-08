/**
 * 인앱 브라우저(embedded webview) 감지
 *
 * Google은 2021년부터 `disallowed_useragent` 정책으로 카카오톡/인스타그램/
 * 페이스북/라인 등 앱의 내장 웹뷰에서 OAuth를 거부합니다. 감지해서 사용자를
 * 외부 브라우저로 안내해야 로그인이 가능합니다.
 *
 * - navigator.userAgent 문자열을 입력으로 받는 순수 함수 (테스트 가능)
 * - 컴포넌트는 mount 이후 useEffect에서 호출 (SSR hydration mismatch 회피)
 */

export type InAppBrowserName =
  | "kakaotalk"
  | "kakaostory"
  | "naver"
  | "daum"
  | "instagram"
  | "facebook"
  | "line"
  | "threads"
  | "other-webview";

export type Platform = "ios" | "android" | "other";

export type InAppBrowserInfo = {
  isInApp: boolean;
  browser: InAppBrowserName | null;
  platform: Platform;
};

/**
 * User agent 문자열에서 인앱 브라우저 종류와 플랫폼을 판별.
 * 실제 디바이스에서 수집한 UA 문자열을 기준으로 substring 매칭.
 */
export function detectInAppBrowser(userAgent: string | null | undefined): InAppBrowserInfo {
  const ua = userAgent ?? "";
  const platform: Platform = /iPhone|iPad|iPod/.test(ua)
    ? "ios"
    : /Android/.test(ua)
      ? "android"
      : "other";

  if (!ua) {
    return { isInApp: false, browser: null, platform };
  }

  // 우선순위: 브랜드 명시 UA → 일반 webview 플래그
  // (브랜드 명시가 더 정확하므로 먼저 검사)
  let browser: InAppBrowserName | null = null;
  if (ua.includes("KAKAOTALK")) browser = "kakaotalk";
  else if (ua.includes("KAKAOSTORY")) browser = "kakaostory";
  else if (ua.includes("NAVER(inapp")) browser = "naver";
  else if (/Daum\/|DaumApps/.test(ua)) browser = "daum";
  else if (ua.includes("Instagram")) browser = "instagram";
  else if (/FBAN|FBAV/.test(ua)) browser = "facebook";
  else if (/ Line\/|LINE\//.test(ua)) browser = "line";
  else if (ua.includes("Barcelona")) browser = "threads"; // Threads 내부 코드명
  else if (/;\s*wv\)/.test(ua)) browser = "other-webview"; // Android WebView 플래그

  return { isInApp: browser !== null, browser, platform };
}

/**
 * Android에서 Chrome을 강제로 띄우는 intent:// URL 생성.
 * iOS/데스크톱은 프로그래매틱 탈출이 불가능하므로 null 반환 (UI에서 수동 안내).
 *
 * intent:// 형식 레퍼런스:
 * https://developer.chrome.com/docs/multidevice/android/intents
 */
export function buildExternalBrowserUrl(
  currentUrl: string,
  platform: Platform,
): string | null {
  if (platform !== "android") return null;

  let parsed: URL;
  try {
    parsed = new URL(currentUrl);
  } catch {
    return null;
  }

  // http/https만 허용 (보안)
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const hostPath = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  const fallback = encodeURIComponent(currentUrl);

  // Chrome이 설치되어 있으면 Chrome으로, 없으면 browser_fallback_url로 폴백
  return `intent://${hostPath}#Intent;scheme=${parsed.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${fallback};end;`;
}
