export default async function SubLinkPage({
  params,
}: {
  params: Promise<{ namespace: string; sub: string }>;
}) {
  const { namespace, sub } = await params;
  const decodedNs = decodeURIComponent(namespace);
  const decodedSub = decodeURIComponent(sub);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4">서브링크 테스트</h1>
      <div className="bg-orange-50 rounded-lg p-6 max-w-md w-full">
        <p className="text-sm text-gray-500 mb-2">브라우저 주소창을 확인하세요:</p>
        <p className="text-lg font-mono text-orange-700">
          좌표.to/{decodedNs}/{decodedSub}
        </p>
        <p className="text-sm text-gray-400 mt-4">
          실제 서비스에서는 여기서 대상 URL로 리다이렉트됩니다.
        </p>
      </div>
      <a href="/" className="mt-6 text-blue-600 hover:underline text-sm">
        ← 메인으로 돌아가기
      </a>
    </main>
  );
}
