"use client";

import { useState } from "react";

export default function ReservePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ message?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/namespace/reserve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) });
      const data = await res.json();
      if (!res.ok) { setResult({ error: data.error }); } else { setResult({ message: data.message }); setName(""); setEmail(""); }
    } catch { setResult({ error: "네트워크 오류가 발생했습니다." }); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--surface)" }}>
      <div className="max-w-sm w-full">
        <a href="/" className="text-xl font-bold tracking-tight mb-8 block" style={{ fontFamily: "Manrope, sans-serif" }}>좌표.to</a>
        <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>내 이름으로 좌표 만들기</h1>
        <p className="mb-8" style={{ color: "var(--on-surface-variant)" }}>좌표.to/홍길동 같은 나만의 영구 URL을 예약하세요.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "var(--surface-lowest)", boxShadow: "0 2px 32px rgba(0,0,0,0.03)" }}>
            <span className="pl-4 pr-1 py-3 text-sm whitespace-nowrap" style={{ color: "var(--on-surface-variant)" }}>좌표.to/</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value.replace(/\s+/g, "-"))} placeholder="홍길동" className="flex-1 py-3 pr-4 bg-transparent outline-none text-lg" required />
          </div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 주소"
            className="w-full py-3 px-4 rounded-xl outline-none" style={{ background: "var(--surface-lowest)", boxShadow: "0 2px 32px rgba(0,0,0,0.03)" }} required />
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: "var(--on-background)", color: "var(--surface-lowest)" }}>
            {loading ? "예약 중..." : "이름 예약하기"}
          </button>
        </form>

        {result?.error && <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "var(--error)" }}>{result.error}</div>}
        {result?.message && (
          <div className="mt-4 p-4 rounded-xl text-sm space-y-1" style={{ background: "rgba(0,128,128,0.08)", color: "var(--primary)" }}>
            <p className="font-medium">{result.message}</p>
            <p style={{ color: "var(--on-surface-variant)" }}>입력하신 이메일로 안내를 보내드리겠습니다.</p>
          </div>
        )}

        <a href="/" className="block mt-6 text-sm" style={{ color: "var(--on-surface-variant)" }}>← 메인으로</a>
      </div>
    </main>
  );
}
