// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  captureUtmFromLocation,
  extractUtm,
  getStoredUtm,
  identify,
  posthogEnabled,
  resetIdentity,
  track,
} from "@/lib/analytics";

describe("extractUtm", () => {
  it("5종 UTM 중 하나라도 있으면 객체 리턴", () => {
    expect(
      extractUtm("?utm_source=google&utm_medium=cpc&foo=bar"),
    ).toEqual({ utm_source: "google", utm_medium: "cpc" });
  });

  it("UTM 이 하나도 없으면 null", () => {
    expect(extractUtm("?foo=bar")).toBeNull();
    expect(extractUtm("")).toBeNull();
  });

  it("URLSearchParams 도 받음", () => {
    const params = new URLSearchParams({ utm_campaign: "launch" });
    expect(extractUtm(params)).toEqual({ utm_campaign: "launch" });
  });
});

describe("sessionStorage UTM", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("location.search 에서 UTM 을 읽어 저장 + getStoredUtm 으로 복원", () => {
    const url = new URL("https://example.com/?utm_source=google&utm_campaign=spring");
    vi.stubGlobal("location", url);
    captureUtmFromLocation();
    expect(getStoredUtm()).toEqual({
      utm_source: "google",
      utm_campaign: "spring",
    });
  });

  it("이미 저장되어 있으면 덮어쓰지 않음", () => {
    window.sessionStorage.setItem(
      "vecto.utm",
      JSON.stringify({ utm_source: "first" }),
    );
    vi.stubGlobal(
      "location",
      new URL("https://example.com/?utm_source=second"),
    );
    captureUtmFromLocation();
    expect(getStoredUtm()).toEqual({ utm_source: "first" });
  });

  it("UTM 없으면 아무것도 저장하지 않음", () => {
    vi.stubGlobal("location", new URL("https://example.com/"));
    captureUtmFromLocation();
    expect(getStoredUtm()).toBeNull();
  });
});

describe("posthogEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("키가 비면 false", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    expect(posthogEnabled()).toBe(false);
  });

  it("키가 있으면 true", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_abc");
    expect(posthogEnabled()).toBe(true);
  });
});

describe("track / identify / resetIdentity — no-op when PostHog missing", () => {
  beforeEach(() => {
    // window.posthog 제거
    delete (window as unknown as { posthog?: unknown }).posthog;
  });

  it("window.posthog 없을 때 track 은 throw 하지 않음", () => {
    expect(() =>
      track("shorten_submitted", { has_custom_slug: true }),
    ).not.toThrow();
  });

  it("window.posthog 있을 때 track 이 capture 호출", () => {
    const capture = vi.fn();
    (window as unknown as { posthog: unknown }).posthog = { capture } as unknown;
    track("shorten_created", { slug: "abc", is_anon: true });
    expect(capture).toHaveBeenCalledWith("shorten_created", {
      slug: "abc",
      is_anon: true,
    });
  });

  it("identify 와 reset 도 동일", () => {
    const id = vi.fn();
    const reset = vi.fn();
    (window as unknown as { posthog: unknown }).posthog = {
      identify: id,
      reset,
    } as unknown;
    identify("user-1", { email: "x@y.z" });
    resetIdentity();
    expect(id).toHaveBeenCalledWith("user-1", { email: "x@y.z" });
    expect(reset).toHaveBeenCalled();
  });
});
