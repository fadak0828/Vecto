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
    <div className="min-h-screen bg-[var(--background)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto">
        <span className="text-lg font-bold tracking-tight">좌표.to</span>
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            대시보드
          </a>
          <a
            href="/reserve"
            className="text-sm text-[var(--accent)] font-medium hover:underline"
          >
            내 이름 예약
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-12 pb-16 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4">
          한글로 기억되는
          <br />
          <span className="text-[var(--accent)]">짧은 주소</span>
        </h1>
        <p className="text-lg text-[var(--muted)] max-w-lg mb-2">
          강의실에서 부르면 30명이 바로 접속하는 URL.
          <br />
          영어 암호 대신 한글로 만드세요.
        </p>

        {/* Live preview */}
        <div className="mt-8 mb-6 py-3 px-5 bg-[var(--surface)] rounded-xl border border-stone-200 inline-block shadow-sm">
          <span className="text-[var(--muted)] text-sm">미리보기 </span>
          <span className="font-mono text-lg font-semibold">
            좌표.to/go/
            <span className="text-[var(--accent)]">
              {slug || "오늘강의"}
            </span>
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 max-w-lg">
          <div className="flex items-center bg-[var(--surface)] border border-stone-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:border-transparent shadow-sm">
            <span className="pl-4 pr-1 py-3 text-[var(--muted)] text-sm whitespace-nowrap select-none">
              좌표.to/go/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.replace(/\s+/g, "-"));
                setResult(null);
              }}
              placeholder="오늘강의"
              className="flex-1 py-3 pr-4 bg-transparent outline-none text-lg"
              required
            />
          </div>

          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="연결할 URL (https://...)"
            className="w-full py-3 px-4 bg-[var(--surface)] border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-base shadow-sm"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--foreground)] text-white rounded-xl font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-[0.98]"
          >
            {loading ? "생성 중..." : "좌표 만들기"}
          </button>
        </form>

        {/* Error */}
        {result?.error && (
          <div className="mt-4 max-w-lg p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-red-700 text-sm">{result.error}</p>
            {result.suggested && (
              <button
                onClick={() => {
                  setSlug(result.suggested!);
                  setResult(null);
                }}
                className="mt-2 text-sm text-[var(--accent)] hover:underline"
              >
                대안 사용: {result.suggested} →
              </button>
            )}
          </div>
        )}

        {/* Success */}
        {result?.url && (
          <div className="mt-4 max-w-lg p-4 bg-[var(--accent-light)] border border-teal-200 rounded-xl">
            <p className="text-sm text-teal-800 mb-2 font-medium">
              생성 완료!
            </p>
            <div className="flex items-center gap-2">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-mono font-semibold text-teal-900 hover:underline break-all"
              >
                {result.url}
              </a>
              <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-1.5 text-xs font-medium bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition"
              >
                {copied ? "복사됨!" : "복사"}
              </button>
            </div>
            <p className="text-xs text-teal-600 mt-2">
              30일간 유효
            </p>
          </div>
        )}
      </section>

      {/* Use cases */}
      <section className="px-6 py-12 border-t border-stone-200">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-6">
            이런 곳에서 쓰세요
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <UseCase
              emoji="🎓"
              title="강의실"
              example="좌표.to/go/AI실습"
              desc="프로젝터에 띄우면 수강생이 바로 접속"
            />
            <UseCase
              emoji="📇"
              title="명함"
              example="좌표.to/홍길동"
              desc="한글 이름으로 된 나만의 링크 허브"
            />
            <UseCase
              emoji="📋"
              title="전단지"
              example="좌표.to/go/신메뉴"
              desc="QR 없이도 누구나 입력 가능"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-12 border-t border-stone-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2">나만의 이름이 필요하세요?</h2>
          <p className="text-[var(--muted)] mb-6">
            좌표.to/홍길동 같은 영구 개인 URL을 예약하세요.
          </p>
          <a
            href="/reserve"
            className="inline-block px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            개인 좌표 예약하기
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-stone-200 text-center text-sm text-[var(--muted)]">
        좌표.to — 짧고 의미있는 한글 URL
      </footer>
    </div>
  );
}

function UseCase({
  emoji,
  title,
  example,
  desc,
}: {
  emoji: string;
  title: string;
  example: string;
  desc: string;
}) {
  return (
    <div className="p-5 bg-[var(--surface)] rounded-xl border border-stone-200 shadow-sm">
      <div className="text-2xl mb-3">{emoji}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="font-mono text-sm text-[var(--accent)] mb-2">{example}</p>
      <p className="text-sm text-[var(--muted)]">{desc}</p>
    </div>
  );
}
