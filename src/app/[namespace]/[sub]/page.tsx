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
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold mb-2">
          {decodedNs}/{decodedSub}
        </h1>
        <p className="text-gray-500 mb-6">
          이 좌표는 아직 준비 중입니다.
        </p>
        <a href="/" className="text-sm text-blue-600 hover:underline">
          좌표.to 메인으로 →
        </a>
      </div>
    </main>
  );
}
