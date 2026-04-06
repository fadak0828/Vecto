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
    <main className="min-h-screen flex flex-col p-6 sm:p-16" style={{ background: "var(--surface)" }}>
      <a href="/" className="text-xl font-bold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>좌표.to</a>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 mt-16 md:mt-24 max-w-5xl">
        {/* Left editorial column */}
        <div className="md:col-span-7 md:pr-8">
          <p
            className="text-xs font-medium mb-4 tracking-wider uppercase"
            style={{ color: "var(--primary)" }}
          >
            이름 예약하기
          </p>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] mb-6"
            style={{ fontFamily: "Manrope, sans-serif", textWrap: "balance" }}
          >
            내 이름으로 좌표 만들기.
          </h1>
          <p
            className="text-base sm:text-lg max-w-md"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
          >
            좌표.to/[내이름].
            <br />
            사람들에게 기억되는 나만의 주소.
          </p>
        </div>

        {/* Right form column */}
        <div className="md:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="space-y-3 p-6 sm:p-8 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(16px)",
              boxShadow: "var(--shadow-whisper-strong)",
            }}
          >
            <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "var(--surface-lowest)" }}>
              <span className="pl-4 pr-1 py-3 text-sm whitespace-nowrap" style={{ color: "var(--on-surface-variant)" }}>좌표.to/</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value.replace(/\s+/g, "-"))} placeholder="내이름" className="flex-1 py-3 pr-4 bg-transparent outline-none text-lg" required />
            </div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 주소"
              className="w-full py-3 px-4 rounded-xl outline-none" style={{ background: "var(--surface-lowest)" }} required />
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ background: "var(--on-background)", color: "var(--surface-lowest)" }}>
              {loading ? "예약 중..." : "이름 예약하기"}
            </button>

            {result?.error && <div className="mt-2 p-3 rounded-xl text-sm" style={{ background: "rgba(186,26,26,0.08)", color: "var(--error)" }}>{result.error}</div>}
            {result?.message && (
              <div className="mt-2 p-4 rounded-xl text-sm space-y-1" style={{ background: "rgba(0,128,128,0.08)", color: "var(--primary)" }}>
                <p className="font-medium">{result.message}</p>
                <p style={{ color: "var(--on-surface-variant)" }}>입력하신 이메일로 안내를 보내드리겠습니다.</p>
              </div>
            )}
          </form>
          <a href="/" className="inline-block mt-6 text-sm" style={{ color: "var(--on-surface-variant)" }}>← 메인으로</a>
        </div>
      </div>
    </main>
  );
}
