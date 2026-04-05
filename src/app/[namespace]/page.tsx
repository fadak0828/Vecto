export default async function NamespacePage({
  params,
}: {
  params: Promise<{ namespace: string }>;
}) {
  const { namespace } = await params;
  const decoded = decodeURIComponent(namespace);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4">네임스페이스 테스트</h1>
      <div className="bg-purple-50 rounded-lg p-6 max-w-md w-full">
        <p className="text-sm text-gray-500 mb-2">브라우저 주소창을 확인하세요:</p>
        <p className="text-lg font-mono text-purple-700">
          좌표.to/{decoded}
        </p>
        <p className="text-sm text-gray-400 mt-4">
          실제 서비스에서는 이 페이지가 프로필 페이지가 됩니다.
        </p>
      </div>
      <a href="/" className="mt-6 text-blue-600 hover:underline text-sm">
        ← 메인으로 돌아가기
      </a>
    </main>
  );
}
