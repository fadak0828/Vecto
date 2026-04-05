"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (error) { setError(error.message); } else { setSent(true); }
    setLoading(false);
  }

  if (sent) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--surface)" }}>
        <div className="max-w-sm text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>이메일을 확인하세요</h1>
          <p style={{ color: "var(--on-surface-variant)" }}><strong>{email}</strong>로 로그인 링크를 보냈습니다.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--surface)" }}>
      <div className="max-w-sm w-full">
        <a href="/" className="text-xl font-bold tracking-tight mb-8 block" style={{ fontFamily: "Manrope, sans-serif" }}>좌표.to</a>
        <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>로그인</h1>
        <p className="mb-8" style={{ color: "var(--on-surface-variant)" }}>이메일로 로그인 링크를 받으세요.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 주소"
            className="w-full py-3 px-4 rounded-xl outline-none text-base" style={{ background: "var(--surface-lowest)", boxShadow: "0 2px 32px rgba(0,0,0,0.03)" }} required />
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: "var(--on-background)", color: "var(--surface-lowest)" }}>
            {loading ? "전송 중..." : "로그인 링크 받기"}
          </button>
        </form>
        {error && <p className="mt-4 text-sm" style={{ color: "var(--error)" }}>{error}</p>}
        <a href="/" className="block mt-6 text-sm" style={{ color: "var(--on-surface-variant)" }}>← 메인으로</a>
      </div>
    </main>
  );
}
