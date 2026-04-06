"use client";

import { useEffect, useState } from "react";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
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
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline"
            style={{ color: "var(--on-surface-variant)" }}
          >
            대시보드
          </a>
          <a
            href="/reserve"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline"
            style={{ color: "var(--on-surface-variant)" }}
          >
            이름 예약하기
          </a>
          <a
            href="/pricing"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline"
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

      {/* Hero */}
      <section className="px-6 sm:px-8 pt-10 sm:pt-16 pb-14 sm:pb-20 max-w-5xl mx-auto">
        <div className="max-w-2xl">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] mb-4 sm:mb-6"
            style={{ fontFamily: "Manrope, sans-serif", textWrap: "balance" }}
          >
            이름이 곧 주소.
          </h1>
          <p
            className="text-base sm:text-lg max-w-lg mb-8 sm:mb-10"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
          >
            말로 부르고, 한 번에 기억합니다.
          </p>

          {/* URL 생성 폼 — Glass Card */}
          <div
            className="p-6 rounded-2xl max-w-lg"
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

            {/* Live preview */}
            <div className="mb-4 overflow-hidden">
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

            {/* Success */}
            {result?.url && (
              <div
                className="mt-4 p-3 rounded-xl"
                style={{ background: "rgba(0,128,128,0.08)" }}
              >
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: "var(--primary)" }}
                >
                  생성 완료!
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold break-all">
                    {result.url}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 px-3 py-1 text-xs rounded-full transition"
                    style={{
                      background: "var(--secondary-container)",
                      color: "var(--on-surface)",
                    }}
                  >
                    {copied ? "복사됨!" : "복사"}
                  </button>
                </div>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  7일간 유효
                </p>
              </div>
            )}
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
                월 ₩742부터 · 12개월 ₩8,900
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
