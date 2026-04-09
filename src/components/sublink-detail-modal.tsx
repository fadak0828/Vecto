"use client";

/**
 * SublinkDetailModal — 서브링크 상세 모달 (대시보드 + 공개 프로필 공용).
 *
 * Full-screen overlay + centered card. 큰 QR + 전체 URL + 복사 + 이미지로 저장 +
 * OG 미리보기 + "다시 가져오기". ESC / 배경 클릭 / X 버튼으로 닫힘. 기본 포커스는
 * close 버튼으로 이동 (포커스 트랩의 기본 수준).
 *
 * **Portal 렌더링**: 모달은 `createPortal`로 `document.body`에 직접 붙는다.
 * 왜: 조상 DOM에 `transform`/`filter`/`will-change`/`backdrop-filter`가 있으면
 * `position: fixed`가 viewport가 아니라 그 조상 기준으로 바뀌는 CSS 함정이
 * 있다. SublinkCard 구조상 QR 버튼이 `hover:translate-y-[-2px]` 카드 안에
 * 있어서 모달이 카드 박스에 갇혀 떨리는 버그가 있었다 (2026-04-09 사용자 제보).
 * Portal로 body에 붙이면 어떤 조상이 transform을 가져도 안전하다.
 *
 * QR 생성: homepage(`src/app/page.tsx`) 패턴 그대로 lazy import.
 * OG 표시: 카드(SublinkCard)는 description을 절대 표시하지 않지만 모달은 유일한
 * description 노출 지점이다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** 여러 줄 텍스트 자동 줄바꿈 — canvas에 그릴 때 한 줄이 maxWidth 넘으면 다음 줄로. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  // 한글은 단어 경계가 없어서 글자 단위로 그리디 래핑한다.
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = "";
  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
      if (lines.length === maxLines - 1) break;
    } else {
      current = test;
    }
  }
  // 남은 글자들이 마지막 줄. maxLines 넘으면 truncate + 말줄임.
  if (lines.length < maxLines) {
    lines.push(current);
  } else {
    // 마지막 줄에 잔여 글자들 이어붙이기
    const rest = chars.slice(chars.indexOf(current[0]!)).join("");
    let last = "";
    for (const ch of Array.from(rest)) {
      if (ctx.measureText(last + ch + "…").width > maxWidth) break;
      last += ch;
    }
    lines.push(last + (rest.length > last.length ? "…" : ""));
  }
  lines.slice(0, maxLines).forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight);
  });
}

/** data URL을 HTMLImageElement로 로드. canvas.drawImage에 쓰려고. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

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
  const [downloading, setDownloading] = useState(false);
  // SSR-safe portal gate: createPortal은 클라이언트에서만 실행되어야 한다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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
  // mounted 의존성이 필요한 이유: portal 게이트 때문에 첫 render에서는
  // mounted=false → null 반환 → ref가 붙지 않는다. mounted=true 재렌더
  // 이후에야 DOM에 붙는다. open만 의존하면 이 시점에 effect가 재실행되지
  // 않아서 포커스가 이동하지 않는다.
  useEffect(() => {
    if (open && mounted) {
      closeButtonRef.current?.focus();
    }
  }, [open, mounted]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 복사 실패는 조용히 무시 (graceful degrade) — 사용자가 수동 선택 가능.
    }
  }, [fullUrl]);

  /**
   * URL 텍스트 + QR을 canvas에 합성해서 PNG로 다운로드.
   *
   * 구성 (960x1200 @ 2x DPR for retina):
   *   - 흰색 배경 (DESIGN.md surface-lowest)
   *   - 상단에 좌표.to/{ns}/{slug} 큰 타이틀 (charcoal)
   *   - 가운데 QR 코드 800x800 (charcoal on transparent → white bg)
   *   - 하단 캡션 "좌표.to"
   *
   * DOM에서 보이는 QR은 width:480 이미 고해상도로 생성됐으므로 그대로
   * drawImage하면 캔버스에서도 선명하다. 텍스트는 브라우저 폰트를 쓰되
   * Manrope/Plus Jakarta Sans 부재 시 sans-serif fallback.
   */
  const handleDownload = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // QR을 먼저 생성 (모달이 열렸으면 이미 qrDataUrl 있지만, 혹시
      // 실패했거나 아직 로딩 중이면 여기서 직접 생성).
      let qr = qrDataUrl;
      if (!qr) {
        const QRCode = (await import("qrcode")).default;
        qr = await QRCode.toDataURL(fullUrl, {
          margin: 1,
          width: 800,
          color: { dark: "#1a1c1c", light: "#ffffff" },
        });
      } else {
        // DOM용 QR은 transparent 배경이라 저장용으로는 다시 그린다 —
        // 흰 배경에 charcoal이 선명하고, 파일 열 때 투명 체커 패턴이
        // 안 보인다.
        const QRCode = (await import("qrcode")).default;
        qr = await QRCode.toDataURL(fullUrl, {
          margin: 1,
          width: 800,
          color: { dark: "#1a1c1c", light: "#ffffff" },
        });
      }

      // Canvas 합성 — 960x1200 (4:5 portrait, SNS 공유에 무난)
      const W = 960;
      const H = 1200;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas 2d context unavailable");

      // 배경
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      // 상단 타이틀 — 2줄까지 자동 줄바꿈
      ctx.fillStyle = "#1a1c1c";
      ctx.font = "700 52px Manrope, 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, displayUrl, W / 2, 100, W - 120, 64, 2);

      // QR — 중앙, 800x800
      const qrImg = await loadImage(qr);
      const qrSize = 800;
      const qrX = (W - qrSize) / 2;
      const qrY = 260;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // 하단 캡션
      ctx.fillStyle = "#444746";
      ctx.font = "500 32px Manrope, system-ui, sans-serif";
      ctx.fillText("좌표.to", W / 2, H - 90);

      // PNG 다운로드
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("canvas.toBlob returned null"));
        }, "image/png");
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // 파일명: 좌표_송민우_유튜브.png — 한글 포함, 공백 대신 밑줄
      a.download = `좌표_${namespaceName}_${link.slug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // 저장 실패는 조용히 무시 — 사용자가 재시도 가능
    } finally {
      setDownloading(false);
    }
  }, [downloading, qrDataUrl, fullUrl, displayUrl, namespaceName, link.slug]);

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
  // SSR 첫 렌더에서는 portal target이 없으므로 mounted 이후에만 렌더.
  if (!mounted) return null;

  const modalTree = (
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

        {/* Action buttons — Copy (primary, dark) + Save-as-image (ghost) */}
        <div className="mt-6 flex flex-col gap-2">
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
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            data-testid="sublink-modal-download"
            className="w-full py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--surface-container)] disabled:opacity-60"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {downloading ? "저장 중..." : "이미지로 저장"}
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
                // Strip Referer header — og_image URL comes from the upstream
                // target site, which could set it to a tracking pixel to
                // harvest 좌표.to session paths from viewers.
                referrerPolicy="no-referrer"
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

  // Portal로 body에 직접 붙여서 조상의 transform/filter/backdrop-filter
  // 스태킹 컨텍스트에서 완전히 탈출한다. position: fixed가 viewport 기준이 됨.
  return createPortal(modalTree, document.body);
}
