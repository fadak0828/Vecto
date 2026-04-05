import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";

type Props = { params: Promise<{ namespace: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { namespace } = await params;
  const decoded = decodeURIComponent(namespace);
  let title = `${decoded} — 좌표.to`;
  let description = `${decoded}의 좌표 페이지`;
  try {
    const supabase = getSupabase();
    const { data: ns } = await supabase.from("namespaces").select("display_name, bio").eq("name", decoded).maybeSingle();
    if (ns) { const name = ns.display_name || decoded; title = `${name} — 좌표.to`; description = ns.bio || `${name}의 좌표 페이지`; }
  } catch { /* fallback */ }
  return { title, description, openGraph: { title, description, siteName: "좌표.to", type: "profile" } };
}

export default async function NamespacePage({ params }: Props) {
  const { namespace } = await params;
  const decoded = decodeURIComponent(namespace);
  if (["go", "api", "auth", "dashboard", "reserve", "_next"].includes(decoded)) return null;

  let ns: { id: string; name: string; display_name: string | null; bio: string | null; avatar_url: string | null } | null = null;
  let links: { slug: string; target_url: string }[] = [];

  try {
    const supabase = getSupabase();
    const { data: nsData } = await supabase.from("namespaces").select("id, name, display_name, bio, avatar_url").eq("name", decoded).maybeSingle();
    if (nsData) {
      ns = nsData;
      const { data: slugs } = await supabase.from("slugs").select("slug, target_url").eq("namespace_id", nsData.id).order("created_at", { ascending: true });
      links = slugs ?? [];
    }
  } catch { /* fallback */ }

  if (!ns) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--surface)" }}>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl" style={{ background: "var(--surface-low)" }}>{decoded[0]}</div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>{decoded}</h1>
          <p className="mb-6" style={{ color: "var(--on-surface-variant)" }}>이 좌표는 아직 주인이 없습니다.</p>
          <a href="/reserve" className="inline-block px-5 py-2.5 rounded-full text-sm font-medium text-white" style={{ background: "var(--on-background)" }}>이 이름 예약하기</a>
          <div className="mt-4"><a href="/" className="text-sm" style={{ color: "var(--on-surface-variant)" }}>좌표.to 메인으로 →</a></div>
        </div>
      </main>
    );
  }

  const displayName = ns.display_name || ns.name;

  return (
    <main className="min-h-screen" style={{ background: "var(--surface)" }}>
      <div className="max-w-lg mx-auto px-6 py-16">
        {/* Profile header */}
        <div className="text-center mb-10">
          {ns.avatar_url ? (
            <img src={ns.avatar_url} alt={displayName} className="w-24 h-24 rounded-full object-cover mx-auto mb-4" style={{ border: "3px solid var(--primary)" }} />
          ) : (
            <div className="w-24 h-24 rounded-full text-white flex items-center justify-center mx-auto mb-4 text-4xl font-bold" style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
              {displayName[0]}
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>{displayName}</h1>
          {ns.bio && <p className="mt-1" style={{ color: "var(--on-surface-variant)" }}>{ns.bio}</p>}
          <p className="text-xs font-mono mt-2" style={{ color: "var(--on-surface-variant)" }}>좌표.to/{ns.name}</p>
        </div>

        {/* Links */}
        {links.length === 0 ? (
          <div className="text-center py-10" style={{ color: "var(--on-surface-variant)" }}>아직 등록된 링크가 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <a key={link.slug} href={link.target_url} target="_blank" rel="noopener noreferrer"
                className="block p-4 rounded-xl text-center transition-all hover:translate-y-[-2px]"
                style={{ background: "var(--surface-lowest)", boxShadow: "0 2px 32px rgba(0,0,0,0.03)" }}
              >
                <span className="font-medium">{link.slug}</span>
              </a>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <a href="/" className="text-xs" style={{ color: "var(--on-surface-variant)" }}>좌표.to에서 나만의 좌표 만들기</a>
        </div>
      </div>
    </main>
  );
}
