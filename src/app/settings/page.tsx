"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { AvatarUpload } from "@/components/avatar-upload";
import { validateSlug, validateUrl } from "@/lib/slug-validation";

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

export default function SettingsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [namespace, setNamespace] = useState<Namespace | null>(null);
  const [links, setLinks] = useState<SubLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showMsg = useCallback(
    (
      setter: (v: { type: "success" | "error"; text: string } | null) => void,
      type: "success" | "error",
      text: string
    ) => {
      setter({ type, text });
      setTimeout(() => setter(null), 3000);
    },
    []
  );

  async function loadData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }
    setUser({ id: user.id });
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!namespace) return;
    setSaving(true);
    const { error } = await supabase
      .from("namespaces")
      .update({
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      })
      .eq("id", namespace.id);
    if (error) {
      showMsg(setSaveMsg, "error", "저장에 실패했습니다: " + error.message);
    } else {
      setNamespace({
        ...namespace,
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      });
      showMsg(setSaveMsg, "success", "프로필이 저장되었습니다.");
    }
    setSaving(false);
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!namespace || !user) return;
    setAdding(true);
    setAddError("");
    // 검증
    const slugCheck = validateSlug(newSlug);
    if (!slugCheck.valid) {
      setAddError(slugCheck.error!);
      setAdding(false);
      return;
    }
    const urlCheck = validateUrl(newUrl);
    if (!urlCheck.valid) {
      setAddError(urlCheck.error!);
      setAdding(false);
      return;
    }
    const { error } = await supabase.from("slugs").insert({
      slug: newSlug,
      target_url: newUrl,
      namespace_id: namespace.id,
      owner_id: user.id,
    });
    if (error) {
      if (error.code === "23505") {
        setAddError("이미 사용 중인 링크 이름입니다.");
      } else {
        setAddError("추가 실패: " + error.message);
      }
    } else {
      setNewSlug("");
      setNewUrl("");
      await loadData();
    }
    setAdding(false);
  }

  async function handleDeleteLink(id: string) {
    // 2-step 삭제
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId((prev) => (prev === id ? null : prev)), 3000);
      return;
    }
    const prevLinks = [...links];
    setLinks(links.filter((l) => l.id !== id));
    setDeletingId(null);
    const { error } = await supabase.from("slugs").delete().eq("id", id);
    if (error) {
      setLinks(prevLinks);
      setAddError("삭제에 실패했습니다. 다시 시도해주세요.");
      setTimeout(() => setAddError(""), 3000);
    }
  }

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--surface)" }}
      >
        <p style={{ color: "var(--on-surface-variant)" }}>로딩 중...</p>
      </main>
    );
  }

  if (!namespace) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ background: "var(--surface)" }}
      >
        <h1
          className="text-2xl font-bold mb-4"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          먼저 좌표를 만들어주세요
        </h1>
        <a
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: "var(--primary)" }}
        >
          대시보드로 이동
        </a>
      </main>
    );
  }

  const previewName = displayName || namespace.name;

  return (
    <div className="min-h-screen" style={{ background: "var(--surface)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-6xl mx-auto">
        <a
          href="/"
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          좌표.to
        </a>
        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="/dashboard"
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: "var(--on-surface-variant)" }}
          >
            대시보드
          </a>
        </div>
      </nav>

      <main className="px-6 sm:px-8 pt-4 sm:pt-12 pb-20 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
        {/* Left Column: Forms */}
        <div className="lg:col-span-7 space-y-10">
          {/* Header */}
          <header>
            <h1
              className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-3"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              나만의 디지털
              <br />
              <span style={{ color: "var(--primary)" }}>좌표</span>를 설정하세요
            </h1>
            <p
              className="text-base sm:text-lg max-w-xl"
              style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
            >
              당신만의 고유한 에디토리얼 공간을 확보하세요. 모든 변경사항은
              실시간으로 반영됩니다.
            </p>
          </header>

          {/* Profile Settings */}
          <section>
            <h2
              className="text-xl font-bold mb-6"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              프로필 설정
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  프로필 이미지
                </label>
                <AvatarUpload
                  userId={user!.id}
                  currentUrl={avatarUrl || null}
                  onUploaded={(url) => setAvatarUrl(url)}
                />
              </div>

              {/* Namespace URL */}
              <div
                className="flex items-center p-5 rounded-xl"
                style={{
                  background: "var(--surface-lowest)",
                  boxShadow: "0 32px 64px -12px rgba(0,101,101,0.06)",
                }}
              >
                <span
                  className="text-xl font-bold mr-1"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  좌표.to/
                </span>
                <span
                  className="text-xl font-extrabold"
                  style={{ color: "var(--on-background)" }}
                >
                  {namespace.name}
                </span>
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  표시 이름
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={namespace.name}
                  className="w-full py-3 px-4 rounded-xl outline-none text-base"
                  style={{ background: "var(--surface-lowest)" }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  한줄 소개
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="디지털 크리에이터 | 서울 기반"
                  maxLength={200}
                  className="w-full py-3 px-4 rounded-xl outline-none text-base"
                  style={{ background: "var(--surface-lowest)" }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {saving ? "저장 중..." : "프로필 저장"}
              </button>

              {saveMsg && (
                <p
                  className="text-sm"
                  style={{
                    color:
                      saveMsg.type === "error"
                        ? "var(--error)"
                        : "var(--primary)",
                  }}
                >
                  {saveMsg.text}
                </p>
              )}
            </form>
          </section>

          {/* Links Management */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                소셜 및 프로젝트 링크
              </h2>
              <span
                className="text-sm"
                style={{ color: "var(--on-surface-variant)" }}
              >
                {links.length}개
              </span>
            </div>

            {links.length > 0 && (
              <div className="space-y-3 mb-6">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-4 p-4 sm:p-5 rounded-xl group transition-colors"
                    style={{ background: "var(--surface-low)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold truncate">{link.slug}</h4>
                        <span
                          className="text-xs tabular-nums shrink-0"
                          style={{ color: "var(--on-surface-variant)" }}
                        >
                          {link.click_count.toLocaleString()}회
                        </span>
                      </div>
                      <p
                        className="text-sm truncate"
                        style={{ color: "var(--on-surface-variant)" }}
                      >
                        → {link.target_url}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="text-xs px-3 py-2 rounded-lg transition-colors"
                      style={{
                        color:
                          deletingId === link.id
                            ? "var(--surface-lowest)"
                            : "var(--error)",
                        background:
                          deletingId === link.id
                            ? "var(--error)"
                            : "transparent",
                        opacity: deletingId === link.id ? 1 : 0.5,
                      }}
                    >
                      {deletingId === link.id ? "정말 삭제?" : "삭제"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Link */}
            <form onSubmit={handleAddLink} className="space-y-3">
              <div
                className="flex items-center rounded-xl overflow-hidden"
                style={{ background: "var(--surface-lowest)" }}
              >
                <span
                  className="pl-4 pr-1 py-3 text-sm whitespace-nowrap"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  /{namespace.name}/
                </span>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) =>
                    setNewSlug(e.target.value.replace(/\s+/g, "-"))
                  }
                  placeholder="노션"
                  className="flex-1 py-3 pr-4 bg-transparent outline-none"
                  required
                />
              </div>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="연결할 URL (https://...)"
                className="w-full py-3 px-4 rounded-xl outline-none"
                style={{ background: "var(--surface-lowest)" }}
                required
              />
              <button
                type="submit"
                disabled={adding}
                className="px-5 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {adding ? "추가 중..." : "+ 새 링크 추가"}
              </button>
              {addError && (
                <p className="text-sm" style={{ color: "var(--error)" }}>
                  {addError}
                </p>
              )}
            </form>
          </section>
        </div>

        {/* Right Column: Phone Preview */}
        <div className="lg:col-span-5 hidden lg:block">
          <div className="sticky top-8 flex flex-col items-center gap-4">
            <span
              className="text-sm font-bold flex items-center gap-2"
              style={{ color: "var(--on-surface-variant)" }}
            >
              실시간 보기
            </span>

            {/* Phone Frame */}
            <div
              className="w-[300px] rounded-[2.5rem] p-3 relative"
              style={{
                background: "var(--on-background)",
                boxShadow: "0 32px 64px -12px rgba(0,0,0,0.3)",
              }}
            >
              {/* Notch */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 rounded-b-2xl z-20"
                style={{ background: "var(--on-background)" }}
              />

              <div
                className="w-full rounded-[2rem] overflow-hidden flex flex-col"
                style={{
                  background: "var(--surface-lowest)",
                  minHeight: "560px",
                }}
              >
                {/* Cover */}
                <div
                  className="h-32 relative"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary), var(--primary-container))",
                  }}
                >
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-16 h-16 rounded-full object-cover"
                        style={{ border: "3px solid white" }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                        style={{
                          background: "var(--primary)",
                          border: "3px solid white",
                        }}
                      >
                        {previewName[0]}
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="mt-10 px-5 text-center space-y-1">
                  <h3
                    className="text-lg font-extrabold"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    {previewName}
                  </h3>
                  {bio && (
                    <p
                      className="text-[11px] px-3"
                      style={{
                        color: "var(--on-surface-variant)",
                        lineHeight: 1.5,
                      }}
                    >
                      {bio}
                    </p>
                  )}
                </div>

                {/* Links Preview */}
                <div className="mt-6 px-5 space-y-2 flex-1">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="w-full p-3 rounded-xl flex items-center gap-2"
                      style={{ background: "var(--surface-low)" }}
                    >
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: "var(--on-background)" }}
                      >
                        {link.slug}
                      </span>
                    </div>
                  ))}
                  {links.length === 0 && (
                    <p
                      className="text-center text-[11px] py-6"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      링크를 추가하면 여기에 표시됩니다
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 text-center">
                  <span
                    className="text-[10px] font-bold tracking-tight"
                    style={{ color: "var(--outline-variant)" }}
                  >
                    좌표.to/{namespace.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="px-6 sm:px-8 py-8"
        style={{ background: "var(--surface-low)" }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-6xl mx-auto">
          <span
            className="font-bold tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            좌표.to
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--on-surface-variant)" }}
          >
            © 2026 좌표.to
          </span>
        </div>
      </footer>
    </div>
  );
}
