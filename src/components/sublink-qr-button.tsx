"use client";

/**
 * SublinkQRButton — 공개 프로필 페이지에서 서브링크 옆에 붙는 작은 QR 버튼.
 *
 * 클릭하면 SublinkDetailModal을 재사용해 전체 URL + 큰 QR + 복사 버튼을
 * 띄운다. 방문자가 수업/부스에서 QR을 보고 스캔하거나, 오너가 자기 페이지에
 * 들어가 현장에서 QR을 크게 띄워 쓸 수 있다.
 *
 * 관리자 전용 refresh-og 기능은 일부러 연결하지 않는다 (`onRefreshOG`
 * 미전달) — 공개 노출이므로 방문자에게 새로고침 권한을 줄 이유가 없다.
 * SublinkDetailModal은 `onRefreshOG`가 없으면 해당 버튼을 렌더하지 않는다.
 *
 * 기존 오너 대시보드의 상세보기 모달과 동일 컴포넌트를 쓰기 때문에 모달
 * chrome/동작이 드리프트할 일이 없다. 유일한 차이는 trigger가 어디서
 * 클릭되느냐와 refresh 핸들러 유무뿐.
 */

import { useState } from "react";
import { SublinkDetailModal } from "@/components/sublink-detail-modal";

export type SublinkQRButtonProps = {
  slug: string;
  targetUrl: string;
  namespaceName: string;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
};

export function SublinkQRButton({
  slug,
  targetUrl,
  namespaceName,
  ogTitle,
  ogDescription,
  ogImage,
}: SublinkQRButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${slug} QR 코드 보기`}
        data-testid="sublink-qr-button"
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--surface-container)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          color: "var(--on-surface-variant)",
          outlineColor: "var(--primary)",
        }}
      >
        {/* QR code glyph — intentional icon, 4 square modules + read marker */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M14 14h3" />
          <path d="M14 17v4" />
          <path d="M17 17v4" />
          <path d="M21 14v7" />
        </svg>
      </button>
      <SublinkDetailModal
        open={open}
        onClose={() => setOpen(false)}
        link={{
          // id는 onRefreshOG 핸들러 전용 — 여긴 안 전달하므로 빈 문자열로 충분.
          id: "",
          slug,
          target_url: targetUrl,
          og_title: ogTitle ?? null,
          og_description: ogDescription ?? null,
          og_image: ogImage ?? null,
          og_fetch_error: null,
        }}
        namespaceName={namespaceName}
      />
    </>
  );
}
