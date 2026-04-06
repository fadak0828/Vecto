import { Metadata } from "next";
import { notFound } from "next/navigation";
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
    notFound();
  }

  const displayName = ns.display_name || ns.name;

  return (
    <main className="min-h-screen" style={{ background: "var(--surface)" }}>
      <div className="max-w-lg mx-auto px-6 py-16">
        {/* Profile header — left-aligned, editorial */}
        <div className="mb-10">
          <div className="flex items-center gap-5 mb-4">
            {ns.avatar_url ? (
              <img src={ns.avatar_url} alt={displayName} className="w-20 h-20 rounded-full object-cover shrink-0" style={{ border: "3px solid var(--primary)" }} />
            ) : (
              <div className="w-20 h-20 rounded-full text-white flex items-center justify-center shrink-0 text-3xl font-bold" style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
                {displayName[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>{displayName}</h1>
              <p className="text-xs font-mono mt-1" style={{ color: "var(--on-surface-variant)" }}>좌표.to/{ns.name}</p>
            </div>
          </div>
          {ns.bio && <p className="mt-2" style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}>{ns.bio}</p>}
        </div>

        {/* Links */}
        {links.length === 0 ? (
          <div className="py-10 rounded-2xl" style={{ background: "var(--surface-lowest)" }}>
            <p className="font-medium mb-1 text-center">아직 등록된 링크가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <a key={link.slug} href={link.target_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl transition-all hover:translate-y-[-2px]"
                style={{ background: "var(--surface-lowest)", boxShadow: "0 2px 32px rgba(0,0,0,0.03)" }}
              >
                <span className="font-medium">{link.slug}</span>
                <span className="ml-auto text-xs" style={{ color: "var(--on-surface-variant)" }}>→</span>
              </a>
            ))}
          </div>
        )}

        <div className="mt-16">
          <a href="/" className="text-xs" style={{ color: "var(--on-surface-variant)" }}>좌표.to에서 나만의 좌표 만들기</a>
        </div>
      </div>
    </main>
  );
}
