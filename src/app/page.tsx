export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <h1 className="text-4xl font-bold mb-4">좌표.to</h1>
      <p className="text-xl text-gray-600 mb-8">짧고 의미있는 한글 URL</p>

      <div className="max-w-xl w-full space-y-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Phase 0: 브라우저 호환성 테스트
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            아래 링크를 클릭한 후, 브라우저 주소창에 한글이 제대로 표시되는지
            확인하세요.
          </p>
          <div className="space-y-3">
            <TestLink
              href="/go/테스트"
              label="무료 단축 URL"
              example="좌표.to/go/테스트"
            />
            <TestLink
              href="/홍길동"
              label="네임스페이스"
              example="좌표.to/홍길동"
            />
            <TestLink
              href="/홍길동/노션"
              label="서브링크"
              example="좌표.to/홍길동/노션"
            />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">테스트 체크리스트</h2>
          <ul className="text-sm space-y-2 text-gray-700">
            <li>☐ Chrome (PC): 주소창에 한글 표시?</li>
            <li>☐ Safari (PC): 주소창에 한글 표시?</li>
            <li>☐ Chrome (모바일): 주소창 + 복사 시 한글 유지?</li>
            <li>☐ Safari (iOS): 주소창 + 복사 시 한글 유지?</li>
            <li>☐ 카카오톡: 링크 프리뷰에 한글 표시?</li>
            <li>☐ 네이버 앱: 인앱 브라우저 한글 표시?</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function TestLink({
  href,
  label,
  example,
}: {
  href: string;
  label: string;
  example: string;
}) {
  return (
    <a
      href={href}
      className="block p-3 bg-white rounded border hover:border-blue-400 transition"
    >
      <span className="font-medium">{label}</span>
      <span className="ml-2 text-sm text-blue-600 font-mono">{example}</span>
    </a>
  );
}
