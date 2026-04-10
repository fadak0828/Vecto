"use client";

import { useState } from "react";
import {
  type InAppBrowserInfo,
  buildExternalBrowserUrl,
} from "@/lib/in-app-browser";

export const INAPP_HEADLINE = "외부 브라우저에서 열어주세요";
export const INAPP_REASON =
  "이 앱의 내장 브라우저는 Google 로그인을 지원하지 않습니다. Chrome 또는 Safari 같은 일반 브라우저에서 열면 정상적으로 로그인할 수 있습니다.";
export const COPY_SUCCESS = "링크가 복사되었습니다";
export const COPY_FAILURE = "복사에 실패했습니다. 주소창을 길게 눌러 복사해주세요";

/**
 * 인앱 브라우저(카톡/인스타/페북/라인 등)에서 Google OAuth 가 막힐 때
 * 사용자를 외부 브라우저로 안내하는 카드.
 *
 * Android: intent:// URL 로 Chrome 직접 호출
 * iOS / 그 외: 링크 복사 + 수동 안내 (⋯ → Safari 로 열기)
 */
export function InAppBrowserNotice({
  info,
  currentUrl,
  onProceedAnyway,
}: {
  info: InAppBrowserInfo;
  currentUrl: string;
  onProceedAnyway: () => void;
}) {
  const [toast, setToast] = useState<string>("");
  const intentUrl = buildExternalBrowserUrl(currentUrl, info.platform);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setToast(COPY_SUCCESS);
    } catch {
      setToast(COPY_FAILURE);
    }
    // 토스트 3초 후 사라지게 (간단 구현, Portal 없음)
    setTimeout(() => setToast(""), 3000);
  }

  function handleOpenChrome() {
    if (intentUrl) {
      window.location.href = intentUrl;
    }
  }

  const isKakaoTalk = info.browser === "kakaotalk";
  const instructionText = isKakaoTalk
    ? "오른쪽 상단 ⋯ 메뉴 → '다른 브라우저로 열기'"
    : "오른쪽 상단 ⋯ 또는 공유 메뉴 → '기본 브라우저로 열기'";

  return (
    <div
      className="space-y-5"
      role="region"
      aria-label="외부 브라우저 안내"
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: "var(--primary)",
            color: "var(--surface-lowest)",
          }}
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 3h7v7M21 3L10 14M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h2
            className="text-lg font-bold mb-2"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--on-background)",
            }}
          >
            {INAPP_HEADLINE}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--on-surface-variant)",
              lineHeight: 1.7,
              wordBreak: "keep-all",
            }}
          >
            {INAPP_REASON}
          </p>
        </div>
      </div>

      {info.platform === "android" && intentUrl && (
        <button
          type="button"
          onClick={handleOpenChrome}
          className="w-full py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          style={{
            background: "var(--primary)",
            color: "var(--surface-lowest)",
            fontFamily: "var(--font-jakarta), sans-serif",
          }}
        >
          Chrome으로 열기
        </button>
      )}

      {info.platform !== "android" && (
        <>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            style={{
              background: "var(--primary)",
              color: "var(--surface-lowest)",
              fontFamily: "var(--font-jakarta), sans-serif",
            }}
          >
            링크 복사
          </button>
          <p
            className="text-sm text-center"
            style={{
              color: "var(--on-surface-variant)",
              lineHeight: 1.7,
            }}
          >
            또는 {instructionText}
          </p>
        </>
      )}

      {toast && (
        <p
          className="text-sm text-center"
          role="status"
          aria-live="polite"
          style={{ color: "var(--primary)" }}
        >
          {toast}
        </p>
      )}

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onProceedAnyway}
          className="text-xs underline"
          style={{ color: "var(--on-surface-variant)" }}
        >
          그래도 여기서 시도하기
        </button>
      </div>
    </div>
  );
}
