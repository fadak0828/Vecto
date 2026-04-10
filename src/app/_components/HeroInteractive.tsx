"use client";

import { useEffect, useState } from "react";
import { NamespacePillPreview } from "@/components/premium-previews";

/** Strip http:// or https:// prefix for display (clipboard copy keeps full URL) */
function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

const ROTATING_SLUGS = ["오픈채팅", "청첩장", "이력서", "메뉴판"];
const NAMESPACE_TEASER_WORDS = [
  "내이름",
  "우리가게",
  "포트폴리오",
  "내브랜드",
  "디자이너",
];
const TYPING_SPEED_MS = 110;
const DELETING_SPEED_MS = 55;
const PAUSE_AFTER_TYPED_MS = 1400;
const PAUSE_BEFORE_NEXT_MS = 350;

/**
 * Landing hero — 유일한 client island.
 *
 * 성능 리팩터 (2026-04-10):
 *   이전에는 랜딩 page.tsx 전체가 "use client" 였다 (816 줄). 실제로 인터랙션은
 *   이 hero 영역(폼 + 애니메이션 + QR 미리보기) 뿐이고 나머지는 정적 마케팅
 *   컨텐츠. 이제는 page.tsx 가 server component 로 SSR 되고 이 컴포넌트만
 *   하이드레이트 → 클라 번들 대폭 축소 + FCP 개선.
 */
