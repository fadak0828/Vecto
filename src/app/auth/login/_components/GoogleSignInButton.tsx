"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  type InAppBrowserInfo,
  detectInAppBrowser,
} from "@/lib/in-app-browser";
import { InAppBrowserNotice } from "./InAppBrowserNotice";

export const LOGIN_FAILED_MESSAGE = "로그인에 실패했습니다. 다시 시도해주세요.";
export const LOGIN_CANCELLED_MESSAGE = "로그인을 취소하셨습니다. 다시 시도해주세요.";

/**
 * URL 쿼리 ?error=... 를 사용자에게 보여줄 한국어 메시지로 매핑.
 *
 * - `auth_failed` — 일반적인 OAuth 교환 실패
 * - `access_denied` — 사용자가 Google consent 화면에서 취소
 * - 그 외 provider 에러 코드(server_error 등) — 실패 메시지로 폴백
 */
export function mapLoginErrorParam(errorParam?: string): string {
  if (!errorParam) return "";
  if (errorParam === "access_denied") return LOGIN_CANCELLED_MESSAGE;
  if (errorParam === "auth_failed") return LOGIN_FAILED_MESSAGE;
  // 알 수 없는 코드는 실패 메시지로 폴백 (빈 문자열로 두면 UX 깨짐).
  return LOGIN_FAILED_MESSAGE;
}

export function GoogleSignInButton({ initialError }: { initialError?: string }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(mapLoginErrorParam(initialError));
  // 인앱 브라우저(카톡/인스타/페북 등) 감지 — Google OAuth 가 차단되는 환경
  const [inApp, setInApp] = useState<InAppBrowserInfo | null>(null);
  const [override, setOverride] = useState(false);

  useEffect(() => {
    // Client-only 감지 (SSR hydration mismatch 회피)
    setInApp(detectInAppBrowser(navigator.userAgent));
  }, []);

  if (inApp?.isInApp && !override) {
    return (
      <InAppBrowserNotice
        info={inApp}
        currentUrl={window.location.href}
        onProceedAnyway={() => setOverride(true)}
      />
    );
  }

  async function handleClick() {
    setLoading(true);
    setErrorMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErrorMsg(LOGIN_FAILED_MESSAGE);
      setLoading(false);
    }
    // 성공 시 브라우저가 accounts.google.com 으로 이동하므로 loading 유지
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        style={{
          background: "var(--on-background)",
          color: "var(--surface-lowest)",
          fontFamily: "var(--font-jakarta), sans-serif",
        }}
      >
        {loading ? (
          <>
            <Spinner />
            <span>Google로 이동 중...</span>
          </>
        ) : (
          <>
            <GoogleLogo />
            <span>Google로 계속하기</span>
          </>
        )}
      </button>

      {errorMsg && (
        <p
          className="text-sm"
          role="alert"
          aria-live="assertive"
          style={{ color: "var(--error)" }}
        >
          {errorMsg}
        </p>
      )}

      <p
        className="text-xs"
        style={{
          color: "var(--on-surface-variant)",
          lineHeight: 1.7,
          wordBreak: "keep-all",
        }}
      >
        Google 로그인 시 이메일, 이름, 프로필 이미지를 수집·이용합니다. 자세한 내용은{" "}
        <a
          href="/privacy"
          className="underline"
          style={{ color: "var(--primary)" }}
        >
          개인정보처리방침
        </a>
        .
      </p>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: "vecto-login-spin 1s linear infinite" }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <style>{`@keyframes vecto-login-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
