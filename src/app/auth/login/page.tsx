"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--background)]">
        <div className="max-w-sm text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-2xl font-bold mb-2">이메일을 확인하세요</h1>
          <p className="text-[var(--muted)]">
            <strong>{email}</strong>로 로그인 링크를 보냈습니다.
            <br />
            메일함에서 링크를 클릭하면 로그인됩니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--background)]">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-2">좌표.to 로그인</h1>
        <p className="text-[var(--muted)] mb-6">
          이메일로 로그인 링크를 받으세요. 비밀번호 없이 로그인합니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="w-full py-3 px-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent)] text-base"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--foreground)] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "전송 중..." : "로그인 링크 받기"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        <a href="/" className="block mt-6 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          ← 메인으로
        </a>
      </div>
    </main>
  );
}
