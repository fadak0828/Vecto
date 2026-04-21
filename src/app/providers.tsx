"use client";

/**
 * 클라이언트 프로바이더.
 *
 * 현재는 PostHog 만 초기화. 키가 비면 no-op → 사이트는 그대로 동작.
 * `autocapture: false` — 명시적 8개 이벤트만 추적 (design doc 2026-04-22).
 * UTM 은 첫 랜딩에서 sessionStorage 에 저장, signup_completed 에 attach.
 */

import { useEffect } from "react";
import posthog from "posthog-js";
import {
  captureUtmFromLocation,
  getStoredUtm,
  identify,
  posthogEnabled,
  track,
} from "@/lib/analytics";
import { createClient } from "@/lib/supabase-browser";

declare global {
  interface Window {
    posthog?: typeof posthog;
  }
}

let initialized = false;

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    captureUtmFromLocation();

    if (!posthogEnabled() || initialized) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    if (!key) return;

    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
      persistence: "localStorage+cookie",
    });
    window.posthog = posthog;
    initialized = true;
  }, []);

  // 서버가 콜백에서 `?auth=success` 로 리다이렉트하면 여기서 한 번만 발화.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("auth") !== "success") return;

    url.searchParams.delete("auth");
    window.history.replaceState(
      {},
      "",
      url.pathname + (url.search ? url.search : "") + url.hash,
    );

    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (user) identify(user.id, { email: user.email });
        const utm = getStoredUtm() ?? {};
        track("signup_completed", { provider: "google", ...utm });
      } catch {
        track("signup_completed", { provider: "google" });
      }
    })();
  }, []);

  return <>{children}</>;
}
