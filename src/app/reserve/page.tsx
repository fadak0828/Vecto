"use client";

import { useState } from "react";

export default function ReservePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{
    message?: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/namespace/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ error: data.error });
      } else {
        setResult({ message: data.message });
      }
    } catch {
      setResult({ error: "네트워크 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <h1 className="text-3xl font-bold mb-2">내 이름으로 좌표 만들기</h1>
      <p className="text-gray-500 mb-8 text-center max-w-md">
        좌표.to/홍길동 같은 나만의 영구 URL을 예약하세요.
        <br />
        서비스 오픈 시 가장 먼저 안내드립니다.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            원하는 이름
          </label>
          <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-r">
              좌표.to/
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="flex-1 px-3 py-2 outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="gildong@example.com"
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {loading ? "예약 중..." : "이름 예약하기"}
        </button>
      </form>

      {result?.error && (
        <div className="mt-6 w-full max-w-md p-4 bg-red-50 rounded-lg">
          <p className="text-red-700 text-sm">{result.error}</p>
        </div>
      )}

      {result?.message && (
        <div className="mt-6 w-full max-w-md p-4 bg-green-50 rounded-lg">
          <p className="text-green-700 text-sm">{result.message}</p>
        </div>
      )}

      <a href="/" className="mt-8 text-sm text-gray-400 hover:text-gray-600">
        ← 메인으로 돌아가기
      </a>
    </main>
  );
}
