"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: "var(--surface)" }}
    >
      <h1
        className="text-4xl font-extrabold mb-2"
        style={{ fontFamily: "Manrope, sans-serif", color: "var(--on-surface)" }}
      >
        오류 발생
      </h1>
      <p className="mb-6" style={{ color: "var(--on-surface-variant)" }}>
        잠시 후 다시 시도해주세요.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: "var(--on-background)", color: "var(--surface-lowest)" }}
      >
        다시 시도
      </button>
    </main>
  );
}
