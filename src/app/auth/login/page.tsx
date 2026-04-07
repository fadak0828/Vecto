"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (error) { setError(error.message); } else { setSent(true); }
    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifyLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setError(error.message);
      setVerifyLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  if (sent) {
    return (
      <main className="flex-1 flex flex-col p-8 sm:p-16" style={{ background: "var(--surface)" }}>
        <div className="max-w-xl mt-24">
          <p
            className="text-xs font-medium mb-4 tracking-wider uppercase"
            style={{ color: "var(--primary)" }}
          >
            로그인 링크 전송 완료
          </p>
          <h1
            className="text-3xl sm:text-4xl font-extrabold mb-4 leading-[1.15]"
            style={{ fontFamily: "Manrope, sans-serif", textWrap: "balance" }}
          >
            이메일을 확인하세요.
          </h1>
          <p style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}>
            <strong style={{ color: "var(--on-background)" }}>{email}</strong>
            로 로그인 링크를 보냈습니다. 메일함에서 링크를 누르거나, 메일에 적힌 6자리 인증 코드를 아래에 입력하세요.
          </p>

          <form
            onSubmit={handleVerifyCode}
            className="mt-8 space-y-3 p-6 sm:p-8 rounded-2xl max-w-md"
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(16px)",
              boxShadow: "var(--shadow-whisper-strong)",
            }}
          >
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6자리 인증 코드"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              className="w-full py-3 px-4 rounded-xl outline-none text-base tracking-[0.4em] text-center"
              style={{ background: "var(--surface-lowest)", fontVariantNumeric: "tabular-nums" }}
              required
            />
            <button
              type="submit"
              disabled={verifyLoading || code.length < 6}
              className="w-full py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ background: "var(--on-background)", color: "var(--surface-lowest)" }}
            >
              {verifyLoading ? "확인 중..." : "코드로 로그인"}
            </button>
            {error && <p className="text-sm pt-1" style={{ color: "var(--error)" }}>{error}</p>}
          </form>

          <a
            href="/"
            className="inline-block mt-8 text-sm"
            style={{ color: "var(--on-surface-variant)" }}
          >
            ← 메인으로
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-8 sm:p-16" style={{ background: "var(--surface)" }}>
      <a href="/" className="text-xl font-bold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>좌표.to</a>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 mt-16 md:mt-24 max-w-5xl">
        {/* Left editorial column */}
        <div className="md:col-span-7 md:pr-8">
          <p
            className="text-xs font-medium mb-4 tracking-wider uppercase"
            style={{ color: "var(--primary)" }}
          >
            로그인
          </p>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] mb-6"
            style={{ fontFamily: "Manrope, sans-serif", textWrap: "balance" }}
          >
            내 좌표로 돌아오는 길.
          </h1>
          <p
            className="text-base sm:text-lg max-w-md"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
          >
            이메일 한 통으로 로그인합니다. 비밀번호 없이, 안전하게.
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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 주소"
              className="w-full py-3 px-4 rounded-xl outline-none text-base" style={{ background: "var(--surface-lowest)" }} required />
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ background: "var(--on-background)", color: "var(--surface-lowest)" }}>
              {loading ? "전송 중..." : "로그인 링크 받기"}
            </button>
            {error && <p className="text-sm pt-1" style={{ color: "var(--error)" }}>{error}</p>}
          </form>
          <a href="/" className="inline-block mt-6 text-sm" style={{ color: "var(--on-surface-variant)" }}>← 메인으로</a>
        </div>
      </div>
    </main>
  );
}
