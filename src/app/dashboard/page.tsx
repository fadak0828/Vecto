"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

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

  // 네임스페이스 생성
  const [claimName, setClaimName] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claiming, setClaiming] = useState(false);

  // 서브링크 추가
  const [newSlug, setNewSlug] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // 프로필 편집
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth/login";
      return;
    }
    setUser({ id: user.id, email: user.email ?? "" });

    const { data: ns } = await supabase
      .from("namespaces")
      .select("id, name, display_name, bio, avatar_url")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ns) {
      setNamespace(ns);
      setDisplayName(ns.display_name ?? "");
      setBio(ns.bio ?? "");
      setAvatarUrl(ns.avatar_url ?? "");

      const { data: slugs } = await supabase
        .from("slugs")
        .select("id, slug, target_url, click_count")
        .eq("namespace_id", ns.id)
        .order("created_at", { ascending: true });
      setLinks(slugs ?? []);
    }
    setLoading(false);
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setClaiming(true);
    setClaimError("");

    const { data: existing } = await supabase
      .from("namespaces")
      .select("id")
      .eq("name", claimName)
      .maybeSingle();

    if (existing) {
      setClaimError("이미 사용 중인 이름입니다.");
      setClaiming(false);
      return;
    }

    const { data: slugConflict } = await supabase
      .from("slugs")
      .select("id")
      .eq("slug", claimName)
      .is("namespace_id", null)
      .maybeSingle();

    if (slugConflict) {
      await supabase.from("slugs").delete().eq("id", slugConflict.id);
    }

    const { data, error } = await supabase
      .from("namespaces")
      .insert({ name: claimName, owner_id: user!.id })
      .select("id, name, display_name, bio, avatar_url")
      .single();

    if (error) {
      setClaimError("네임스페이스 생성 실패: " + error.message);
    } else {
      setNamespace(data);
    }
    setClaiming(false);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);

    const { error } = await supabase
      .from("namespaces")
      .update({
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      })
      .eq("id", namespace!.id);

    if (!error) {
      setNamespace({
        ...namespace!,
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      });
      setEditingProfile(false);
    }
    setSavingProfile(false);
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError("");

    if (links.length >= 20) {
      setAddError("서브링크는 최대 20개까지 추가할 수 있습니다.");
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("slugs").insert({
      slug: newSlug,
      target_url: newUrl,
      namespace_id: namespace!.id,
      owner_id: user!.id,
    });

    if (error) {
      setAddError("링크 추가 실패: " + error.message);
    } else {
      setNewSlug("");
      setNewUrl("");
      await loadData();
    }
    setAdding(false);
  }

  async function handleDeleteLink(id: string) {
    await supabase.from("slugs").delete().eq("id", id);
    setLinks(links.filter((l) => l.id !== id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--muted)]">로딩 중...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto">
        <a href="/" className="text-lg font-bold tracking-tight">
          좌표.to
        </a>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--muted)] hidden sm:inline">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            로그아웃
          </button>
        </div>
      </nav>

      <main className="px-6 py-8 max-w-3xl mx-auto">
        {!namespace ? (
          <section>
            <h1 className="text-3xl font-bold mb-2">내 좌표 만들기</h1>
            <p className="text-[var(--muted)] mb-6">
              좌표.to/내이름 으로 나만의 영구 URL을 만드세요.
            </p>
            <form onSubmit={handleClaim} className="max-w-md space-y-3">
              <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--accent)]">
                <span className="pl-4 pr-1 py-3 text-[var(--muted)] text-sm whitespace-nowrap">
                  좌표.to/
                </span>
                <input
                  type="text"
                  value={claimName}
                  onChange={(e) =>
                    setClaimName(e.target.value.replace(/\s+/g, "-"))
                  }
                  placeholder="홍길동"
                  className="flex-1 py-3 pr-4 bg-transparent outline-none text-lg"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={claiming}
                className="w-full py-3 bg-[var(--foreground)] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {claiming ? "생성 중..." : "이 이름으로 시작하기"}
              </button>
              {claimError && (
                <p className="text-sm text-red-600">{claimError}</p>
              )}
            </form>
          </section>
        ) : (
          <section className="space-y-8">
            {/* 프로필 카드 */}
            <div className="p-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm">
              <div className="flex items-start gap-4">
                {/* 아바타 */}
                <div className="shrink-0">
                  {namespace.avatar_url ? (
                    <img
                      src={namespace.avatar_url}
                      alt={namespace.display_name || namespace.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-2xl font-bold">
                      {(namespace.display_name || namespace.name)[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold">
                    {namespace.display_name || namespace.name}
                  </h1>
                  <p className="text-sm font-mono text-[var(--accent)]">
                    좌표.to/{namespace.name}
                  </p>
                  {namespace.bio && (
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {namespace.bio}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setEditingProfile(!editingProfile)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-stone-50 transition"
                >
                  {editingProfile ? "취소" : "편집"}
                </button>
              </div>

              {/* 프로필 편집 폼 */}
              {editingProfile && (
                <form
                  onSubmit={handleSaveProfile}
                  className="mt-6 pt-6 border-t border-[var(--border)] space-y-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                      표시 이름 (프로필에 보이는 이름)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={namespace.name}
                      className="w-full py-2.5 px-3 border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                      한줄 소개
                    </label>
                    <input
                      type="text"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="AI 기업강의 전문 강사"
                      className="w-full py-2.5 px-3 border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                      프로필 이미지 URL
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full py-2.5 px-3 border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {savingProfile ? "저장 중..." : "프로필 저장"}
                  </button>
                </form>
              )}
            </div>

            {/* 프로필 미리보기 링크 */}
            <div className="flex items-center gap-3">
              <a
                href={`/${namespace.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--accent)] hover:underline"
              >
                프로필 페이지 보기 →
              </a>
              <span className="text-sm text-[var(--muted)]">
                {links.length}/20 링크
              </span>
            </div>

            {/* 서브링크 목록 */}
            <div className="space-y-2">
              {links.length === 0 && (
                <div className="py-10 text-center text-[var(--muted)] bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                  <div className="text-3xl mb-3">📎</div>
                  <p className="font-medium mb-1">아직 링크가 없습니다</p>
                  <p className="text-sm">
                    아래에서 노션, 유튜브 등의 링크를 추가하세요.
                  </p>
                </div>
              )}
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-[var(--accent)] truncate">
                      좌표.to/{namespace.name}/{link.slug}
                    </div>
                    <div className="text-sm text-[var(--muted)] truncate">
                      → {link.target_url}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--muted)] shrink-0 tabular-nums">
                    {link.click_count}회
                  </span>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0 px-2 py-1 rounded hover:bg-red-50 transition"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>

            {/* 링크 추가 */}
            <div className="p-5 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
              <h2 className="font-semibold mb-3">링크 추가</h2>
              <form onSubmit={handleAddLink} className="space-y-3">
                <div className="flex items-center border border-[var(--border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--accent)]">
                  <span className="pl-4 pr-1 py-2.5 text-[var(--muted)] text-sm whitespace-nowrap">
                    /{namespace.name}/
                  </span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) =>
                      setNewSlug(e.target.value.replace(/\s+/g, "-"))
                    }
                    placeholder="노션"
                    className="flex-1 py-2.5 pr-4 bg-transparent outline-none"
                    required
                  />
                </div>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="연결할 URL (https://...)"
                  className="w-full py-2.5 px-4 border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                />
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {adding ? "추가 중..." : "추가"}
                </button>
                {addError && (
                  <p className="text-sm text-red-600">{addError}</p>
                )}
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
