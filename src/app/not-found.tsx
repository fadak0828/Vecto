export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-gray-500 mb-6">이 좌표를 찾을 수 없습니다.</p>
      <a
        href="/"
        className="text-blue-600 hover:underline text-sm"
      >
        좌표.to 메인으로 →
      </a>
    </main>
  );
}
