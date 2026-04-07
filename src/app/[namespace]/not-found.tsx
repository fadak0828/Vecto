/**
 * 존재하지 않는 namespace에 대한 404 페이지.
 * notFound()가 호출되면 이 컴포넌트가 렌더링되며 HTTP 404 상태코드를 반환합니다.
 */
export default function NamespaceNotFound() {
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center p-8"
      style={{ background: "var(--surface)" }}
    >
      <div className="max-w-md text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4"
          style={{
            background: "var(--surface-low)",
            color: "var(--on-surface-variant)",
          }}
        >
          ?
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          좌표를 찾을 수 없습니다
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--on-surface-variant)" }}
        >
          이 좌표는 아직 주인이 없습니다.
        </p>
        <a
          href="/reserve"
          className="inline-block px-5 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ background: "var(--on-background)" }}
        >
          이 이름 예약하기
        </a>
        <div className="mt-4">
          <a
            href="/"
            className="text-sm"
            style={{ color: "var(--on-surface-variant)" }}
          >
            좌표.to 메인으로 →
          </a>
        </div>
      </div>
    </main>
  );
}
