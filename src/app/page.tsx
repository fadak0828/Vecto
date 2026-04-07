"use client";

import { useEffect, useState } from "react";

/** Strip http:// or https:// prefix for display (clipboard copy keeps full URL) */
function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

const ROTATING_SLUGS = ["오픈채팅", "청첩장", "이력서", "메뉴판"];
const TYPING_SPEED_MS = 110;
const DELETING_SPEED_MS = 55;
const PAUSE_AFTER_TYPED_MS = 1400;
const PAUSE_BEFORE_NEXT_MS = 350;

export default function Home() {
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
              : target.slice(0, prev.length + 1)
          );
        },
        isDeleting ? DELETING_SPEED_MS : TYPING_SPEED_MS
      );
    }

    return () => clearTimeout(timeout);
  }, [rotatingText, rotatingIndex, isDeleting, slug]);

  // 데스크톱 우측 ghost preview용 QR — 입력 또는 rotating slug 기반.
  // 실제 결과(result.url)가 있으면 preview는 미사용.
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
          }
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
        // QR 코드를 클라이언트에서 즉시 생성 (lazy import → bundle 분리)
        try {
          const QRCode = (await import("qrcode")).default;
          // 큰 사이즈로 생성해서 mobile full-width 다운스케일 시 선명함 확보
          const dataUrl = await QRCode.toDataURL(data.url, {
            margin: 1,
            width: 480,
            color: { dark: "#1a1c1c", light: "#00000000" },
          });
          setQrDataUrl(dataUrl);
        } catch {
          // QR 생성 실패해도 URL+복사는 그대로 작동 (graceful degrade)
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
      // Clipboard API + ClipboardItem (Safari 13.4+, Chrome 76+)
      const blob = await (await fetch(qrDataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setQrCopied("image");
    } catch {
      // Fallback: 미지원 브라우저 또는 권한 거부 → URL 텍스트 복사
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
    <div className="min-h-screen" style={{ background: "var(--surface)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-5xl mx-auto">
        <span
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          좌표.to
        </span>
        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="/dashboard"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline-flex sm:items-center"
            style={{ color: "var(--on-surface-variant)" }}
          >
            대시보드
          </a>
          <a
            href="/reserve"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline-flex sm:items-center"
            style={{ color: "var(--on-surface-variant)" }}
          >
            이름 예약하기
          </a>
          <a
            href="/pricing"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline-flex sm:items-center"
            style={{ color: "var(--on-surface-variant)" }}
          >
            요금제
          </a>
          <a
            href="/auth/login"
            className="text-sm px-4 py-2 rounded-full transition-opacity hover:opacity-90"
            style={{
              background: "var(--on-background)",
              color: "var(--surface-lowest)",
            }}
          >
            로그인
          </a>
        </div>
      </nav>

      {/* Hero — copy above, form + result side-by-side on lg+ */}
      <section className="px-6 sm:px-8 pt-10 sm:pt-16 pb-14 sm:pb-20 max-w-5xl mx-auto">
        {/* Hero copy — full width, sits above the grid */}
        <div className="max-w-2xl mb-8 sm:mb-10">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] mb-4 sm:mb-6"
            style={{ fontFamily: "Manrope, sans-serif", textWrap: "balance" }}
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
            {/* URL 생성 폼 — Glass Card */}
            <div
              className="p-6 rounded-2xl max-w-lg lg:max-w-none"
              style={{
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(16px)",
                boxShadow: "var(--shadow-whisper-strong)",
              }}
            >
              <p
                className="text-xs font-medium mb-1 tracking-wider uppercase"
                style={{ color: "var(--on-surface-variant)" }}
              >
                좌표 만들기
              </p>

              {/* Live preview — mobile/tablet only (desktop has right panel ghost preview) */}
              <div className="mb-4 overflow-hidden lg:hidden">
                <span
                  className="text-xl sm:text-2xl font-bold whitespace-nowrap"
                  style={{ fontFamily: "Manrope, sans-serif" }}
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
                  type="text"
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
                type="url"
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

            {/* Success — mobile/tablet only (desktop shows in right panel) */}
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

                {/* URL — 클릭하면 복사 */}
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="단축 주소 복사"
                  className="w-full text-left font-mono text-xl sm:text-2xl font-bold break-all rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-black/5 cursor-pointer"
                  style={{
                    fontFamily: "Manrope, sans-serif",
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

                {/* QR 코드 — 클릭하면 이미지 복사 (fallback: URL) */}
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

                <p
                  className="text-xs mt-3"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  7일간 유효
                </p>
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

              {/* URL — real or ghost */}
              {result?.url ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="단축 주소 복사"
                  className="w-full text-left font-mono text-2xl xl:text-3xl font-bold break-all rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-black/5 cursor-pointer"
                  style={{
                    fontFamily: "Manrope, sans-serif",
                    color: "var(--on-background)",
                  }}
                >
                  {stripScheme(result.url)}
                </button>
              ) : (
                <div
                  className="font-mono text-2xl xl:text-3xl font-bold break-all px-2 py-2 -mx-2"
                  style={{
                    fontFamily: "Manrope, sans-serif",
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

              {/* QR — real (filled) or ghost preview */}
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
                      <img
                        src={previewQrDataUrl}
                        alt=""
                        className="block w-full h-auto"
                      />
                    ) : (
                      <div className="aspect-square w-full rounded-lg" style={{ background: "var(--surface-container)" }} />
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

      {/* Mobile-only nav links */}
      <nav className="flex sm:hidden gap-2 px-6 pb-6">
        <a
          href="/dashboard"
          className="flex-1 inline-flex items-center justify-center text-sm font-medium py-3 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: "var(--surface-container)", color: "var(--on-surface)" }}
        >
          대시보드
        </a>
        <a
          href="/reserve"
          className="flex-1 inline-flex items-center justify-center text-sm font-medium py-3 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: "var(--surface-container)", color: "var(--on-surface)" }}
        >
          이름 예약
        </a>
        <a
          href="/pricing"
          className="flex-1 inline-flex items-center justify-center text-sm font-medium py-3 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: "var(--surface-container)", color: "var(--on-surface)" }}
        >
          요금제
        </a>
      </nav>

      {/* Two-tier choice — asymmetric editorial split (5/12 free + 7/12 premium) */}
      <section
        className="px-6 sm:px-8 py-12 sm:py-20"
        style={{ background: "var(--surface-low)" }}
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-sm font-medium mb-8 tracking-wider uppercase"
            style={{ color: "var(--on-surface-variant)" }}
          >
            두 가지 시작.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
            {/* Free — secondary, lighter, 5/12 */}
            <div
              className="lg:col-span-5 p-7 sm:p-8 rounded-2xl flex flex-col"
              style={{
                background: "var(--surface-lowest)",
                boxShadow: "var(--shadow-whisper)",
              }}
            >
              <p
                className="text-xs font-medium mb-3 tracking-wider uppercase"
                style={{ color: "var(--on-surface-variant)" }}
              >
                체험
              </p>
              <h3
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                무료
              </h3>
              <p
                className="text-sm mb-2"
                style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}
              >
                한글 URL 즉시 생성. 7일 후 자동 만료.
              </p>
              <p
                className="text-sm mb-7"
                style={{ color: "var(--on-surface-variant)", opacity: 0.7 }}
              >
                ₩0
              </p>
              <ul className="space-y-2.5 mt-auto">
                {["한글 주소 생성", "7일간 유효", "하루 10개까지"].map((f) => (
                  <li key={f} className="text-sm flex items-center gap-2.5">
                    <span style={{ color: "var(--primary)" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium — dominant, dark, 7/12 */}
            <div
              className="lg:col-span-7 p-8 sm:p-10 rounded-2xl flex flex-col"
              style={{
                background: "var(--on-background)",
                color: "var(--surface-lowest)",
                boxShadow: "var(--shadow-whisper-strong)",
              }}
            >
              <p
                className="text-xs font-medium mb-3 tracking-wider uppercase"
                style={{ opacity: 0.55 }}
              >
                추천 · 유료
              </p>
              <h3
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3 break-all"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                좌표.to/[내이름]
              </h3>
              <p
                className="text-base font-bold mb-2"
                style={{ lineHeight: 1.7 }}
              >
                사람들에게 기억되는 나만의 주소.
              </p>
              <p className="text-sm mb-7" style={{ opacity: 0.55 }}>
                월 약 ₩740부터 · 12개월 ₩8,900
              </p>
              <ul className="space-y-2.5 mt-auto">
                {[
                  "나만의 전용 주소",
                  "하위 링크 무제한",
                  "개인 프로필 페이지",
                  "클릭 분석 대시보드",
                ].map((f) => (
                  <li key={f} className="text-sm flex items-center gap-2.5">
                    <span style={{ color: "#76d6d5" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features — asymmetric layout */}
      <section className="px-6 sm:px-8 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-sm font-medium mb-8 tracking-wider uppercase"
            style={{ color: "var(--on-surface-variant)" }}
          >
            이름 하나면 됩니다.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div
              className="p-8 rounded-2xl sm:row-span-2"
              style={{
                background: "var(--on-background)",
                color: "var(--surface-lowest)",
                boxShadow: "var(--shadow-whisper-strong)",
              }}
            >
              <h3
                className="text-xl font-bold mb-3"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                개인 프로필
              </h3>
              <p className="text-sm opacity-70" style={{ lineHeight: 1.7 }}>
                좌표.to/[내이름] 하나로 모든 링크를 모읍니다.
                디지털 명함, 끝.
              </p>
            </div>
            <FeatureCard
              title="클릭 분석"
              desc="누가 언제 클릭했는지, 날짜별 추이를 한눈에."
            />
            <FeatureCard
              title="하위 주소"
              desc="좌표.to/[내이름]/노션, /유튜브, /깃허브. 무제한 추가."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="px-6 sm:px-8 py-12 sm:py-16"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            내 이름, 내 주소.
            <br />
            지금 바로 시작하세요.
          </h2>
          <div className="flex gap-3 justify-center mt-8">
            <a
              href="/reserve"
              className="px-6 py-3 rounded-full font-semibold text-sm"
              style={{
                background: "var(--surface-lowest)",
                color: "var(--on-background)",
              }}
            >
              무료로 시작하기
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 text-center">
        <span className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
          좌표.to
        </span>
      </footer>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      className="p-6 rounded-2xl"
      style={{
        background: "var(--surface-lowest)",
        boxShadow: "var(--shadow-whisper)",
      }}
    >
      <h3
        className="font-bold mb-2"
        style={{ fontFamily: "Manrope, sans-serif" }}
      >
        {title}
      </h3>
      <p className="text-sm" style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}>
        {desc}
      </p>
    </div>
  );
}
