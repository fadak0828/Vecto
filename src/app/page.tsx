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

  function useSuggested() {
    if (result?.suggested) {
      setSlug(result.suggested);
      setResult(null);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <h1 className="text-4xl font-bold mb-2">좌표.to</h1>
      <p className="text-lg text-gray-500 mb-8">짧고 의미있는 한글 URL</p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            한글 슬러그
          </label>
          <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-r">
              좌표.to/go/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="오늘강의"
              className="flex-1 px-3 py-2 outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            연결할 URL
          </label>
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://docs.google.com/..."
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {loading ? "생성 중..." : "좌표 만들기"}
        </button>
      </form>

      {result?.error && (
        <div className="mt-6 w-full max-w-md p-4 bg-red-50 rounded-lg">
          <p className="text-red-700 text-sm">{result.error}</p>
          {result.suggested && (
            <button
              onClick={useSuggested}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              대안 사용: {result.suggested} →
            </button>
          )}
        </div>
      )}

      {result?.url && (
        <div className="mt-6 w-full max-w-md p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">생성 완료!</p>
          <div className="flex items-center gap-2">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-mono text-green-700 hover:underline break-all"
            >
              {result.url}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(result.url!)}
              className="shrink-0 px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50"
            >
              복사
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            30일간 유효 · 삭제 토큰: {result.delete_token?.slice(0, 8)}...
          </p>
        </div>
      )}

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-400">
          나만의 이름으로 된 영구 URL이 필요하신가요?
        </p>
        <p className="text-sm text-gray-500 font-medium">
          좌표.to/홍길동 같은 개인 네임스페이스를 준비하고 있습니다.
        </p>
      </div>
    </main>
  );
}
