"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { AvatarUpload } from "@/components/avatar-upload";
import { ClickStats } from "@/components/click-stats";

type Namespace = {
  id: string;
  name: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type SubLink = {
  id: string;
  slug: string;
  target_url: string;
  click_count: number;
};

export default function DashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [namespace, setNamespace] = useState<Namespace | null>(null);
  const [links, setLinks] = useState<SubLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimName, setClaimName] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/auth/login"; return; }
    setUser({ id: user.id, email: user.email ?? "" });
    const { data: ns } = await supabase.from("namespaces").select("id, name, display_name, bio, avatar_url").eq("owner_id", user.id).maybeSingle();
    if (ns) {
      setNamespace(ns);
      setDisplayName(ns.display_name ?? "");
      setBio(ns.bio ?? "");
      setAvatarUrl(ns.avatar_url ?? "");
      const { data: slugs } = await supabase.from("slugs").select("id, slug, target_url, click_count").eq("namespace_id", ns.id).order("created_at", { ascending: true });
      setLinks(slugs ?? []);
    }
    setLoading(false);
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault(); setClaiming(true); setClaimError("");
    const { data: existing } = await supabase.from("namespaces").select("id").eq("name", claimName).maybeSingle();
    if (existing) { setClaimError("이미 사용 중인 이름입니다."); setClaiming(false); return; }
    const { data: slugConflict } = await supabase.from("slugs").select("id").eq("slug", claimName).is("namespace_id", null).maybeSingle();
    if (slugConflict) { await supabase.from("slugs").delete().eq("id", slugConflict.id); }
    const { data, error } = await supabase.from("namespaces").insert({ name: claimName, owner_id: user!.id }).select("id, name, display_name, bio, avatar_url").single();
    if (error) { setClaimError("생성 실패: " + error.message); } else { setNamespace(data); }
    setClaiming(false);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault(); setSavingProfile(true);
    const { error } = await supabase.from("namespaces").update({ display_name: displayName || null, bio: bio || null, avatar_url: avatarUrl || null }).eq("id", namespace!.id);
    if (!error) { setNamespace({ ...namespace!, display_name: displayName || null, bio: bio || null, avatar_url: avatarUrl || null }); setEditingProfile(false); }
    setSavingProfile(false);
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault(); setAdding(true); setAddError("");
    if (links.length >= 20) { setAddError("하위 링크는 최대 20개까지 추가할 수 있습니다."); setAdding(false); return; }
    const { error } = await supabase.from("slugs").insert({ slug: newSlug, target_url: newUrl, namespace_id: namespace!.id, owner_id: user!.id });
    if (error) { setAddError("추가 실패: " + error.message); } else { setNewSlug(""); setNewUrl(""); await loadData(); }
    setAdding(false);
  }

  async function handleDeleteLink(id: string) {
    await supabase.from("slugs").delete().eq("id", id);
    setLinks(links.filter((l) => l.id !== id));
  }

  async function handleLogout() { await supabase.auth.signOut(); window.location.href = "/"; }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface)" }}>
        <p style={{ color: "var(--on-surface-variant)" }}>로딩 중...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surface)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-5xl mx-auto">
        <a href="/" className="text-xl font-bold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>좌표.to</a>
        <div className="flex items-center gap-4">
          <a href="/settings" className="text-sm hover:opacity-70 transition-opacity hidden sm:inline" style={{ color: "var(--on-surface-variant)" }}>설정</a>
          <span className="text-sm hidden sm:inline" style={{ color: "var(--on-surface-variant)" }}>{user?.email}</span>
          <button onClick={handleLogout} className="text-sm hover:opacity-70" style={{ color: "var(--on-surface-variant)" }}>로그아웃</button>
        </div>
      </nav>

      <main className="px-6 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
        {!namespace ? (
          /* Claim */
          <section className="max-w-lg">
            <h1 className="text-4xl font-extrabold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>내 좌표 만들기</h1>
            <p className="mb-8" style={{ color: "var(--on-surface-variant)" }}>좌표.to/내이름 으로 나만의 영구 URL을 만드세요.</p>
            <form onSubmit={handleClaim} className="space-y-3">
              <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "var(--surface-lowest)", boxShadow: "0 2px 32px rgba(0,0,0,0.03)" }}>
                <span className="pl-4 pr-1 py-3 text-sm whitespace-nowrap" style={{ color: "var(--on-surface-variant)" }}>좌표.to/</span>
                <input type="text" value={claimName} onChange={(e) => setClaimName(e.target.value.replace(/\s+/g, "-"))} placeholder="홍길동" className="flex-1 py-3 pr-4 bg-transparent outline-none text-lg" required />
              </div>
              <button type="submit" disabled={claiming} className="w-full py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity" style={{ background: "var(--on-background)", color: "var(--surface-lowest)" }}>
                {claiming ? "생성 중..." : "이 이름으로 시작하기"}
              </button>
              {claimError && <p className="text-sm" style={{ color: "var(--error)" }}>{claimError}</p>}
            </form>
          </section>
        ) : (
          <section className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-extrabold" style={{ fontFamily: "Manrope, sans-serif" }}>대시보드</h1>
              <p style={{ color: "var(--on-surface-variant)" }}>당신만의 디지털 좌표를 관리하세요.</p>
            </div>

            {/* Stats row */}
            <ClickStats namespaceId={namespace.id} />

            {/* Profile card */}
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface-lowest)", boxShadow: "0 2px 48px rgba(0,0,0,0.03)" }}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {namespace.avatar_url ? (
                    <img src={namespace.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0" style={{ background: "var(--primary)" }}>
                      {(namespace.display_name || namespace.name)[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>{namespace.display_name || namespace.name}</h2>
                    <p className="text-sm font-mono" style={{ color: "var(--primary)" }}>좌표.to/{namespace.name}</p>
                    {namespace.bio && <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>{namespace.bio}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`/${namespace.name}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-xs rounded-full" style={{ background: "var(--secondary-container)", color: "var(--on-surface)" }}>프로필 보기</a>
                  <button onClick={() => setEditingProfile(!editingProfile)} className="px-3 py-2 text-xs rounded-full" style={{ background: "var(--secondary-container)", color: "var(--on-surface)" }}>
                    {editingProfile ? "취소" : "편집"}
                  </button>
                </div>
              </div>

              {editingProfile && (
                <form onSubmit={handleSaveProfile} className="mt-6 pt-6 space-y-3" style={{ background: "var(--surface-low)", margin: "24px -24px -24px", padding: "24px", borderRadius: "0 0 16px 16px" }}>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--on-surface-variant)" }}>프로필 이미지</label>
                    <AvatarUpload userId={user!.id} currentUrl={avatarUrl || null} onUploaded={(url) => setAvatarUrl(url)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--on-surface-variant)" }}>표시 이름</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={namespace.name} className="w-full py-2.5 px-3 rounded-xl outline-none text-sm" style={{ background: "var(--surface-lowest)" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--on-surface-variant)" }}>한줄 소개</label>
                    <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="AI 기업강의 전문 강사" className="w-full py-2.5 px-3 rounded-xl outline-none text-sm" style={{ background: "var(--surface-lowest)" }} />
                  </div>
                  <button type="submit" disabled={savingProfile} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity" style={{ background: "var(--primary)" }}>
                    {savingProfile ? "저장 중..." : "프로필 저장"}
                  </button>
                </form>
              )}
            </div>

            {/* Links */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>좌표 및 링크 관리</h2>
                <span className="text-sm" style={{ color: "var(--on-surface-variant)" }}>{links.length}/20</span>
              </div>

              {links.length === 0 ? (
                <div className="py-10 text-center rounded-2xl" style={{ background: "var(--surface-lowest)" }}>
                  <p className="font-medium mb-1">아직 링크가 없습니다</p>
                  <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>아래에서 첫 번째 링크를 추가하세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map((link) => (
                    <div key={link.id} className="flex items-center gap-3 p-4 rounded-xl transition-all hover:translate-x-0.5" style={{ background: "var(--surface-lowest)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm truncate" style={{ color: "var(--primary)" }}>좌표.to/{namespace.name}/{link.slug}</div>
                        <div className="text-sm truncate" style={{ color: "var(--on-surface-variant)" }}>→ {link.target_url}</div>
                      </div>
                      <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--on-surface-variant)" }}>{link.click_count.toLocaleString()}회</span>
                      <button onClick={() => handleDeleteLink(link.id)} className="text-xs px-2 py-1 rounded-lg hover:opacity-70 shrink-0" style={{ color: "var(--error)" }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add link */}
            <div className="p-5 rounded-2xl" style={{ background: "var(--surface-lowest)", boxShadow: "0 2px 48px rgba(0,0,0,0.03)" }}>
              <h2 className="font-bold mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>새 링크 추가</h2>
              <form onSubmit={handleAddLink} className="space-y-3">
                <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "var(--surface-low)" }}>
                  <span className="pl-4 pr-1 py-2.5 text-sm whitespace-nowrap" style={{ color: "var(--on-surface-variant)" }}>/{namespace.name}/</span>
                  <input type="text" value={newSlug} onChange={(e) => setNewSlug(e.target.value.replace(/\s+/g, "-"))} placeholder="노션" className="flex-1 py-2.5 pr-4 bg-transparent outline-none" required />
                </div>
                <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="연결할 URL (https://...)" className="w-full py-2.5 px-4 rounded-xl outline-none" style={{ background: "var(--surface-low)" }} required />
                <button type="submit" disabled={adding} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity" style={{ background: "var(--primary)" }}>
                  {adding ? "추가 중..." : "+ 새 링크 추가"}
                </button>
                {addError && <p className="text-sm" style={{ color: "var(--error)" }}>{addError}</p>}
              </form>
            </div>

            {/* Upsell banner */}
            <div className="p-6 rounded-2xl text-white" style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
              <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>나만의 맞춤 배너 좌표를 확보하세요.</h3>
              <p className="text-sm opacity-80 mb-4">내 이름으로 영구 좌표를 만들어보세요.</p>
            </div>
          </section>
        )}
      </main>

      <footer className="px-8 py-6 text-center text-xs" style={{ color: "var(--on-surface-variant)" }}>좌표.to</footer>
    </div>
  );
}
