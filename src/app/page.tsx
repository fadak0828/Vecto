"use client";

import { useState } from "react";

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
      <nav className="flex items-center justify-between px-8 py-5 max-w-5xl mx-auto">
        <span
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          좌표.to
        </span>
        <div className="flex items-center gap-6">
          <a
            href="/dashboard"
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: "var(--on-surface-variant)" }}
          >
            대시보드
          </a>
          <a
            href="/reserve"
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: "var(--on-surface-variant)" }}
          >
            이름 예약하기
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
      <section className="px-8 pt-16 pb-20 max-w-5xl mx-auto">
        <div className="max-w-2xl">
          <h1
            className="text-5xl sm:text-6xl font-extrabold leading-[1.1] mb-6"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            한글로 기억되는
            <br />
            짧은 주소, 좌표.to
          </h1>
          <p
            className="text-lg max-w-lg mb-10"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
          >
            길고 복잡한 URL을 한글로 줄이세요.
            <br />
            말로 불러줄 수 있고, 바로 기억할 수 있는 주소.
          </p>

          {/* URL 생성 폼 — Glass Card */}
          <div
            className="p-6 rounded-2xl max-w-lg"
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(16px)",
              boxShadow:
                "0 4px 64px rgba(0,101,101,0.04), 0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <p
              className="text-xs font-medium mb-1 tracking-wider uppercase"
              style={{ color: "var(--on-surface-variant)" }}
            >
              나만의 좌표 만들기
            </p>

            {/* Live preview */}
            <div className="mb-4">
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                좌표.to/go/
                <span style={{ color: "var(--primary)" }}>
                  {slug || "내-포트폴리오"}
                </span>
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div
                className="flex items-center rounded-xl overflow-hidden"
                style={{
                  background: "var(--surface-lowest)",
                  boxShadow: "0 2px 32px rgba(0,101,101,0.03)",
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
                  placeholder="내-포트폴리오"
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
                  background: "var(--surface-lowest)",
                  boxShadow: "0 2px 32px rgba(0,101,101,0.03)",
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
                  30일간 유효
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Selection */}
      <section className="px-8 py-16" style={{ background: "var(--surface-low)" }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-sm font-medium mb-2 tracking-wider uppercase"
            style={{ color: "var(--on-surface-variant)" }}
          >
            무료로 시작하고, 필요하면 업그레이드하세요
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <TypeCard
              active
              title="무료"
              desc="한글 URL 즉시 생성. 30일 유효."
              features={["한글 주소 생성", "30일간 유효", "하루 10개까지"]}
            />
            <TypeCard
              title="내 이름 좌표"
              desc="나만의 이름으로 영구 URL."
              features={["나만의 영구 주소", "하위 링크 20개", "개인 프로필 페이지"]}
              highlight
            />
          </div>
        </div>
      </section>

      {/* Premium Features */}
      <section className="px-8 py-16">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-sm font-medium mb-8 tracking-wider uppercase"
            style={{ color: "var(--on-surface-variant)" }}
          >
            내 이름으로 할 수 있는 것
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              title="개인 프로필"
              desc="좌표.to/홍길동 하나로 내 모든 링크를 모아 공유하세요."
            />
            <FeatureCard
              title="클릭 분석"
              desc="누가 언제 클릭했는지, 날짜별 추이를 한눈에."
            />
            <FeatureCard
              title="하위 주소"
              desc="좌표.to/홍길동/노션, /유튜브, /깃허브... 자유롭게 추가."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="px-8 py-16"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2
            className="text-3xl sm:text-4xl font-extrabold text-white mb-4"
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

function TypeCard({
  title,
  desc,
  features,
  highlight,
  active,
}: {
  title: string;
  desc: string;
  features: string[];
  highlight?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className="p-6 rounded-2xl transition-all"
      style={{
        background: highlight
          ? "var(--on-background)"
          : "var(--surface-lowest)",
        color: highlight ? "var(--surface-lowest)" : "var(--on-surface)",
        boxShadow: active ? "0 0 0 2px var(--primary)" : "none",
      }}
    >
      <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
        {title}
      </h3>
      <p className="text-sm mb-4 opacity-70">{desc}</p>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li key={f} className="text-sm flex items-center gap-2">
            <span
              style={{ color: highlight ? "#76d6d5" : "var(--primary)" }}
            >
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      className="p-6 rounded-2xl"
      style={{
        background: "var(--surface-lowest)",
        boxShadow: "0 2px 48px rgba(0,0,0,0.03)",
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
