/**
 * PostHog 이벤트 트래킹.
 *
 * - 8개 타입 안전 이벤트 (design doc 2026-04-22 기준)
 * - `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` 가 비어 있으면 no-op → 사이트는 정상 동작
 * - UTM 은 첫 랜딩에서 sessionStorage 에 저장 → `signup_completed` 에 attach
 */

import type { PostHog } from "posthog-js";

type ShortenSubmitted = { event: "shorten_submitted"; properties: { has_custom_slug: boolean } };
type ShortenCreated = {
  event: "shorten_created";
  properties: { slug: string; is_anon: boolean; ttl_hours?: number };
};
type ShortenError = {
  event: "shorten_error";
  properties: { code: string; http_status?: number };
};
type ResultPageViewed = { event: "result_page_viewed"; properties: { slug: string } };
type UpsellCtaClicked = {
  event: "upsell_cta_clicked";
  properties: { placement: "result_page" | "hero" | string };
};
type SignupStarted = { event: "signup_started"; properties: { provider: "google" | string } };
type SignupCompleted = {
  event: "signup_completed";
  properties: {
    provider: "google" | string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
};
type CustomSlugFirstUsed = {
  event: "custom_slug_first_used";
  properties: { slug_length: number };
};

export type AnalyticsEvent =
  | ShortenSubmitted
  | ShortenCreated
  | ShortenError
  | ResultPageViewed
  | UpsellCtaClicked
  | SignupStarted
  | SignupCompleted
  | CustomSlugFirstUsed;

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const UTM_STORAGE_KEY = "vecto.utm";

export const posthogEnabled = () =>
  Boolean((process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? "").trim());

/** 브라우저에서만 PostHog 인스턴스 접근. 서버/비활성화 시 null. */
function getPosthog(): PostHog | null {
  if (typeof window === "undefined") return null;
  const ph = (window as unknown as { posthog?: PostHog }).posthog;
  return ph ?? null;
}

type EventName = AnalyticsEvent["event"];
type PropsFor<N extends EventName> = Extract<
  AnalyticsEvent,
  { event: N }
> extends { properties: infer P }
  ? P
  : undefined;

export function track<N extends EventName>(
  event: N,
  ...args: PropsFor<N> extends undefined
    ? [properties?: undefined]
    : [properties: PropsFor<N>]
): void {
  const ph = getPosthog();
  if (!ph) return;
  ph.capture(event, args[0] as Record<string, unknown> | undefined);
}

export function identify(distinctId: string, properties?: Record<string, unknown>): void {
  const ph = getPosthog();
  if (!ph) return;
  ph.identify(distinctId, properties);
}

export function resetIdentity(): void {
  const ph = getPosthog();
  if (!ph) return;
  ph.reset();
}

/**
 * URLSearchParams 에서 UTM 5종을 추출. 값이 하나라도 있을 때만 객체 리턴.
 */
export function extractUtm(search: string | URLSearchParams): UtmParams | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const utm: UtmParams = {};
  for (const key of UTM_KEYS) {
    const v = params.get(key);
    if (v) utm[key] = v;
  }
  return Object.keys(utm).length > 0 ? utm : null;
}

/** 현재 location.search 에서 UTM 파싱 후 sessionStorage 에 1회만 저장 (덮어쓰지 않음). */
export function captureUtmFromLocation(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(UTM_STORAGE_KEY)) return;
    const utm = extractUtm(window.location.search);
    if (!utm) return;
    window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  } catch {
    /* sessionStorage 비활성화 환경(프라이빗 모드 등) 무시 */
  }
}

export function getStoredUtm(): UtmParams | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UtmParams;
  } catch {
    return null;
  }
}
