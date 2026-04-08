// 인앱 브라우저 감지 로직 테스트
//
// Google OAuth는 2021년부터 disallowed_useragent 정책으로 카톡/인스타/페북/라인
// 인앱 웹뷰에서 거부합니다. 감지해서 사용자를 외부 브라우저로 안내해야 합니다.
//
// UA 픽스처는 실제 2024-2026년 디바이스에서 수집한 문자열 기준.
import { describe, it, expect } from "vitest";
import {
  detectInAppBrowser,
  buildExternalBrowserUrl,
} from "../src/lib/in-app-browser";

// === UA 픽스처 ===
// 브랜드 인앱 브라우저 (우선순위 매칭)
const UA = {
  kakaoTalkAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-S918N Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.210 Mobile Safari/537.36;KAKAOTALK 10.5.5",
  kakaoTalkIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.5.5",
  kakaoStory:
    "Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 KAKAOSTORY/1.0",
  naverInApp:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 NAVER(inapp; search; 2000; 12.0.0)",
  daumApp:
    "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Daum/1.0 DaumApps/4.2.0",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 307.0.0.34.111 (iPhone14,5; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 520000000)",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 [FBAN/FB4A;FBAV/438.0.0.35.80;FBBV/497831458]",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/438.0.0.29.115]",
  lineAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 Line/14.0.0",
  threadsIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Barcelona 307.0.0.34.111",
  androidWebViewOnly:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.210 Mobile Safari/537.36",
  // === 정상 브라우저 (인앱 아님) ===
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  chromeDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Safari/537.36",
};

describe("detectInAppBrowser — 인앱 브라우저 UA 판별", () => {
  it("KakaoTalk Android UA → kakaotalk + android", () => {
    const r = detectInAppBrowser(UA.kakaoTalkAndroid);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("kakaotalk");
    expect(r.platform).toBe("android");
  });

  it("KakaoTalk iOS UA → kakaotalk + ios", () => {
    const r = detectInAppBrowser(UA.kakaoTalkIos);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("kakaotalk");
    expect(r.platform).toBe("ios");
  });

  it("KakaoStory → kakaostory", () => {
    const r = detectInAppBrowser(UA.kakaoStory);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("kakaostory");
  });

  it("NAVER 인앱 → naver", () => {
    const r = detectInAppBrowser(UA.naverInApp);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("naver");
    expect(r.platform).toBe("ios");
  });

  it("Daum 앱 → daum", () => {
    const r = detectInAppBrowser(UA.daumApp);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("daum");
    expect(r.platform).toBe("android");
  });

  it("Instagram iOS → instagram + ios", () => {
    const r = detectInAppBrowser(UA.instagramIos);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("instagram");
    expect(r.platform).toBe("ios");
  });

  it("Facebook Android (FBAN) → facebook + android", () => {
    const r = detectInAppBrowser(UA.facebookAndroid);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("facebook");
    expect(r.platform).toBe("android");
  });

  it("Facebook iOS (FBAV) → facebook + ios", () => {
    const r = detectInAppBrowser(UA.facebookIos);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("facebook");
    expect(r.platform).toBe("ios");
  });

  it("Line Android → line + android", () => {
    const r = detectInAppBrowser(UA.lineAndroid);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("line");
  });

  it("Threads (Barcelona 코드명) iOS → threads + ios", () => {
    const r = detectInAppBrowser(UA.threadsIos);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("threads");
  });

  it("브랜드 명시 없이 Android WebView 플래그 (; wv) 만 있어도 other-webview 로 탐지", () => {
    const r = detectInAppBrowser(UA.androidWebViewOnly);
    expect(r.isInApp).toBe(true);
    expect(r.browser).toBe("other-webview");
    expect(r.platform).toBe("android");
  });

  it("일반 Chrome Android → isInApp: false", () => {
    const r = detectInAppBrowser(UA.chromeAndroid);
    expect(r.isInApp).toBe(false);
    expect(r.browser).toBeNull();
    expect(r.platform).toBe("android");
  });

  it("일반 Safari iOS → isInApp: false", () => {
    const r = detectInAppBrowser(UA.safariIos);
    expect(r.isInApp).toBe(false);
    expect(r.browser).toBeNull();
    expect(r.platform).toBe("ios");
  });

  it("데스크톱 Chrome → isInApp: false, platform: other", () => {
    const r = detectInAppBrowser(UA.chromeDesktop);
    expect(r.isInApp).toBe(false);
    expect(r.platform).toBe("other");
  });

  it("빈 문자열 → isInApp: false (방어)", () => {
    const r = detectInAppBrowser("");
    expect(r.isInApp).toBe(false);
    expect(r.browser).toBeNull();
  });

  it("null / undefined → isInApp: false (방어)", () => {
    expect(detectInAppBrowser(null).isInApp).toBe(false);
    expect(detectInAppBrowser(undefined).isInApp).toBe(false);
  });
});

describe("buildExternalBrowserUrl — 외부 브라우저 탈출 URL", () => {
  it("Android + https URL → intent:// Chrome 스킴 반환", () => {
    const url = buildExternalBrowserUrl(
      "https://xn--h25b29s.to/auth/login",
      "android",
    );
    expect(url).toContain("intent://xn--h25b29s.to/auth/login");
    expect(url).toContain("scheme=https");
    expect(url).toContain("package=com.android.chrome");
    expect(url).toContain("end;");
  });

  it("intent URL 에 browser_fallback_url 이 encoded 로 포함 (Chrome 미설치 폴백)", () => {
    const url = buildExternalBrowserUrl(
      "https://xn--h25b29s.to/auth/login?error=x",
      "android",
    );
    expect(url).toContain(
      "S.browser_fallback_url=" +
        encodeURIComponent("https://xn--h25b29s.to/auth/login?error=x"),
    );
  });

  it("쿼리스트링과 해시도 intent URL 에 포함", () => {
    const url = buildExternalBrowserUrl(
      "https://xn--h25b29s.to/auth/login?from=kakao#top",
      "android",
    );
    expect(url).toContain("/auth/login?from=kakao#top");
  });

  it("iOS → null (프로그래매틱 탈출 불가)", () => {
    expect(
      buildExternalBrowserUrl("https://xn--h25b29s.to/auth/login", "ios"),
    ).toBeNull();
  });

  it("other(데스크톱) → null", () => {
    expect(
      buildExternalBrowserUrl("https://xn--h25b29s.to/auth/login", "other"),
    ).toBeNull();
  });

  it("잘못된 URL → null (방어)", () => {
    expect(buildExternalBrowserUrl("not-a-url", "android")).toBeNull();
    expect(buildExternalBrowserUrl("", "android")).toBeNull();
  });

  it("javascript: 같은 비-http 스킴은 거부 (보안)", () => {
    expect(
      buildExternalBrowserUrl(
        "javascript:alert('xss')",
        "android",
      ),
    ).toBeNull();
  });
});