export function HeroInteractive() {
  const [slug, setSlug] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [result, setResult] = useState<{
    url?: string;
    delete_token?: string;
    error?: string;
    suggested?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrCopied, setQrCopied] = useState<"image" | "url" | null>(null);
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string | null>(null);
  const [rotatingText, setRotatingText] = useState("");
  const [rotatingIndex, setRotatingIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Teaser pill 크로스 페이드 루프
  const [teaserWordIndex, setTeaserWordIndex] = useState(0);
  const [teaserVisible, setTeaserVisible] = useState(true);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let cancelled = false;
    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
    const cycle = () => {
      if (cancelled) return;
      setTeaserVisible(false);
      fadeTimeout = setTimeout(() => {
        if (cancelled) return;
        setTeaserWordIndex((i) => (i + 1) % NAMESPACE_TEASER_WORDS.length);
        setTeaserVisible(true);
      }, 380);
    };
    const interval = setInterval(cycle, 2400);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, []);

  const teaserSlug = NAMESPACE_TEASER_WORDS[teaserWordIndex];
  const teaserSlugStyle: React.CSSProperties = {
    width: "5.5em",
    opacity: teaserVisible ? 1 : 0,
    transition: "opacity 0.38s ease-in-out",
  };

  useEffect(() => {
    if (slug.length > 0) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setRotatingText(ROTATING_SLUGS[0]);
      return;
    }

    const target = ROTATING_SLUGS[rotatingIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && rotatingText === target) {
      timeout = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPED_MS);
    } else if (isDeleting && rotatingText === "") {
      timeout = setTimeout(() => {
        setIsDeleting(false);
        setRotatingIndex((i) => (i + 1) % ROTATING_SLUGS.length);
      }, PAUSE_BEFORE_NEXT_MS);
    } else {
      timeout = setTimeout(
        () => {
          setRotatingText((prev) =>
            isDeleting
              ? target.slice(0, prev.length - 1)
              : target.slice(0, prev.length + 1),
          );
        },
        isDeleting ? DELETING_SPEED_MS : TYPING_SPEED_MS,
      );
    }

    return () => clearTimeout(timeout);
  }, [rotatingText, rotatingIndex, isDeleting, slug]);

  // 데스크톱 우측 ghost preview용 QR
  useEffect(() => {
    if (result?.url) return;
    const previewSlug = slug || rotatingText;
    if (!previewSlug) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(
          `https://좌표.to/go/${previewSlug}`,
          {
            margin: 1,
            width: 480,
            color: { dark: "#1a1c1c", light: "#00000000" },
          },
        );
        if (!cancelled) setPreviewQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setPreviewQrDataUrl(null);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [slug, rotatingText, result?.url]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setQrDataUrl(null);
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, target_url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error, suggested: data.suggested });
      } else {
        setResult({ url: data.url, delete_token: data.delete_token });
        try {
          const QRCode = (await import("qrcode")).default;
          const dataUrl = await QRCode.toDataURL(data.url, {
            margin: 1,
            width: 480,
            color: { dark: "#1a1c1c", light: "#00000000" },
          });
          setQrDataUrl(dataUrl);
        } catch {
          setQrDataUrl(null);
        }
      }
    } catch {
      setResult({ error: "네트워크 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (result?.url) {
      navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleQrCopy() {
    if (!qrDataUrl || !result?.url) return;
    try {
      const blob = await (await fetch(qrDataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setQrCopied("image");
    } catch {
      try {
        await navigator.clipboard.writeText(result.url);
        setQrCopied("url");
      } catch {
        return;
      }
    }
    setTimeout(() => setQrCopied(null), 2000);
  }

  return (
    <section className="px-6 sm:px-8 pt-10 sm:pt-16 pb-14 sm:pb-20 max-w-5xl mx-auto">
      {/* Hero copy — full width, sits above the grid */}
      <div className="max-w-2xl mb-8 sm:mb-10">
        <h1
          className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] mb-4 sm:mb-6"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            textWrap: "balance",
          }}
        >
          이름이 곧 주소.
        </h1>
        <p
          className="text-base sm:text-lg max-w-lg"
          style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
        >
          말로 부르고, 한 번에 기억합니다.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
        {/* Left: form */}
        <div className="lg:col-span-6">
          <div
            className={
              result?.url
                ? "p-6 rounded-2xl max-w-lg lg:max-w-none result-mobile-fullscreen"
                : "p-6 rounded-2xl max-w-lg lg:max-w-none"
            }
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(16px)",
              boxShadow: "var(--shadow-whisper-strong)",
            }}
          >
            {!result?.url && (
              <>
                <p
                  className="text-xs font-medium mb-1 tracking-wider uppercase"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  좌표 만들기
                </p>

                {/* Live preview — mobile/tablet only */}
                <div className="mb-4 overflow-hidden lg:hidden">
                  <span
                    className="text-xl sm:text-2xl font-bold whitespace-nowrap"
                    style={{
                      fontFamily: "var(--font-manrope), sans-serif",
                    }}
                  >
                    좌표.to/go/
                    <span style={{ color: "var(--primary)" }}>
                      {slug || rotatingText}
                      {!slug && (
                        <span
                          aria-hidden="true"
                          style={{ opacity: 0.4, marginLeft: 1 }}
                        >
                          |
                        </span>
                      )}
                    </span>
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div
                    className="flex items-center rounded-xl overflow-hidden focus-within:outline focus-within:outline-2 focus-within:outline-offset-2"
                    style={{
                      background: "var(--surface-container)",
                      boxShadow: "inset 0 0 0 1px rgba(0,101,101,0.06)",
                      outlineColor: "var(--primary)",
                    }}
                  >
                    <span
                      className="pl-4 pr-1 py-3 text-sm whitespace-nowrap select-none"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      좌표.to/go/
                    </span>
                    <input
                      id="hero-slug"
                      name="slug"
                      type="text"
                      aria-label="좌표 이름"
                      autoComplete="off"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value.replace(/\s+/g, "-"));
                        setResult(null);
                      }}
                      placeholder={ROTATING_SLUGS[rotatingIndex]}
                      className="flex-1 py-3 pr-4 bg-transparent outline-none text-base"
                      required
                    />
                  </div>

                  <input
                    id="hero-target-url"
                    name="target_url"
                    type="url"
                    aria-label="연결할 URL"
                    autoComplete="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="연결할 URL을 입력하세요"
                    className="w-full py-3 px-4 rounded-xl outline-none text-base"
                    style={{
                      background: "var(--surface-container)",
                      boxShadow: "inset 0 0 0 1px rgba(0,101,101,0.06)",
                    }}
                    required
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: "var(--on-background)",
                      color: "var(--surface-lowest)",
                    }}
                  >
                    {loading ? "생성 중..." : "생성하기"}
                  </button>
                </form>

                {/* Error */}
                {result?.error && (
                  <div
                    className="mt-4 p-3 rounded-xl text-sm"
                    style={{ background: "#fef2f2", color: "#b91c1c" }}
                  >
                    {result.error}
                    {result.suggested && (
                      <button
                        onClick={() => {
                          setSlug(result.suggested!);
                          setResult(null);
                        }}
                        className="block mt-1 underline"
                        style={{ color: "var(--primary)" }}
                      >
                        대안: {result.suggested}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Success — mobile/tablet only */}
            {result?.url && (
              <div
                className="mt-4 p-4 rounded-xl lg:hidden"
                style={{ background: "rgba(0,128,128,0.08)" }}
              >
                <p
                  className="text-xs font-medium mb-3 tracking-wider uppercase"
                  style={{ color: "var(--primary)" }}
                >
                  생성 완료
                </p>

                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="단축 주소 복사"
                  className="w-full text-left font-mono text-xl sm:text-2xl font-bold break-all rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-black/5 cursor-pointer"
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    color: "var(--on-background)",
                  }}
                >
                  {stripScheme(result.url)}
                </button>
                <p
                  className="text-xs mt-1 ml-0 h-4 transition-opacity"
                  style={{
                    color: "var(--primary)",
                    opacity: copied ? 1 : 0,
                  }}
                  aria-live="polite"
                >
                  주소가 복사되었습니다
                </p>

                {qrDataUrl && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleQrCopy}
                      aria-label="QR 코드 이미지 복사"
                      className="block w-full sm:w-72 mx-auto rounded-2xl transition-transform hover:scale-[1.01] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{
                        background: "var(--surface-lowest)",
                        padding: "16px",
                        boxShadow: "var(--shadow-whisper)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrDataUrl}
                        alt={`${stripScheme(result.url)} QR 코드. 카메라로 스캔하세요.`}
                        className="block w-full h-auto"
                      />
                    </button>
                    <p
                      className="text-xs mt-2 text-center h-4 transition-opacity"
                      style={{
                        color: "var(--primary)",
                        opacity: qrCopied ? 1 : 0,
                      }}
                      aria-live="polite"
                    >
                      {qrCopied === "image"
                        ? "QR 이미지가 복사되었습니다"
                        : qrCopied === "url"
                          ? "주소가 복사되었습니다"
                          : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Upgrade prompt */}
            {result?.url && (
              <div className="mt-5">
                <h3
                  className="text-lg sm:text-xl font-extrabold mb-1 break-keep"
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    color: "var(--on-background)",
                  }}
                >
                  이 링크는 7일 후 만료됩니다
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{
                    color: "var(--on-surface-variant)",
                    lineHeight: 1.7,
                  }}
                >
                  영구적인 좌표를 만드시겠어요?
                </p>

                <a
                  href="/pricing"
                  className="group flex flex-col items-start gap-3 p-4 rounded-2xl transition-all hover:translate-y-[-1px]"
                  style={{
                    background: "var(--surface-lowest)",
                    boxShadow: "var(--shadow-whisper-strong)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <NamespacePillPreview
                    slug={teaserSlug}
                    slugStyle={teaserSlugStyle}
                    hideCursor
                  />
                  <div className="w-full">
                    <p
                      className="text-sm font-bold break-keep"
                      style={{
                        fontFamily: "var(--font-manrope), sans-serif",
                        color: "var(--on-background)",
                      }}
                    >
                      영구적인 주소 만들기
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold group-hover:translate-x-0.5 transition-transform"
                    style={{ color: "var(--primary)" }}
                    aria-hidden="true"
                  >
                    더 알아보기 →
                  </span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setSlug("");
                    setTargetUrl("");
                    setQrDataUrl(null);
                    setCopied(false);
                  }}
                  className="block mt-4 text-sm hover:opacity-70 transition-opacity"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  ← 새로 만들기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column — desktop only — ghost preview OR actual result */}
        <div className="hidden lg:block lg:col-span-6 lg:relative lg:top-[-186px]">
          <div
            className="p-6 rounded-2xl transition-opacity"
            style={{
              background: result?.url
                ? "rgba(0,128,128,0.08)"
                : "rgba(255,255,255,0.6)",
              backdropFilter: "blur(16px)",
              boxShadow: "var(--shadow-whisper)",
            }}
          >
            <p
              className="text-xs font-medium mb-3 tracking-wider uppercase"
              style={{
                color: result?.url
                  ? "var(--primary)"
                  : "var(--on-surface-variant)",
              }}
            >
              {result?.url ? "생성 완료" : "미리보기"}
            </p>

            {result?.url ? (
              <button
                type="button"
                onClick={handleCopy}
                aria-label="단축 주소 복사"
                className="w-full text-left font-mono text-2xl xl:text-3xl font-bold break-all rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-black/5 cursor-pointer"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  color: "var(--on-background)",
                }}
              >
                {stripScheme(result.url)}
              </button>
            ) : (
              <div
                className="font-mono text-2xl xl:text-3xl font-bold break-all px-2 py-2 -mx-2"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  color: "var(--on-surface-variant)",
                  opacity: 0.55,
                }}
                aria-hidden="true"
              >
                좌표.to/go/
                <span style={{ color: "var(--primary)", opacity: 0.7 }}>
                  {slug || rotatingText}
                  {!slug && (
                    <span style={{ opacity: 0.4, marginLeft: 1 }}>|</span>
                  )}
                </span>
              </div>
            )}
            <p
              className="text-xs mt-1 ml-0 h-4 transition-opacity"
              style={{
                color: "var(--primary)",
                opacity: copied ? 1 : 0,
              }}
              aria-live="polite"
            >
              주소가 복사되었습니다
            </p>

            <div className="mt-5">
              {result?.url && qrDataUrl ? (
                <button
                  type="button"
                  onClick={handleQrCopy}
                  aria-label="QR 코드 이미지 복사"
                  className="block w-full max-w-xs mx-auto rounded-2xl transition-transform hover:scale-[1.01] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    background: "var(--surface-lowest)",
                    padding: "16px",
                    boxShadow: "var(--shadow-whisper)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt={`${stripScheme(result.url)} QR 코드. 카메라로 스캔하세요.`}
                    className="block w-full h-auto"
                  />
                </button>
              ) : (
                <div
                  className="block w-full max-w-xs mx-auto rounded-2xl"
                  style={{
                    background: "var(--surface-lowest)",
                    padding: "16px",
                    boxShadow: "var(--shadow-whisper)",
                    opacity: 0.55,
                  }}
                  aria-hidden="true"
                >
                  {previewQrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewQrDataUrl}
                      alt=""
                      className="block w-full h-auto"
                    />
                  ) : (
                    <div
                      className="aspect-square w-full rounded-lg"
                      style={{ background: "var(--surface-container)" }}
                    />
                  )}
                </div>
              )}
              <p
                className="text-xs mt-2 text-center h-4 transition-opacity"
                style={{
                  color: "var(--primary)",
                  opacity: qrCopied ? 1 : 0,
                }}
                aria-live="polite"
              >
                {qrCopied === "image"
                  ? "QR 이미지가 복사되었습니다"
                  : qrCopied === "url"
                    ? "주소가 복사되었습니다"
                    : ""}
              </p>
            </div>

            <p
              className="text-xs mt-3"
              style={{ color: "var(--on-surface-variant)" }}
            >
              {result?.url
                ? "7일간 유효"
                : "생성 후 결과가 여기에 표시됩니다"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
