import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { GoogleSignInButton } from "./_components/GoogleSignInButton";

// Belt-and-suspenders: getUser() + cookie-reading client must evaluate per-request.
// Next.js 16 should infer this from awaiting searchParams, but being explicit prevents
// a future refactor from silently making the auth redirect static.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "로그인 — 좌표.to",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();

  if (authError && authError.name !== "AuthSessionMissingError") {
    // 로그인 안 된 사용자는 "session missing" 이 정상. 그 외 오류는 관찰용으로 로깅.
    console.error("[/auth/login] getUser failed:", authError.message);
  }

  if (data.user) {
    redirect("/dashboard");
  }

  const { error: errorParam } = await searchParams;
  // searchParams 는 배열일 수 있음 — 첫 값만 사용, 길이 제한(DoS 방어).
  const rawError = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const error = rawError && rawError.length <= 64 ? rawError : undefined;

  return (
    <main
      className="flex-1 flex flex-col p-8 sm:p-16"
      style={{ background: "var(--surface)" }}
    >
      <a
        href="/"
        className="text-xl font-bold tracking-tight"
        style={{ fontFamily: "Manrope, sans-serif" }}
      >
        좌표.to
      </a>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 mt-16 md:mt-24 max-w-5xl mx-auto w-full md:items-center">
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
            style={{
              fontFamily: "Manrope, sans-serif",
              textWrap: "balance",
              wordBreak: "keep-all",
            }}
          >
            내 좌표로 돌아오는 길.
          </h1>
          <p
            className="text-base sm:text-lg max-w-md"
            style={{
              color: "var(--on-surface-variant)",
              lineHeight: 1.8,
              wordBreak: "keep-all",
            }}
          >
            Google 계정 하나로 이어집니다. 비밀번호 없이, 단 한 번의 클릭으로.
          </p>
        </div>

        {/* Right glass card column */}
        <div className="md:col-span-5">
          <div
            className="p-8 md:p-12 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(16px)",
              boxShadow: "var(--shadow-whisper-strong)",
            }}
          >
            <GoogleSignInButton initialError={error} />
          </div>
          <a
            href="/"
            className="inline-block mt-6 text-sm"
            style={{ color: "var(--on-surface-variant)" }}
          >
            ← 메인으로
          </a>
        </div>
      </div>
    </main>
  );
}
