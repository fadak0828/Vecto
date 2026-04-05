import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";

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

  // reserved paths
  if (["go", "api", "auth", "dashboard", "reserve", "_next"].includes(decoded)) {
    return null;
  }

  let ns = null;
  let links: { slug: string; target_url: string }[] = [];

  try {
    const supabase = getSupabase();

    const { data: nsData } = await supabase
      .from("namespaces")
      .select("id, name")
      .eq("name", decoded)
      .maybeSingle();

    if (nsData) {
      ns = nsData;
      const { data: slugs } = await supabase
        .from("slugs")
        .select("slug, target_url")
        .eq("namespace_id", nsData.id)
        .order("created_at", { ascending: true });
      links = slugs ?? [];
    }
  } catch {
    // Supabase 미설정 시 fallback
  }

  // 네임스페이스 없음 → 예약 유도
  if (!ns) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--background)]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">{decoded[0]}</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{decoded}</h1>
          <p className="text-[var(--muted)] mb-6">
            이 좌표는 아직 주인이 없습니다.
          </p>
          <a
            href="/reserve"
            className="inline-block px-5 py-2.5 bg-[var(--foreground)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            이 이름 예약하기
          </a>
          <div className="mt-4">
            <a href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              좌표.to 메인으로 →
            </a>
          </div>
        </div>
      </main>
    );
  }

  // 네임스페이스 있음 → 프로필 페이지
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* 프로필 헤더 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[var(--accent)] text-white flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            {ns.name[0]}
          </div>
          <h1 className="text-2xl font-bold">{ns.name}</h1>
          <p className="text-sm text-[var(--muted)] font-mono mt-1">
            좌표.to/{ns.name}
          </p>
        </div>

        {/* 링크 목록 */}
        {links.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted)]">
            아직 등록된 링크가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <a
                key={link.slug}
                href={link.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)] transition-colors text-center"
              >
                <span className="font-medium">{link.slug}</span>
              </a>
            ))}
          </div>
        )}

        {/* 푸터 */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            좌표.to에서 나만의 좌표 만들기
          </a>
        </div>
      </div>
    </main>
  );
}
