export default async function GoSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4">무료 단축 URL 테스트</h1>
      <div className="bg-green-50 rounded-lg p-6 max-w-md w-full">
        <p className="text-sm text-gray-500 mb-2">브라우저 주소창을 확인하세요:</p>
        <p className="text-lg font-mono text-green-700">
          좌표.to/go/{decoded}
        </p>
        <p className="text-sm text-gray-400 mt-4">
          주소창에 한글이 보이면 성공. percent-encoding(%ED%...)이 보이면 실패.
        </p>
      </div>
      <a href="/" className="mt-6 text-blue-600 hover:underline text-sm">
        ← 메인으로 돌아가기
      </a>
    </main>
  );
}
