"use client";

/**
 * SublinkDetailModal — 오너 대시보드 전용 서브링크 상세 모달.
 *
 * Full-screen overlay + centered card. 큰 QR + 전체 URL + 복사 + OG 미리보기 +
 * "다시 가져오기". ESC / 배경 클릭 / X 버튼으로 닫힘. 기본 포커스는 close
 * 버튼으로 이동 (포커스 트랩의 기본 수준).
 *
 * QR 생성: homepage(`src/app/page.tsx`) 패턴 그대로 lazy import.
 * OG 표시: 카드(SublinkCard)는 description을 절대 표시하지 않지만 모달은 유일한
 * description 노출 지점이다.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type SublinkDetailModalLink = {
  id: string;
  slug: string;
  target_url: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_fetch_error: string | null;
};

export type SublinkDetailModalProps = {
  open: boolean;
  onClose: () => void;
  link: SublinkDetailModalLink;
  namespaceName: string;
  /** 제공되면 "다시 가져오기" 버튼 렌더. 대시보드가 POST /api/slugs/:id/refresh-og를 붙인다. */
  onRefreshOG?: (id: string) => Promise<void>;
};

export function SublinkDetailModal({
  open,
  onClose,
  link,
  namespaceName,
  onRefreshOG,
}: SublinkDetailModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const fullUrl = `https://좌표.to/${namespaceName}/${link.slug}`;
  const displayUrl = `좌표.to/${namespaceName}/${link.slug}`;

  // QR 생성 — homepage 패턴 그대로 (margin:1, width:480, charcoal on transparent).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(fullUrl, {
          margin: 1,
          width: 480,
          color: { dark: "#1a1c1c", light: "#00000000" },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fullUrl]);

  // ESC → 닫힘. open 동안만 바인딩.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 열릴 때 close 버튼으로 포커스 이동 (기본 포커스 트랩).
  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 복사 실패는 조용히 무시 (graceful degrade) — 사용자가 수동 선택 가능.
    }
  }, [fullUrl]);

  const handleRefresh = useCallback(async () => {
    if (!onRefreshOG || refreshing) return;
    setRefreshing(true);
    try {
      await onRefreshOG(link.id);
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshOG, refreshing, link.id]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="서브링크 상세"
      data-testid="sublink-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        data-testid="sublink-detail-card"
        className="relative w-full max-w-md rounded-2xl p-8"
        style={{
          background: "var(--surface-lowest)",
          boxShadow: "0 8px 64px rgba(26,28,28,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (top-right) */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="닫기"
          data-testid="sublink-modal-close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors hover:bg-[var(--surface-container)]"
          style={{ color: "var(--on-surface-variant)" }}
        >
          ✕
        </button>

        {/* Full URL */}
        <p
          className="text-2xl font-bold pr-8 break-all"
          style={{
            color: "var(--on-background)",
            fontFamily: "Manrope, sans-serif",
            fontFeatureSettings: '"tnum"',
            lineHeight: 1.3,
          }}
          data-testid="sublink-modal-url"
        >
          {displayUrl}
        </p>

        {/* QR Code */}
        <div className="mt-6 flex items-center justify-center">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`${displayUrl} QR 코드`}
              className="w-[320px] h-[320px] max-w-full"
              data-testid="sublink-modal-qr"
            />
          ) : (
            <div
              className="w-[320px] h-[320px] max-w-full rounded-xl"
              style={{ background: "var(--surface-container)" }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Copy button + toast */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleCopy}
            data-testid="sublink-modal-copy"
            className="w-full py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--on-background)",
              color: "var(--surface)",
              fontFamily: "Plus Jakarta Sans, sans-serif",
            }}
          >
            {copied ? "복사됨" : "URL 복사"}
          </button>
        </div>

        {/* OG preview section */}
        {(link.og_image || link.og_title || link.og_description || link.og_fetch_error) && (
          <div className="mt-6" data-testid="sublink-modal-og">
            {link.og_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={link.og_image}
                alt=""
                className="w-40 aspect-video rounded-xl object-cover"
                style={{ background: "var(--surface-container)" }}
              />
            )}
            {link.og_title && (
              <p
                className="mt-3 text-sm font-medium"
                style={{ color: "var(--on-background)", lineHeight: 1.6 }}
              >
                {link.og_title}
              </p>
            )}
            {link.og_description && (
              <p
                className="mt-1.5 text-xs"
                style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}
                data-testid="sublink-modal-og-description"
              >
                {link.og_description}
              </p>
            )}
            {link.og_fetch_error && (
              <p
                className="mt-2 text-xs"
                style={{ color: "var(--error)" }}
                data-testid="sublink-modal-og-error"
              >
                OG 정보를 가져오지 못했습니다: {link.og_fetch_error}
              </p>
            )}
          </div>
        )}

        {/* Refresh OG button — shown when error OR when handler provided */}
        {onRefreshOG && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="sublink-modal-refresh"
            className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--surface-container)] disabled:opacity-60"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {refreshing ? "가져오는 중..." : "다시 가져오기"}
          </button>
        )}
      </div>
    </div>
  );
}
