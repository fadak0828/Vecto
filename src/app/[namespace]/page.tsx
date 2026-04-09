import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { PublicProfileView } from "@/components/public-profile-view";

type Props = { params: Promise<{ namespace: string }> };

/**
 * Reserved route aliases. Users who type these in the address bar get
 * redirected to the canonical path instead of falling through to the
 * namespace catch-all (which would show "claim this name" false affordance).
 */
const ROUTE_ALIASES: Record<string, string> = {
  login: "/auth/login",
  signin: "/auth/login",
  "sign-in": "/auth/login",
  signup: "/auth/login",
  "sign-up": "/auth/login",
  logout: "/",
  signout: "/",
  about: "/",
  help: "/",
  contact: "/",
  home: "/",
  index: "/",
};

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
  const lower = decoded.toLowerCase();
  // Known framework/API routes — should never reach the namespace lookup.
  if (["go", "api", "auth", "dashboard", "reserve", "_next"].includes(lower)) return null;
  // Known public route aliases — redirect to canonical path.
  if (ROUTE_ALIASES[lower]) redirect(ROUTE_ALIASES[lower]);

  let ns: { id: string; name: string; display_name: string | null; bio: string | null; avatar_url: string | null; payment_status: string; paid_until: string | null } | null = null;
  let links: {
    slug: string;
    target_url: string;
    og_title: string | null;
    og_image: string | null;
    og_site_name: string | null;
    og_description: string | null;
  }[] = [];

  try {
    const supabase = getSupabase();
    const { data: nsData } = await supabase.from("namespaces").select("id, name, display_name, bio, avatar_url, payment_status, paid_until").eq("name", decoded).maybeSingle();
    if (nsData) {
      ns = nsData;
      const { data: slugs } = await supabase
        .from("slugs")
        .select("slug, target_url, og_title, og_image, og_site_name, og_description")
        .eq("namespace_id", nsData.id)
        .order("created_at", { ascending: true });
      links = slugs ?? [];
    }
  } catch { /* fallback */ }

  if (!ns) {
    notFound();
  }

  const displayName = ns.display_name || ns.name;
  const isPaid =
    ns.payment_status === "active" &&
    ns.paid_until !== null &&
    new Date(ns.paid_until) > new Date();
  const isExpired = ns.payment_status === "expired";

  return (
    <PublicProfileView
      displayName={displayName}
      namespaceName={ns.name}
      bio={ns.bio}
      avatarUrl={ns.avatar_url}
      links={links}
      isPaid={isPaid}
      isExpired={isExpired}
      variant="live"
    />
  );
}
