export default function NotFound() {
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center p-8"
      style={{ background: "var(--surface)" }}
    >
      <h1
        className="text-4xl font-extrabold mb-2"
        style={{ fontFamily: "Manrope, sans-serif", color: "var(--on-surface)" }}
      >
        404
      </h1>
      <p className="mb-6" style={{ color: "var(--on-surface-variant)" }}>
        이 좌표를 찾을 수 없습니다.
      </p>
      <a
        href="/"
        className="text-sm hover:opacity-70 transition-opacity"
        style={{ color: "var(--primary)" }}
      >
        좌표.to 메인으로 →
      </a>
    </main>
  );
}
