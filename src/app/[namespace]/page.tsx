import { Metadata } from "next";

type Props = { params: Promise<{ namespace: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { namespace } = await params;
  const decoded = decodeURIComponent(namespace);
  return {
    title: `${decoded} — 좌표.to`,
    description: `${decoded}의 좌표 페이지`,
    openGraph: {
      title: `${decoded} — 좌표.to`,
      description: `${decoded}의 좌표 페이지`,
      siteName: "좌표.to",
      type: "profile",
    },
  };
}

export default async function NamespacePage({ params }: Props) {
  const { namespace } = await params;
  const decoded = decodeURIComponent(namespace);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">{decoded[0]}</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{decoded}</h1>
        <p className="text-gray-500 mb-6">
          이 좌표는 아직 준비 중입니다.
        </p>
        <a
          href="/reserve"
          className="inline-block px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition"
        >
          이 이름 예약하기
        </a>
        <div className="mt-4">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600">
            좌표.to 메인으로 →
          </a>
        </div>
      </div>
    </main>
  );
}
